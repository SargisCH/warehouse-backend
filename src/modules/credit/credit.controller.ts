import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  Credit as CreditModel,
  CreditType,
  Manager,
  Prisma,
  Role,
  TransactionStatus,
  TransactionType,
  User,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { WeekDay } from 'src/shared/constants/global.constants';

import { AuthGuard } from '../auth/auth.guard';
import { ManagerService } from '../manager/manager.service';

import { CreditService } from './credit.service';
import { BalanceHistoryService } from '../balanceHistory/balanceHistory.service';
import { UserService } from '../user/user.service';

type CreditApiType = {
  amount: number;
  clientId: number;
  date: string;
  type: CreditType;
  status: TransactionStatus;
};

@ApiTags('credit')
@Controller('/credit')
export class CreditController {
  constructor(
    private creditService: CreditService,
    private managerService: ManagerService,
    private balanceHistoryService: BalanceHistoryService,
    private userService: UserService,
  ) {}

  @Get('/')
  @UseGuards(AuthGuard)
  async getAllCredits(
    @Query() query: { weekDay?: WeekDay; clientId?: number | string },
    @Req() request: Request,
  ): Promise<CreditModel[]> {
    const where: Prisma.CreditWhereInput = {};
    const user = (request as any).user as User;
    let manager: Manager;
    if (user.role === Role.MANAGER) {
      manager = await this.managerService.findFirst({
        email: user.email,
      });

      if (manager) {
        where.client = { managerId: manager.id };
      }
    }

    if (query.weekDay || query.clientId) {
      if (!where.client) {
        where.client = {};
      }
      if (query.clientId) {
        where.clientId = Number(query.clientId);
      }
      if (query.weekDay) {
        const and = [];

        if (manager) {
          and.push({ managerId: manager.id });
        }
        and.push({ dayPlan: { has: query.weekDay } });
        where.client.Schedule = {
          some: {
            AND: and,
          },
        };
      }
    }
    return this.creditService.findAll({ where });
  }

  @Get('/:id')
  async getCreditById(@Param('id') id: string): Promise<CreditModel> {
    return this.creditService.findOne({ id: Number(id) });
  }
  @Post('create')
  async createCredit(
    @Body()
    creditData: CreditApiType,
  ): Promise<CreditModel> {
    return this.creditService.create({
      amount: creditData.amount,
      type: creditData.type,
      status: creditData.status,
      client: {
        connect: {
          id: creditData.clientId,
        },
      },
      date: creditData.date,
    });
  }

  @Put('/:id')
  @UseGuards(AuthGuard)
  async editCredit(
    @Req() request: Request,
    @Param('id') id: string,
    @Body()
    creditData: CreditApiType,
  ): Promise<CreditModel> {
    const user = (request as any).user as User;
    const tenant = await this.userService.findTenant({ id: user.tenantId });
    const creditDB = await this.creditService.findOne({ id: Number(id) });
    const creditCreated = await this.creditService.update({
      where: { id: Number(id) },
      data: {
        amount: creditData.amount,
        type: creditData.type,
        status: creditData.status,
        client: {
          connect: { id: creditData.clientId },
        },
        date: creditData.date,
      },
    });
    if (
      creditDB.status === TransactionStatus.FINISHED &&
      creditDB.status !== creditCreated.status
    ) {
      const toPay = creditData.type === CreditType.TO_PAY;
      await this.userService.updateTenantBalance(
        tenant.id,
        toPay ? TransactionType.OUT : TransactionType.IN,
        creditData.amount,
      );
      await this.balanceHistoryService.create({
        status: TransactionStatus.FINISHED,
        amount: creditData.amount,
        direction: toPay ? TransactionType.OUT : TransactionType.IN,
        before: tenant.balance,
        result: toPay
          ? tenant.balance - creditData.amount
          : tenant.balance + creditData.amount,
        tenant: {
          connect: {
            id: tenant.id,
          },
        },
      });
    }
    return creditCreated;
  }
}
