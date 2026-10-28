import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { BalanceRepository } from 'src/repositories/balance.repository';
import { ClientRepository } from 'src/repositories/client.repository';
import { CreditRepository } from 'src/repositories/credit.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import { PaymentRepository } from 'src/repositories/payment.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';
import { UserService } from '../user/user.service';
import { CreditService } from './credit.service';
import { PaymentController, RepaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [DrizzleModule],
  controllers: [PaymentController, RepaymentController],
  providers: [
    PaymentRepository,
    CreditRepository,
    BalanceRepository,
    ClientRepository,
    ManagerRepository,
    CreditService,
    PaymentService,
    UserService,
    UserRoleRepository,
    UserRepository,
    TenantRepository,
  ],
  exports: [PaymentService, CreditService],
})
export class PaymentModule {}
