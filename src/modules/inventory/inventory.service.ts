import { Injectable } from '@nestjs/common';
import { Inventory, InventoryEntryHistory, Prisma } from '@prisma/client';

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
  }): Promise<{ inventories: Inventory[]; totalWorth: number }> {
    const { skip, take, cursor, where, orderBy } = params;
    const query = Prisma.sql`
      SELECT SUM(amount * price) AS total_price
      FROM public."Inventory";
    `;
    const result = await this.prisma.$queryRaw(query);
    const totalWorth = result[0].total_price || 0;

    const inventoryData = await this.prisma.inventory.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
    return {
      totalWorth,
      inventories: inventoryData,
    };
  }

  async create(data: Prisma.InventoryCreateInput): Promise<Inventory> {
    return this.prisma.inventory.create({
      data,
    });
  }

  async createEntry(data: InventoryEntry): Promise<InventoryEntryHistory> {
    const createData: Prisma.InventoryEntryHistoryCreateInput = {
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

  async delete(where: Prisma.InventoryWhereUniqueInput): Promise<Inventory> {
    return this.prisma.inventory.delete({
      where,
    });
  }
}
