import { Injectable } from '@nestjs/common';
import {
  Sale,
  SaleReturn,
  Prisma,
  User,
  TransactionType,
  TransactionStatus,
  CreditType,
  SaleItem,
  Client,
} from '@prisma/client';
import { BalanceHistoryService } from '../balanceHistory/balanceHistory.service';

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
  constructor(
    private prisma: PrismaService,
    private readonly balanceHistoryService: BalanceHistoryService,
  ) {}

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
  async findSaleItemsBySaleId(saleId: number): Promise<SaleItem[] | null> {
    return this.prisma.saleItem.findMany({
      where: { saleId: saleId },
      include: { stockProduct: { include: { product: true } } },
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
  async findAllReturns(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.SaleReturnWhereUniqueInput;
    where?: Prisma.SaleReturnWhereInput;
    orderBy?: Prisma.SaleReturnOrderByWithRelationInput;
  }): Promise<
    {
      saleId: number;
      clientId: number;
      client: Client;
      returnItems: SaleReturn[];
    }[]
  > {
    const { skip, take, cursor, where, orderBy } = params;
    const groupedReturns = await this.prisma.saleReturn.groupBy({
      by: ['saleId'],
      where,
    });
    const resultWithRelations = await Promise.all(
      groupedReturns.map(async (group) => {
        const returns = await this.prisma.saleReturn.findMany({
          where: {
            saleId: group.saleId,
          },
          skip,
          take,
          orderBy,
          cursor,
          include: {
            stockProduct: { include: { product: true } },
            sale: {
              include: {
                client: true,
                saleItems: { include: { stockProduct: true } },
              },
            },
          },
        });

        return {
          ...group,
          clientId: returns[0].sale.clientId,
          client: returns[0].sale.client,
          returnItems: returns,
        };
      }),
    );
    return resultWithRelations;
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
    const stockProducts = await this.prisma.stockProduct.findMany({
      where: { id: { in: data.saleItems.map((si) => si.stockProductId) } },
      include: { product: true },
    });
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    const saleCreated = await this.prisma.sale.create({
      data: {
        tenant: { connect: { id: user.tenantId } },
        paymentType: data.paymentType,
        partialCreditAmount: isPartailCredit ? data.partialCreditAmount : 0,
        client: {
          connect: { id: Number(data.clientId) },
        },
        saleItems: {
          createMany: {
            data: data.saleItems.map((si) => {
              const productFound = stockProducts.find(
                (stockProduct) => stockProduct.id === si.stockProductId,
              );

              if (!productFound) return si;
              if (si.price !== productFound.product.price) {
                return { ...si, originalPrice: productFound.product.price };
              }
              return si;
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
          type: CreditType.TO_RECEIVE,
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
      await this.balanceHistoryService.create({
        direction: TransactionType.IN,
        amount: totalAmount - data.partialCreditAmount,
        date: new Date(),
        status: TransactionStatus.FINISHED,
        sale: {
          connect: {
            id: saleCreated.id,
          },
        },
        client: {
          connect: { id: saleCreated.clientId },
        },
        tenant: { connect: { id: user.tenantId } },
        before: tenant.balance,
        result: totalAmount - data.partialCreditAmount + tenant.balance,
      });
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
          type: CreditType.TO_RECEIVE,
        },
      });
    } else if (data.paymentType === PaymentTypeEnum.CASH) {
      const totalAmount = data.saleItems.reduce(
        (acc, s) => s.price * s.amount + acc,
        0,
      );

      await this.balanceHistoryService.create({
        direction: TransactionType.IN,
        amount: totalAmount,
        date: new Date(),
        status: TransactionStatus.FINISHED,
        sale: {
          connect: {
            id: saleCreated.id,
          },
        },
        client: {
          connect: { id: saleCreated.clientId },
        },
        tenant: { connect: { id: user.tenantId } },
        before: tenant.balance,
        result: totalAmount + tenant.balance,
      });
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { balance: { increment: totalAmount } },
      });
    } else if (data.paymentType === PaymentTypeEnum.TRANSFER) {
      await this.prisma.transactionHistory.create({
        data: {
          amount,
          tenant: { connect: { id: user.tenantId } },
          sale: { connect: { id: saleCreated.id } },
          transactionType: TransactionType.IN,
          client: { connect: { id: data.clientId } },
        },
      });
    }

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
  async confirmReturnByReturnId(returnId: number, user: User): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    const returnedSale = await this.prisma.saleReturn.findUnique({
      where: { id: returnId },
      include: {
        sale: {
          include: {
            saleItems: {
              include: {
                stockProduct: true,
              },
            },
          },
        },
      },
    });
    const dbSaleItem = returnedSale.sale.saleItems.find(
      (item: any) => item.stockProductId === returnedSale.stockProductId,
    );
    if (returnedSale.amount > dbSaleItem.amount) {
      throw new Error(
        'Amount of return should less then the original amount of order',
      );
    }
    const amount = returnedSale.amount * dbSaleItem.price;
    await this.prisma.stockProduct.update({
      where: { id: returnedSale.stockProductId },
      data: {
        inStock: { increment: returnedSale.amount },
      },
    });
    if (returnedSale.sale.paymentType === PaymentTypeEnum.CASH) {
      await this.prisma.balanceHistory.create({
        data: {
          tenant: { connect: { id: user.tenantId } },
          amount: amount,
          before: tenant.balance,
          result: tenant.balance - amount,
          return: { connect: { id: returnedSale.id } },
          direction: TransactionType.OUT,
          status: TransactionStatus.FINISHED,
        },
      });
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { balance: { decrement: amount } },
      });
    } else if (returnedSale.sale.paymentType === PaymentTypeEnum.CREDIT) {
      const credit = await this.prisma.credit.findFirst({
        where: { saleId: returnedSale.id },
      });
      if (credit.status === TransactionStatus.FINISHED) {
        await this.prisma.balanceHistory.create({
          data: {
            tenant: { connect: { id: user.tenantId } },
            amount,
            before: tenant.balance,
            result: tenant.balance - amount,
            return: { connect: { id: returnedSale.id } },
            direction: TransactionType.OUT,
            status: TransactionStatus.FINISHED,
          },
        });
        await this.prisma.tenant.update({
          where: { id: user.tenantId },
          data: { balance: { decrement: amount } },
        });
      }
    } else if (returnedSale.sale.paymentType === PaymentTypeEnum.TRANSFER) {
      const transaction = await this.prisma.transactionHistory.findFirst({
        where: { saleId: returnedSale.id },
      });
      if (transaction.status === TransactionStatus.FINISHED) {
        await this.prisma.balanceHistory.create({
          data: {
            tenant: { connect: { id: user.tenantId } },
            amount,
            before: tenant.balance,
            result: tenant.balance - amount,
            return: { connect: { id: returnedSale.id } },
            direction: TransactionType.OUT,
            status: TransactionStatus.FINISHED,
          },
        });
        await this.prisma.tenant.update({
          where: { id: user.tenantId },
          data: { balance: { decrement: amount } },
        });
      }
    }
    await this.prisma.saleReturn.updateMany({
      where: { id: returnedSale.id },
      data: { confirmed: true },
    });
  }
  async confirmReturn(saleId: number, user: User) {
    const returnedSales = await this.prisma.saleReturn.findMany({
      where: { sale: { id: saleId }, confirmed: false, disposed: false },
      include: { sale: { include: { saleItems: true } } },
    });
    const promises = [];
    returnedSales.forEach((rSale) => {
      promises.push(this.confirmReturnByReturnId(rSale.id, user));
    });
    await Promise.all(promises);
  }
  async returnSale(
    saleId: number,
    returnData: {
      saleItems: Array<{ amount: number; stockProductId: number }>;
    },
    user: User,
  ): Promise<void> {
    const promises = [];
    returnData.saleItems.forEach((saleItem) => {
      promises.push(
        this.prisma.saleReturn.create({
          data: {
            sale: { connect: { id: saleId } },
            amount: saleItem.amount,
            stockProduct: { connect: { id: saleItem.stockProductId } },
            tenant: { connect: { id: user.tenantId } },
          },
        }),
      );
    });
    await Promise.all(promises);
  }
  async disposeReturn(saleId: number): Promise<void> {
    await this.prisma.saleReturn.updateMany({
      where: { saleId, disposed: false, confirmed: false },
      data: { disposed: true },
    });
  }
  async disposeByReturnId(returnId: number): Promise<void> {
    await this.prisma.saleReturn.updateMany({
      where: { id: returnId },
      data: { disposed: true },
    });
  }
  async cancelSale(saleId: number, user: User): Promise<void> {
    const sale = await this.findOne({ id: Number(saleId) });
    const saleItems = await this.findSaleItemsBySaleId(Number(saleId));
    const promises = [];
    let amountToAdd = 0;
    if (sale.paymentType === PaymentTypeEnum.CASH) {
      saleItems.forEach((si) => {
        const amountPerProduct = si.amount * si.price;

        amountToAdd += amountPerProduct;
        promises.push(async () => {
          this.prisma.stockProduct.update({
            where: { id: si.stockProductId },
            data: {
              inStock: { increment: si.amount },
            },
          });
          const tenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
          });

          await this.prisma.balanceHistory.create({
            data: {
              tenant: { connect: { id: user.tenantId } },
              amount: amountPerProduct,
              before: tenant.balance,
              result: tenant.balance - amountPerProduct,
              direction: TransactionType.OUT,
              status: TransactionStatus.FINISHED,
            },
          });
        });
      });

      await Promise.all(promises.map((p) => p()));
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { balance: { decrement: amountToAdd } },
      });
      await this.prisma.sale.update({
        where: { id: saleId },
        data: { canceled: true },
      });
    } else if (sale.paymentType === PaymentTypeEnum.CREDIT) {
      let promises = [];
      const credit = await this.prisma.credit.findFirst({
        where: { saleId: sale.id },
      });
      saleItems.forEach((si) => {
        const amountPerProduct = si.amount * si.price;

        amountToAdd += amountPerProduct;
        promises.push(async () => {
          this.prisma.stockProduct.update({
            where: { id: si.stockProductId },
            data: {
              inStock: { increment: si.amount },
            },
          });

          if (credit.status === TransactionStatus.FINISHED) {
            const tenant = await this.prisma.tenant.findUnique({
              where: { id: user.tenantId },
            });

            await this.prisma.balanceHistory.create({
              data: {
                tenant: { connect: { id: user.tenantId } },
                amount: amountPerProduct,
                before: tenant.balance,
                result: tenant.balance - amountPerProduct,
                direction: TransactionType.OUT,
                status: TransactionStatus.FINISHED,
              },
            });
          }
        });
      });
      await Promise.all(promises.map((p) => p()));
      await this.prisma.sale.update({
        where: { id: saleId },
        data: { canceled: true },
      });
      if (credit.status === TransactionStatus.FINISHED) {
        await this.prisma.tenant.update({
          where: { id: user.tenantId },
          data: { balance: { decrement: amountToAdd } },
        });
      }
    } else if (sale.paymentType === PaymentTypeEnum.TRANSFER) {
      let promises = [];
      const transaction = await this.prisma.transactionHistory.findFirst({
        where: { saleId: sale.id },
      });
      saleItems.forEach((si) => {
        const amountPerProduct = si.amount * si.price;

        amountToAdd += amountPerProduct;
        promises.push(async () => {
          this.prisma.stockProduct.update({
            where: { id: si.stockProductId },
            data: {
              inStock: { increment: si.amount },
            },
          });

          if (transaction.status === TransactionStatus.FINISHED) {
            const tenant = await this.prisma.tenant.findUnique({
              where: { id: user.tenantId },
            });

            await this.prisma.balanceHistory.create({
              data: {
                tenant: { connect: { id: user.tenantId } },
                amount: amountPerProduct,
                before: tenant.balance,
                result: tenant.balance - amountPerProduct,
                direction: TransactionType.OUT,
                status: TransactionStatus.FINISHED,
              },
            });
          }
        });
      });
      await Promise.all(promises.map((p) => p()));
      await this.prisma.sale.update({
        where: { id: saleId },
        data: { canceled: true },
      });
      if (transaction.status === TransactionStatus.FINISHED) {
        await this.prisma.tenant.update({
          where: { id: user.tenantId },
          data: { balance: { decrement: amountToAdd } },
        });
      }
    } else if (sale.paymentType === PaymentTypeEnum.PARTIAL_CREDIT) {
      let promises = [];
      const credit = await this.prisma.credit.findFirst({
        where: { saleId: sale.id },
      });
      const total = saleItems.reduce((acc, item) => {
        return acc + item.amount * item.price;
      }, 0);

      let cashAmount = total - sale.partialCreditAmount;
      saleItems.forEach((si) => {
        const amountPerProduct = si.amount * si.price;

        amountToAdd += amountPerProduct;
        promises.push(async () => {
          this.prisma.stockProduct.update({
            where: { id: si.stockProductId },
            data: {
              inStock: { decrement: si.amount },
            },
          });
          const tenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
          });
          await this.prisma.balanceHistory.create({
            data: {
              tenant: { connect: { id: user.tenantId } },
              amount: cashAmount,
              before: tenant.balance,
              result: tenant.balance - cashAmount,
              direction: TransactionType.OUT,
              status: TransactionStatus.FINISHED,
            },
          });
          if (credit.status === TransactionStatus.FINISHED) {
            const tenant = await this.prisma.tenant.findUnique({
              where: { id: user.tenantId },
            });

            await this.prisma.balanceHistory.create({
              data: {
                tenant: { connect: { id: user.tenantId } },
                amount: amountPerProduct,
                before: tenant.balance,
                result: tenant.balance - amountPerProduct,
                direction: TransactionType.OUT,
                status: TransactionStatus.FINISHED,
              },
            });
          }
        });
      });
      await Promise.all(promises.map((p) => p()));
      await this.prisma.sale.update({
        where: { id: saleId },
        data: { canceled: true },
      });
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { balance: { decrement: amountToAdd } },
      });
      if (credit.status === TransactionStatus.FINISHED) {
        await this.prisma.tenant.update({
          where: { id: user.tenantId },
          data: { balance: { decrement: amountToAdd } },
        });
      }
    }
  }
}
