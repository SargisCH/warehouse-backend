import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserService } from '../user/user.service';
import { JWT_SECRET } from '../../shared/constants/global.constants';

import { JwtStrategy } from './auth.jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
    }),
    DrizzleModule,
  ],
  providers: [
    UserService,
    AuthService,
    JwtStrategy,
    UserRepository,
    TenantRepository,
    UserRoleRepository,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
