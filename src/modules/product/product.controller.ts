import {
  Controller,
  Get,
  Body,
  Delete,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Product as ProductModel } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { ProductService } from './product.service';

@ApiTags('product')
@Controller('/product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get('/')
  async getAllProduct(): Promise<ProductModel[]> {
    return this.productService.findAll({});
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
  async createDraft(
    @Body()
    postData: {
      name: string;
      inStock?: number;
      inStockUnit: string;
      price: number;
      priceUnit: string;
      ingredients: Array<{
        id?: string;
        amount: number;
        unit: string;
        inventory: number;
      }>;
    },
  ): Promise<ProductModel> {
    const { name, inStockUnit, inStock, price, priceUnit, ingredients } =
      postData;
    return this.productService.create({
      name,
      inStock,
      inStockUnit,
      price,
      priceUnit,
      ingredients: {
        create: ingredients.map((ingredient) => ({
          amount: ingredient.amount,
          amountUnit: ingredient.unit,
          inventory: {
            connect: {
              id: ingredient.inventory,
            },
          },
        })),
      },
    });
  }

  @Put('/:id')
  async editPost(
    @Param('id') id: string,
    @Body()
    productData: {
      name: string;
      inStock?: number;
      inStockUnit: string;
      price: number;
      priceUnit: string;
      inventoryId: string;
      ingredients: Array<{ inventory: number; amount: number; unit: string }>;
    },
  ): Promise<ProductModel> {
    const ingrediensUpdate = productData.ingredients.map((ing) => {
      return {
        where: {
          productId_inventoryId: {
            productId: Number(id),
            inventoryId: ing.inventory,
          },
        },
        data: { amount: ing.amount, amountUnit: ing.unit },
      };
    });
    return this.productService.update({
      where: { id: Number(id) },
      data: { ...productData, ingredients: { update: ingrediensUpdate } },
    });
  }

  @Delete('/:id')
  async deleteProduct(@Param('id') id: string): Promise<ProductModel> {
    return this.productService.delete({ id: Number(id) });
  }
}
