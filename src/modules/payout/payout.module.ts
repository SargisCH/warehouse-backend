import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';

@Module({
  imports: [],
  controllers: [PayoutController],
  providers: [PayoutService, PrismaService, UserService],
  exports: [PayoutService],
})
export class PayoutModule {}
