import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { ProductCategoryController } from './productCategory.controller';
import { ProductCategoryService } from './productCategory.service';

@Module({
  imports: [],
  controllers: [ProductCategoryController],
  providers: [ProductCategoryService, PrismaService],
  exports: [ProductCategoryService],
})
export class ProductCategoryModule {}
