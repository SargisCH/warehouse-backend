import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

import { InventorySupplierController } from './inventorySupplier.controller';
import { InventorySupplierService } from './inventorySupplier.service';

@Module({
  imports: [],
  controllers: [InventorySupplierController],
  providers: [InventorySupplierService, PrismaService, UserService],
  exports: [InventorySupplierService],
})
export class InventorySupplierModule {}
