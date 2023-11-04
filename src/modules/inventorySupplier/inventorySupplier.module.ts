import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { InventorySupplierController } from './inventorySupplier.controller';
import { InventorySupplierService } from './inventorySupplier.service';

@Module({
  imports: [],
  controllers: [InventorySupplierController],
  providers: [InventorySupplierService, PrismaService],
  exports: [InventorySupplierService],
})
export class InventorySupplierModule {}
