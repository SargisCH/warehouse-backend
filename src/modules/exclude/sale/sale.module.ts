import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { ManagerService } from '../manager/manager.service';
import { BalanceHistoryService } from '../balanceHistory/balanceHistory.service';

import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';

@Module({
  imports: [],
  controllers: [SaleController],
  providers: [
    SaleService,
    PrismaService,
    UserService,
    ManagerService,
    BalanceHistoryService,
  ],
  exports: [SaleService],
})
export class SaleModule {}
