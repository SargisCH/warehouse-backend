import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { SupplierRepository } from 'src/repositories/supplier.repository';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserService } from '../user/user.service';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [SupplierController],
  providers: [
    SupplierRepository,
    SupplierService,
    UserService,
    UserRoleRepository,
    UserRepository,
    TenantRepository,
  ],
  exports: [SupplierService],
})
export class SupplierModule {}
