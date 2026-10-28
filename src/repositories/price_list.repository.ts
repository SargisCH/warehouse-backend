import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { PriceList, PriceListInsert } from 'src/drizzle/schema';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type PriceListListOptions = {
  searchTerm?: string;
  sortKey?: string;
  sortOrder?: string;
};

// A priced product as the «Ավելացնել ապրանքներ» picker needs it.
export type PriceListEntry = {
  productId: number;
  productCode: string | null;
  productName: string | null;
  unitName: string | null;
  price: string;
};

const SORTABLE = {
  code: schema.priceLists.code,
  name: schema.priceLists.name,
  isDefault: schema.priceLists.isDefault,
  isClosed: schema.priceLists.isClosed,
  createdAt: schema.priceLists.createdAt,
};

@Injectable()
export class PriceListRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findById(id: number): Promise<PriceList> {
    const result = await this.db
      .select()
      .from(schema.priceLists)
      .where(eq(schema.priceLists.id, id));
    return result[0];
  }

  async findByTenant(
    tenantId: number,
    options: PriceListListOptions = {},
  ): Promise<PriceList[]> {
    const { searchTerm, sortKey, sortOrder } = options;
    const column = SORTABLE[sortKey as keyof typeof SORTABLE];

    return this.db
      .select()
      .from(schema.priceLists)
      .where(
        and(
          eq(schema.priceLists.tenantId, tenantId),
          searchTerm
            ? or(
                ilike(schema.priceLists.name, `%${searchTerm}%`),
                ilike(schema.priceLists.code, `%${searchTerm}%`),
              )
            : undefined,
        ),
      )
      .orderBy(
        column
          ? sortOrder === 'desc'
            ? desc(column)
            : asc(column)
          : asc(schema.priceLists.code),
      );
  }

  async findDefault(tenantId: number): Promise<PriceList> {
    const result = await this.db
      .select()
      .from(schema.priceLists)
      .where(
        and(
          eq(schema.priceLists.tenantId, tenantId),
          eq(schema.priceLists.isDefault, true),
          eq(schema.priceLists.isClosed, false),
        ),
      );
    return result[0];
  }

  async nextCode(tenantId: number): Promise<string> {
    const result = await this.db
      .select({
        highest: sql<number>`coalesce(max(nullif(regexp_replace(${schema.priceLists.code}, '\\D', '', 'g'), '')::int), 0)`,
      })
      .from(schema.priceLists)
      .where(eq(schema.priceLists.tenantId, tenantId));
    const next = Number(result[0]?.highest ?? 0) + 1;
    return String(next).padStart(2, '0');
  }

  async create(data: PriceListInsert): Promise<PriceList> {
    const result = await this.db
      .insert(schema.priceLists)
      .values(data)
      .returning();
    return result[0];
  }

  async update(id: number, data: Partial<PriceListInsert>): Promise<PriceList> {
    const result = await this.db
      .update(schema.priceLists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.priceLists.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<PriceList> {
    const result = await this.db
      .delete(schema.priceLists)
      .where(eq(schema.priceLists.id, id))
      .returning();
    return result[0];
  }

  // Only one list per tenant may be the fallback.
  async clearDefault(tenantId: number, exceptId?: number): Promise<void> {
    await this.db
      .update(schema.priceLists)
      .set({ isDefault: false })
      .where(
        and(
          eq(schema.priceLists.tenantId, tenantId),
          eq(schema.priceLists.isDefault, true),
          exceptId ? sql`${schema.priceLists.id} <> ${exceptId}` : undefined,
        ),
      );
  }

  /** The list's priced products, as «Ավելացնել ապրանքներ» shows them. */
  async entries(
    priceListId: number,
    searchTerm?: string,
  ): Promise<PriceListEntry[]> {
    return this.db
      .select({
        productId: schema.priceListItems.productId,
        productCode: schema.products.sku,
        productName: schema.products.name,
        unitName: schema.units.name,
        price: schema.priceListItems.price,
      })
      .from(schema.priceListItems)
      .innerJoin(
        schema.products,
        eq(schema.priceListItems.productId, schema.products.id),
      )
      .leftJoin(schema.units, eq(schema.products.unitId, schema.units.id))
      .where(
        and(
          eq(schema.priceListItems.priceListId, priceListId),
          searchTerm
            ? or(
                ilike(schema.products.name, `%${searchTerm}%`),
                ilike(schema.products.sku, `%${searchTerm}%`),
              )
            : undefined,
        ),
      )
      .orderBy(asc(schema.products.sku), asc(schema.products.name));
  }

  /** The prices for a set of products, keyed by product id. */
  async pricesFor(
    priceListId: number,
    productIds: number[],
  ): Promise<Map<number, string>> {
    if (!productIds.length) return new Map();
    const rows = await this.db
      .select({
        productId: schema.priceListItems.productId,
        price: schema.priceListItems.price,
      })
      .from(schema.priceListItems)
      .where(
        and(
          eq(schema.priceListItems.priceListId, priceListId),
          inArray(schema.priceListItems.productId, productIds),
        ),
      );
    return new Map(rows.map((row) => [row.productId, row.price]));
  }

  /** Replaces the whole set of prices for a list. */
  async replaceItems(
    priceListId: number,
    items: Array<{ productId: number; price: string }>,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.priceListItems)
        .where(eq(schema.priceListItems.priceListId, priceListId));
      if (items.length) {
        await tx
          .insert(schema.priceListItems)
          .values(items.map((item) => ({ ...item, priceListId })));
      }
    });
  }

  async countClientsUsing(priceListId: number): Promise<number> {
    const rows = await this.db
      .select({ id: schema.clients.id })
      .from(schema.clients)
      .where(eq(schema.clients.priceListId, priceListId));
    return rows.length;
  }

  async countSalesUsing(priceListId: number): Promise<number> {
    const rows = await this.db
      .select({ id: schema.sales.id })
      .from(schema.sales)
      .where(eq(schema.sales.priceListId, priceListId));
    return rows.length;
  }
}
