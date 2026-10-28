import { BadRequestException, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/drizzle/schema';
import { CreditAllocationInsert } from 'src/drizzle/schema';
import {
  CreditRepository,
  CreditSource,
} from 'src/repositories/credit.repository';
import { fromMinor, toMinor } from 'src/shared/helpers/money';

type Executor = NodePgDatabase<typeof schema>;

/** Where the money comes from: one named document, or the buyer's pool. */
export type CreditFrom =
  | { paymentId: number }
  | { returnId: number }
  | { pool: 'PREPAYMENT' | 'RETURN' | 'ANY' };

/** Where it goes: chosen sales, the oldest open sales, or a refund. */
export type CreditTo =
  | { sales: Array<{ saleId: number; amount: string }> }
  | { oldestSales: true }
  | { refundId: number };

export type ApplyCredit = {
  tenantId: number;
  clientId: number;
  from: CreditFrom;
  to: CreditTo;
  // Most that may move. With chosen sales, their sum must not exceed it.
  limit: bigint;
  repaymentId?: number | null;
};

const POOL_KIND = {
  PREPAYMENT: 'PAYMENT',
  RETURN: 'RETURN',
  ANY: undefined,
} as const;

/**
 * Moves a buyer's credit onto what they owe, writing `credit_allocations`.
 *
 * Callers must hold the buyer's row lock (BalanceRepository.lockClient) so two
 * documents cannot spend the same credit or pay the same sale twice.
 */
@Injectable()
export class CreditService {
  constructor(private readonly creditRepository: CreditRepository) {}

  private async sourcesFor(
    clientId: number,
    from: CreditFrom,
    limit: bigint,
    tx: Executor,
  ): Promise<Array<{ source: CreditSource | null; unused: bigint }>> {
    // A document spending its own value (a new payment or return) needs no
    // lookup: its whole amount is available, up to the limit given.
    if ('paymentId' in from || 'returnId' in from) {
      return [{ source: null, unused: limit }];
    }
    const sources = await this.creditRepository.creditSources(
      clientId,
      POOL_KIND[from.pool],
      tx,
    );
    // Prepayment before returns when either will do, each oldest first.
    sources.sort((a, b) =>
      a.kind === b.kind ? 0 : a.kind === 'PAYMENT' ? -1 : 1,
    );
    return sources.map((source) => ({
      source,
      unused: toMinor(source.unused),
    }));
  }

  private async targetsFor(
    clientId: number,
    to: CreditTo,
    limit: bigint,
    tx: Executor,
  ): Promise<Array<{ saleId?: number; refundId?: number; amount: bigint }>> {
    if ('refundId' in to) {
      return [{ refundId: to.refundId, amount: limit }];
    }

    const open = await this.creditRepository.openSales(clientId, tx);
    if ('oldestSales' in to) {
      let left = limit;
      const targets = [];
      for (const sale of open) {
        if (left <= 0n) break;
        const take = [toMinor(sale.outstanding), left].reduce((a, b) =>
          a < b ? a : b,
        );
        targets.push({ saleId: sale.id, amount: take });
        left -= take;
      }
      return targets;
    }

    const outstanding = new Map(
      open.map((sale) => [sale.id, toMinor(sale.outstanding)]),
    );
    const seen = new Set<number>();
    let sum = 0n;
    const targets = to.sales.map(({ saleId, amount }) => {
      if (seen.has(saleId)) {
        throw new BadRequestException(
          'A sale may only be settled once per document',
        );
      }
      seen.add(saleId);
      const owed = outstanding.get(saleId);
      if (owed === undefined) {
        throw new BadRequestException(
          `Sale ${saleId} is not an open debt of this client`,
        );
      }
      const value = toMinor(amount);
      if (value <= 0n) {
        throw new BadRequestException('Settled amounts must be positive');
      }
      if (value > owed) {
        throw new BadRequestException(
          `Sale ${saleId} only has ${fromMinor(owed)} outstanding`,
        );
      }
      sum += value;
      return { saleId, amount: value };
    });
    if (sum > limit) {
      throw new BadRequestException(
        `Settled documents total ${fromMinor(sum)}, more than ${fromMinor(
          limit,
        )} available`,
      );
    }
    return targets;
  }

  /** Returns the amount actually moved. */
  async apply(input: ApplyCredit, tx: Executor): Promise<bigint> {
    if (input.limit <= 0n) return 0n;

    const [sources, targets] = await Promise.all([
      this.sourcesFor(input.clientId, input.from, input.limit, tx),
      this.targetsFor(input.clientId, input.to, input.limit, tx),
    ]);

    const wanted = targets.reduce((sum, t) => sum + t.amount, 0n);
    const available = sources.reduce((sum, s) => sum + s.unused, 0n);
    if (wanted > available) {
      throw new BadRequestException(
        `The client only has ${fromMinor(available)} of credit to apply`,
      );
    }

    // Walk both lists at once, cutting a row wherever either side runs out.
    const rows: CreditAllocationInsert[] = [];
    let s = 0;
    for (const target of targets) {
      let need = target.amount;
      while (need > 0n) {
        const source = sources[s];
        const take = source.unused < need ? source.unused : need;
        if (take > 0n) {
          rows.push({
            sourcePaymentId:
              'paymentId' in input.from
                ? input.from.paymentId
                : source.source?.kind === 'PAYMENT'
                ? source.source.id
                : null,
            sourceReturnId:
              'returnId' in input.from
                ? input.from.returnId
                : source.source?.kind === 'RETURN'
                ? source.source.id
                : null,
            targetSaleId: target.saleId ?? null,
            targetRefundId: target.refundId ?? null,
            repaymentId: input.repaymentId ?? null,
            amount: fromMinor(take),
            tenantId: input.tenantId,
          });
        }
        source.unused -= take;
        need -= take;
        if (source.unused === 0n) s++;
      }
    }

    await this.creditRepository.insert(rows, tx);
    return wanted;
  }

  /** What the buyer can still spend, split the way «Մարման աղբյուր» offers it. */
  async available(clientId: number, tx?: Executor) {
    const sources = await this.creditRepository.creditSources(
      clientId,
      undefined,
      tx,
    );
    const sum = (kind: CreditSource['kind']) =>
      fromMinor(
        sources
          .filter((source) => source.kind === kind)
          .reduce((total, source) => total + toMinor(source.unused), 0n),
      );
    return { prepayment: sum('PAYMENT'), returns: sum('RETURN'), sources };
  }
}
