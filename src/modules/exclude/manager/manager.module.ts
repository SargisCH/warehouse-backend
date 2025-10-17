import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';

@Module({
  imports: [],
  controllers: [ManagerController],
  providers: [ManagerService, PrismaService, UserService],
  exports: [ManagerService],
})
export class ManagerModule {}
