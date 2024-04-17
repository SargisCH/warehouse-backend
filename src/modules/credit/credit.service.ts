import { Injectable } from '@nestjs/common';
import { Prisma, Credit, User, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    creditWhereUniqueInput: Prisma.CreditWhereUniqueInput,
  ): Promise<Credit | null> {
    return this.prisma.credit.findUnique({
      where: creditWhereUniqueInput,
      include: { sale: true, client: true },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.CreditWhereUniqueInput;
    where?: Prisma.CreditWhereInput;
    orderBy?: Prisma.CreditOrderByWithRelationInput;
  }): Promise<Credit[]> {
    const { skip, take, cursor, where = {}, orderBy } = params;
    // only return the client where the manager assigned to
    return this.prisma.credit.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { sale: true, client: true },
    });
  }
  async create(data: Prisma.CreditCreateInput): Promise<Credit> {
    return this.prisma.credit.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.CreditWhereUniqueInput;
    data: Prisma.CreditUpdateInput;
  }): Promise<Credit> {
    const { data, where } = params;
    return this.prisma.credit.update({
      data,
      where,
    });
  }
}
