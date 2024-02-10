import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [],
  controllers: [ClientController],
  providers: [ClientService, PrismaService],
  exports: [ClientService],
})
export class ClientModule {}
