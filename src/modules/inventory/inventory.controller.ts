import {
  Controller,
  Get,
  Body,
  // Delete,
  // Param,
  Post,
  // Put,
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

  // @Get('post/:id')
  // async getPostById(@Param('id') id: string): Promise<Inventory> {
  //   return this.inventoryService.findOne({ id: Number(id) });
  // }

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

  @Post('inventory')
  async createDraft(
    @Body() postData: { name: string; amount?: number; amountUnit: string },
  ): Promise<InventoryModel> {
    const { name, amount, amountUnit } = postData;
    return this.inventoryService.create({
      name,
      amount,
      amountUnit,
    });
  }

  // @Put('publish/:id')
  // async publishPost(@Param('id') id: string): Promise<PostModel> {
  //   return this.postService.update({
  //     where: { id: Number(id) },
  //     data: { published: true },
  //   });
  // }

  // @Delete('post/:id')
  // async deletePost(@Param('id') id: string): Promise<PostModel> {
  //   return this.postService.delete({ id: Number(id) });
  // }
}
