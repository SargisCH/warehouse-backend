import { Injectable } from '@nestjs/common';
import { Inventory, InventoryEntryHistory, Prisma, User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { InventoryEntry } from './inventory.DTO';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    inventoryWhereUniqueInput: Prisma.InventoryWhereUniqueInput,
  ): Promise<Inventory | null> {
    return this.prisma.inventory.findUnique({
      where: inventoryWhereUniqueInput,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.InventoryWhereUniqueInput;
    where?: Prisma.InventoryWhereInput;
    orderBy?: Prisma.InventoryOrderByWithRelationInput;
  }): Promise<Inventory[]> {
    const { skip, take, cursor, where, orderBy } = params;

    const inventoryData = await this.prisma.inventory.findMany({
      skip,
      take,
      cursor,
      where: { ...where, AND: { deleted: false } },
      orderBy,
      include: { InventoryEntryHistoryItem: true },
    });
    return inventoryData;
  }

  async create(data: Prisma.InventoryCreateInput): Promise<Inventory> {
    return this.prisma.inventory.create({
      data,
    });
  }

  async findAllEntries(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.InventoryEntryHistoryWhereUniqueInput;
    where?: Prisma.InventoryEntryHistoryWhereInput;
    orderBy?: Prisma.InventoryEntryHistoryOrderByWithRelationInput;
  }): Promise<{ inventoryEntries: InventoryEntry[]; totalWorth: number }> {
    const { skip, take, cursor, where, orderBy } = params;

    const inventoryData = await this.prisma.inventoryEntryHistory.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        inventorySupplier: true,
        inventoryEntryItems: { include: { inventory: true } },
      },
    });
    return {
      totalWorth: 0,
      inventoryEntries: inventoryData,
    };
  }

  async createEntry(
    data: InventoryEntry,
    user: User,
  ): Promise<InventoryEntryHistory> {
    const createData: Prisma.InventoryEntryHistoryCreateInput = {
      tenant: { connect: { id: user.tenantId } },
      inventoryEntryItems: {
        create: data.inventoryEntryItems.map((inventoryEntryItem) => {
          return {
            amount: inventoryEntryItem.amount,
            amountUnit: inventoryEntryItem.amountUnit,
            price: inventoryEntryItem.price,
            inventory: {
              connect: {
                id: inventoryEntryItem.inventoryId,
              },
            },
          };
        }),
      },
    };
    if (data.date) {
      createData.date = data.date;
    }
    if (data.inventorySupplierId) {
      createData.inventorySupplier = {
        connect: {
          id: data.inventorySupplierId,
        },
      };
    }
    const inventoryIds = data.inventoryEntryItems.map(
      (invEn) => invEn.inventoryId,
    );
    const inventories = await this.prisma.inventory.findMany({
      where: { id: { in: inventoryIds } },
    });
    inventories.forEach(async (inv) => {
      const orderInv = data.inventoryEntryItems.find(
        (invEn) => invEn.inventoryId === inv.id,
      );
      const avgDB = inv.avg * inv.amount;
      const orderTotalPrice = orderInv.price * orderInv.amount;
      const totalCost = avgDB + orderTotalPrice;
      const avg =
        inv.avg > 0
          ? totalCost / (inv.amount + orderInv.amount)
          : orderInv.price;
      await this.prisma.inventory.update({
        where: { id: inv.id },
        data: { avg, amount: inv.amount + orderInv.amount },
      });
    });
    return this.prisma.inventoryEntryHistory.create({ data: createData });
  }

  async update(params: {
    where: Prisma.InventoryWhereUniqueInput;
    data: Prisma.InventoryUpdateInput;
  }): Promise<Inventory> {
    const { data, where } = params;
    return this.prisma.inventory.update({
      data,
      where,
    });
  }
  async updateAmount(
    id: number,
    params: {
      where: Prisma.InventoryWhereUniqueInput;
      data: { amount: number; avg: number };
    },
    user: User,
  ): Promise<Inventory> {
    const { data, where } = params;
    await this.prisma.inventoryEntryItem.updateMany({
      where: { inventoryId: id },
      data: { deleted: true },
    });
    const inventory = await this.prisma.inventory.findUnique({ where: { id } });
    await this.prisma.inventoryEntryHistory.create({
      data: {
        tenant: { connect: { id: user.tenantId } },
        inventoryEntryItems: {
          create: {
            inventoryId: id,
            amount: data.amount,
            amountUnit: inventory.amountUnit,
            price: inventory.price,
          },
        },
      },
    });
    return this.prisma.inventory.update({
      data: { amount: data.amount, avg: data.avg },
      where,
    });
  }

  async delete(where: Prisma.InventoryWhereUniqueInput): Promise<Inventory> {
    return this.prisma.inventory.update({
      where,
      data: { deleted: true },
    });
  }
}
