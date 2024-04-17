import { Injectable } from '@nestjs/common';
import { Product, Prisma, StockProduct } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StockProductDTO } from './product.dto';

export type productCreateType = {
  name: string;
  price: number;
  priceUnit: string;
  ingredients: Array<{
    id?: string;
    amount: number;
    amountUnit: string;
    inventoryId: number;
  }>;
};

export type productAddInStockType = {
  productId: number;
  inStock?: number;
  inStockUnit: string;
  manualAdd?: boolean;
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

    const products = await this.prisma.product.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { ingredients: true },
    });
    return products;
  }
  async findAllStockProducts(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.StockProductWhereUniqueInput;
    where?: Prisma.StockProductWhereInput;
    orderBy?: Prisma.StockProductOrderByWithRelationInput;
  }): Promise<{ stockProducts: StockProduct[]; totalWorth: number }> {
    const { skip, take, cursor, where, orderBy } = params;
    const query = Prisma.sql`
      SELECT SUM(sp."inStock" * p.price) AS total_price
      FROM public."StockProduct" AS sp
      JOIN public."Product" AS p ON sp."productId" = p.id;
    `;
    const result = await this.prisma.$queryRaw(query);
    const totalWorth = result[0].total_price || 0;
    const stockProducts = await this.prisma.stockProduct.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { product: true },
    });
    return { stockProducts, totalWorth };
  }

  async create(data: productCreateType): Promise<Product> {
    const productCreateInput = {
      name: data.name,
      price: data.price,
      priceUnit: data.priceUnit,
      ingredients: {
        create: data.ingredients.map((ingredient) => {
          return {
            amount: ingredient.amount,
            amountUnit: ingredient.amountUnit,
            inventory: {
              connect: {
                id: ingredient.inventoryId,
              },
            },
          };
        }),
      },
    };
    return this.prisma.product.create({
      data: productCreateInput,
    });
  }
  async addInStock(data: StockProductDTO) {
    const invenoryUpdatePromises = [];
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: { ingredients: true },
    });

    if (!data.noCalculation) {
      product.ingredients.forEach((ingredient) => {
        invenoryUpdatePromises.push(
          this.prisma.inventory.update({
            where: { id: ingredient.inventoryId },
            data: {
              amount: { decrement: ingredient.amount * data.inStock },
            },
          }),
        );
      });
    }

    await Promise.all(invenoryUpdatePromises);
    const stockProductDB = await this.prisma.stockProduct.findFirst({
      where: {
        productId: data.productId,
      },
    });

    if (stockProductDB?.id) {
      return this.prisma.stockProduct.update({
        where: { id: stockProductDB.id },
        data: {
          inStock: { increment: data.inStock },
          inStockUnit: data.inStockUnit,
        },
      });
    }
    return this.prisma.stockProduct.create({
      data: {
        productId: data.productId,
        inStock: data.inStock,
        inStockUnit: data.inStockUnit,
      },
    });
  }
  async findStockProductById(
    stockProductWhereUniqueInput: Prisma.StockProductWhereUniqueInput,
  ): Promise<StockProduct | null> {
    return this.prisma.stockProduct.findUnique({
      where: stockProductWhereUniqueInput,
      include: { product: true },
    });
  }
  async updateStockProduct(
    stockProductDto: StockProductDTO,
  ): Promise<StockProduct | null> {
    if (stockProductDto.noCalculation) {
      const data = {
        ...stockProductDto,
      };
      delete data.noCalculation;
      delete data.productId;
      console.log('data', data);
      return this.prisma.stockProduct.update({
        where: {
          id: stockProductDto.id,
        },
        data,
      });
    } else {
      delete stockProductDto.noCalculation;
      delete stockProductDto.productId;
      return this.addInStock({
        ...stockProductDto,
      });
    }
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
