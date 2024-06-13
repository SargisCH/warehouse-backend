import {
  Controller,
  Get,
  Body,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductCategory as ProductCategoryModel } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { ProductCategoryService } from './productCategory.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestExtended } from 'src/configs/types';

@ApiTags('productCategory')
@Controller('/productCategory')
export class ProductCategoryController {
  constructor(private productCategoryService: ProductCategoryService) {}
  @UseGuards(AuthGuard)
  @Get('/')
  async getAllProductCategories(
    @Req() request: RequestExtended,
  ): Promise<ProductCategoryModel[]> {
    return this.productCategoryService.findAll({
      where: { tenantId: request.user.tenantId },
    });
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  async getProductCategoryById(
    @Param('id') id: string,
  ): Promise<ProductCategoryModel> {
    return this.productCategoryService.findOne({ id: Number(id) });
  }

  @UseGuards(AuthGuard)
  @Post('create')
  async createDraft(
    @Req() request: RequestExtended,
    @Body()
    postData: {
      name: string;
    },
  ): Promise<ProductCategoryModel> {
    const { name } = postData;
    return this.productCategoryService.create({
      name,
      tenant: { connect: { id: request.user.tenantId } },
    });
  }

  @UseGuards(AuthGuard)
  @Post('create')
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

  @UseGuards(AuthGuard)
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
