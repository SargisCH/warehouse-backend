import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SaleListOptions,
  SaleRepository,
} from 'src/repositories/sale.repository';
import { ManagerStockRepository } from 'src/repositories/manager_stock.repository';
import { PriceListRepository } from 'src/repositories/price_list.repository';
import { ClientRepository } from 'src/repositories/client.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import {
  BALANCE_KIND,
  BalanceRepository,
} from 'src/repositories/balance.repository';
import { CreateSaleDto, PaySaleDto, SettleClientDto } from './sale.dto';
import { User } from 'src/drizzle/schema';
import { CreditRepository } from 'src/repositories/credit.repository';
import { CreditService } from '../payment/credit.service';
import { PaymentService } from '../payment/payment.service';
import { withDocumentCode } from 'src/shared/helpers/document-code';
import {
  fromMilli,
  fromMinor,
  priceLines,
  toMilli,
  toMinor,
  today,
} from 'src/shared/helpers/money';

const MANAGER_ROLE = 'Manager';

type UserWithRole = User & { role?: string };

@Injectable()
export class SaleService {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly saleItemStock: ManagerStockRepository,
    private readonly priceListRepository: PriceListRepository,
    private readonly clientRepository: ClientRepository,
    private readonly managerRepository: ManagerRepository,
    private readonly balanceRepository: BalanceRepository,
    private readonly creditRepository: CreditRepository,
    private readonly creditService: CreditService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * «Վաճառքի գոտի (բերել ավտոմատ մենեջերի կպած գոտուց)» - the zone is taken
   * from the agent rather than accepted from the client, which is why the field
   * arrives disabled.
   */
  private async resolveContext(user: UserWithRole, dto: CreateSaleDto) {
    const manager = await this.managerRepository.findById(dto.managerId);
    if (!manager || manager.tenantId !== user.tenantId) {
      throw new BadRequestException('Manager not found');
    }

    const client = await this.clientRepository.findById(dto.clientId);
    if (!client || client.tenantId !== user.tenantId) {
      throw new BadRequestException('Client not found');
    }

    // Explicit choice first, then the buyer's own list, then the tenant default.
    let priceListId = dto.priceListId ?? client.priceListId ?? null;
    if (!priceListId) {
      const fallback = await this.priceListRepository.findDefault(
        user.tenantId,
      );
      priceListId = fallback?.id ?? null;
    }
    if (priceListId) {
      const priceList = await this.priceListRepository.findById(priceListId);
      if (!priceList || priceList.tenantId !== user.tenantId) {
        throw new BadRequestException('Price list not found');
      }
    }

    // «Առաքիչ» is a manager too; an agent with none assigned delivers himself.
    const delivererId = dto.delivererId ?? manager.delivererId ?? manager.id;
    if (delivererId !== manager.id) {
      const deliverer = await this.managerRepository.findById(delivererId);
      if (!deliverer || deliverer.tenantId !== user.tenantId) {
        throw new BadRequestException('Deliverer not found');
      }
    }

    if (dto.documentId) {
      const document = await this.saleRepository.findDocument(dto.documentId);
      if (!document) {
        throw new BadRequestException('Document type not found');
      }
    }

    return { manager, client, priceListId, delivererId };
  }

  /**
   * «Պարտքի սահմանաչափ» and «Ժամկետանց պարտքի սահմանաչափ»: a sale that
   * leaves debt behind is refused once the buyer is over either limit. Zero
   * means the buyer has no limit. Runs under the buyer's lock.
   */
  private async assertWithinLimits(
    client: { debtLimit: string; overdueDebtLimit: string; name: string },
    clientId: number,
    newDebt: bigint,
    tx: any,
  ) {
    if (newDebt <= 0n) return;
    const debtLimit = toMinor(client.debtLimit ?? '0');
    if (debtLimit > 0n) {
      const balance = toMinor(
        await this.balanceRepository.currentBalance(clientId, tx),
      );
      if (balance + newDebt > debtLimit) {
        throw new BadRequestException(
          `${client.name} would owe ${fromMinor(
            balance + newDebt,
          )}, over the debt limit of ${fromMinor(debtLimit)}`,
        );
      }
    }
    const overdueLimit = toMinor(client.overdueDebtLimit ?? '0');
    if (overdueLimit > 0n) {
      const open = await this.creditRepository.openSales(clientId, tx);
      const overdue = open
        .filter((sale) => sale.isOverdue)
        .reduce((sum, sale) => sum + toMinor(sale.outstanding), 0n);
      if (overdue > overdueLimit) {
        throw new BadRequestException(
          `${client.name} has ${fromMinor(
            overdue,
          )} overdue, over the limit of ${fromMinor(overdueLimit)}`,
        );
      }
    }
  }

