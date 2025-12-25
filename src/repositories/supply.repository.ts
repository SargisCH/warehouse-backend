import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { Supply, SupplyInsert } from 'src/drizzle/schema';
import { eq, sql, or, ilike, inArray, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateSupplyDto } from 'src/modules/supply/supply.dto';

@Injectable()
export class SupplyRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
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
      .where(where);

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

  async create(createSupplyDto: CreateSupplyDto) {
    return this.db.transaction(async (tx) => {
      const [supply] = await tx
        .insert(schema.supplies)
        .values({
          documentId: createSupplyDto.documentId,
          warehouseId: createSupplyDto.warehouseId,
        })
        .returning();

      for (const product of createSupplyDto.products) {
        await tx.insert(schema.supplyProducts).values({
          supplyId: supply.id,
          productId: product.productId,
          amount: product.amount,
        });

        const [inventoryItem] = await tx
          .select()
          .from(schema.inventory)
          .where(
            and(
              eq(schema.inventory.productId, product.productId),
              eq(schema.inventory.warehouseId, createSupplyDto.warehouseId),
            ),
          );

        if (inventoryItem) {
          await tx
            .update(schema.inventory)
            .set({
              quantity: sql`${schema.inventory.quantity} + ${product.amount}`,
            })
            .where(eq(schema.inventory.productId, product.productId));
        } else {
          await tx.insert(schema.inventory).values({
            productId: product.productId,
            warehouseId: createSupplyDto.warehouseId,
            quantity: product.amount,
          });
        }
      }

      return supply;
    });
  }
}
