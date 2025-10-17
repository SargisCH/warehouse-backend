import { Inject, Injectable } from '@nestjs/common';
import AWS_SDK from 'aws-sdk';

import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { ProductRepository } from 'src/repositories/product.repository';
import { ProductDTO, UpdateProductDto } from './product.dto';

@Injectable()
export class ProductService {
  constructor(
    @Inject(ProductRepository)
    private productRepository: ProductRepository,
  ) {}

  async find(where: { name?: string; id?: number }) {
    return this.productRepository.find(where);
  }

  async findAll(
    queryParams: {
      name?: string;
      forSale?: boolean;
      returnable?: boolean;
      fractional?: boolean;
      sku?: string;
      units?: Array<string>;
      groups?: Array<string>;
      warehouses?: Array<string>;
      page?: number;
    } = {},
  ) {
    return this.productRepository.findAll(queryParams);
  }

  async create(data: ProductDTO) {
    return this.productRepository.create(data);
  }
  async update(id: number, data: UpdateProductDto) {
    return this.productRepository.update(id, data);
  }
  async delete(id: number) {
    return this.productRepository.delete(id);
  }
  async move(body: {
    warehouseId: number;
    products: { id: number | string; quantity: number }[];
  }) {
    return this.productRepository.move(body);
  }
}
