import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';

import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { ProductGroupsDTO } from './product_groups.dto';

import { ProductGroupsService } from './product_groups.service';

@ApiTags('product_groups')
@Controller('/product_groups')
export class ProductGroupsController {
  constructor(private productGroupsService: ProductGroupsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAll() {
    return this.productGroupsService.findAll();
  }

  @Post('/create')
  @ApiOperation({ description: 'Create a product group' })
  @ApiBody({ type: ProductGroupsDTO })
  @UseGuards(AuthGuard)
  async create(@Body() productGroup: ProductGroupsDTO) {
    return this.productGroupsService.create(productGroup);
  }
}
