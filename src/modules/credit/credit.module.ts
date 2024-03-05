import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';

@Module({
  imports: [],
  controllers: [CreditController],
  providers: [CreditService, PrismaService],
  exports: [CreditService],
})
export class CreditModule {}
