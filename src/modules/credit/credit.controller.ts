import { Controller, Get, Param } from '@nestjs/common';
import { Credit as CreditModel } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { CreditService } from './credit.service';

@ApiTags('credit')
@Controller('/credit')
export class CreditController {
  constructor(private creditService: CreditService) {}

  @Get('/')
  async getAllCredits(): Promise<CreditModel[]> {
    return this.creditService.findAll({});
  }

  @Get('/:id')
  async getCreditById(@Param('id') id: string): Promise<CreditModel> {
    return this.creditService.findOne({ id: Number(id) });
  }
}
