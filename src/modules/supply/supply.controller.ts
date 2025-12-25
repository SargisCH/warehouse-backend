import {
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
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.supplyService.create(createSupplyDto);
  }
}
