import dayjs from 'dayjs';
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
  InventorySupplier as InventorySupplierModel,
  InventorySupplierOrder as InventorySupplierOrderModel,
  InventorySupplierOrderItem,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../modules/auth/auth.guard';

import { InventorySupplierService } from './inventorySupplier.service';

@ApiTags('inventorySupplier')
@Controller('/inventorySupplier')
export class InventorySupplierController {
  constructor(private inventorySupplierService: InventorySupplierService) {}

  @Get('/order')
  async getAllInventorySupplierOrders(): Promise<
    InventorySupplierOrderModel[]
  > {
    return this.inventorySupplierService.findOrderMany();
  }

  @Get('/')
  @UseGuards(AuthGuard)
  async getAllInventorySuppliers(
    @Req() request: Request,
  ): Promise<InventorySupplierModel[]> {
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
    await this.inventorySupplierService.syncInventory(orderItems);

    return inventorySupplier;
  }
  @Put('/:id/order/:orderId')
  async updateOrder(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
    @Body()
    supplierOrder: {
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
        orderDate,
        status,
        orderItems: {
          updateMany: orderItems.map((item) => ({
            where: {
              inventoryId: item.inventoryId,
            },
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
  @Get('/:id/order')
  async getInventorySupplierOrder(
    @Param('id') id: string,
  ): Promise<InventorySupplierOrderModel[]> {
    return this.inventorySupplierService.findOrder({
      inventorySupplierId: Number(id),
    });
  }

  @Get('/:id/order/:orderId')
  async getOrderbyId(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
  ): Promise<InventorySupplierOrderModel> {
    return this.inventorySupplierService.findOrderById({
      id: Number(orderId),
    });
  }

  @Delete('/:id/order/:orderId')
  async deleteInventorySupplierOrder(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
  ): Promise<{ message: string }> {
    await this.inventorySupplierService.deleteOrderItems({
      inventorySupplierOrderId: Number(orderId),
    });
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

  @Get('/:id/inventory/:inventoryId/latest')
  async getLatestOrderDetails(
    @Param('id') id: string,
    @Param('inventoryId') inventoryId: string,
  ): Promise<{ orderItem: InventorySupplierOrderItem | undefined }> {
    return this.inventorySupplierService.getLatestOrderDetails(
      Number(inventoryId),
    );
  }
}
