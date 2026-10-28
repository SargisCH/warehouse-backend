import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { SupplyRepository } from 'src/repositories/supply.repository';
import { InventoryRepository } from 'src/repositories/inventory.repository';
import { PriceListRepository } from 'src/repositories/price_list.repository';
import { SupplyService } from './supply.service';
import { SupplyController } from './supply.controller';
import { UserService } from '../user/user.service';
import { UserRoleRepository } from 'src/repositories/userRole.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRepository } from 'src/repositories/user.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [SupplyController],
  providers: [
    SupplyRepository,
    InventoryRepository,
    PriceListRepository,
    SupplyService,
    UserService,
    UserRepository,
    UserRoleRepository,
    TenantRepository,
  ],
  exports: [SupplyService],
})
export class SupplyModule {}
