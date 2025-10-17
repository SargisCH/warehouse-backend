import { Module } from '@nestjs/common';

import { DrizzleModule } from '../../drizzle/drizzle.module';
import { ProductGroupsRepository } from 'src/repositories/product_groups.repository';
import { ProductGroupsService } from './product_groups.service';
import { ProductGroupsController } from './product_groups.controller';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';
import { UserService } from '../user/user.service';

@Module({
  imports: [DrizzleModule],
  controllers: [ProductGroupsController],
  providers: [
    ProductGroupsRepository,
    ProductGroupsService,
    UserRepository,
    TenantRepository,
    UserRoleRepository,
    UserService,
  ],
  exports: [ProductGroupsService],
})
export class ProductGroupsModule {}
