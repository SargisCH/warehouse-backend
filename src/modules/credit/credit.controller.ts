import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Credit as CreditModel, Prisma } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { CreditService } from './credit.service';

type CreditApiType = {
  amount: number;
  clientId: number;
  date: string;
};

@ApiTags('credit')
@Controller('/credit')
export class CreditController {
  constructor(private creditService: CreditService) {}

  @Get('/')
  async getAllCredits(): Promise<CreditModel[]> {
    return this.creditService.findAll({});
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
