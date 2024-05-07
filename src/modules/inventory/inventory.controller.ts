import {
  Controller,
  Get,
  Body,
  Delete,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  Inventory as InventoryModel,
  InventoryEntryHistory as InventoryEntryHistoryModel,
  InventoryEntryItem,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { InventoryService } from './inventory.service';
import { InventoryEntry, InventoryModelResponse } from './inventory.DTO';

@ApiTags('inventory')
@Controller('/inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('/')
  async getAllInventory(): Promise<{
    inventories: InventoryModelResponse[];
    totalWorth: number;
  }> {
    const inventoryData = (await this.inventoryService.findAll(
      {},
    )) as InventoryModelResponse[];
    let totalWorth = 0;
    inventoryData.forEach((inv) => {
      let sumPrice = 0;
      // let sumAmount = 0;
      // let amountUnit = '';

      sumPrice += inv.amount * inv.price;
      // inv.InventoryEntryHistoryItem.forEach((invEn: InventoryEntryItem) => {
      // sumAmount += invEn.amount;
      // amountUnit = invEn.amountUnit;
      // });
      // inv.avg = sumPrice / sumAmount;
      // inv.amount = sumAmount;
      // inv.amountUnit = amountUnit;

      totalWorth += sumPrice;
    });
    return {
      inventories: inventoryData,
      totalWorth,
    };
  }
  @Get('/entry')
  async getEntries(): Promise<{
    inventoryEntries: InventoryEntry[];
    totalWorth: number;
  }> {
    return this.inventoryService.findAllEntries({});
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
      price: number;
      amountUnit?: string;
      amount?: number;
      avg?: number;
    },
  ): Promise<InventoryModel> {
    const { name, price, amount = 0, amountUnit = 'kg', avg = 0 } = postData;
    return this.inventoryService.create({
      name,
      price,
      amount,
      avg,
      amountUnit,
    });
  }

  @Post('entry/create')
  async createInventoryEntry(
    @Body()
    inventoryEntry: InventoryEntry,
  ): Promise<InventoryEntryHistoryModel> {
    return this.inventoryService.createEntry(inventoryEntry);
  }

  @Post('/updateAmount/:id')
  async updateAmount(
    @Param('id') id: string,
    @Body()
    updateAmountPayload: {
      amount: number;
      avg: number;
    },
  ): Promise<InventoryModel> {
    return this.inventoryService.updateAmount(Number(id), {
      where: { id: Number(id) },
      data: updateAmountPayload,
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
