import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/drizzle/schema';
import { User } from 'src/drizzle/schema';
import {
  InventoryRepository,
  isStockShortage,
} from 'src/repositories/inventory.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import { ManagerStockRepository } from 'src/repositories/manager_stock.repository';
import { PriceListRepository } from 'src/repositories/price_list.repository';
import {
  StockTransferListOptions,
  StockTransferRepository,
} from 'src/repositories/stock_transfer.repository';
import { WarehouseRepository } from 'src/repositories/warehouse.repository';
import { withDocumentCode } from 'src/shared/helpers/document-code';
import {
  fromMilli,
  fromMinor,
  priceLines,
  toMilli,
  today,
} from 'src/shared/helpers/money';
import { CreateStockTransferDto, TransferKind } from './stock_transfer.dto';

type Executor = NodePgDatabase<typeof schema>;

// A place stock sits: a warehouse, or a deliverer's van.
type Holder = { warehouseId: number } | { managerId: number };

// Which ends each kind of document moves between.
const ENDS: Record<
  TransferKind,
  ['warehouse' | 'manager', 'warehouse' | 'manager']
> = {
  WAREHOUSE: ['warehouse', 'warehouse'],
  DELIVERER: ['manager', 'manager'],
  ISSUE: ['warehouse', 'manager'],
  RETURN: ['manager', 'warehouse'],
};

@Injectable()
export class StockTransferService {
  constructor(
    private readonly transferRepository: StockTransferRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly managerStock: ManagerStockRepository,
    private readonly managerRepository: ManagerRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly priceListRepository: PriceListRepository,
  ) {}

  private async resolveEnd(
    user: User,
    side: 'warehouse' | 'manager',
    warehouseId: number | undefined,
    managerId: number | undefined,
    label: string,
  ): Promise<Holder> {
    if (side === 'warehouse') {
      if (!warehouseId) {
        throw new BadRequestException(`${label} warehouse is required`);
      }
      const warehouse = await this.warehouseRepository.findOne(warehouseId);
      if (!warehouse) {
        throw new BadRequestException(`${label} warehouse not found`);
      }
      return { warehouseId };
    }
    if (!managerId) {
      throw new BadRequestException(`${label} deliverer is required`);
    }
    const manager = await this.managerRepository.findById(managerId);
    if (!manager || manager.tenantId !== user.tenantId) {
      throw new BadRequestException(`${label} deliverer not found`);
    }
    return { managerId };
  }

  private async move(
    holder: Holder,
    productId: number,
    delta: bigint,
    tx: Executor,
  ) {
    try {
      if ('warehouseId' in holder) {
        await this.inventoryRepository.adjust(
          holder.warehouseId,
          productId,
          fromMilli(delta),
          tx,
        );
      } else {
        await this.managerStock.adjust(
          holder.managerId,
          productId,
          fromMilli(delta),
          tx,
        );
      }
    } catch (e) {
      if (isStockShortage(e)) {
        throw new BadRequestException(
          `Not enough of product ${productId} to move`,
        );
      }
      throw e;
    }
  }

  async create(user: User, dto: CreateStockTransferDto) {
    const [fromSide, toSide] = ENDS[dto.kind];
    const from = await this.resolveEnd(
      user,
      fromSide,
      dto.fromWarehouseId,
      dto.fromManagerId,
      'Source',
    );
    const to = await this.resolveEnd(
      user,
      toSide,
      dto.toWarehouseId,
      dto.toManagerId,
      'Destination',
    );
    if (JSON.stringify(from) === JSON.stringify(to)) {
      throw new BadRequestException('Source and destination must differ');
    }

    const productIds = dto.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('A product may only appear on one line');
    }

    // Lines without a price take it from the chosen price list.
    let listPrices = new Map<number, string>();
    if (dto.priceListId) {
      const priceList = await this.priceListRepository.findById(
        dto.priceListId,
      );
      if (!priceList || priceList.tenantId !== user.tenantId) {
        throw new BadRequestException('Price list not found');
      }
      listPrices = await this.priceListRepository.pricesFor(
        dto.priceListId,
        productIds,
      );
    }
    const { items, total } = priceLines(
      dto.items.map((item) => ({
        ...item,
        price: item.price ?? listPrices.get(item.productId) ?? '0',
      })),
    );

    return this.transferRepository.transaction(async (tx) => {
      for (const item of items) {
        await this.move(from, item.line.productId, -item.quantityMilli, tx);
        await this.move(to, item.line.productId, item.quantityMilli, tx);
      }

      const transfer = await withDocumentCode(
        tx,
        () => this.transferRepository.nextCode(user.tenantId, tx),
        'stock_transfers_tenant_code',
        (code) =>
          this.transferRepository.insert(
            {
              code,
              kind: dto.kind,
              documentDate: dto.documentDate ?? today(),
              fromWarehouseId: 'warehouseId' in from ? from.warehouseId : null,
              toWarehouseId: 'warehouseId' in to ? to.warehouseId : null,
              fromManagerId: 'managerId' in from ? from.managerId : null,
              toManagerId: 'managerId' in to ? to.managerId : null,
              sender: dto.sender ?? null,
              receiver: dto.receiver ?? null,
              priceListId: dto.priceListId ?? null,
              note: dto.note ?? null,
              totalAmount: fromMinor(total),
              tenantId: user.tenantId,
            },
            tx,
          ),
      );

      await this.transferRepository.insertItems(
        transfer.id,
        items.map((item) => ({
          productId: item.line.productId,
          quantity: item.quantity,
          price: item.price,
          amount: item.amount,
        })),
        tx,
      );
      return transfer;
    });
  }

  async findAll(user: User, options: StockTransferListOptions) {
    return this.transferRepository.findByTenant(user.tenantId, options);
  }

  async findOne(user: User, id: number) {
    const transfer = await this.transferRepository.findById(id);
    if (!transfer || transfer.tenantId !== user.tenantId) {
      throw new NotFoundException('Transfer not found');
    }
    const items = await this.transferRepository.itemsFor(id);
    return { ...transfer, items };
  }

  /**
   * Puts the goods back where they came from. Refused if the destination has
   * since sold or moved them on, which the stock CHECK catches.
   */
  async remove(user: User, id: number) {
    const transfer = await this.findOne(user, id);
    const from: Holder = transfer.fromWarehouseId
      ? { warehouseId: transfer.fromWarehouseId }
      : { managerId: transfer.fromManagerId };
    const to: Holder = transfer.toWarehouseId
      ? { warehouseId: transfer.toWarehouseId }
      : { managerId: transfer.toManagerId };

    return this.transferRepository.transaction(async (tx) => {
      for (const item of transfer.items) {
        const quantity = toMilli(item.quantity);
        await this.move(to, item.productId, -quantity, tx);
        await this.move(from, item.productId, quantity, tx);
      }
      await this.transferRepository.delete(id, tx);
      return { id };
    });
  }
}
