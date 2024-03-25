import { Injectable } from '@nestjs/common';
import { Prisma, TransactionHistory } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionHistoryService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    transactionHistoryWhereUniqueInput: Prisma.TransactionHistoryWhereUniqueInput,
  ): Promise<TransactionHistory | null> {
    return this.prisma.transactionHistory.findUnique({
      where: transactionHistoryWhereUniqueInput,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.TransactionHistoryWhereUniqueInput;
    where?: Prisma.TransactionHistoryWhereInput;
    orderBy?: Prisma.TransactionHistoryOrderByWithRelationInput;
  }): Promise<TransactionHistory[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.transactionHistory.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { sale: true, client: true, inventorySupplier: true },
    });
  }
  async create(
    data: Prisma.TransactionHistoryCreateInput,
  ): Promise<TransactionHistory> {
    return this.prisma.transactionHistory.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.TransactionHistoryWhereUniqueInput;
    data: Prisma.TransactionHistoryUpdateInput;
  }): Promise<TransactionHistory> {
    const { data, where } = params;
    return this.prisma.transactionHistory.update({
      data,
      where,
    });
  }

  async handleBalanceUpdate(
    tenantId: number,
    transactionAmount: number,
  ): Promise<void> {
    console.log('handle balance update', tenantId, transactionAmount);
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        balance: {
          increment: transactionAmount,
        },
      },
    });
  }
}
