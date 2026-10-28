import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { Sale, SaleInsert, SaleItem } from 'src/drizzle/schema';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * The «Վաճառք» list filters. Every one of these is a column on the sale or on
 * something it points at, so they compose into a single WHERE.
 */
export type SaleListOptions = {
  searchTerm?: string;
  sortKey?: string;
  sortOrder?: string;
  // «Ժամանակահատված»
  dateFrom?: string;
  dateTo?: string;
  // «Առևտրային գործակալ (մենեջեր)»
  managerId?: number;
  // «Վաճառքի գոտի» - the zone recorded on the sale itself.
  salesZoneId?: number;
  // «Գնորդի վաճառքի գոտի» - the zone on the buyer's own record.
  clientSalesZoneId?: number;
  clientId?: number;
  // «Գնորդների խումբ»
  clientGroupId?: number;
  // «Փաստաթղթի խումբ»
  documentId?: number;
  // «Առաքիչ»
  delivererId?: number;
  // «Վճարման տեսակ»
  paymentType?: string;
  // «Գտնվելու վայր» - matched against the buyer's business address.
  location?: string;
  // «Այլ համակարգ ուղարկման վիճակ»
  externalStatus?: string;
  // «Միայն մնացորդ ունեցողները» - resolved by the service, which knows balances.
  clientIdsWithBalance?: number[];
  isReturn?: boolean;
};

export type SaleRow = Sale & {
  managerCode: string | null;
  managerName: string | null;
  clientCode: string | null;
  clientName: string | null;
  clientAddress: string | null;
  salesZoneName: string | null;
  clientSalesZoneName: string | null;
  delivererCode: string | null;
  delivererName: string | null;
  priceListName: string | null;
  documentName: string | null;
  clientGroupName: string | null;
};

// The deliverer is a manager too, so it needs its own alias.
const deliverer = alias(schema.managers, 'deliverer') as typeof schema.managers;
// The buyer's own zone is a different link from the one stamped on the sale.
const clientZone = alias(
  schema.salesZones,
  'client_zone',
) as typeof schema.salesZones;

const SORTABLE = {
  code: schema.sales.code,
  documentDate: schema.sales.documentDate,
  totalAmount: schema.sales.totalAmount,
  paidAmount: schema.sales.paidAmount,
  createdAt: schema.sales.createdAt,
};

