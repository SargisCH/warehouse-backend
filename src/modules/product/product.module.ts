import { Module } from '@nestjs/common';

import { DrizzleModule } from '../../drizzle/drizzle.module';
import { ProductController } from './product.controller';
import { ProductRepository } from 'src/repositories/product.repository';
import { ProductService } from './product.service';
import { UserService } from '../user/user.service';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [ProductController],
  providers: [
    ProductRepository,
    ProductService,
    UserRepository,
    UserService,
    TenantRepository,
    UserRoleRepository,
  ],
  exports: [ProductService],
})
export class ProductModule {}
