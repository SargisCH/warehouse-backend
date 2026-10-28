import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { ClientRepository } from 'src/repositories/client.repository';
import { ClientGroupsRepository } from 'src/repositories/client_groups.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import { SalesZoneRepository } from 'src/repositories/sales_zone.repository';
import { PriceListRepository } from 'src/repositories/price_list.repository';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserService } from '../user/user.service';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [ClientController],
  providers: [
    ClientRepository,
    ClientGroupsRepository,
    ManagerRepository,
    SalesZoneRepository,
    PriceListRepository,
    ClientService,
    UserService,
    UserRoleRepository,
    UserRepository,
    TenantRepository,
  ],
  exports: [ClientService],
})
export class ClientModule {}
