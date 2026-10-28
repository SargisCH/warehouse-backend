import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { SalesZoneRepository } from 'src/repositories/sales_zone.repository';
import { ClientGroupsRepository } from 'src/repositories/client_groups.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import { ClientRepository } from 'src/repositories/client.repository';
import { SalesZoneService } from './sales_zone.service';
import { SalesZoneController } from './sales_zone.controller';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserService } from '../user/user.service';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [SalesZoneController],
  providers: [
    SalesZoneRepository,
    ClientGroupsRepository,
    ManagerRepository,
    ClientRepository,
    SalesZoneService,
    UserService,
    UserRoleRepository,
    UserRepository,
    TenantRepository,
  ],
  exports: [SalesZoneService],
})
export class SalesZoneModule {}
