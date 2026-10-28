import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { Supply, SupplyInsert } from 'src/drizzle/schema';
import { desc, eq, sql, or, ilike, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateSupplyDto } from 'src/modules/supply/supply.dto';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class SupplyRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    private readonly inventory: InventoryRepository,
  ) {}

  async findAll({
    page = 1,
    searchTerm,
  }: {
    page?: number;
    searchTerm?: string;
  }) {
    const limit = 10;
    const offset = (page - 1) * limit;

    const where = searchTerm
      ? or(
          ilike(schema.products.name, `%${searchTerm}%`),
          ilike(schema.warehouses.name, `%${searchTerm}%`),
          ilike(schema.documents.name, `%${searchTerm}%`),
        )
      : undefined;

    const supplyIdsSubQuery = this.db
      .selectDistinct({ id: schema.supplies.id })
      .from(schema.supplies)
      .leftJoin(
        schema.warehouses,
        eq(schema.supplies.warehouseId, schema.warehouses.id),
      )
      .leftJoin(
        schema.documents,
        eq(schema.supplies.documentId, schema.documents.id),
      )
      .leftJoin(
        schema.supplyProducts,
        eq(schema.supplies.id, schema.supplyProducts.supplyId),
      )
      .leftJoin(
        schema.products,
        eq(schema.supplyProducts.productId, schema.products.id),
      )
      .where(where)
      .orderBy(desc(schema.supplies.id));

    const totalQuery = await this.db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(supplyIdsSubQuery.as('sub'));

    const total = totalQuery[0].count;

    const supplyIdsResult = await supplyIdsSubQuery.limit(limit).offset(offset);
    const supplyIds = supplyIdsResult.map((s) => s.id);

    if (supplyIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
      };
    }

    const supplies = await this.db.query.supplies.findMany({
      where: inArray(schema.supplies.id, supplyIds),
      orderBy: [desc(schema.supplies.documentDate), desc(schema.supplies.id)],
      with: {
        warehouse: true,
        document: true,
        supplyProducts: {
          with: {
            product: true,
          },
        },
      },
    });

    return {
      data: supplies,
      total,
      page,
      limit,
    };
  }

  async findById(id: number): Promise<Supply> {
    const result = await this.db
      .select()
      .from(schema.supplies)
      .where(eq(schema.supplies.id, id));
    return result[0];
  }

  /**
   * Books a receipt: the document, its priced lines, and the stock landing in
   * the warehouse. Lines come pre-priced from the service.
   */
  async create(
    dto: CreateSupplyDto,
    lines: Array<{
      productId: number;
      amount: string;
      price: string;
      total: string;
    }>,
    totalAmount: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [supply] = await tx
        .insert(schema.supplies)
        .values({
          documentId: dto.documentId,
          warehouseId: dto.warehouseId,
          documentDate:
            dto.documentDate ?? new Date().toISOString().slice(0, 10),
          receiver: dto.receiver ?? null,
          note: dto.note ?? null,
          priceListId: dto.priceListId ?? null,
          totalAmount,
        })
        .returning();

      // Receipts are not tenant-scoped, so the number simply follows the id.
      const [numbered] = await tx
        .update(schema.supplies)
        .set({ code: String(supply.id).padStart(6, '0') })
        .where(eq(schema.supplies.id, supply.id))
        .returning();

      await tx
        .insert(schema.supplyProducts)
        .values(lines.map((line) => ({ ...line, supplyId: supply.id })));

      for (const line of lines) {
        await this.inventory.adjust(
          dto.warehouseId,
          line.productId,
          line.amount,
          tx,
        );
      }

      return numbered;
    });
  }
}
