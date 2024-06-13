import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

import { ProductCategoryController } from './productCategory.controller';
import { ProductCategoryService } from './productCategory.service';

@Module({
  imports: [],
  controllers: [ProductCategoryController],
  providers: [ProductCategoryService, PrismaService, UserService],
  exports: [ProductCategoryService],
})
export class ProductCategoryModule {}
