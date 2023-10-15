import {
  Controller,
  Get,
  // Body,
  // Delete,
  // Param,
  // Post,
  // Put,
} from '@nestjs/common';
import { Inventory } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('/inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('/')
  async getAllInventory(): Promise<Inventory[]> {
    return [
      {
        id: 4,
        amount: 1,
        name: 'asdas',
        amountUnit: 213.2,
        created_at: 421342321 as unknown as Date,
        updated_at: 421342321 as unknown as Date,
        productId: null,
        // amountUnit: 'kg',
        // created_at: 123213,
        // updated_at: Date.now(),
      },
    ];
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

  // @Post('post')
  // async createDraft(
  //   @Body() postData: { title: string; content?: string; authorEmail: string },
  // ): Promise<PostModel> {
  //   const { title, content, authorEmail } = postData;
  //   return this.postService.create({
  //     title,
  //     content,
  //     User: {
  //       connect: { email: authorEmail },
  //     },
  //   });
  // }

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
