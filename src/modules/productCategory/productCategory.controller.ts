import {
  Controller,
  Get,
  Body,
  Delete,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ProductCategory as ProductCategoryModel } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { ProductCategoryService } from './productCategory.service';

@ApiTags('productCategory')
@Controller('/productCategory')
export class ProductCategoryController {
  constructor(private productCategoryService: ProductCategoryService) {}

  @Get('/')
  async getAllProductCategories(): Promise<ProductCategoryModel[]> {
    return this.productCategoryService.findAll({});
  }

  @Get('/:id')
  async getProductCategoryById(
    @Param('id') id: string,
  ): Promise<ProductCategoryModel> {
    return this.productCategoryService.findOne({ id: Number(id) });
  }

  @Post('create')
  async createDraft(
    @Body()
    postData: {
      name: string;
    },
  ): Promise<ProductCategoryModel> {
    const { name } = postData;
    return this.productCategoryService.create({
      name,
    });
  }

  @Put('/:id')
  async editProductCategory(
    @Param('id') id: string,
    @Body()
    productCategoryData: {
      name: string;
    },
  ): Promise<ProductCategoryModel> {
    return this.productCategoryService.update({
      where: { id: Number(id) },
      data: { ...productCategoryData },
    });
  }

  @Delete('/:id')
  async deleteProductCategory(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const deletedCount = await this.productCategoryService.delete({
      id: Number(id),
    });

    if (deletedCount) {
      return {
        message: 'Product Category deleted successfully',
      };
    } else {
      return { message: 'Product Category deletion failed' };
    }
  }
}
