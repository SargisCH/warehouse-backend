import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { ManagerService } from '../manager/manager.service';

import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';

@Module({
  imports: [],
  controllers: [CreditController],
  providers: [CreditService, PrismaService, UserService, ManagerService],
  exports: [CreditService],
})
export class CreditModule {}
