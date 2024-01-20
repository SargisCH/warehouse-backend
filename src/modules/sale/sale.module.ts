import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';

@Module({
  imports: [],
  controllers: [SaleController],
  providers: [SaleService, PrismaService],
  exports: [SaleService],
})
export class SaleModule {}
