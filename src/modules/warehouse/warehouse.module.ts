import { Module } from '@nestjs/common';

import { DrizzleModule } from '../../drizzle/drizzle.module';
import { WarehouseRepository } from 'src/repositories/warehouse.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';
import { WarehouseService } from './warehouse.service';
import { UserService } from './../user/user.service';
import { AuthService } from './../auth/auth.service';
import { WarehouseController } from './warehouse.controller';

@Module({
  imports: [DrizzleModule],
  controllers: [WarehouseController],
  providers: [WarehouseRepository, WarehouseService, UserService, UserRepository, TenantRepository, UserRoleRepository],
  exports: [WarehouseService],
})
export class WarehouseModule {}
