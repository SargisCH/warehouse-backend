import { Injectable } from '@nestjs/common';
import { Prisma, Credit } from '@prisma/client';

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
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.credit.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { sale: true, client: true },
    });
  }
}
