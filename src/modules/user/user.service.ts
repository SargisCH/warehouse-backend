import { Inject, Injectable } from '@nestjs/common';
import AWS_SDK from 'aws-sdk';

import * as schema from '../../drizzle/schema';

import { RegisterUserDTO } from '../auth/auth.dto';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { users, tenant as tenantTable, userRole } from 'src/drizzle/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Injectable()
export class UserService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    private userRepository: UserRepository,
    private tenantRepository: TenantRepository,
    private userRoleRepository: UserRoleRepository,
  ) {}

  async findUser(where: { email?: string }) {
    return this.userRepository.find({ email: where.email });
  }
  //
  // async findTenant(
  //   tenantWhereUniqueInput: Prisma.TenantWhereUniqueInput,
  // ): Promise<Tenant | null> {
  //   return this.prisma.tenant.findUnique({
  //     where: tenantWhereUniqueInput,
  //   });
  // }

  async users(params: {
    skip?: any;
    take?: any;
    cursor?: any;
    where?: any;
    orderBy?: any;
  }) {
    // const { skip, take, cursor, where, orderBy } = params;
    return this.db.query.users.findMany({});
  }

  async createUser(data: RegisterUserDTO) {
    const cognito = new AWS_SDK.CognitoIdentityServiceProvider({
      region: 'us-east-1',
    });

    const params = {
      ClientId: 'ngltvt3dbqp86piipjoeic9cc', // tenant client id
      Username: data.email,
      Password: data.password,
    };
    try {
      const queryResult = await this.tenantRepository.create({
        name: data.companyName,
      });
    } catch (e) {
      console.log(e);
    }

    const tenant = await this.tenantRepository.find({ name: data.companyName });
    if (tenant) {
      console.log('tenant', tenant);
    }
    await cognito.signUp(params).promise();
    const role = await this.userRoleRepository.find({ name: 'Admin' });
    const res = await this.userRepository.create({
      email: data.email,
      password: data.password,
      companyName: data.companyName,
      roleId: role.id,
      tenantId: tenant.id,
    });
    const user = await this.userRepository.find({ email: data.email });
    delete user.password;
    return { ...user };
  }
  //
  // async updateUser(params: {
  //   where: Prisma.UserWhereUniqueInput;
  //   data: Prisma.UserUpdateInput;
  // }): Promise<User> {
  //   const { where, data } = params;
  //   return this.prisma.user.update({
  //     data,
  //     where,
  //   });
  // }
  //
  // async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
  //   return this.prisma.user.delete({
  //     where,
  //   });
  // }
  // async updateTenantBalance(
  //   tenantId: number,
  //   direction: TransactionType,
  //   amount: number,
  // ): Promise<void> {
  //   if (direction === TransactionType.IN) {
  //     await this.prisma.tenant.update({
  //       where: {
  //         id: tenantId,
  //       },
  //       data: {
  //         balance: { increment: amount },
  //       },
  //     });
  //   } else {
  //     await this.prisma.tenant.update({
  //       where: {
  //         id: tenantId,
  //       },
  //       data: {
  //         balance: { decrement: amount },
  //       },
  //     });
  //   }
  // }
}
