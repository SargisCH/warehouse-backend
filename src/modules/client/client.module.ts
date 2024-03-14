import { Module } from '@nestjs/common';
import { ManagerService } from '../manager/manager.service';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [],
  controllers: [ClientController],
  providers: [ClientService, PrismaService, UserService, ManagerService],
  exports: [ClientService],
})
export class ClientModule {}
