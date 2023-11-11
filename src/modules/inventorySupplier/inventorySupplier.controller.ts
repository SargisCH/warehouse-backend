import dayjs from 'dayjs';
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
  InventorySupplier as InventorySupplierModel,
  InventorySupplierOrder as InventorySupplierOrderModel,
} from '@prisma/client';
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
      supplierId: number;
      orderDate: Date;
      status: string;
      orderItems: Array<{
        inventoryId: number;
        amount: number;
        amountUnit: string;
        price: number;
        priceUnit: string;
      }>;
    },
  ): Promise<InventorySupplierOrderModel> {
    const { orderDate, status, orderItems } = supplierOrder;

    if (!orderItems.length) throw new Error('At least one order is required');
    const inventorySupplier = await this.inventorySupplierService.createOrder({
      inventorySupplier: {
        connect: { id: Number(id) },
      },
      orderDate: dayjs(orderDate, 'YYYY-MM-DD').toDate(),
      status,
      orderItems: {
        createMany: {
          data: orderItems.map((item) => ({
            inventoryId: item.inventoryId,
            amount: item.amount,
            amountUnit: item.amountUnit,
            price: item.price,
            priceUnit: item.priceUnit,
          })),
        },
      },
    });

    return inventorySupplier;
  }
  @Get('/:id/order')
  async getInventorySupplierOrder(
    @Param('id') id: string,
  ): Promise<InventorySupplierOrderModel[]> {
    return this.inventorySupplierService.findOrder({
      inventorySupplierId: Number(id),
    });
  }

  @Put('/:id/order/:orderId')
  async upadateOrder(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
    @Body()
    supplierOrder: {
      supplierId: number;
      orderDate: Date;
      status: string;
      orderItems: Array<{
        id?: number;
        inventoryId: number;
        amount: number;
        amountUnit: string;
        price: number;
        priceUnit: string;
      }>;
    },
  ): Promise<InventorySupplierOrderModel> {
    const { orderDate, status, orderItems } = supplierOrder;

    if (!orderItems.length) throw new Error('At least one order is required');
    const inventorySupplier = await this.inventorySupplierService.updateOrder(
      {
        id: Number(orderId),
      },
      {
        orderDate: dayjs(orderDate, 'YYYY-MM-DD').toDate(),
        status,
        orderItems: {
          updateMany: orderItems.map((item) => ({
            where: { id: Number(item.id) },
            data: {
              inventoryId: item.inventoryId,
              amount: item.amount,
              amountUnit: item.amountUnit,
              price: item.price,
              priceUnit: item.priceUnit,
            },
          })),
        },
      },
    );

    return inventorySupplier;
  }

  @Delete('/:id/order/:orderId')
  async deleteInventorySupplierOrder(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
  ): Promise<{ message: string }> {
    const deletedCount = await this.inventorySupplierService.deleteOrder({
      id: Number(orderId),
    });

    if (deletedCount) {
      return {
        message: 'Inventory Supplier Order deleted successfully',
      };
    } else {
      return { message: 'Inventory supplier Order deletion failed' };
    }
  }
}
