import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { UnitService } from './unit.service';

@ApiTags('unit')
@Controller('/unit')
export class UnitController {
  constructor(private unitService: UnitService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAll() {
    return this.unitService.findAll();
  }
}
