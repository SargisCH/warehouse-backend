import { Injectable } from '@nestjs/common';
import { Unit, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    unitWhereUniqueInput: Prisma.UnitWhereUniqueInput,
  ): Promise<Unit | null> {
    return this.prisma.unit.findUnique({
      where: unitWhereUniqueInput,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UnitWhereUniqueInput;
    where?: Prisma.UnitWhereInput;
    orderBy?: Prisma.UnitOrderByWithRelationInput;
  }): Promise<Unit[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.unit.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(data: Prisma.UnitCreateInput): Promise<Unit> {
    return this.prisma.unit.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.UnitWhereUniqueInput;
    data: Prisma.UnitUpdateInput;
  }): Promise<Unit> {
    const { data, where } = params;
    return this.prisma.unit.update({
      data,
      where,
    });
  }

  async delete(where: Prisma.UnitWhereUniqueInput): Promise<number> {
    const res = await this.prisma.unit.deleteMany({
      where,
    });
    return res.count;
  }
}
