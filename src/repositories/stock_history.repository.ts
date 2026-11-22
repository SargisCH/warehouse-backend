import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { today } from 'src/shared/helpers/money';

type Executor = NodePgDatabase<typeof schema>;
type HistoryRow = typeof schema.stockHistory.$inferInsert;
type Line = { productId: number; quantity: string };
type Sale = Pick<
  typeof schema.sales.$inferSelect,
  'id' | 'code' | 'documentDate' | 'tenantId' | 'managerId' | 'isReturn'
>;
type Transfer = typeof schema.stockTransfers.$inferSelect;

const saleKinds = ['SALE', 'SALE_RETURN'];
const transferKinds = ['WAREHOUSE', 'DELIVERER', 'ISSUE', 'RETURN'];
export const stockHistoryKinds = [
  ...saleKinds,
  ...transferKinds,
  'SUPPLY',
  'ADJUSTMENT',
];

export async function appendStockHistory(tx: Executor, rows: HistoryRow[]) {
  if (rows.length) await tx.insert(schema.stockHistory).values(rows);
}

export function recordSaleStockHistory(
  tx: Executor,
  sale: Sale,
  lines: Line[],
  reversed = false,
) {
  const inbound = sale.isReturn !== reversed;
  const documentDate = reversed ? today() : sale.documentDate;
  return appendStockHistory(
    tx,
    lines.map(({ productId, quantity }) => ({
      productId,
      quantity,
      tenantId: sale.tenantId,
      kind: sale.isReturn ? 'SALE_RETURN' : 'SALE',
      documentId: sale.id,
      documentCode: sale.code,
      documentDate,
      reversed,
      fromManagerId: inbound ? null : sale.managerId,
      toManagerId: inbound ? sale.managerId : null,
    })),
  );
}

export function recordTransferStockHistory(
  tx: Executor,
  transfer: Transfer,
  lines: Line[],
  reversed = false,
) {
  const documentDate = reversed ? today() : transfer.documentDate;
  return appendStockHistory(
    tx,
    lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      tenantId: transfer.tenantId,
      kind: transfer.kind,
      documentId: transfer.id,
      documentCode: transfer.code,
      documentDate,
      reversed,
      fromWarehouseId: reversed
        ? transfer.toWarehouseId
        : transfer.fromWarehouseId,
      toWarehouseId: reversed
        ? transfer.fromWarehouseId
        : transfer.toWarehouseId,
      fromManagerId: reversed ? transfer.toManagerId : transfer.fromManagerId,
      toManagerId: reversed ? transfer.fromManagerId : transfer.toManagerId,
    })),
  );
}

type HistoryFilters = {
  dateFrom?: string;
  dateTo?: string;
  kind?: string;
  searchTerm?: string;
  page?: number;
};

const {
  stockHistory,
  products,
  warehouses,
  managers,
  units,
  sales,
  stockTransfers,
} = schema;
const fromWarehouse = alias(warehouses, 'history_from_warehouse');
const toWarehouse = alias(warehouses, 'history_to_warehouse');
const fromManager = alias(managers, 'history_from_manager');
const toManager = alias(managers, 'history_to_manager');
const pageSize = 25;

@Injectable()
export class StockHistoryRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private readonly db: Executor,
  ) {}

  async find(
    tenantId: number,
    scope: 'product' | 'warehouse',
    id: number,
    { dateFrom, dateTo, kind, searchTerm, page = 1 }: HistoryFilters,
  ) {
    const entityTable = scope === 'product' ? products : warehouses;
    const [entity] = await this.db
      .select({ id: entityTable.id, name: entityTable.name })
      .from(entityTable)
      .where(eq(entityTable.id, id));
    if (!entity) return null;

    const period = and(
      eq(stockHistory.tenantId, tenantId),
      scope === 'product'
        ? eq(stockHistory.productId, id)
        : or(
            eq(stockHistory.fromWarehouseId, id),
            eq(stockHistory.toWarehouseId, id),
          ),
      dateFrom ? gte(stockHistory.documentDate, dateFrom) : undefined,
      dateTo ? lte(stockHistory.documentDate, dateTo) : undefined,
    );
    const saleJoin = and(
      eq(stockHistory.documentId, sales.id),
      eq(stockHistory.tenantId, sales.tenantId),
      inArray(stockHistory.kind, saleKinds),
    );
    const search = searchTerm?.trim();
    const rows = await this.db
      .select({
        id: stockHistory.id,
        productId: stockHistory.productId,
        product: products.name,
        sku: products.sku,
        unit: units.name,
        kind: stockHistory.kind,
        quantity: stockHistory.quantity,
        date: stockHistory.documentDate,
        documentId: stockHistory.documentId,
        documentCode: stockHistory.documentCode,
        reversed: stockHistory.reversed,
        documentAvailable: sql<boolean>`${sales.id} is not null or ${stockTransfers.id} is not null`,
        fromWarehouseId: stockHistory.fromWarehouseId,
        fromWarehouse: fromWarehouse.name,
        toWarehouseId: stockHistory.toWarehouseId,
        toWarehouse: toWarehouse.name,
        fromManagerId: stockHistory.fromManagerId,
        fromManager: fromManager.name,
        toManagerId: stockHistory.toManagerId,
        toManager: toManager.name,
        beforeQuantity: stockHistory.beforeQuantity,
        afterQuantity: stockHistory.afterQuantity,
      })
      .from(stockHistory)
      .leftJoin(products, eq(stockHistory.productId, products.id))
      .leftJoin(units, eq(products.unitId, units.id))
      .leftJoin(
        fromWarehouse,
        eq(stockHistory.fromWarehouseId, fromWarehouse.id),
      )
      .leftJoin(toWarehouse, eq(stockHistory.toWarehouseId, toWarehouse.id))
      .leftJoin(
        fromManager,
        and(
          eq(stockHistory.fromManagerId, fromManager.id),
          eq(stockHistory.tenantId, fromManager.tenantId),
        ),
      )
      .leftJoin(
        toManager,
        and(
          eq(stockHistory.toManagerId, toManager.id),
          eq(stockHistory.tenantId, toManager.tenantId),
        ),
      )
      .leftJoin(sales, saleJoin)
      .leftJoin(
        stockTransfers,
        and(
          eq(stockHistory.documentId, stockTransfers.id),
          eq(stockHistory.tenantId, stockTransfers.tenantId),
          inArray(stockHistory.kind, transferKinds),
        ),
      )
      .where(
        and(
          period,
          kind ? eq(stockHistory.kind, kind) : undefined,
          search
            ? or(
                ilike(products.name, `%${search}%`),
                ilike(products.sku, `%${search}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(stockHistory.documentDate), desc(stockHistory.id))
      .limit(pageSize + 1)
      .offset((page - 1) * pageSize);

    const summary =
      scope === 'product'
        ? (
            await this.db
              .select({
                sold: sql<string>`coalesce(sum(${stockHistory.quantity}) filter (where ${stockHistory.kind} = 'SALE'), 0)::text`,
                returned: sql<string>`coalesce(sum(${stockHistory.quantity}) filter (where ${stockHistory.kind} = 'SALE_RETURN'), 0)::text`,
              })
              .from(stockHistory)
              .innerJoin(sales, saleJoin)
              .where(and(period, eq(stockHistory.reversed, false)))
          )[0]
        : null;

    return {
      entity,
      rows: rows.slice(0, pageSize),
      hasMore: rows.length > pageSize,
      summary,
    };
  }
}
