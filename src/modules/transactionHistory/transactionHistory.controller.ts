import { Controller, Get, Param } from '@nestjs/common';
import { TransactionHistory as TransactionHistoryModel } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { TransactionHistoryService } from './transactionHistory.service';

@ApiTags('transactionHistory')
@Controller('/transactionHistory')
export class TransactionHistoryController {
  constructor(private transactionHistoryService: TransactionHistoryService) {}

  @Get('/')
  async getAllTransactionHistory(): Promise<TransactionHistoryModel[]> {
    return this.transactionHistoryService.findAll({});
  }

  @Get('/:id')
  async getTransactionHistoryById(
    @Param('id') id: string,
  ): Promise<TransactionHistoryModel> {
    return this.transactionHistoryService.findOne({ id: Number(id) });
  }
}
