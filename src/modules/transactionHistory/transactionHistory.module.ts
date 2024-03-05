import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { TransactionHistoryController } from './transactionHistory.controller';
import { TransactionHistoryService } from './transactionHistory.service';

@Module({
  imports: [],
  controllers: [TransactionHistoryController],
  providers: [TransactionHistoryService, PrismaService],
  exports: [TransactionHistoryService],
})
export class TransactionHistoryModule {}
