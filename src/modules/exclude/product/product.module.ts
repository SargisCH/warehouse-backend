import { Module } from '@nestjs/common';
import { ProductRepository } from 'src/repositories/product.repository';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService],
})
export class ProductModule {}
