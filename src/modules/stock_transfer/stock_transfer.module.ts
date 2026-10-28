import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { InventoryRepository } from 'src/repositories/inventory.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import { ManagerStockRepository } from 'src/repositories/manager_stock.repository';
import { PriceListRepository } from 'src/repositories/price_list.repository';
import { StockTransferRepository } from 'src/repositories/stock_transfer.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';
import { WarehouseRepository } from 'src/repositories/warehouse.repository';
import { UserService } from '../user/user.service';
import { StockTransferController } from './stock_transfer.controller';
import { StockTransferService } from './stock_transfer.service';

@Module({
  imports: [DrizzleModule],
  controllers: [StockTransferController],
  providers: [
    StockTransferRepository,
    InventoryRepository,
    ManagerStockRepository,
    ManagerRepository,
    WarehouseRepository,
    PriceListRepository,
    StockTransferService,
    UserService,
    UserRoleRepository,
    UserRepository,
    TenantRepository,
  ],
})
export class StockTransferModule {}
