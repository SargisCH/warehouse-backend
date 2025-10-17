import { Inject, Injectable } from '@nestjs/common';
import AWS_SDK from 'aws-sdk';

import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ProductGroupsRepository } from 'src/repositories/product_groups.repository';
import { ProductGroupsDTO } from './product_groups.dto';

@Injectable()
export class ProductGroupsService {
  constructor(
    @Inject(ProductGroupsRepository)
    private productGroupsRepository: ProductGroupsRepository,
  ) {}

  async find(where: { name?: string; id?: number }) {
    return this.productGroupsRepository.find(where);
  }

  async findAll() {
    return this.productGroupsRepository.findAll();
  }

  async create(data: ProductGroupsDTO) {
    return this.productGroupsRepository.create(data);
  }
}
