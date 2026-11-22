import { Module } from '@nestjs/common';

import { DrizzleModule } from '../../drizzle/drizzle.module';
import { ProductController } from './product.controller';
import { ProductRepository } from 'src/repositories/product.repository';
import { ProductService } from './product.service';
import { UserService } from '../user/user.service';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

import { StockHistoryRepository } from 'src/repositories/stock_history.repository';
import { StockHistoryController } from './stock_history.controller';

@Module({
  imports: [DrizzleModule],
  controllers: [ProductController, StockHistoryController],
  providers: [
    ProductRepository,
    StockHistoryRepository,
    ProductService,
    UserRepository,
    UserService,
    TenantRepository,
    UserRoleRepository,
  ],
  exports: [ProductService],
})
export class ProductModule {}
