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
import {
  Inventory as InventoryModel,
  InventoryEntryHistory as InventoryEntryHistoryModel,
  User,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { InventoryService } from './inventory.service';
import { InventoryEntry, InventoryModelResponse } from './inventory.DTO';
import { AuthGuard } from '../auth/auth.guard';
import { RequestExtended } from 'src/configs/types';

@ApiTags('inventory')
@Controller('/inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @UseGuards(AuthGuard)
  @Get('/')
  async getAllInventory(@Req() request: RequestExtended): Promise<{
    inventories: InventoryModelResponse[];
    totalWorth: number;
  }> {
    const user = request.user as User;
    const inventoryData = (await this.inventoryService.findAll({
      where: { tenantId: user.tenantId },
    })) as InventoryModelResponse[];
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

  @UseGuards(AuthGuard)
  @Get('/entry')
  async getEntries(@Req() request: RequestExtended): Promise<{
    inventoryEntries: InventoryEntry[];
    totalWorth: number;
  }> {
    const {
      user: { tenantId },
    } = request;

    return this.inventoryService.findAllEntries({ where: { tenantId } });
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

  @UseGuards(AuthGuard)
  @Post('create')
  async createDraft(
    @Req() request: Request,
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
    const user = (request as any).user as User;
    return this.inventoryService.create({
      name,
      price,
      amount,
      avg,
      amountUnit,
      tenant: { connect: { id: user.tenantId } },
    });
  }
  @UseGuards(AuthGuard)
  @Post('entry/create')
  async createInventoryEntry(
    @Req() request: RequestExtended,
    @Body()
    inventoryEntry: InventoryEntry,
  ): Promise<InventoryEntryHistoryModel> {
    return this.inventoryService.createEntry(inventoryEntry, request.user);
  }

  @UseGuards(AuthGuard)
  @Post('/updateAmount/:id')
  async updateAmount(
    @Req() request: RequestExtended,
    @Param('id') id: string,
    @Body()
    updateAmountPayload: {
      amount: number;
      avg: number;
    },
  ): Promise<InventoryModel> {
    return this.inventoryService.updateAmount(
      Number(id),
      {
        where: { id: Number(id) },
        data: updateAmountPayload,
      },
      request.user,
    );
  }

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
  @Delete('/:id')
  async deleteInventory(@Param('id') id: string): Promise<InventoryModel> {
    return this.inventoryService.delete({ id: Number(id) });
  }
}
