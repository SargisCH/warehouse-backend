import {
  BadRequestException,
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { SupplyService } from './supply.service';
import { CreateSupplyDto, FindAllSuppliesDto } from './supply.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modules/auth/auth.guard';

import { User } from 'src/drizzle/schema';
import { AuthUser } from '../auth/auth.user.decorator';

@ApiTags('Supplies')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('supplies')
export class SupplyController {
  constructor(private readonly supplyService: SupplyService) {}

  @Get()
  getAll(@Query() findAllSuppliesDto: FindAllSuppliesDto) {
    return this.supplyService.findAll(findAllSuppliesDto);
  }

  @Post()
  create(@AuthUser() user: User, @Body() createSupplyDto: CreateSupplyDto) {
    if (user.tenantId == null)
      throw new BadRequestException('Tenant is required');
    return this.supplyService.create(createSupplyDto, user.tenantId);
  }
}
