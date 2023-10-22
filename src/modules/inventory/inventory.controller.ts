import {
  Controller,
  Get,
  Body,
  Delete,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Inventory as InventoryModel } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('/inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('/')
  async getAllInventory(): Promise<InventoryModel[]> {
    return this.inventoryService.findAll({});
  }

  @Get('/:id')
  async getInventoryById(@Param('id') id: string): Promise<InventoryModel> {
    return this.inventoryService.findOne({ id: Number(id) });
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
      amount?: number;
      amountUnit: string;
      price: number;
    },
  ): Promise<InventoryModel> {
    const { name, amount, amountUnit, price } = postData;
    return this.inventoryService.create({
      name,
      amount,
      amountUnit,
      price,
    });
  }

  @Put('/:id')
  async editPost(
    @Param('id') id: string,
    @Body()
    inventoryData: {
      name: string;
      amount?: number;
      amountUnit: string;
      price: number;
    },
  ): Promise<InventoryModel> {
    return this.inventoryService.update({
      where: { id: Number(id) },
      data: inventoryData,
    });
  }

  @Delete('/:id')
  async deleteInventory(@Param('id') id: string): Promise<InventoryModel> {
    return this.inventoryService.delete({ id: Number(id) });
  }
}
