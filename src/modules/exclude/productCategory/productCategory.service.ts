import { Injectable } from '@nestjs/common';
import { ProductCategory, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductCategoryService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    productCategoryWhereUniqueInput: Prisma.ProductCategoryWhereUniqueInput,
  ): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findUnique({
      where: productCategoryWhereUniqueInput,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ProductCategoryWhereUniqueInput;
    where?: Prisma.ProductCategoryWhereInput;
    orderBy?: Prisma.ProductCategoryOrderByWithRelationInput;
  }): Promise<ProductCategory[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.productCategory.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(
    data: Prisma.ProductCategoryCreateInput,
  ): Promise<ProductCategory> {
    return this.prisma.productCategory.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.ProductCategoryWhereUniqueInput;
    data: Prisma.ProductCategoryUpdateInput;
  }): Promise<ProductCategory> {
    const { data, where } = params;
    return this.prisma.productCategory.update({
      data,
      where,
    });
  }

  async delete(where: Prisma.ProductCategoryWhereUniqueInput): Promise<number> {
    const res = await this.prisma.productCategory.deleteMany({
      where,
    });
    return res.count;
  }
}
