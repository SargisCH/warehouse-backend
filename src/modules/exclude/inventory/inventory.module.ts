import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { UserService } from '../user/user.service';

@Module({
  imports: [],
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService, UserService],
  exports: [InventoryService],
})
export class InventoryModule {}
