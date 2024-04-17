import { Module } from '@nestjs/common';
import { ManagerService } from '../manager/manager.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { BalanceHistoryService } from '../balanceHistory/balanceHistory.service';

import { TransactionHistoryController } from './transactionHistory.controller';
import { TransactionHistoryService } from './transactionHistory.service';

@Module({
  imports: [],
  controllers: [TransactionHistoryController],
  providers: [
    TransactionHistoryService,
    PrismaService,
    UserService,
    ManagerService,
    BalanceHistoryService,
  ],
  exports: [TransactionHistoryService],
})
export class TransactionHistoryModule {}
