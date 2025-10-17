import { Module } from '@nestjs/common';

import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DrizzleModule } from '../../drizzle/drizzle.module';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    TenantRepository,
    UserRoleRepository,
  ],
  exports: [UserService],
})
export class UserModule {}
