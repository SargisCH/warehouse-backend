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
  Manager,
  Prisma,
  Role,
  User,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { WeekDay } from 'src/shared/constants/global.constants';

import { AuthGuard } from '../auth/auth.guard';
import { ManagerService } from '../manager/manager.service';

import { CreditService } from './credit.service';

type CreditApiType = {
  amount: number;
  clientId: number;
  date: string;
};

@ApiTags('credit')
@Controller('/credit')
export class CreditController {
  constructor(
    private creditService: CreditService,
    private managerService: ManagerService,
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
      client: {
        connect: {
          id: creditData.clientId,
        },
      },
      date: creditData.date,
    });
  }

  @Put('/:id')
  async editCredit(
    @Param('id') id: string,
    @Body()
    creditData: CreditApiType,
  ): Promise<CreditModel> {
    return this.creditService.update({
      where: { id: Number(id) },
      data: {
        amount: creditData.amount,
        client: {
          connect: { id: creditData.clientId },
        },
        date: creditData.date,
      },
    });
  }
}
