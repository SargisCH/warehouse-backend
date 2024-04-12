import { Controller, Get } from '@nestjs/common';
import { BalanceHistory as BalanceHistoryModel, User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';

import { BalanceHistoryService } from './balanceHistory.service';

@ApiTags('balanceHistory')
@Controller('/balanceHistory')
export class BalanceHistoryController {
  constructor(private balanceHistoryService: BalanceHistoryService) {}

  @Get('/')
  async getAllBalanceHistory(): Promise<BalanceHistoryModel[]> {
    return this.balanceHistoryService.findAll({});
  }
}
