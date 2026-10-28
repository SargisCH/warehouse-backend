import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { ClientGroupsRepository } from 'src/repositories/client_groups.repository';
import { SalesZoneRepository } from 'src/repositories/sales_zone.repository';
import { ClientGroupsService } from './client_groups.service';
import { ClientGroupsController } from './client_groups.controller';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserService } from '../user/user.service';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [ClientGroupsController],
  providers: [
    ClientGroupsRepository,
    SalesZoneRepository,
    ClientGroupsService,
    UserService,
    UserRoleRepository,
    UserRepository,
    TenantRepository,
  ],
  exports: [ClientGroupsService],
})
export class ClientGroupsModule {}
