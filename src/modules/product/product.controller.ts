import {
  Controller,
  Get,
  Body,
  Delete,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Product as ProductModel, StockProduct } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import {
  productAddInStockType,
  productCreateType,
  ProductService,
} from './product.service';
import { ProductResponseItem, StockProductDTO } from './product.dto';

@ApiTags('product')
@Controller('/product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get('/')
  async getAllProduct(): Promise<ProductModel[]> {
    return this.productService.findAll({});
  }

  @Get('/stockProduct')
  async getAllStockProduct(): Promise<{
    stockProducts: StockProduct[];
    totalWorth: number;
  }> {
    return this.productService.findAllStockProducts({});
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

  @Post('create')
  async createProduct(
    @Body()
    postData: productCreateType,
  ): Promise<ProductModel> {
    return this.productService.create(postData);
  }

  @Post('addInStock')
  async addInStock(
    @Body()
    postData: StockProductDTO,
  ): Promise<StockProduct> {
    return this.productService.addInStock(postData);
  }
  @Get('/stockProduct/:id')
  async getStockProductById(@Param('id') id: string): Promise<StockProduct> {
    return this.productService.findStockProductById({ id: Number(id) });
  }
  @Put('/stockProduct/:id')
  async updateStockProductById(
    @Param('id') id: string,
    @Body()
    stockProductDto: StockProductDTO,
  ): Promise<StockProduct> {
    return this.productService.updateStockProduct(stockProductDto);
  }
  @Put('/makeProduct/:id')
  async make(
    @Param('id') id: string,
    @Body()
    productPayload: { amount: number },
  ): Promise<ProductResponseItem> {
    return this.productService.makeProduct({
      ...productPayload,
      id: Number(id),
    });
  }
  @Put('/updateAmount/:id')
  async updateAmount(
    @Param('id') id: string,
    @Body()
    updateAmountPayload: {
      amount: number;
      costPrice: number;
    },
  ): Promise<ProductResponseItem> {
    return this.productService.updateAmount(Number(id), {
      where: { id: Number(id) },
      data: updateAmountPayload,
    });
  }
  @Put('/:id')
  async editProduct(
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
      data: productData,
    });
  }

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
