import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [],
  controllers: [InventoryController],
  providers: [InventoryController, PrismaService],
  exports: [InventoryService],
})
export class InventoryModule {}
