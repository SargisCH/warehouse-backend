import { Module } from '@nestjs/common';

import { DrizzleModule } from '../../drizzle/drizzle.module';
import { UnitRepository } from 'src/repositories/unit.repository';
import { UnitService } from './unit.service';
import { UnitController } from './unit.controller';
import { AuthGuard } from '../auth/auth.guard';
import { UserService } from '../user/user.service';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [UnitController],
  providers: [
    UnitRepository,
    UnitService,
    UserService,
    UserRepository,
    TenantRepository,
    UserRoleRepository,
  ],
  exports: [UnitService],
})
export class UnitModule {}