  async create(user: UserWithRole, dto: CreateSaleDto) {
    const { manager, client, priceListId, delivererId } =
      await this.resolveContext(user, dto);

    const productIds = dto.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('A product may only appear on one line');
    }

    // Line totals and the document total, all in minor units.
    const priced = priceLines(dto.items);
    const total = priced.total;
    const items = priced.items.map(({ line, ...item }) => ({
      productId: line.productId,
      ...item,
    }));

    const isReturn = dto.isReturn ?? false;
    // The buyer's own «Վճարման տեսակ» applies when none is chosen.
    const paymentType = dto.paymentType ?? client.paymentType ?? 'CASH';

    // A cash sale is settled at the counter unless told otherwise. A return
    // pays nothing out at the counter: its value goes back on the account.
    const paid = isReturn
      ? 0n
      : dto.paidAmount !== undefined
      ? toMinor(dto.paidAmount)
      : paymentType === 'CASH'
      ? total
      : 0n;
    if (paid < 0n) {
      throw new BadRequestException('Paid amount cannot be negative');
    }
    if (paid > total) {
      throw new BadRequestException('Paid amount exceeds the sale total');
    }

    return this.saleRepository.transaction(async (tx) => {
      // Serialise everything touching this buyer's account.
      await this.balanceRepository.lockClient(dto.clientId, tx);
      if (!isReturn) {
        await this.assertWithinLimits(client, dto.clientId, total - paid, tx);
      }

      for (const item of items) {
        // A return puts goods back on the van; a sale takes them off.
        // An agent's stock may go negative.
        const delta = isReturn ? item.quantityMilli : -item.quantityMilli;
        await this.saleItemStock.adjust(
          manager.id,
          item.productId,
          fromMilli(delta),
          tx,
        );
      }

      const sale = await withDocumentCode(
        tx,
        () => this.saleRepository.nextCode(user.tenantId, tx),
        'sales_tenant_code',
        (code) =>
          this.saleRepository.insert(
            {
              code,
              documentDate: today(),
              managerId: manager.id,
              // Taken from the agent, never from the request.
              salesZoneId: manager.salesZoneId,
              clientId: dto.clientId,
              delivererId,
              priceListId,
              documentId: dto.documentId ?? null,
              paymentType,
              note: dto.note ?? null,
              totalAmount: fromMinor(total),
              paidAmount: fromMinor(paid),
              isReturn,
              tenantId: user.tenantId,
            },
            tx,
          ),
      );

      await this.saleRepository.insertItems(
        sale.id,
        items.map(({ productId, quantity, price, amount }) => ({
          productId,
          quantity,
          price,
          amount,
        })),
        tx,
      );

      // A sale adds the unpaid part to «պարտք»; a return takes the whole value
      // back off the account, so an overpaid buyer ends up in «կանխավճար»
      // rather than having money pulled out of a balance they never had.
      const movement = isReturn ? -total : total - paid;
      if (movement !== 0n) {
        await this.balanceRepository.append(
          {
            clientId: dto.clientId,
            kind: isReturn ? BALANCE_KIND.RETURN : BALANCE_KIND.SALE,
            amount: fromMinor(movement),
            saleId: sale.id,
            tenantId: user.tenantId,
          },
          tx,
        );
      }

      // «մարել պարտքը վաճառողից եթե կա»: a return settles the buyer's oldest
      // debts first; only what is left over stays as credit.
      if (isReturn) {
        await this.creditService.apply(
          {
            tenantId: user.tenantId,
            clientId: dto.clientId,
            from: { returnId: sale.id },
            to: { oldestSales: true },
            limit: total,
          },
          tx,
        );
      }

      return sale;
    });
  }

  private async scopeToOwnRound(user: UserWithRole, options: SaleListOptions) {
    if (user.role !== MANAGER_ROLE) return options;
    const manager = await this.managerRepository.findByEmail(
      user.tenantId,
      user.email,
    );
    if (!manager) return { ...options, managerId: -1 };
    return { ...options, managerId: manager.id };
  }

  /** «Միայն մնացորդ ունեցողները» - buyers whose account is not settled. */
  private async clientsWithBalance(tenantId: number): Promise<number[]> {
    const balances = await this.balanceRepository.balancesByTenant(tenantId);
    return [...balances.entries()]
      .filter(([, balance]) => toMinor(balance) > 0n)
      .map(([clientId]) => clientId);
  }

  async findAll(user: UserWithRole, options: SaleListOptions) {
    const scoped = await this.scopeToOwnRound(user, options);
    const [rows, totals] = await Promise.all([
      this.saleRepository.findByTenant(user.tenantId, scoped),
      this.saleRepository.totals(user.tenantId, scoped),
    ]);
    const settled = await this.creditRepository.settledBySale(
      rows.map((row) => row.id),
    );
    let outstandingTotal = 0n;
    const withDebt = rows.map((row) => {
      const settledMinor =
        toMinor(row.paidAmount) + toMinor(settled.get(row.id) ?? '0');
      // For a return, the part not yet spent on the buyer's debt.
      const outstanding = toMinor(row.totalAmount) - settledMinor;
      outstandingTotal += outstanding;
      return {
        ...row,
        settledAmount: fromMinor(settledMinor),
        outstanding: fromMinor(outstanding),
      };
    });
    return {
      rows: withDebt,
      totals: { ...totals, outstanding: fromMinor(outstandingTotal) },
    };
  }

  async resolveFilters(
    user: UserWithRole,
    options: SaleListOptions & { onlyWithBalance?: boolean },
  ): Promise<SaleListOptions> {
    const { onlyWithBalance, ...rest } = options;
    if (!onlyWithBalance) return rest;
    return {
      ...rest,
      clientIdsWithBalance: await this.clientsWithBalance(user.tenantId),
    };
  }

  async findOne(id: number) {
    const sale = await this.saleRepository.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    const [items, allocations] = await Promise.all([
      this.saleRepository.itemsFor(id),
      this.creditRepository.allocationsFor(
        sale.isReturn ? { sourceReturnId: id } : { targetSaleId: id },
      ),
    ]);
    const settled =
      toMinor(sale.paidAmount) +
      allocations.reduce((sum, a) => sum + toMinor(a.amount), 0n);
    return {
      ...sale,
      items,
      allocations,
      settledAmount: fromMinor(settled),
      outstanding: fromMinor(toMinor(sale.totalAmount) - settled),
    };
  }

  /**
   * «Հեռացնել» - unwinds the document: goods go back on the van and the balance
   * movement is reversed.
   *
   * The reversal is a new entry rather than a deletion. Removing ledger rows
   * would leave every later row's before/result chain describing a history that
   * no longer exists, so the account would read a balance its own entries do
   * not add up to.
   */
  async remove(id: number) {
    const sale = await this.saleRepository.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return this.saleRepository.transaction(async (tx) => {
      await this.balanceRepository.lockClient(sale.clientId, tx);
      if (
        sale.isReturn &&
        (await this.creditRepository.isSpentElsewhere({ returnId: id }, tx))
      ) {
        throw new BadRequestException(
          'This return is used by a repayment or refund; remove that first',
        );
      }
      // Payments that settled this sale keep their money as «կանխավճար»; a
      // repayment that settled it shrinks accordingly.
      if (!sale.isReturn) {
        await this.creditRepository.releaseRepaymentsOnSale(id, tx);
      }
      const items = await this.saleRepository.rawItems(id, tx);

      for (const item of items) {
        // Mirror of what create() did: a sale gives stock back, a return takes it.
        const delta = sale.isReturn
          ? -toMilli(item.quantity)
          : toMilli(item.quantity);
        await this.saleItemStock.adjust(
          sale.managerId,
          item.productId,
          fromMilli(delta),
          tx,
        );
      }

      // Everything this document did to the account, including any «վճարում»
      // posted against it afterwards.
      const posted = await this.balanceRepository.entriesForSale(id, tx);
      const net = posted.reduce(
        (sum, entry) => sum + toMinor(entry.amount),
        0n,
      );
      if (net !== 0n) {
        await this.balanceRepository.append(
          {
            clientId: sale.clientId,
            kind: BALANCE_KIND.ADJUSTMENT,
            amount: fromMinor(-net),
            note: `Reversal of ${sale.isReturn ? 'return' : 'sale'} ${
              sale.code
            }`,
            tenantId: sale.tenantId,
          },
          tx,
        );
      }

      // The FK is ON DELETE SET NULL, so those entries survive with their link
      // cleared and the note above is what ties them to the removed document.
      await this.saleRepository.delete(id, tx);
      return { id };
    });
  }

  /**
   * «Կատարել վճարում» - posts a «Վճարում» against this one sale, settling the
   * remainder in full when no amount is given.
   */
  async pay(user: UserWithRole, id: number, dto: PaySaleDto) {
    const sale = await this.saleRepository.findById(id);
    if (!sale || sale.tenantId !== user.tenantId) {
      throw new NotFoundException('Sale not found');
    }
    if (sale.isReturn) {
      throw new BadRequestException('A return cannot be paid');
    }

    const open = await this.creditRepository.openSales(sale.clientId);
    const outstanding = toMinor(
      open.find((row) => row.id === id)?.outstanding ?? '0',
    );
    if (outstanding <= 0n) {
      throw new BadRequestException('This sale is already settled');
    }
    const amount = dto.amount !== undefined ? toMinor(dto.amount) : outstanding;
    if (amount > outstanding) {
      throw new BadRequestException(
        `Payment exceeds the outstanding ${fromMinor(outstanding)}`,
      );
    }

    return this.paymentService.create(user, {
      clientId: sale.clientId,
      managerId: sale.managerId,
      salesZoneId: sale.salesZoneId,
      paymentType: sale.paymentType,
      amount: fromMinor(amount),
      note: dto.note ?? null,
      allocations: [{ saleId: id, amount: fromMinor(amount) }],
    });
  }

  /**
   * «Կատարել մարում» - settles open sales from credit the buyer already has.
   * It never adds to the balance; it only closes debt.
   */
  async settle(user: UserWithRole, dto: SettleClientDto) {
    return this.paymentService.createRepayment(user, {
      clientId: dto.clientId,
      source: dto.source ?? 'PREPAYMENT',
      amount: dto.amount,
      note: dto.note ?? null,
    });
  }

  /**
   * What the add-sale form needs the moment a buyer is picked: their accumulated
   * debt and the date of their last purchase.
   */
  async clientSnapshot(user: UserWithRole, clientId: number) {
    const client = await this.clientRepository.findById(clientId);
    if (!client || client.tenantId !== user.tenantId) {
      throw new NotFoundException('Client not found');
    }
    const [balance, lastPurchase, credit, open] = await Promise.all([
      this.balanceRepository.currentBalance(clientId),
      this.balanceRepository.lastPurchase(clientId),
      this.creditService.available(clientId),
      this.creditRepository.openSales(clientId),
    ]);
    // «Գնորդի ժամկետանց պարտք»: open sales past their payment term.
    const overdue = open
      .filter((sale) => sale.isOverdue)
      .reduce((sum, sale) => sum + toMinor(sale.outstanding), 0n);
    const balanceMinor = toMinor(balance);
    return {
      clientId,
      clientName: client.name,
      priceListId: client.priceListId,
      // Positive is «պարտք», negative is «կանխավճար»; split so the form can show
      // each on its own line the way the ERP does.
      debt: fromMinor(balanceMinor > 0n ? balanceMinor : 0n),
      prepaid: fromMinor(balanceMinor < 0n ? -balanceMinor : 0n),
      balance,
      overdueDebt: fromMinor(overdue),
      paymentType: client.paymentType,
      debtLimit: client.debtLimit,
      overdueDebtLimit: client.overdueDebtLimit,
      // Unspent credit by origin: «Կանխավճար» and «Վերադարձ».
      unusedPrepayment: credit.prepayment,
      unusedReturns: credit.returns,
      lastPurchaseDate: lastPurchase?.documentDate ?? null,
      lastPurchaseAmount: lastPurchase?.totalAmount ?? null,
    };
  }

  async balanceHistory(user: UserWithRole, clientId: number) {
    const client = await this.clientRepository.findById(clientId);
    if (!client || client.tenantId !== user.tenantId) {
      throw new NotFoundException('Client not found');
    }
    return this.balanceRepository.history(clientId);
  }
}
