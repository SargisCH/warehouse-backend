import { Injectable } from '@nestjs/common';
import {
  Payout,
  PayoutType,
  Prisma,
  TransactionStatus,
  TransactionType,
  User,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayoutService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    payoutWhereUniqueInput: Prisma.PayoutWhereUniqueInput,
  ): Promise<Payout | null> {
    return this.prisma.payout.findUnique({
      where: payoutWhereUniqueInput,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PayoutWhereUniqueInput;
    where?: Prisma.PayoutWhereInput;
    orderBy?: Prisma.PayoutOrderByWithRelationInput;
  }): Promise<Payout[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.payout.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { type: true },
    });
  }
  async findAllTypes(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PayoutTypeWhereUniqueInput;
    where?: Prisma.PayoutTypeWhereInput;
    orderBy?: Prisma.PayoutTypeOrderByWithRelationInput;
  }): Promise<PayoutType[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.payoutType.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(data: Prisma.PayoutCreateInput, user: User): Promise<Payout> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    const payout = await this.prisma.payout.create({
      data,
    });
    await this.prisma.balanceHistory.create({
      data: {
        amount: data.amount,
        before: tenant.balance,
        result: tenant.balance - data.amount,
        tenant: { connect: { id: user.tenantId } },
        payout: { connect: { id: payout.id } },
        direction: TransactionType.OUT,
        status: TransactionStatus.FINISHED,
      },
    });
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { balance: tenant.balance - data.amount },
    });
    return payout;
  }
  async createType(data: Prisma.PayoutTypeCreateInput): Promise<PayoutType> {
    return this.prisma.payoutType.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.PayoutWhereUniqueInput;
    data: Prisma.PayoutUpdateInput;
  }): Promise<Payout> {
    const { data, where } = params;
    return this.prisma.payout.update({
      data,
      where,
    });
  }

  async delete(where: Prisma.PayoutWhereUniqueInput): Promise<number> {
    const res = await this.prisma.payout.deleteMany({
      where,
    });
    return res.count;
  }
}
