import { Injectable } from '@nestjs/common';
import { Sale, Prisma, User } from '@prisma/client';

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
    productId: number;
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
      include: { client: true, saleItems: { include: { product: true } } },
    });
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
      include: { client: true, saleItems: { include: { product: true } } },
    });
  }

  async create(data: SaleAPIType, user: User): Promise<Sale> {
    const productCounts: Array<{ id: number; amount: number }> =
      data.saleItems.map((si) => ({ id: si.productId, amount: si.amount }));

    const promises = [];
    productCounts.forEach((pc) => {
      promises.push(
        this.prisma.product.update({
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
    const isPartailCredit = data.paymentType === PaymentTypeEnum.CREDIT;
    const saleCreated = await this.prisma.sale.create({
      data: {
        paymentType: data.paymentType,
        partialCreditAmount: isPartailCredit ? data.partialCreditAmount : 0,
        client: {
          connect: { id: Number(data.clientId) },
        },
        saleItems: { createMany: { data: data.saleItems } },
      },
    });
    const amount = data.saleItems.reduce(
      (acc, current) => acc + current.price * current.amount,
      0,
    );

    if (data.paymentType === PaymentTypeEnum.CREDIT) {
      await this.prisma.credit.create({
        data: {
          saleId: saleCreated.id,
          clientId: data.clientId,
          amount,
        },
      });
    } else if (isPartailCredit) {
      const creditAmount = data.partialCreditAmount;
      await this.prisma.credit.create({
        data: {
          saleId: saleCreated.id,
          clientId: data.clientId,
          amount: creditAmount,
        },
      });
    } else if (data.paymentType === PaymentTypeEnum.CASH) {
      const totalAmount = data.saleItems.reduce(
        (acc, s) => s.price * s.amount + acc,
        0,
      );
      const { tenantId } = user;
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { balance: { increment: totalAmount } },
      });
    } else if (data.paymentType === PaymentTypeEnum.PARTIAL_CREDIT) {
      const totalAmount = data.saleItems.reduce(
        (acc, s) => s.price * s.amount + acc,
        0,
      );

      if (!data.partialCreditAmount) {
        throw new Error(
          'The partial credit amount is mandatory when partial credit is selected as a payment method',
        );
      }
      const { tenantId } = user;
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          balance: { increment: totalAmount - data.partialCreditAmount },
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
