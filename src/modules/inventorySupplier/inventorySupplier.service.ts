import { Injectable } from '@nestjs/common';
import {
  InventorySupplier,
  InventorySupplierOrder,
  InventorySupplierOrderItem,
  Prisma,
  TransactionType,
  User,
} from '@prisma/client';
import dayjs from 'dayjs';

import { PrismaService } from '../prisma/prisma.service';
import {
  InventorySupplierOrderDTO,
  PaymentTypeEnum,
} from './inventorySupplierOrder.dto';

@Injectable()
export class InventorySupplierService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    inventorySupplierWhereUniqueInput: Prisma.InventorySupplierWhereUniqueInput,
  ): Promise<InventorySupplier | null> {
    return this.prisma.inventorySupplier.findUnique({
      where: inventorySupplierWhereUniqueInput,
    });
  }

  async findAll(
    params: {
      skip?: number;
      take?: number;
      cursor?: Prisma.InventorySupplierWhereUniqueInput;
      where?: Prisma.InventorySupplierWhereInput;
      orderBy?: Prisma.InventorySupplierOrderByWithRelationInput;
    },
    includeOrders?: boolean,
  ): Promise<InventorySupplier[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.inventorySupplier.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { orders: includeOrders ?? false },
    });
  }

  async create(
    data: Prisma.InventorySupplierCreateInput,
  ): Promise<InventorySupplier> {
    return this.prisma.inventorySupplier.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.InventorySupplierWhereUniqueInput;
    data: Prisma.InventorySupplierUpdateInput;
  }): Promise<InventorySupplier> {
    const { data, where } = params;
    return this.prisma.inventorySupplier.update({
      data,
      where,
    });
  }

  async delete(
    where: Prisma.InventorySupplierWhereUniqueInput,
  ): Promise<number> {
    const res = await this.prisma.inventorySupplier.deleteMany({
      where,
    });
    return res.count;
  }
  //async deleteItems(where: Prisma.Partner_ItemWhereInput): Promise<number> {
  //return (await this.prisma.partner_Item.deleteMany({ where })).count;
  //}
  async createOrder(
    id: number,
    user: User,
    data: InventorySupplierOrderDTO,
  ): Promise<InventorySupplierOrder> {
    const isPartailCredit = data.paymentType === PaymentTypeEnum.PARTIAL_CREDIT;
    const createData = {
      paymentType: data.paymentType,
      partialCreditAmount: isPartailCredit ? data.partialCreditAmount : 0,
      inventorySupplier: {
        connect: { id: Number(id) },
      },
      orderDate: dayjs(data.orderDate, 'YYYY-MM-DD').toDate(),
      orderItems: {
        createMany: {
          data: data.orderItems.map((item) => ({
            inventoryId: item.inventoryId,
            amount: item.amount,
            amountUnit: item.amountUnit,
            price: item.price,
            priceUnit: item.priceUnit,
          })),
        },
      },
    };
    const orderCreated = await this.prisma.inventorySupplierOrder.create({
      data: createData,
      include: {
        inventorySupplier: true,
        orderItems: { include: { inventory: true } },
      },
    });
    const amount = data.orderItems.reduce(
      (acc, current) => acc + current.price * current.amount,
      0,
    );

    const { tenantId } = user;

    if (data.paymentType === PaymentTypeEnum.CREDIT) {
      await this.prisma.credit.create({
        data: {
          inventorySupplierOrderId: Number(id),
          amount,
        },
      });
    } else if (isPartailCredit) {
      if (!data.partialCreditAmount) {
        throw new Error(
          'The partial credit amount is mandatory when partial credit is selected as a payment method',
        );
      }
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          balance: { decrement: amount - data.partialCreditAmount },
        },
      });
      await this.prisma.credit.create({
        data: {
          amount: data.partialCreditAmount,
          inventorySupplierOrderId: id,
        },
      });
    } else if (data.paymentType === PaymentTypeEnum.CASH) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { balance: { decrement: amount } },
      });
    } else if (data.paymentType === PaymentTypeEnum.TRANSFER) {
      await this.prisma.transactionHistory.create({
        data: {
          amount,
          inventorySupplierId: id,
          transactionType: TransactionType.OUT,
        },
      });
    }

    await this.syncInventory(data.orderItems);
    return orderCreated;
  }

  async syncInventory(
    orderItems: Array<{
      inventoryId: number;
      amount: number;
      amountUnit: string;
      price: number;
      priceUnit: string;
    }>,
  ): Promise<void> {
    const syncPromises = orderItems.map(async (orderItem) => {
      const inv = await this.prisma.inventory.findUnique({
        where: { id: orderItem.inventoryId },
      });
      const sum = inv.price * inv.amount + orderItem.amount * orderItem.price;
      const avg = sum / (orderItem.amount + inv.amount);
      return this.prisma.inventory.update({
        data: { amount: { increment: orderItem.amount }, avg },
        where: { id: orderItem.inventoryId },
      });
    });
    await Promise.all(syncPromises);
  }

  async createOrderMany(
    data: Array<Prisma.InventorySupplierOrderCreateManyInput>,
  ): Promise<number> {
    const res = await this.prisma.inventorySupplierOrder.createMany({ data });
    return res.count;
  }

  async findOrderMany(
    where: Prisma.InventorySupplierOrderWhereInput,
  ): Promise<InventorySupplierOrder[] | null> {
    return this.prisma.inventorySupplierOrder.findMany({
      where,
      include: {
        inventorySupplier: true,
        orderItems: { include: { inventory: true } },
      },
    });
  }
  async findOrder(
    inventorySupplierOrderWhereInput: Prisma.InventorySupplierOrderWhereInput,
  ): Promise<InventorySupplierOrder[] | null> {
    return this.prisma.inventorySupplierOrder.findMany({
      where: inventorySupplierOrderWhereInput,
      include: { orderItems: { include: { inventory: true } } },
    });
  }
  async findOrderById(
    InventorySupplierOrderWhereUniqueInput: Prisma.InventorySupplierOrderWhereUniqueInput,
  ): Promise<InventorySupplierOrder | null> {
    return this.prisma.inventorySupplierOrder.findUnique({
      where: InventorySupplierOrderWhereUniqueInput,
      include: { orderItems: { include: { inventory: true } } },
    });
  }
  async updateOrder(
    where: Prisma.InventorySupplierOrderWhereUniqueInput,
    data: Prisma.InventorySupplierOrderUpdateInput,
  ): Promise<InventorySupplierOrder> {
    return this.prisma.inventorySupplierOrder.update({
      where,
      data,
      include: {
        inventorySupplier: true,
        orderItems: { include: { inventory: true } },
      },
    });
  }
  async deleteOrder(
    where: Prisma.InventorySupplierOrderWhereUniqueInput,
  ): Promise<number> {
    const res = await this.prisma.inventorySupplierOrder.deleteMany({
      where,
    });
    return res.count;
  }
  async deleteOrderItems(
    where: Prisma.InventorySupplierOrderItemWhereInput,
  ): Promise<number> {
    const res = await this.prisma.inventorySupplierOrderItem.deleteMany({
      where,
    });
    return res.count;
  }
  async getLatestOrderDetails(
    inventoryId: number,
  ): Promise<{ orderItem: InventorySupplierOrderItem | undefined }> {
    const orderItems = await this.prisma.inventorySupplierOrderItem.findMany({
      where: { inventoryId },
      orderBy: {
        created_at: 'desc',
      },
      take: 1,
    });
    return { orderItem: orderItems.length && orderItems[0] };
  }
}
