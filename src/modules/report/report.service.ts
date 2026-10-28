import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from 'src/drizzle/schema';
import { ClientRepository } from 'src/repositories/client.repository';
import { ReportRepository } from 'src/repositories/report.repository';
import {
  fromMilli,
  fromMinor,
  toMilli,
  toMinor,
  today,
} from 'src/shared/helpers/money';
import {
  BalancesQueryDto,
  ClientStatementQueryDto,
  ManagerStockQueryDto,
  SalesAnalysisQueryDto,
  SalesComparisonDto,
} from './report.dto';

const sumMoney = (rows: any[], key: string) =>
  fromMinor(rows.reduce((sum, row) => sum + toMinor(row[key] ?? '0'), 0n));
const sumQuantity = (rows: any[], key: string) =>
  fromMilli(rows.reduce((sum, row) => sum + toMilli(row[key] ?? '0'), 0n));

@Injectable()
export class ReportService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly clientRepository: ClientRepository,
  ) {}

  private assertRange(from: string, to: string) {
    if (from > to) {
      throw new BadRequestException('The period starts after it ends');
    }
  }

  async salesAnalysis(user: User, query: SalesAnalysisQueryDto) {
    const { dateFrom, dateTo, ...filters } = query;
    this.assertRange(dateFrom, dateTo);
    const rows = await this.reportRepository.salesAnalysis(
      user.tenantId,
      dateFrom,
      dateTo,
      filters,
    );
    return {
      rows,
      totals: {
        quantity: sumQuantity(rows, 'quantity'),
        amount: sumMoney(rows, 'amount'),
      },
    };
  }

  async salesComparison(user: User, dto: SalesComparisonDto) {
    const {
      periods,
      groupBy,
      measures,
      includeZeroRows,
      sortBy,
      explodeKits,
      ...filters
    } = dto;
    periods.forEach((period) => this.assertRange(period.from, period.to));
    const rows = await this.reportRepository.salesComparison(
      user.tenantId,
      periods,
      [...new Set(groupBy)],
      [...new Set(measures)],
      filters,
      includeZeroRows ?? false,
      sortBy ?? 'label',
      explodeKits ?? false,
    );
    // Footer: one total per value column.
    const totals: Record<string, string> = {};
    periods.forEach((_, index) =>
      measures.forEach((measure) => {
        const key = `${measure}${index + 1}`;
        totals[key] =
          measure === 'quantity' ? sumQuantity(rows, key) : sumMoney(rows, key);
      }),
    );
    return { periods, groupBy, measures, rows, totals };
  }

  /**
   * «Քաղվածք»: each movement carries the running balance after it, starting
   * from what the buyer owed the day the period opens.
   */
  async clientStatement(user: User, query: ClientStatementQueryDto) {
    this.assertRange(query.dateFrom, query.dateTo);
    const client = await this.clientRepository.findById(query.clientId);
    if (!client || client.tenantId !== user.tenantId) {
      throw new BadRequestException('Client not found');
    }
    const { opening, movements } = await this.reportRepository.clientStatement(
      query.clientId,
      query.dateFrom,
      query.dateTo,
    );
    let running = toMinor(opening);
    let debit = 0n;
    let credit = 0n;
    const rows = movements.map((movement: any) => {
      const amount = toMinor(movement.amount);
      running += amount;
      if (amount > 0n) debit += amount;
      else credit -= amount;
      return {
        ...movement,
        debit: fromMinor(amount > 0n ? amount : 0n),
        credit: fromMinor(amount < 0n ? -amount : 0n),
        balance: fromMinor(running),
      };
    });
    return {
      client: { id: client.id, code: client.code, name: client.name },
      opening,
      rows,
      totals: { debit: fromMinor(debit), credit: fromMinor(credit) },
      closing: fromMinor(running),
    };
  }

  async clientBalances(user: User, query: BalancesQueryDto) {
    const { date = today(), ...filters } = query;
    const rows = await this.reportRepository.clientBalances(
      user.tenantId,
      date,
      filters,
    );
    // Split the signed balance the way the ERP columns show it.
    const split = rows.map((row: any) => {
      const balance = toMinor(row.balance);
      return {
        ...row,
        debt: fromMinor(balance > 0n ? balance : 0n),
        prepayment: fromMinor(balance < 0n ? -balance : 0n),
      };
    });
    return {
      date,
      rows: split,
      totals: {
        balance: sumMoney(split, 'balance'),
        debt: sumMoney(split, 'debt'),
        prepayment: sumMoney(split, 'prepayment'),
      },
    };
  }

  async managerBalances(user: User, query: BalancesQueryDto) {
    const date = query.date ?? today();
    const rows = await this.reportRepository.managerBalances(
      user.tenantId,
      date,
    );
    return { date, rows, totals: { balance: sumMoney(rows, 'balance') } };
  }

  async managerStock(user: User, query: ManagerStockQueryDto) {
    const rows = await this.reportRepository.managerStock(user.tenantId, query);
    return { rows, totals: { quantity: sumQuantity(rows, 'quantity') } };
  }
}
