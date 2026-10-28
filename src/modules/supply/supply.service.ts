import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { CreateSupplyDto, FindAllSuppliesDto } from './supply.dto';
import { SupplyRepository } from 'src/repositories/supply.repository';
import { PriceListRepository } from 'src/repositories/price_list.repository';
import { fromMinor, priceLines } from 'src/shared/helpers/money';

@Injectable()
export class SupplyService {
  constructor(
    @Inject(SupplyRepository)
    private supplyRepository: SupplyRepository,
    private priceListRepository: PriceListRepository,
  ) {}

  async create(dto: CreateSupplyDto) {
    const productIds = dto.products.map((product) => product.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('A product may only appear on one line');
    }
    const listPrices = dto.priceListId
      ? await this.priceListRepository.pricesFor(dto.priceListId, productIds)
      : new Map<number, string>();

    const { items, total } = priceLines(
      dto.products.map((product) => ({
        productId: product.productId,
        quantity: product.amount,
        price: product.price ?? listPrices.get(product.productId) ?? '0',
      })),
    );
    return this.supplyRepository.create(
      dto,
      items.map((item) => ({
        productId: item.line.productId,
        amount: item.quantity,
        price: item.price,
        total: item.amount,
      })),
      fromMinor(total),
    );
  }

  async findAll(findAllSuppliesDto: FindAllSuppliesDto) {
    const { page, searchTerm } = findAllSuppliesDto;
    return this.supplyRepository.findAll({ page, searchTerm });
  }
}
