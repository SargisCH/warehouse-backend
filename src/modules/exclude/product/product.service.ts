import { Injectable } from '@nestjs/common';
import { Product, Prisma, StockProduct } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ProductResponseItem, StockProductDTO } from './product.dto';

export type productCreateType = {
  name: string;
  price: number;
  priceUnit: string;
  tenantId: number;
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
  ): Promise<ProductResponseItem | null> {
    const product = await this.prisma.product.findUnique({
      where: productWhereUniqueInput,
      include: { ingredients: true, StockProduct: true },
    });
    if (!product.StockProduct)
      return { ...product, inStockUnit: 'kg', inStock: 0, costPrice: 0 };
    const inStock = product.StockProduct.inStock || 0;
    const inStockUnit = product.StockProduct.inStockUnit || 'kg';
    const costPrice = product.StockProduct.costPrice || 0;
    delete product.StockProduct;
    return { ...product, inStockUnit, inStock, costPrice };
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ProductWhereUniqueInput;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }): Promise<ProductResponseItem[]> {
    const { skip, take, cursor, where, orderBy } = params;

    const products = await this.prisma.product.findMany({
      skip,
      take,
      cursor,
      where: { ...where, AND: { deleted: false } },
      orderBy,
      include: { ingredients: true, StockProduct: true },
    });
    return products.map((p) => {
      const inStock = p.StockProduct?.inStock || 0;
      const inStockUnit = p.StockProduct?.inStockUnit || 'kg';
      const costPrice = p.StockProduct?.costPrice || 0;
      return {
        ...p,
        StockProduct: undefined,
        inStock,
        inStockUnit,
        costPrice,
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

  async create(data: productCreateType): Promise<Product> {
    const productCreateInput = {
      name: data.name,
      price: data.price,
      priceUnit: data.priceUnit,
      tenant: { connect: { id: data.tenantId } },
      ingredients: {
        create: (data.ingredients || [])
          .filter((ing) => ing.inventoryId)
          .map((ingredient) => {
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
    return {
      ...product,
    };
  }
  async addInStock(data: StockProductDTO, tenantId: number) {
    const invenoryUpdatePromises = [];
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: { ingredients: { include: { inventory: true } } },
    });

    let costPrice = 0;
    if (!data.noCalculation) {
      product.ingredients.forEach((ingredient) => {
        let ingredientTotalAmountDecrement = 0;
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
              costPrice += amountToDecrement * inventoryHistoryItem.price;
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
            ingredientTotalAmountDecrement += amountToDecrement;

            await this.prisma.inventoryEntryHistory.update({
              where: { id: inventoryRecord.id },
              data: dataToUpdate,
            });
          }
          const newAvg =
            (ingredient.inventory.amount * ingredient.inventory.avg -
              ingredientTotalAmountDecrement * ingredient.inventory.avg) /
            (ingredient.inventory.amount - ingredientTotalAmountDecrement);
          await this.prisma.inventory.update({
            where: { id: ingredient.inventoryId },
            data: {
              amount: { decrement: ingredientTotalAmountDecrement },
              avg: newAvg,
            },
          });
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
        product: { connect: { id: data.productId } },
        tenant: { connect: { id: tenantId } },
        inStock: data.inStock,
        inStockUnit: data.inStockUnit,
        costPrice: costPrice / data.inStock,
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
    tenantId: number,
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
      return this.addInStock(
        {
          ...stockProductDto,
        },
        tenantId,
      );
    }
  }
  async makeProduct(
    productPayload: {
      amount: number;
      id: number;
    },
    tenantId: number,
  ): Promise<ProductResponseItem | null> {
    const stockProduct = await this.prisma.stockProduct.findUnique({
      where: { productId: productPayload.id },
      include: { product: true },
    });

    const stockProductUpdated = await this.addInStock(
      {
        ...stockProduct,
        productId: productPayload.id,
        inStock: productPayload.amount,
        inStockUnit: stockProduct?.inStockUnit || 'kg',
      },
      tenantId,
    );
    const product = await this.prisma.product.findUnique({
      where: { id: productPayload.id },
    });
    return {
      ...product,
      inStock: stockProductUpdated.inStock,
      inStockUnit: stockProductUpdated.inStockUnit,
      costPrice: stockProductUpdated.costPrice,
    };
  }
  async updateAmount(
    id: number,
    params: {
      where: Prisma.StockProductWhereInput;
      data: { amount: number; costPrice: number; amountUnit?: string };
    },
    tenantId: number,
  ): Promise<ProductResponseItem> {
    const { data, where } = params;
    const stockProduct = await this.prisma.stockProduct.findFirst({
      where: { productId: where.id },
    });
    let stockProductUpdated: StockProduct;
    if (stockProduct?.id) {
      stockProductUpdated = await this.prisma.stockProduct.update({
        where: { productId: id },
        data: {
          inStock: data.amount,
          costPrice: data.costPrice,
          inStockUnit: data.amountUnit || 'kg',
        },
      });
    } else {
      stockProductUpdated = await this.prisma.stockProduct.create({
        data: {
          product: {
            connect: {
              id: Number(where.id),
            },
          },
          tenant: { connect: { id: tenantId } },
          inStock: data.amount,
          costPrice: data.costPrice,
          inStockUnit: data.amountUnit || 'kg',
        },
      });
    }
    const product = await this.prisma.product.findUnique({
      where: { id: Number(where.id) },
    });
    return {
      ...product,
      inStock: stockProductUpdated.inStock,
      inStockUnit: stockProductUpdated.inStockUnit,
      costPrice: stockProductUpdated.costPrice,
    };
  }

  async update(params: {
    where: Prisma.ProductWhereUniqueInput;
    data: productCreateType;
  }): Promise<Product | null> {
    const { data, where } = params;
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
    return {
      ...productUpdated,
    };
  }

  async delete(where: Prisma.ProductWhereUniqueInput): Promise<Product> {
    const prod = await this.prisma.product.update({
      where,
      data: { deleted: true },
    });
    return prod;
  }
  async deleteIngredients(where: Prisma.IngredientWhereInput): Promise<number> {
    return (await this.prisma.ingredient.deleteMany({ where })).count;
  }
}
