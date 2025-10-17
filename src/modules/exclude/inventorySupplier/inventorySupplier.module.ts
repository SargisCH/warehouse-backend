import { Module } from '@nestjs/common';
import { BalanceHistoryService } from '../balanceHistory/balanceHistory.service';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { InventoryService } from '../inventory/inventory.service';

import { InventorySupplierController } from './inventorySupplier.controller';
import { InventorySupplierService } from './inventorySupplier.service';

@Module({
  imports: [],
  controllers: [InventorySupplierController],
  providers: [
    InventorySupplierService,
    PrismaService,
    UserService,
    BalanceHistoryService,
    InventoryService,
  ],
  exports: [InventorySupplierService],
})
export class InventorySupplierModule {}
