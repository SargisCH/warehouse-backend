import { Injectable } from '@nestjs/common';
import { Product, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type productCreateType = {
  name: string;
  inStock?: number;
  inStockUnit: string;
  price: number;
  priceUnit: string;
  ingredients: Array<{
    id?: string;
    amount: number;
    unit: string;
    inventory: number;
  }>;
  isProductMigration?: boolean;
};

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    productWhereUniqueInput: Prisma.ProductWhereUniqueInput,
  ): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: productWhereUniqueInput,
      include: { ingredients: true },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ProductWhereUniqueInput;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }): Promise<Product[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.product.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { ingredients: true },
    });
  }

  async create(data: productCreateType): Promise<Product> {
    const create = [];
    const invenoryUpdatePromises = [];

    data.ingredients.forEach((ingredient) => {
      if (!data.isProductMigration) {
        invenoryUpdatePromises.push(
          this.prisma.inventory.update({
            where: { id: ingredient.inventory },
            data: { amount: { decrement: ingredient.amount } },
          }),
        );
      }

      create.push({
        amount: ingredient.amount,
        amountUnit: ingredient.unit,
        inventory: {
          connect: {
            id: ingredient.inventory,
          },
        },
      });
    });
    const productCreateInput = {
      name: data.name,
      inStock: data.inStock,
      inStockUnit: data.inStockUnit,
      price: data.price,
      priceUnit: data.priceUnit,
      ingredients: {
        create,
      },
    };
    await Promise.all(invenoryUpdatePromises);
    return this.prisma.product.create({
      data: productCreateInput,
    });
  }

  async update(params: {
    where: Prisma.ProductWhereUniqueInput;
    data: Prisma.ProductUpdateInput;
  }): Promise<Product> {
    const { data, where } = params;
    return this.prisma.product.update({
      data,
      where,
    });
  }

  async delete(where: Prisma.ProductWhereUniqueInput): Promise<number> {
    const res = await this.prisma.product.deleteMany({
      where,
    });
    return res.count;
  }
  async deleteIngredients(where: Prisma.IngredientWhereInput): Promise<number> {
    return (await this.prisma.ingredient.deleteMany({ where })).count;
  }
}
