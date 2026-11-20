import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { ClientRepository } from 'src/repositories/client.repository';
import { ManagerCashRepository } from 'src/repositories/managerCash.repository';
import { ManagerCashController } from './managerCash.controller';
import { ReportRepository } from 'src/repositories/report.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';
import { UserService } from '../user/user.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [DrizzleModule],
  controllers: [ReportController, ManagerCashController],
  providers: [
    ReportRepository,
    ManagerCashRepository,
    ClientRepository,
    ReportService,
    UserService,
    UserRoleRepository,
    UserRepository,
    TenantRepository,
  ],
})
export class ReportModule {}
