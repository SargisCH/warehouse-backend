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
import { Product as ProductModel, StockProduct } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import {
  productAddInStockType,
  productCreateType,
  ProductService,
} from './product.service';
import { ProductResponseItem, StockProductDTO } from './product.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RequestExtended } from 'src/configs/types';

@ApiTags('product')
@Controller('/product')
export class ProductController {
  constructor(private productService: ProductService) {}
  @UseGuards(AuthGuard)
  @Get('/')
  async getAllProduct(
    @Req() request: RequestExtended,
  ): Promise<ProductModel[]> {
    const {
      user: { tenantId },
    } = request;
    return this.productService.findAll({ where: { tenantId } });
  }

  @UseGuards(AuthGuard)
  @Get('/stockProduct')
  async getAllStockProduct(@Req() request: RequestExtended): Promise<{
    stockProducts: StockProduct[];
    totalWorth: number;
  }> {
    const {
      user: { tenantId },
    } = request;
    return this.productService.findAllStockProducts({ where: { tenantId } });
  }

  @Get('/:id')
  async getProductById(@Param('id') id: string): Promise<ProductModel> {
    return this.productService.findOne({ id: Number(id) });
  }

  // @Get('feed')
  // async getPublishedPosts(): Promise<Inventory[]> {
  //   return this.inventoryService.findAll({
  //     where: { published: true },
  //   });
  // }

  // @Get('filtered-posts/:searchString')
  // async getFilteredPosts(
  //   @Param('searchString') searchString: string,
  // ): Promise<Inventory[]> {
  //   return this.inventoryService.findAll({
  //     where: {
  //       OR: [
  //         {
  //           title: { contains: searchString },
  //         },
  //         {
  //           content: { contains: searchString },
  //         },
  //       ],
  //     },
  //   });
  // }
  @UseGuards(AuthGuard)
  @Post('create')
  async createProduct(
    @Req() request: RequestExtended,
    @Body()
    postData: productCreateType,
  ): Promise<ProductModel> {
    const {
      user: { tenantId },
    } = request;
    return this.productService.create({ ...postData, tenantId });
  }
  @UseGuards(AuthGuard)
  @Post('addInStock')
  async addInStock(
    @Req() request: RequestExtended,
    @Body()
    postData: StockProductDTO,
  ): Promise<StockProduct> {
    return this.productService.addInStock(postData, request.user.tenantId);
  }

  @UseGuards(AuthGuard)
  @Get('/stockProduct/:id')
  async getStockProductById(@Param('id') id: string): Promise<StockProduct> {
    return this.productService.findStockProductById({ id: Number(id) });
  }

  @UseGuards(AuthGuard)
  @Put('/stockProduct/:id')
  async updateStockProductById(
    @Req() request: RequestExtended,
    @Param('id') id: string,
    @Body()
    stockProductDto: StockProductDTO,
  ): Promise<StockProduct> {
    return this.productService.updateStockProduct(
      stockProductDto,
      request.user.tenantId,
    );
  }

  @UseGuards(AuthGuard)
  @Put('/makeProduct/:id')
  async make(
    @Req() request: RequestExtended,
    @Param('id') id: string,
    @Body()
    productPayload: { amount: number },
  ): Promise<ProductResponseItem> {
    return this.productService.makeProduct(
      {
        ...productPayload,
        id: Number(id),
      },
      request.user.tenantId,
    );
  }

  @UseGuards(AuthGuard)
  @Put('/updateAmount/:id')
  async updateAmount(
    @Req() request: RequestExtended,
    @Param('id') id: string,
    @Body()
    updateAmountPayload: {
      amount: number;
      costPrice: number;
    },
  ): Promise<ProductResponseItem> {
    return this.productService.updateAmount(
      Number(id),
      {
        where: { id: Number(id) },
        data: updateAmountPayload,
      },
      request.user.tenantId,
    );
  }

  @UseGuards(AuthGuard)
  @Put('/:id')
  async editProduct(
    @Req() request: RequestExtended,
    @Param('id') id: string,
    @Body()
    productData: {
      name: string;
      inStock?: number;
      inStockUnit: string;
      noCalculation?: boolean;
      price: number;
      priceUnit: string;
      inventoryId: string;
      ingredients: Array<{
        inventoryId: number;
        amount: number;
        amountUnit: string;
      }>;
    },
  ): Promise<ProductModel> {
    return this.productService.update({
      where: { id: Number(id) },
      data: { ...productData, tenantId: request.user.tenantId },
    });
  }

  @UseGuards(AuthGuard)
  @Delete('/:id')
  async deleteProduct(@Param('id') id: string): Promise<{ message: string }> {
    // await this.productService.deleteIngredients({ productId: Number(id) });
    const prod = await this.productService.delete({ id: Number(id) });

    if (prod.deleted) {
      return {
        message: 'Product delted successfully',
      };
    } else {
      return { message: 'Product deletion failed' };
    }
  }
}
