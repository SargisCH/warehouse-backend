import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { WarehouseRepository } from 'src/repositories/warehouse.repository';
import { fromMilli, toMilli } from 'src/shared/helpers/money';
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

  async findStock(id: number) {
    const rows = await this.warehouseRepository.findStock(id);
    const [warehouse] = rows;
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const products = rows.flatMap(({ product, unit, quantity }) =>
      product && quantity !== null ? [{ ...product, unit, quantity }] : [],
    );
    const totals = new Map<
      number | null,
      { unit: (typeof products)[number]['unit']; quantity: bigint }
    >();
    for (const { unit, quantity } of products) {
      const key = unit?.id ?? null;
      const previous = totals.get(key)?.quantity ?? 0n;
      totals.set(key, { unit, quantity: previous + toMilli(quantity) });
    }

    return {
      id: warehouse.warehouseId,
      name: warehouse.warehouseName,
      products,
      totals: Array.from(totals.values(), ({ unit, quantity }) => ({
        unit,
        quantity: fromMilli(quantity),
      })),
    };
  }

  async create(data: WarehouseDTO) {
    return this.warehouseRepository.create(data);
  }
  async update(id: number, data: WarehouseDTO) {
    return this.warehouseRepository.update(id, data);
  }
}
