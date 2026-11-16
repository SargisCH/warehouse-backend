import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser } from '../auth/auth.user.decorator';
import { User } from 'src/drizzle/schema';
import { UnitDTO } from './unit.dto';
import { UnitService } from './unit.service';

@ApiTags('unit')
@Controller('/unit')
export class UnitController {
  constructor(private unitService: UnitService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  create(@AuthUser() user: User & { role?: string }, @Body() dto: UnitDTO) {
    return this.unitService.create(user, dto);
  }

  @Get()
  @UseGuards(AuthGuard)
  async getAll() {
    return this.unitService.findAll();
  }
}
