import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

import { BalanceHistoryController } from './balanceHistory.controller';
import { BalanceHistoryService } from './balanceHistory.service';

@Module({
  imports: [],
  controllers: [BalanceHistoryController],
  providers: [BalanceHistoryService, PrismaService, UserService],
  exports: [BalanceHistoryService],
})
export class BalanceHistory {}
