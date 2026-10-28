import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { BalanceEntry } from 'src/drizzle/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

// What moved a buyer's account.
export const BALANCE_KIND = {
  SALE: 'SALE',
  PAYMENT: 'PAYMENT',
  RETURN: 'RETURN',
  // «Վճարում գնորդին»: money paid back out, which raises the balance.
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export type BalanceKind = (typeof BALANCE_KIND)[keyof typeof BALANCE_KIND];

export type AppendBalanceEntry = {
  clientId: number;
  kind: BalanceKind;
  // Signed: positive adds to «պարտք», negative settles it. Past zero the buyer
  // is in «կանխավճար».
  amount: string | number;
  saleId?: number | null;
  paymentId?: number | null;
  note?: string | null;
  tenantId: number;
};

// Anything that can run a query - the pool, or an open transaction.
type Executor = NodePgDatabase<typeof schema>;

@Injectable()
export class BalanceRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * The buyer's balance right now: the `result` of their last movement, or zero
   * if the account has never moved.
   */
  async currentBalance(clientId: number, tx?: Executor): Promise<string> {
    const executor = tx ?? this.db;
    const rows = await executor
      .select({ result: schema.balanceEntries.result })
      .from(schema.balanceEntries)
      .where(eq(schema.balanceEntries.clientId, clientId))
      .orderBy(desc(schema.balanceEntries.id))
      .limit(1);
    return rows[0]?.result ?? '0.00';
  }

  /**
   * Adds one movement, deriving `before`/`result` from the account as it stands.
   *
   * Callers must already hold the buyer's row lock (see `lockClient`), so two
   * concurrent sales cannot both read the same `before`.
   */
  async append(
    entry: AppendBalanceEntry,
    tx?: Executor,
  ): Promise<BalanceEntry> {
    const executor = tx ?? this.db;
    const before = await this.currentBalance(entry.clientId, executor);
    const rows = await executor
      .insert(schema.balanceEntries)
      .values({
        clientId: entry.clientId,
        kind: entry.kind,
        amount: String(entry.amount),
        before,
        result: sql`${before}::numeric + ${String(entry.amount)}::numeric`,
        saleId: entry.saleId ?? null,
        paymentId: entry.paymentId ?? null,
        note: entry.note ?? null,
        tenantId: entry.tenantId,
      })
      .returning();
    return rows[0];
  }

  /**
   * Serialises movements on one buyer. Postgres holds the row lock until the
   * surrounding transaction ends.
   */
  async lockClient(clientId: number, tx: Executor): Promise<void> {
    await tx.execute(
      sql`SELECT id FROM clients WHERE id = ${clientId} FOR UPDATE`,
    );
  }

  /** Everything posted against one document, for reversing it. */
  async entriesForSale(saleId: number, tx?: Executor): Promise<BalanceEntry[]> {
    const executor = tx ?? this.db;
    return executor
      .select()
      .from(schema.balanceEntries)
      .where(eq(schema.balanceEntries.saleId, saleId));
  }

  async history(clientId: number): Promise<BalanceEntry[]> {
    return this.db
      .select()
      .from(schema.balanceEntries)
      .where(eq(schema.balanceEntries.clientId, clientId))
      .orderBy(desc(schema.balanceEntries.id));
  }

  /**
   * Every buyer's balance in one pass - the latest entry per account.
   * Backs the «Միայն մնացորդ ունեցողները» filter and the buyer list.
   */
  async balancesByTenant(tenantId: number): Promise<Map<number, string>> {
    const rows = await this.db.execute<{ client_id: number; result: string }>(
      sql`
        SELECT DISTINCT ON (client_id) client_id, result
        FROM balance_entries
        WHERE tenant_id = ${tenantId}
        ORDER BY client_id, id DESC
      `,
    );
    return new Map(
      rows.rows.map((row) => [Number(row.client_id), String(row.result)]),
    );
  }

  /** «Բերել վերջին գնումը տվյալ գնորդից» - date and total of their last sale. */
  async lastPurchase(
    clientId: number,
  ): Promise<{ documentDate: string; totalAmount: string } | null> {
    const rows = await this.db
      .select({
        documentDate: schema.sales.documentDate,
        totalAmount: schema.sales.totalAmount,
      })
      .from(schema.sales)
      .where(
        and(
          eq(schema.sales.clientId, clientId),
          eq(schema.sales.isReturn, false),
        ),
      )
      .orderBy(desc(schema.sales.documentDate), desc(schema.sales.id))
      .limit(1);
    return rows[0] ?? null;
  }
}
