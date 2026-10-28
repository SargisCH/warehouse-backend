import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { StockTransfer, StockTransferInsert } from 'src/drizzle/schema';
import { and, asc, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { nextDocumentCode } from 'src/shared/helpers/document-code';

type Executor = NodePgDatabase<typeof schema>;

export type StockTransferListOptions = {
  kind?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  // Either side of the movement.
  warehouseId?: number;
  managerId?: number;
};

const fromWarehouse = alias(schema.warehouses, 'from_warehouse');
const toWarehouse = alias(schema.warehouses, 'to_warehouse');
const fromManager = alias(
  schema.managers,
  'from_manager',
) as typeof schema.managers;
const toManager = alias(
  schema.managers,
  'to_manager',
) as typeof schema.managers;

@Injectable()
export class StockTransferRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private baseQuery(executor: Executor = this.db) {
    return executor
      .select({
        id: schema.stockTransfers.id,
        code: schema.stockTransfers.code,
        kind: schema.stockTransfers.kind,
        documentDate: schema.stockTransfers.documentDate,
        fromWarehouseId: schema.stockTransfers.fromWarehouseId,
        toWarehouseId: schema.stockTransfers.toWarehouseId,
        fromManagerId: schema.stockTransfers.fromManagerId,
        toManagerId: schema.stockTransfers.toManagerId,
        sender: schema.stockTransfers.sender,
        receiver: schema.stockTransfers.receiver,
        priceListId: schema.stockTransfers.priceListId,
        note: schema.stockTransfers.note,
        totalAmount: schema.stockTransfers.totalAmount,
        tenantId: schema.stockTransfers.tenantId,
        createdAt: schema.stockTransfers.createdAt,
        fromWarehouseName: fromWarehouse.name,
        toWarehouseName: toWarehouse.name,
        fromManagerCode: fromManager.code,
        fromManagerName: fromManager.name,
        toManagerCode: toManager.code,
        toManagerName: toManager.name,
      })
      .from(schema.stockTransfers)
      .leftJoin(
        fromWarehouse,
        eq(schema.stockTransfers.fromWarehouseId, fromWarehouse.id),
      )
      .leftJoin(
        toWarehouse,
        eq(schema.stockTransfers.toWarehouseId, toWarehouse.id),
      )
      .leftJoin(
        fromManager,
        eq(schema.stockTransfers.fromManagerId, fromManager.id),
      )
      .leftJoin(toManager, eq(schema.stockTransfers.toManagerId, toManager.id));
  }

  async findByTenant(tenantId: number, options: StockTransferListOptions) {
    const { kind, searchTerm, dateFrom, dateTo, warehouseId, managerId } =
      options;
    return this.baseQuery()
      .where(
        and(
          eq(schema.stockTransfers.tenantId, tenantId),
          kind ? eq(schema.stockTransfers.kind, kind) : undefined,
          dateFrom
            ? gte(schema.stockTransfers.documentDate, dateFrom)
            : undefined,
          dateTo ? lte(schema.stockTransfers.documentDate, dateTo) : undefined,
          warehouseId
            ? or(
                eq(schema.stockTransfers.fromWarehouseId, warehouseId),
                eq(schema.stockTransfers.toWarehouseId, warehouseId),
              )
            : undefined,
          managerId
            ? or(
                eq(schema.stockTransfers.fromManagerId, managerId),
                eq(schema.stockTransfers.toManagerId, managerId),
              )
            : undefined,
          searchTerm
            ? or(
                ilike(schema.stockTransfers.code, `%${searchTerm}%`),
                ilike(schema.stockTransfers.note, `%${searchTerm}%`),
              )
            : undefined,
        ),
      )
      .orderBy(
        desc(schema.stockTransfers.documentDate),
        desc(schema.stockTransfers.id),
      );
  }

  async findById(id: number) {
    const rows = await this.baseQuery().where(eq(schema.stockTransfers.id, id));
    return rows[0];
  }

  async itemsFor(transferId: number, tx?: Executor) {
    return (tx ?? this.db)
      .select({
        id: schema.stockTransferItems.id,
        productId: schema.stockTransferItems.productId,
        productCode: schema.products.sku,
        productName: schema.products.name,
        unitName: schema.units.name,
        quantity: schema.stockTransferItems.quantity,
        price: schema.stockTransferItems.price,
        amount: schema.stockTransferItems.amount,
      })
      .from(schema.stockTransferItems)
      .innerJoin(
        schema.products,
        eq(schema.stockTransferItems.productId, schema.products.id),
      )
      .leftJoin(schema.units, eq(schema.products.unitId, schema.units.id))
      .where(eq(schema.stockTransferItems.transferId, transferId))
      .orderBy(asc(schema.stockTransferItems.id));
  }

  nextCode(tenantId: number, tx?: Executor) {
    return nextDocumentCode(
      tx ?? this.db,
      schema.stockTransfers,
      schema.stockTransfers.code,
      schema.stockTransfers.tenantId,
      tenantId,
    );
  }

  async insert(
    data: StockTransferInsert,
    tx: Executor,
  ): Promise<StockTransfer> {
    const rows = await tx
      .insert(schema.stockTransfers)
      .values(data)
      .returning();
    return rows[0];
  }

  async insertItems(
    transferId: number,
    items: Array<{
      productId: number;
      quantity: string;
      price: string;
      amount: string;
    }>,
    tx: Executor,
  ): Promise<void> {
    await tx
      .insert(schema.stockTransferItems)
      .values(items.map((item) => ({ ...item, transferId })));
  }

  async delete(id: number, tx: Executor): Promise<void> {
    await tx
      .delete(schema.stockTransfers)
      .where(eq(schema.stockTransfers.id, id));
  }

  async transaction<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
    return this.db.transaction(fn as any) as Promise<T>;
  }
}
