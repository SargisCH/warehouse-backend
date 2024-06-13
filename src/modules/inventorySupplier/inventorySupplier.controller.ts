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
  Query,
} from '@nestjs/common';
import {
  InventorySupplier as InventorySupplierModel,
  InventorySupplierOrder as InventorySupplierOrderModel,
  InventorySupplierOrderItem,
  Prisma,
  User,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../modules/auth/auth.guard';

import { InventorySupplierService } from './inventorySupplier.service';
import { InventorySupplierOrderDTO } from './inventorySupplierOrder.dto';
import { RequestExtended } from 'src/configs/types';

@ApiTags('inventorySupplier')
@Controller('/inventorySupplier')
export class InventorySupplierController {
  constructor(private inventorySupplierService: InventorySupplierService) {}

  @UseGuards(AuthGuard)
  @Get('/order')
  async getAllInventorySupplierOrders(
    @Req() request: RequestExtended,
    @Query() query: { inventory: string[] },
  ): Promise<InventorySupplierOrderModel[]> {
    const where: Prisma.InventorySupplierOrderWhereInput = {};

    if (query?.inventory) {
      where.orderItems = {
        some: {
          inventoryId: {
            in: query?.inventory?.map((invId) => Number(invId)) ?? [],
          },
        },
      };
    }
    return this.inventorySupplierService.findOrderMany({
      ...where,
      tenantId: request.user.tenantId,
    });
  }

  @Get('/')
  @UseGuards(AuthGuard)
  async getAllInventorySuppliers(
    @Req() request: RequestExtended,
  ): Promise<InventorySupplierModel[]> {
    return this.inventorySupplierService.findAll({
      where: { deleted: false, tenantId: request.user.tenantId },
    });
  }

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
  @Post('create')
  async createDraft(
    @Req() request: RequestExtended,
    @Body()
    postData: {
      name: string;
    },
  ): Promise<InventorySupplierModel> {
    const { name } = postData;

    return this.inventorySupplierService.create({
      name,
      tenant: { connect: { id: request.user.tenantId } },
    });
  }

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  @Post('/:id/order/create')
  async createOrder(
    @Req() request: Request,
    @Param('id') id: string,
    @Body()
    supplierOrder: InventorySupplierOrderDTO,
  ): Promise<InventorySupplierOrderModel> {
    if (!supplierOrder.orderItems.length)
      throw new Error('At least one order is required');
    const inventorySupplier = await this.inventorySupplierService.createOrder(
      Number(id),
      (request as any).user as User,
      supplierOrder,
    );

    return inventorySupplier;
  }

  @UseGuards(AuthGuard)
  @Post('/:id/order/create')
  @Put('/:id/order/:orderId')
  async updateOrder(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
    @Body()
    supplierOrder: InventorySupplierOrderDTO,
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

  @UseGuards(AuthGuard)
  @Get('/:id/order')
  async getInventorySupplierOrder(
    @Param('id') id: string,
  ): Promise<InventorySupplierOrderModel[]> {
    return this.inventorySupplierService.findOrder({
      inventorySupplierId: Number(id),
    });
  }

  @UseGuards(AuthGuard)
  @Get('/:id/order/:orderId')
  async getOrderbyId(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
  ): Promise<InventorySupplierOrderModel> {
    return this.inventorySupplierService.findOrderById({
      id: Number(orderId),
    });
  }

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
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
