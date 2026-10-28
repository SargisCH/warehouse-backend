import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { SaleRepository } from 'src/repositories/sale.repository';
import { ManagerStockRepository } from 'src/repositories/manager_stock.repository';
import { PriceListRepository } from 'src/repositories/price_list.repository';
import { BalanceRepository } from 'src/repositories/balance.repository';
import { ClientRepository } from 'src/repositories/client.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import { ProductRepository } from 'src/repositories/product.repository';
import { CreditRepository } from 'src/repositories/credit.repository';
import { PaymentRepository } from 'src/repositories/payment.repository';
import { CreditService } from '../payment/credit.service';
import { PaymentService } from '../payment/payment.service';
import { SaleService } from './sale.service';
import { PriceListService } from './price_list.service';
import { SaleController } from './sale.controller';
import { PriceListController } from './price_list.controller';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserService } from '../user/user.service';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [SaleController, PriceListController],
  providers: [
    SaleRepository,
    ManagerStockRepository,
    PriceListRepository,
    BalanceRepository,
    ClientRepository,
    ManagerRepository,
    ProductRepository,
    CreditRepository,
    PaymentRepository,
    CreditService,
    PaymentService,
    SaleService,
    PriceListService,
    UserService,
    UserRoleRepository,
    UserRepository,
    TenantRepository,
  ],
  exports: [SaleService, PriceListService],
})
export class SaleModule {}
