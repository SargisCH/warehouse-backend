import { Injectable } from '@nestjs/common';
import {
  InventorySupplier,
  InventorySupplierOrder,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

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
    data: Prisma.InventorySupplierOrderCreateInput,
  ): Promise<InventorySupplierOrder> {
    return this.prisma.inventorySupplierOrder.create({
      data,
      include: {
        inventorySupplier: true,
        orderItems: { include: { inventory: true } },
      },
    });
  }

  async createOrderMany(
    data: Array<Prisma.InventorySupplierOrderCreateManyInput>,
  ): Promise<number> {
    const res = await this.prisma.inventorySupplierOrder.createMany({ data });
    return res.count;
  }

  async findOrder(
    inventorySupplierOrderWhereInput: Prisma.InventorySupplierOrderWhereInput,
  ): Promise<InventorySupplierOrder[] | null> {
    return this.prisma.inventorySupplierOrder.findMany({
      where: inventorySupplierOrderWhereInput,
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
}
