import {
  Body,
  Param,
  Controller,
  Get,
  Post,
  UseGuards,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ProductService } from './product.service';
import { ProductDTO, UpdateProductDto } from './product.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('product')
@Controller('/product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAll(
    @Query('name') name: string,
    @Query('forSale') forSale: boolean,
    @Query('returnable') returnable: boolean,
    @Query('fractional') fractional: boolean,
    @Query('units') units: string,
    @Query('groups') groups: string,
    @Query('warehouses') warehouses: string,
    @Query('sku') sku: string,
    @Query('page') page: string,
  ) {
    return this.productService.findAll({
      name,
      forSale,
      returnable,
      fractional,
      units: units?.split(','),
      sku,
      groups: groups?.split(','),
      warehouses: warehouses?.split(','),
      page: page ? Number(page) : 1,
    });
  }

  @Post('/create')
  @ApiOperation({ description: 'Create a product' })
  @ApiBody({ type: ProductDTO })
  @UseGuards(AuthGuard)
  async create(@Body() product: ProductDTO) {
    return this.productService.create(product);
  }

  @Put('/:id')
  @ApiOperation({ description: 'Update product' })
  @ApiBody({ type: UpdateProductDto })
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() product: UpdateProductDto) {
    return this.productService.update(Number(id), product);
  }

  @Get('/:id')
  @ApiOperation({ description: 'Get a single product' })
  @UseGuards(AuthGuard)
  async getProductById(@Param('id') id: string) {
    return this.productService.find({ id: Number(id) });
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Delete a product' })
  @Delete('/:id')
  async deleteProduct(@Param('id') id: string): Promise<{ message: string }> {
    const prod = await this.productService.delete(Number(id));
    return {
      message: 'Product delted successfully',
    };
  }
  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Move to another warehouse' })
  @Post('/move')
  async move(
    @Body()
    body: {
      warehouseId: number;
      products: { id: number | string; quantity: number }[];
    },
  ): Promise<{ message: string }> {
    await this.productService.move(body);
    return {
      message: 'Product moved successfully',
    };
  }
}
