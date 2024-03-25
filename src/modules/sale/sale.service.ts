import { Injectable } from '@nestjs/common';
import { Sale, Prisma, User, TransactionType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

enum PaymentTypeEnum {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
  TRANSFER = 'TRANSFER',
  PARTIAL_CREDIT = 'PARTIAL CREDIT',
}

export interface SaleAPIType {
  clientId: number;
  paymentType: PaymentTypeEnum;
  partialCreditAmount?: number;
  saleItems: Array<{
    stockProductId: number;
    price: number;
    priceUnit: string;
    amount: number;
    amountUnit: string;
  }>;
}

@Injectable()
export class SaleService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    SaleCategoryWhereUniqueInput: Prisma.SaleWhereUniqueInput,
  ): Promise<Sale | null> {
    return this.prisma.sale.findUnique({
      where: SaleCategoryWhereUniqueInput,
      include: {
        client: true,
        saleItems: {
          include: { stockProduct: { include: { product: true } } },
        },
      },
    });
  }
  async getTotalPages(
    pageSize: number,
    where?: Prisma.SaleWhereInput,
  ): Promise<number> {
    const totalPosts = await this.prisma.sale.count({ where });
    const totalPages = Math.ceil(totalPosts / pageSize);
    return totalPages;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.SaleWhereUniqueInput;
    where?: Prisma.SaleWhereInput;
    orderBy?: Prisma.SaleOrderByWithRelationInput;
  }): Promise<Sale[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.sale.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        client: true,
        saleItems: {
          include: { stockProduct: { include: { product: true } } },
        },
      },
    });
  }

  async create(data: SaleAPIType, user: User): Promise<Sale> {
    const productCounts: Array<{ id: number; amount: number }> =
      data.saleItems.map((si) => ({
        id: si.stockProductId,
        amount: si.amount,
      }));

    const promises = [];
    productCounts.forEach((pc) => {
      promises.push(
        this.prisma.stockProduct.update({
          where: {
            id: pc.id,
          },
          data: {
            inStock: {
              decrement: pc.amount,
            },
          },
        }),
      );
    });
    await Promise.all(promises);
    const isPartailCredit = data.paymentType === PaymentTypeEnum.PARTIAL_CREDIT;
    const products = await this.prisma.stockProduct.findMany({
      where: { id: { in: data.saleItems.map((si) => si.stockProductId) } },
      include: { product: true },
    });

    const saleCreated = await this.prisma.sale.create({
      data: {
        paymentType: data.paymentType,
        partialCreditAmount: isPartailCredit ? data.partialCreditAmount : 0,
        client: {
          connect: { id: Number(data.clientId) },
        },
        saleItems: {
          createMany: {
            data: data.saleItems.map((si) => {
              const productFound = products.find(
                (p) => p.productId === si.stockProductId,
              );

              if (!productFound) return si;
              if (si.price !== productFound.product.price) {
                return { ...si, originalPrice: productFound.product.price };
              }
            }),
          },
        },
      },
    });
    const amount = data.saleItems.reduce(
      (acc, current) => acc + current.price * current.amount,
      0,
    );

    const { tenantId } = user;

    if (data.paymentType === PaymentTypeEnum.CREDIT) {
      await this.prisma.credit.create({
        data: {
          saleId: saleCreated.id,
          clientId: data.clientId,
          amount,
        },
      });
    } else if (isPartailCredit) {
      const totalAmount = data.saleItems.reduce(
        (acc, s) => s.price * s.amount + acc,
        0,
      );

      if (!data.partialCreditAmount) {
        throw new Error(
          'The partial credit amount is mandatory when partial credit is selected as a payment method',
        );
      }
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          balance: { increment: totalAmount - data.partialCreditAmount },
        },
      });
      await this.prisma.credit.create({
        data: {
          amount: data.partialCreditAmount,
          saleId: saleCreated.id,
          clientId: data.clientId,
        },
      });
    } else if (data.paymentType === PaymentTypeEnum.CASH) {
      const totalAmount = data.saleItems.reduce(
        (acc, s) => s.price * s.amount + acc,
        0,
      );
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { balance: { increment: totalAmount } },
      });
    } else if (data.paymentType === PaymentTypeEnum.TRANSFER) {
      await this.prisma.transactionHistory.create({
        data: {
          amount,
          saleId: saleCreated.id,
          transactionType: TransactionType.IN,
          clientId: data.clientId,
        },
      });
    }
    // TODO: create balance table and save the paid info
    return saleCreated;
  }

  async update(params: {
    where: Prisma.SaleWhereUniqueInput;
    data: Prisma.SaleUpdateInput;
  }): Promise<Sale> {
    const { data, where } = params;
    return this.prisma.sale.update({
      data,
      where,
    });
  }

  async delete(where: Prisma.SaleWhereUniqueInput): Promise<number> {
    const res = await this.prisma.sale.deleteMany({
      where,
    });
    return res.count;
  }
}
