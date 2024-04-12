import { Injectable } from '@nestjs/common';
import { BalanceHistory, Prisma, User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BalanceHistoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.BalanceHistoryWhereUniqueInput;
    where?: Prisma.BalanceHistoryWhereInput;
    orderBy?: Prisma.BalanceHistoryOrderByWithRelationInput;
  }): Promise<BalanceHistory[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.balanceHistory.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { inventorySupplier: true, client: true },
    });
  }

  async create(
    data: Prisma.BalanceHistoryCreateInput,
  ): Promise<BalanceHistory> {
    return this.prisma.balanceHistory.create({
      data,
    });
  }
}
