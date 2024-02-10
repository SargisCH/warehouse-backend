import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    clientCategoryWhereUniqueInput: Prisma.ClientWhereUniqueInput,
  ): Promise<Client | null> {
    return this.prisma.client.findUnique({
      where: clientCategoryWhereUniqueInput,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ClientWhereUniqueInput;
    where?: Prisma.ClientWhereInput;
    orderBy?: Prisma.ClientOrderByWithRelationInput;
  }): Promise<Client[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.client.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(data: Prisma.ClientCreateInput): Promise<Client> {
    return this.prisma.client.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.ClientWhereUniqueInput;
    data: Prisma.ClientUpdateInput;
  }): Promise<Client> {
    const { data, where } = params;
    return this.prisma.client.update({
      data,
      where,
    });
  }

  async delete(where: Prisma.ClientWhereUniqueInput): Promise<number> {
    const res = await this.prisma.client.deleteMany({
      where,
    });
    return res.count;
  }
}
