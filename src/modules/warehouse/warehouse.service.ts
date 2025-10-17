import { Inject, Injectable } from '@nestjs/common';
import AWS_SDK from 'aws-sdk';

import { WarehouseRepository } from 'src/repositories/warehouse.repository';
import { WarehouseDTO } from './warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(
    @Inject(WarehouseRepository)
    private warehouseRepository: WarehouseRepository,
  ) {}

  async findOne(id: number) {
    return this.warehouseRepository.findOne(id);
  }

  async findAll() {
    return this.warehouseRepository.findAll();
  }

  async findWithProducts(id: number) {
    return this.warehouseRepository.findWithProducts(id);
  }

  async create(data: WarehouseDTO) {
    return this.warehouseRepository.create(data);
  }
  async update(id: number, data: WarehouseDTO) {
    return this.warehouseRepository.update(id, data);
  }
}
