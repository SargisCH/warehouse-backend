import { Injectable } from '@nestjs/common';
import { Client, Prisma, Role, User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ClientDTO } from './client.dto';

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

  async findAll(
    params: {
      skip?: number;
      take?: number;
      cursor?: Prisma.ClientWhereUniqueInput;
      where?: Prisma.ClientWhereInput;
      orderBy?: Prisma.ClientOrderByWithRelationInput;
    },
    user: User,
  ): Promise<Client[]> {
    const { skip, take, cursor, where = {}, orderBy } = params;
    // only return the client where the manager assigned to

    if (user.role === Role.MANAGER) {
      const manager = await this.prisma.manager.findFirstOrThrow({
        where: { email: user.email },
      });

      if (manager.id) {
        where.managerId = manager.id;
      }
    }
    return this.prisma.client.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(data: ClientDTO, tenantId: number): Promise<Client> {
    const clientCreateData = { ...data };
    delete clientCreateData.dayPlan;
    delete clientCreateData.managerId;
    const updateQuery: Prisma.ClientCreateInput = {
      ...clientCreateData,
      tenant: { connect: { id: tenantId } },
    };

    if (data.managerId) {
      updateQuery.manager = { connect: { id: Number(data.managerId) ?? null } };
    }
    const client = await this.prisma.client.create({
      data: updateQuery,
    });

    if (data.managerId) {
      await this.prisma.schedule.create({
        data: {
          managerId: data.managerId,
          clientId: client.id,
          dayPlan: data.dayPlan,
        },
      });
    }
    return client;
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
