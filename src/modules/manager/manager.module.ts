import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { ManagerRepository } from 'src/repositories/manager.repository';
import { ClientRepository } from 'src/repositories/client.repository';
import { SalesZoneRepository } from 'src/repositories/sales_zone.repository';
import { ManagerService } from './manager.service';
import { ManagerController } from './manager.controller';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserService } from '../user/user.service';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [ManagerController],
  providers: [
    ManagerRepository,
    ClientRepository,
    SalesZoneRepository,
    ManagerService,
    UserService,
    UserRoleRepository,
    UserRepository,
    TenantRepository,
  ],
  exports: [ManagerService],
})
export class ManagerModule {}
