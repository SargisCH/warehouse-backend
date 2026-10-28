import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from 'src/drizzle/schema';
import {
  BALANCE_KIND,
  BalanceRepository,
} from 'src/repositories/balance.repository';
import { ClientRepository } from 'src/repositories/client.repository';
import { CreditRepository } from 'src/repositories/credit.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import {
  MoneyListOptions,
  PaymentRepository,
} from 'src/repositories/payment.repository';
import { withDocumentCode } from 'src/shared/helpers/document-code';
import { fromMinor, toMinor, today } from 'src/shared/helpers/money';
import { CreditService } from './credit.service';
import {
  CreatePaymentDto,
  CreateRefundDto,
  CreateRepaymentDto,
} from './payment.dto';

const sumAmounts = (rows: Array<{ amount: string }>) =>
  fromMinor(rows.reduce((sum, row) => sum + toMinor(row.amount), 0n));

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly creditRepository: CreditRepository,
    private readonly creditService: CreditService,
    private readonly balanceRepository: BalanceRepository,
    private readonly clientRepository: ClientRepository,
    private readonly managerRepository: ManagerRepository,
  ) {}

  private async assertClient(user: User, clientId: number) {
    const client = await this.clientRepository.findById(clientId);
    if (!client || client.tenantId !== user.tenantId) {
      throw new BadRequestException('Client not found');
    }
    return client;
  }

  private async assertManager(user: User, managerId?: number | null) {
    if (!managerId) return null;
    const manager = await this.managerRepository.findById(managerId);
    if (!manager || manager.tenantId !== user.tenantId) {
      throw new BadRequestException('Manager not found');
    }
    return manager;
  }

  private positive(amount: string) {
    const value = toMinor(amount);
    if (value <= 0n) {
      throw new BadRequestException('Amount must be greater than zero');
    }
    return value;
  }

  /**
   * «Վճարում». The money comes off the balance in full; it then settles the
   * chosen sales, or the oldest ones, and whatever is left is «կանխավճար».
   */
  async create(user: User, dto: CreatePaymentDto) {
    const client = await this.assertClient(user, dto.clientId);
    const manager = await this.assertManager(user, dto.managerId);
    const amount = this.positive(dto.amount);

    return this.paymentRepository.transaction(async (tx) => {
      await this.balanceRepository.lockClient(client.id, tx);

      const payment = await withDocumentCode(
        tx,
        () => this.paymentRepository.nextPaymentCode(user.tenantId, tx),
        'payments_tenant_code',
        (code) =>
          this.paymentRepository.insertPayment(
            {
              code,
              kind: 'IN',
              documentDate: dto.documentDate ?? today(),
              managerId: manager?.id ?? null,
              // An agent brings his zone; otherwise take what was sent, then
              // the buyer's own.
              salesZoneId:
                dto.salesZoneId ??
                manager?.salesZoneId ??
                client.salesZoneId ??
                null,
              clientId: client.id,
              paymentType: dto.paymentType ?? null,
              amount: fromMinor(amount),
              note: dto.note ?? null,
              tenantId: user.tenantId,
            },
            tx,
          ),
      );

      await this.balanceRepository.append(
        {
          clientId: client.id,
          kind: BALANCE_KIND.PAYMENT,
          amount: fromMinor(-amount),
          paymentId: payment.id,
          note: dto.note ?? null,
          tenantId: user.tenantId,
        },
        tx,
      );

      await this.creditService.apply(
        {
          tenantId: user.tenantId,
          clientId: client.id,
          from: { paymentId: payment.id },
          to: dto.allocations
            ? { sales: dto.allocations }
            : { oldestSales: true },
          limit: amount,
        },
        tx,
      );

      return payment;
    });
  }

  /**
   * «Վճարում գնորդին» - money handed back to the buyer. It raises the balance
   * and spends their credit, so it can never exceed what they have.
   */
  async refund(user: User, dto: CreateRefundDto) {
    const client = await this.assertClient(user, dto.clientId);
    const manager = await this.assertManager(user, dto.managerId);
    const amount = this.positive(dto.amount);

    return this.paymentRepository.transaction(async (tx) => {
      await this.balanceRepository.lockClient(client.id, tx);

      const refund = await withDocumentCode(
        tx,
        () => this.paymentRepository.nextPaymentCode(user.tenantId, tx),
        'payments_tenant_code',
        (code) =>
          this.paymentRepository.insertPayment(
            {
              code,
              kind: 'REFUND',
              documentDate: dto.documentDate ?? today(),
              managerId: manager?.id ?? null,
              salesZoneId: manager?.salesZoneId ?? client.salesZoneId ?? null,
              clientId: client.id,
              paymentType: dto.paymentType ?? null,
              amount: fromMinor(amount),
              note: dto.note ?? null,
              tenantId: user.tenantId,
            },
            tx,
          ),
      );

      await this.creditService.apply(
        {
          tenantId: user.tenantId,
          clientId: client.id,
          from: { pool: 'ANY' },
          to: { refundId: refund.id },
          limit: amount,
        },
        tx,
      );

      await this.balanceRepository.append(
        {
          clientId: client.id,
          kind: BALANCE_KIND.REFUND,
          amount: fromMinor(amount),
          paymentId: refund.id,
          note: dto.note ?? null,
          tenantId: user.tenantId,
        },
        tx,
      );

      return refund;
    });
  }

  async findAll(user: User, options: MoneyListOptions) {
    const rows = await this.paymentRepository.findPayments(
      user.tenantId,
      options,
    );
    return { rows, totals: { amount: sumAmounts(rows), count: rows.length } };
  }

  async findOne(user: User, id: number) {
    const payment = await this.paymentRepository.findPayment(id);
    if (!payment || payment.tenantId !== user.tenantId) {
      throw new NotFoundException('Payment not found');
    }
    const allocations = await this.creditRepository.allocationsFor(
      payment.kind === 'REFUND'
        ? { targetRefundId: id }
        : { sourcePaymentId: id },
    );
    const allocated = sumAmounts(allocations);
    return {
      ...payment,
      allocations,
      allocated,
      // For a payment in, what is still sitting as «կանխավճար».
      unallocated: fromMinor(toMinor(payment.amount) - toMinor(allocated)),
    };
  }

  /**
   * Removing a payment frees the sales it settled and reverses its balance
   * entry. Refused while a repayment or refund is spending its credit, since
   * those would be left pointing at money that is gone.
   */
  async remove(user: User, id: number) {
    const payment = await this.paymentRepository.findPayment(id);
    if (!payment || payment.tenantId !== user.tenantId) {
      throw new NotFoundException('Payment not found');
    }

    return this.paymentRepository.transaction(async (tx) => {
      await this.balanceRepository.lockClient(payment.clientId, tx);
      if (
        payment.kind === 'IN' &&
        (await this.creditRepository.isSpentElsewhere({ paymentId: id }, tx))
      ) {
        throw new BadRequestException(
          'This payment is used by a repayment or refund; remove that first',
        );
      }

      const posted = await this.paymentRepository.balanceEntriesFor(id, tx);
      const net = posted.reduce(
        (sum, entry) => sum + toMinor(entry.amount),
        0n,
      );
      if (net !== 0n) {
        await this.balanceRepository.append(
          {
            clientId: payment.clientId,
            kind: BALANCE_KIND.ADJUSTMENT,
            amount: fromMinor(-net),
            note: `Reversal of ${
              payment.kind === 'REFUND' ? 'refund' : 'payment'
            } ${payment.code}`,
            tenantId: payment.tenantId,
          },
          tx,
        );
      }
      await this.paymentRepository.deletePayment(id, tx);
      return { id };
    });
  }

  /**
   * «Մարում»: spends existing credit - «կանխավճար» or a «վերադարձ» - on open
   * sales. The balance already reflects that credit, so it does not move.
   */
  async createRepayment(user: User, dto: CreateRepaymentDto) {
    const client = await this.assertClient(user, dto.clientId);
    const source = dto.source as 'PREPAYMENT' | 'RETURN';

    return this.paymentRepository.transaction(async (tx) => {
      await this.balanceRepository.lockClient(client.id, tx);

      const available = await this.creditService.available(client.id, tx);
      const pool = toMinor(
        source === 'PREPAYMENT' ? available.prepayment : available.returns,
      );
      // Chosen documents fix the amount; otherwise use what was asked, capped
      // at the credit there is.
      const requested = dto.allocations?.length
        ? dto.allocations.reduce((sum, a) => sum + toMinor(a.amount), 0n)
        : dto.amount
        ? this.positive(dto.amount)
        : pool;
      if (requested <= 0n) {
        throw new BadRequestException('There is nothing to settle');
      }

      const repayment = await withDocumentCode(
        tx,
        () => this.paymentRepository.nextRepaymentCode(user.tenantId, tx),
        'repayments_tenant_code',
        (code) =>
          this.paymentRepository.insertRepayment(
            {
              code,
              documentDate: dto.documentDate ?? today(),
              clientId: client.id,
              source,
              amount: fromMinor(requested),
              note: dto.note ?? null,
              tenantId: user.tenantId,
            },
            tx,
          ),
      );

      const applied = await this.creditService.apply(
        {
          tenantId: user.tenantId,
          clientId: client.id,
          from: { pool: source },
          to: dto.allocations?.length
            ? { sales: dto.allocations }
            : { oldestSales: true },
          limit: requested,
          repaymentId: repayment.id,
        },
        tx,
      );
      if (applied <= 0n) {
        throw new BadRequestException('This client has no open debt to settle');
      }
      // Oldest-first may settle less than asked when the debt runs out.
      if (applied !== requested) {
        await this.paymentRepository.updateRepayment(
          repayment.id,
          { amount: fromMinor(applied) },
          tx,
        );
      }
      return { ...repayment, amount: fromMinor(applied) };
    });
  }

  async findRepayments(user: User, options: MoneyListOptions) {
    const rows = await this.paymentRepository.findRepayments(
      user.tenantId,
      options,
    );
    return { rows, totals: { amount: sumAmounts(rows), count: rows.length } };
  }

  async findRepayment(user: User, id: number) {
    const repayment = await this.paymentRepository.findRepayment(id);
    if (!repayment || repayment.tenantId !== user.tenantId) {
      throw new NotFoundException('Repayment not found');
    }
    const allocations = await this.creditRepository.allocationsFor({
      repaymentId: id,
    });
    return { ...repayment, allocations };
  }

  /** Its allocations cascade, handing the credit back to where it came from. */
  async removeRepayment(user: User, id: number) {
    const repayment = await this.paymentRepository.findRepayment(id);
    if (!repayment || repayment.tenantId !== user.tenantId) {
      throw new NotFoundException('Repayment not found');
    }
    return this.paymentRepository.transaction(async (tx) => {
      await this.balanceRepository.lockClient(repayment.clientId, tx);
      await this.paymentRepository.deleteRepayment(id, tx);
      return { id };
    });
  }

  /**
   * Everything the payment and repayment forms need once a buyer is picked:
   * the open documents (oldest first, the order money settles them in) and the
   * credit on hand.
   */
  async clientOpenItems(user: User, clientId: number) {
    await this.assertClient(user, clientId);
    const [openSales, credit, balance] = await Promise.all([
      this.creditRepository.openSales(clientId),
      this.creditService.available(clientId),
      this.balanceRepository.currentBalance(clientId),
    ]);
    return {
      balance,
      openSales,
      overdue: sumAmounts(
        openSales
          .filter((sale) => sale.isOverdue)
          .map((sale) => ({ amount: sale.outstanding })),
      ),
      debt: sumAmounts(openSales.map((sale) => ({ amount: sale.outstanding }))),
      prepayment: credit.prepayment,
      returns: credit.returns,
      sources: credit.sources,
    };
  }
}
