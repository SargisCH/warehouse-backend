import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';

@Module({
  imports: [],
  controllers: [UnitController],
  providers: [UnitService, PrismaService, UserService],
  exports: [UnitService],
})
export class UnitModule {}
