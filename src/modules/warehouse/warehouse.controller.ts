import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';
import { WarehouseDTO } from './warehouse.dto';

import { WarehouseService } from './warehouse.service';

@ApiTags('warehouse')
@Controller('/warehouses')
export class WarehouseController {
  constructor(private warehouseService: WarehouseService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAll() {
    return this.warehouseService.findAll();
  }

  @Post('/create')
  @ApiOperation({ description: 'Create a warehouse' })
  @ApiBody({ type: WarehouseDTO })
  @UseGuards(AuthGuard)
  async create(@Body() warehouse: WarehouseDTO) {
    return this.warehouseService.create(warehouse);
  }

  @Get(':id')
  @ApiOperation({ description: 'Get specific warehouse' })
  @UseGuards(AuthGuard)
  async get(@Param('id') id: string) {
    return this.warehouseService.findOne(Number(id));
  }
  @Put(':id')
  @ApiOperation({ description: 'Update warehouse' })
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() warehouse: WarehouseDTO) {
    return this.warehouseService.update(Number(id), warehouse);
  }
}
