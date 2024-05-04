import { Injectable } from '@nestjs/common';
import { Product, Prisma, StockProduct } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, StockProductDTO } from './product.dto';

export type productCreateType = {
  name: string;
  price: number;
  priceUnit: string;
  noCalculation?: boolean;
  inStock?: number;
  inStockUnit?: string;
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
  ): Promise<CreateProductDto | null> {
    const product = await this.prisma.product.findUnique({
      where: productWhereUniqueInput,
      include: { ingredients: true, StockProduct: true },
    });
    if (!product.StockProduct)
      return { ...product, inStockUnit: 'kg', inStock: 0 };
    const inStock = product.StockProduct.inStock || 0;
    const inStockUnit = product.StockProduct.inStockUnit || 'kg';
    delete product.StockProduct;
    return { ...product, inStockUnit, inStock };
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ProductWhereUniqueInput;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }): Promise<CreateProductDto[]> {
    const { skip, take, cursor, where, orderBy } = params;

    const products = await this.prisma.product.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: { ingredients: true, StockProduct: true },
    });
    return products.map((p) => {
      return {
        ...p,
        StockProduct: undefined,
        inStock: p.StockProduct.inStock,
        inStockUnit: p.StockProduct.inStockUnit,
      };
    });
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

  async create(data: productCreateType): Promise<CreateProductDto> {
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

    const product = await this.prisma.product.create({
      data: productCreateInput,
    });
    let stockProduct: StockProduct;
    if (data.inStock) {
      stockProduct = await this.addInStock({
        productId: product.id,
        inStockUnit: data.inStockUnit || 'kg',
        inStock: data.inStock,
        noCalculation: data.noCalculation,
      });
    }
    return {
      ...product,
      inStock: stockProduct.inStock,
      inStockUnit: stockProduct.inStockUnit,
    };
  }
  async addInStock(data: StockProductDTO) {
    const invenoryUpdatePromises = [];
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: { ingredients: true },
    });

    let costPrice = 0;
    if (!data.noCalculation) {
      product.ingredients.forEach((ingredient) => {
        invenoryUpdatePromises.push(async () => {
          const inventoryHistoryRecords =
            await this.prisma.inventoryEntryHistory.findMany({
              where: {
                inventoryEntryItems: {
                  some: { inventoryId: ingredient.inventoryId },
                },
              },
              include: { inventoryEntryItems: true },
              orderBy: { date: 'asc' },
            });
          let amountLeft = ingredient.amount * data.inStock;
          for (let inventoryRecord of inventoryHistoryRecords) {
            if (amountLeft === 0) break;
            let amountToDecrement = amountLeft || 0;
            const inventoryHistoryItem =
              inventoryRecord.inventoryEntryItems.find(
                (ei) => ei.inventoryId === ingredient.inventoryId,
              );
            if (inventoryHistoryItem.amount >= amountLeft) {
              amountToDecrement = amountLeft;
              amountLeft = 0;
              costPrice = amountToDecrement * inventoryHistoryItem.price;
            } else if (inventoryHistoryItem.amount < amountLeft) {
              amountToDecrement = inventoryHistoryItem.amount;
              amountLeft = amountLeft - inventoryHistoryItem.amount;
              costPrice += amountToDecrement * inventoryHistoryItem.price;
            }
            const dataToUpdate = {
              inventoryEntryItems: {
                update: {
                  where: { id: inventoryHistoryItem.id },
                  data: {
                    amount: { decrement: amountToDecrement },
                  },
                },
              },
            };

            await this.prisma.inventoryEntryHistory.update({
              where: { id: inventoryRecord.id },
              data: dataToUpdate,
            });
          }
        });
      });
    }

    await Promise.all(invenoryUpdatePromises.map((f) => f()));
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
        costPrice,
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
    data: productCreateType;
  }): Promise<CreateProductDto | null> {
    const { data, where } = params;
    console.log('data', data, where);
    const productUpdateInput = {
      name: data.name,
      price: data.price,
      priceUnit: data.priceUnit,
      ingredients: {
        update: data.ingredients.map((ing) => {
          return {
            where: {
              productId_inventoryId: {
                productId: Number(where.id),
                inventoryId: ing.inventoryId,
              },
            },
            data: { amount: ing.amount, amountUnit: ing.amountUnit },
          };
        }),
      },
    };
    const productUpdated = await this.prisma.product.update({
      data: productUpdateInput,
      where,
    });
    const stockProduct = await this.prisma.stockProduct.findFirst({
      where: { productId: where.id },
    });
    let stockProductUpdated: StockProduct;
    if (typeof data.inStock === 'number') {
      let amountToAdd = 0;
      if (stockProduct?.id && data.inStock > stockProduct.inStock) {
        amountToAdd = data.inStock - stockProduct.inStock;
      } else if (!stockProduct?.id) {
        amountToAdd = data.inStock;
      }
      stockProductUpdated = await this.addInStock({
        inStock: amountToAdd,
        inStockUnit: data.inStockUnit,
        productId: productUpdated.id,
        noCalculation: data.noCalculation,
      });
    }
    return {
      ...productUpdated,
      inStock: stockProductUpdated.inStock || stockProduct?.inStock || 0,
      inStockUnit:
        stockProductUpdated.inStockUnit || stockProduct?.inStockUnit || 'kg',
    };
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
