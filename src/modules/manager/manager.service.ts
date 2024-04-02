import { Injectable } from '@nestjs/common';
import { Manager, Prisma, Role, Schedule, User } from '@prisma/client';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ManagerService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    managerWhereUniqueInput: Prisma.ManagerWhereUniqueInput,
  ): Promise<Manager | null> {
    return this.prisma.manager.findUnique({
      where: managerWhereUniqueInput,
      include: { schedule: { include: { client: true } } },
    });
  }

  async findFirst(
    managerWhereInput: Prisma.ManagerWhereInput,
  ): Promise<Manager | null> {
    return this.prisma.manager.findFirst({
      where: managerWhereInput,
    });
  }

  async findSchedule(
    managerId: number,
    clientId: number,
  ): Promise<Schedule | null> {
    return this.prisma.schedule.findUnique({
      where: { managerId_clientId: { managerId, clientId } },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ManagerWhereUniqueInput;
    where?: Prisma.ManagerWhereInput;
    orderBy?: Prisma.ManagerOrderByWithRelationInput;
  }): Promise<Manager[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.manager.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(data: Prisma.ManagerCreateInput, user: User): Promise<Manager> {
    const cognito = new CognitoIdentityServiceProvider({
      region: 'us-east-1',
    });

    const params = {
      UserPoolId: 'us-east-1_QsJSsFk4H',
      Username: data.email,
      DesiredDeliveryMediums: ['EMAIL'],
      TemporaryPassword: 'WTest123!',
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        {
          Name: 'email',
          Value: data.email,
        },
        {
          Name: 'name',
          Value: data.name,
        },
      ],
    };

    await cognito.adminCreateUser(params).promise();
    console.log('aws created');
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    console.log('tenant', JSON.stringify(tenant));

    await this.prisma.user.create({
      data: {
        email: data.email,
        companyName: tenant.name,
        tenantId: user.tenantId,
        password: 'WTest123!',
        role: Role.MANAGER,
      },
    });
    console.log('user created');
    return this.prisma.manager.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.ManagerWhereUniqueInput;
    data: Prisma.ManagerUpdateInput;
  }): Promise<Manager> {
    const { data, where } = params;
    return this.prisma.manager.update({
      data,
      where,
    });
  }

  async delete(where: Prisma.ManagerWhereUniqueInput): Promise<number> {
    const res = await this.prisma.manager.deleteMany({
      where,
    });
    return res.count;
  }
}
