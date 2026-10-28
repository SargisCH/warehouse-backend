import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PriceListListOptions,
  PriceListRepository,
} from 'src/repositories/price_list.repository';
import { ProductRepository } from 'src/repositories/product.repository';
import { CreatePriceListDto, UpdatePriceListDto } from './sale.dto';
import { User } from 'src/drizzle/schema';

const UNIQUE_VIOLATION = '23505';
const CODE_RETRIES = 5;

@Injectable()
export class PriceListService {
  constructor(
    private readonly priceListRepository: PriceListRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async create(user: User, dto: CreatePriceListDto) {
    for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
      const code = await this.priceListRepository.nextCode(user.tenantId);
      try {
        const priceList = await this.priceListRepository.create({
          code,
          name: dto.name,
          isDefault: dto.isDefault ?? false,
          isClosed: dto.isClosed ?? false,
          tenantId: user.tenantId,
        });
        if (dto.isDefault) {
          await this.priceListRepository.clearDefault(
            user.tenantId,
            priceList.id,
          );
        }
        if (dto.items?.length) {
          await this.priceListRepository.replaceItems(priceList.id, dto.items);
        }
        return priceList;
      } catch (e) {
        const isDuplicateCode =
          (e?.cause?.code ?? e?.code) === UNIQUE_VIOLATION &&
          String(e?.cause?.constraint ?? e?.constraint) ===
            'price_lists_tenant_code';
        if (!isDuplicateCode || attempt === CODE_RETRIES - 1) throw e;
      }
    }
  }

  async findAll(user: User, options: PriceListListOptions) {
    return this.priceListRepository.findByTenant(user.tenantId, options);
  }

  async findOne(user: User, id: number) {
    const priceList = await this.priceListRepository.findById(id);
    if (!priceList || priceList.tenantId !== user.tenantId) {
      throw new NotFoundException('Price list not found');
    }
    const items = await this.priceListRepository.entries(id);
    return { ...priceList, items };
  }

  /** «Ավելացնել ապրանքները գնացուցակից» - the picker's rows. */
  async entries(user: User, id: number, searchTerm?: string) {
    await this.findOne(user, id);
    return this.priceListRepository.entries(id, searchTerm);
  }

  async update(user: User, id: number, dto: UpdatePriceListDto) {
    await this.findOne(user, id);
    const { items, ...fields } = dto;
    const priceList = await this.priceListRepository.update(id, fields);
    if (dto.isDefault) {
      await this.priceListRepository.clearDefault(user.tenantId, id);
    }
    if (items) {
      await this.priceListRepository.replaceItems(id, items);
    }
    return priceList;
  }

  async remove(user: User, id: number) {
    await this.findOne(user, id);
    const clientCount = await this.priceListRepository.countClientsUsing(id);
    if (clientCount > 0) {
      throw new BadRequestException(
        `Price list is attached to ${clientCount} buyer(s) and cannot be deleted`,
      );
    }
    const saleCount = await this.priceListRepository.countSalesUsing(id);
    if (saleCount > 0) {
      throw new BadRequestException(
        `Price list is used by ${saleCount} sale(s) and cannot be deleted`,
      );
    }
    return this.priceListRepository.delete(id);
  }

  /** The products that can be priced onto a list. */
  async availableProducts(searchTerm?: string) {
    const { data } = await this.productRepository.findAll(
      searchTerm ? { name: searchTerm } : {},
    );
    return data;
  }
}
