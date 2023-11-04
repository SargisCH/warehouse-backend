import {
  Controller,
  Get,
  Body,
  Delete,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { InventorySupplier as InventorySupplierModel } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { InventorySupplierService } from './inventorySupplier.service';

@ApiTags('inventorySupplier')
@Controller('/inventorySupplier')
export class InventorySupplierController {
  constructor(private inventorySupplierService: InventorySupplierService) {}

  @Get('/')
  async getAllInventorySuppliers(): Promise<InventorySupplierModel[]> {
    return this.inventorySupplierService.findAll({ where: { deleted: false } });
  }

  @Get('/:id')
  async getInventorySupplierById(
    @Param('id') id: string,
  ): Promise<InventorySupplierModel> {
    return this.inventorySupplierService.findOne({ id: Number(id) });
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
    },
  ): Promise<InventorySupplierModel> {
    const { name } = postData;

    return this.inventorySupplierService.create({
      name,
    });
  }

  @Put('/:id')
  async editInventorySupplier(
    @Param('id') id: string,
    @Body()
    inventorySupplierData: {
      name: string;
    },
  ): Promise<InventorySupplierModel> {
    return this.inventorySupplierService.update({
      where: { id: Number(id) },
      data: { ...inventorySupplierData },
    });
  }

  @Delete('/:id')
  async deleteInventorySupplier(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.inventorySupplierService.update({
      where: { id: Number(id) },
      data: { deleted: true },
    });
    const deletedCount = await this.inventorySupplierService.delete({
      id: Number(id),
    });

    if (deletedCount) {
      return {
        message: 'Inventory Supplier deleted successfully',
      };
    } else {
      return { message: 'Inventory supplier deletion failed' };
    }
  }
  @Post('/:id/order/create')
  async createOrder(
    @Param('id') id: string,
    @Body()
    supplierOrder: {
      inventory: Array<{
        id: number;
        amount: number;
        amountUnit: string;
        price: number;
        priceUnit: string;
        orderDate: Date;
      }>;
    },
  ): Promise<Array<InventorySupplierModel>> {
    const { inventory } = supplierOrder;

    if (!inventory.length) throw new Error('At least one order is required');
    const addedCount = await this.inventorySupplierService.createOrderMany(
      inventory.map((inv) => ({
        inventirySupplierId: Number(id),
        inventoryId: inv.id,
        amount: inv.amount,
        amountUnit: inv.amountUnit,
        price: inv.price,
        priceUnit: inv.priceUnit,
      })),
    );

    if (addedCount > 0) {
      return this.inventorySupplierService.findAll(
        {
          where: { id: Number(id) },
        },
        true,
      );
    }
  }
}