@Injectable()
export class SaleRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private get selection() {
    return {
      id: schema.sales.id,
      code: schema.sales.code,
      documentDate: schema.sales.documentDate,
      managerId: schema.sales.managerId,
      salesZoneId: schema.sales.salesZoneId,
      clientId: schema.sales.clientId,
      delivererId: schema.sales.delivererId,
      priceListId: schema.sales.priceListId,
      documentId: schema.sales.documentId,
      paymentType: schema.sales.paymentType,
      note: schema.sales.note,
      totalAmount: schema.sales.totalAmount,
      paidAmount: schema.sales.paidAmount,
      isReturn: schema.sales.isReturn,
      externalStatus: schema.sales.externalStatus,
      tenantId: schema.sales.tenantId,
      createdAt: schema.sales.createdAt,
      updatedAt: schema.sales.updatedAt,
      managerCode: schema.managers.code,
      managerName: schema.managers.name,
      clientCode: schema.clients.code,
      clientName: schema.clients.name,
      clientAddress: schema.clients.address,
      salesZoneName: schema.salesZones.name,
      clientSalesZoneName: clientZone.name,
      delivererCode: deliverer.code,
      delivererName: deliverer.name,
      priceListName: schema.priceLists.name,
      documentName: schema.documents.name,
      clientGroupName: schema.clientGroups.name,
    };
  }

  private get baseQuery() {
    return this.db
      .select(this.selection)
      .from(schema.sales)
      .leftJoin(schema.managers, eq(schema.sales.managerId, schema.managers.id))
      .leftJoin(schema.clients, eq(schema.sales.clientId, schema.clients.id))
      .leftJoin(
        schema.salesZones,
        eq(schema.sales.salesZoneId, schema.salesZones.id),
      )
      .leftJoin(clientZone, eq(schema.clients.salesZoneId, clientZone.id))
      .leftJoin(deliverer, eq(schema.sales.delivererId, deliverer.id))
      .leftJoin(
        schema.priceLists,
        eq(schema.sales.priceListId, schema.priceLists.id),
      )
      .leftJoin(
        schema.documents,
        eq(schema.sales.documentId, schema.documents.id),
      )
      .leftJoin(
        schema.clientGroups,
        eq(schema.clients.clientGroupId, schema.clientGroups.id),
      );
  }

  private filters(tenantId: number, options: SaleListOptions) {
    const {
      searchTerm,
      dateFrom,
      dateTo,
      managerId,
      salesZoneId,
      clientSalesZoneId,
      clientId,
      clientGroupId,
      documentId,
      delivererId,
      paymentType,
      location,
      externalStatus,
      clientIdsWithBalance,
      isReturn,
    } = options;

    return and(
      eq(schema.sales.tenantId, tenantId),
      isReturn === undefined ? undefined : eq(schema.sales.isReturn, isReturn),
      dateFrom ? gte(schema.sales.documentDate, dateFrom) : undefined,
      dateTo ? lte(schema.sales.documentDate, dateTo) : undefined,
      managerId ? eq(schema.sales.managerId, managerId) : undefined,
      salesZoneId ? eq(schema.sales.salesZoneId, salesZoneId) : undefined,
      clientSalesZoneId
        ? eq(schema.clients.salesZoneId, clientSalesZoneId)
        : undefined,
      clientId ? eq(schema.sales.clientId, clientId) : undefined,
      clientGroupId
        ? eq(schema.clients.clientGroupId, clientGroupId)
        : undefined,
      documentId ? eq(schema.sales.documentId, documentId) : undefined,
      delivererId ? eq(schema.sales.delivererId, delivererId) : undefined,
      paymentType ? eq(schema.sales.paymentType, paymentType) : undefined,
      location ? ilike(schema.clients.address, `%${location}%`) : undefined,
      externalStatus
        ? eq(schema.sales.externalStatus, externalStatus)
        : undefined,
      // An empty list means nobody qualified, which must return nothing rather
      // than silently dropping the filter.
      clientIdsWithBalance
        ? clientIdsWithBalance.length
          ? inArray(schema.sales.clientId, clientIdsWithBalance)
          : sql`false`
        : undefined,
      searchTerm
        ? or(
            ilike(schema.sales.code, `%${searchTerm}%`),
            ilike(schema.clients.name, `%${searchTerm}%`),
            ilike(schema.managers.name, `%${searchTerm}%`),
          )
        : undefined,
    );
  }

  async findByTenant(
    tenantId: number,
    options: SaleListOptions = {},
  ): Promise<SaleRow[]> {
    const column = SORTABLE[options.sortKey as keyof typeof SORTABLE];

    return this.baseQuery
      .where(this.filters(tenantId, options))
      .orderBy(
        column
          ? options.sortOrder === 'desc'
            ? desc(column)
            : asc(column)
          : desc(schema.sales.documentDate),
      );
  }

  /** The footer totals the ERP grid shows under the list. */
  async totals(
    tenantId: number,
    options: SaleListOptions = {},
  ): Promise<{ totalAmount: string; paidAmount: string; count: number }> {
    const rows = await this.db
      .select({
        totalAmount: sql<string>`coalesce(sum(${schema.sales.totalAmount}), 0)`,
        paidAmount: sql<string>`coalesce(sum(${schema.sales.paidAmount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.sales)
      .leftJoin(schema.managers, eq(schema.sales.managerId, schema.managers.id))
      .leftJoin(schema.clients, eq(schema.sales.clientId, schema.clients.id))
      .where(this.filters(tenantId, options));
    return {
      totalAmount: String(rows[0]?.totalAmount ?? '0'),
      paidAmount: String(rows[0]?.paidAmount ?? '0'),
      count: Number(rows[0]?.count ?? 0),
    };
  }

  async findById(id: number): Promise<SaleRow> {
    const result = await this.baseQuery.where(eq(schema.sales.id, id));
    return result[0];
  }

  async itemsFor(saleId: number) {
    return this.db
      .select({
        id: schema.saleItems.id,
        productId: schema.saleItems.productId,
        productCode: schema.products.sku,
        productName: schema.products.name,
        unitName: schema.units.name,
        quantity: schema.saleItems.quantity,
        price: schema.saleItems.price,
        amount: schema.saleItems.amount,
      })
      .from(schema.saleItems)
      .innerJoin(
        schema.products,
        eq(schema.saleItems.productId, schema.products.id),
      )
      .leftJoin(schema.units, eq(schema.products.unitId, schema.units.id))
      .where(eq(schema.saleItems.saleId, saleId))
      .orderBy(asc(schema.saleItems.id));
  }

  async findDocument(id: number) {
    const rows = await this.db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id));
    return rows[0];
  }

  async nextCode(
    tenantId: number,
    tx?: NodePgDatabase<typeof schema>,
  ): Promise<string> {
    const result = await (tx ?? this.db)
      .select({
        highest: sql<number>`coalesce(max(nullif(regexp_replace(${schema.sales.code}, '\\D', '', 'g'), '')::int), 0)`,
      })
      .from(schema.sales)
      .where(eq(schema.sales.tenantId, tenantId));
    const next = Number(result[0]?.highest ?? 0) + 1;
    return String(next).padStart(6, '0');
  }

  async insert(
    data: SaleInsert,
    tx: NodePgDatabase<typeof schema>,
  ): Promise<Sale> {
    const rows = await tx.insert(schema.sales).values(data).returning();
    return rows[0];
  }

  async insertItems(
    saleId: number,
    items: Array<{
      productId: number;
      quantity: string;
      price: string;
      amount: string;
    }>,
    tx: NodePgDatabase<typeof schema>,
  ): Promise<SaleItem[]> {
    if (!items.length) return [];
    return tx
      .insert(schema.saleItems)
      .values(items.map((item) => ({ ...item, saleId })))
      .returning();
  }

  async update(id: number, data: Partial<SaleInsert>): Promise<Sale> {
    const rows = await this.db
      .update(schema.sales)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.sales.id, id))
      .returning();
    return rows[0];
  }

  async rawItems(saleId: number, tx?: NodePgDatabase<typeof schema>) {
    const executor = tx ?? this.db;
    return executor
      .select()
      .from(schema.saleItems)
      .where(eq(schema.saleItems.saleId, saleId));
  }

  // Sale items and balance entries both cascade from the sale row.
  async delete(id: number, tx: NodePgDatabase<typeof schema>): Promise<void> {
    await tx.delete(schema.sales).where(eq(schema.sales.id, id));
  }

  async transaction<T>(
    fn: (tx: NodePgDatabase<typeof schema>) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(fn as any) as Promise<T>;
  }
}
