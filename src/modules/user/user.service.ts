import { Prisma, Role, User } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import AWS_SDK from 'aws-sdk';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDTO } from '../auth/auth.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUser(data: RegisterUserDTO): Promise<User> {
    const cognito = new AWS_SDK.CognitoIdentityServiceProvider({
      region: 'us-east-1',
    });

    const params = {
      ClientId: 'ngltvt3dbqp86piipjoeic9cc', // tenant client id
      Username: data.email,
      Password: data.password,
    };
    const tenant = await this.prisma.tenant.create({
      data: { name: data.companyName },
    });
    await cognito.signUp(params).promise();
    return this.prisma.user.create({
      data: { ...data, tenantId: tenant.id, role: Role.ADMIN },
    });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({
      data,
      where,
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    });
  }
}
