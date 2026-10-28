import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type ManagerStockRow = {
  productId: number;
  productCode: string | null;
  productName: string | null;
  unitName: string | null;
  quantity: string;
};

type Executor = NodePgDatabase<typeof schema>;

@Injectable()
export class ManagerStockRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /** «Ապրանքները մենեջերի մոտ» - what the agent is currently carrying. */
  async findByManager(managerId: number): Promise<ManagerStockRow[]> {
    return this.db
      .select({
        productId: schema.managerStock.productId,
        productCode: schema.products.sku,
        productName: schema.products.name,
        unitName: schema.units.name,
        quantity: schema.managerStock.quantity,
      })
      .from(schema.managerStock)
      .innerJoin(
        schema.products,
        eq(schema.managerStock.productId, schema.products.id),
      )
      .leftJoin(schema.units, eq(schema.products.unitId, schema.units.id))
      .where(eq(schema.managerStock.managerId, managerId))
      .orderBy(asc(schema.products.sku), asc(schema.products.name));
  }

  async quantitiesFor(
    managerId: number,
    productIds: number[],
    tx?: Executor,
  ): Promise<Map<number, string>> {
    if (!productIds.length) return new Map();
    const executor = tx ?? this.db;
    const rows = await executor
      .select({
        productId: schema.managerStock.productId,
        quantity: schema.managerStock.quantity,
      })
      .from(schema.managerStock)
      .where(
        and(
          eq(schema.managerStock.managerId, managerId),
          inArray(schema.managerStock.productId, productIds),
        ),
      );
    return new Map(rows.map((row) => [row.productId, row.quantity]));
  }

  /**
   * Moves stock by `delta` (negative sells, positive returns it), creating the
   * row when the agent has never carried the product. The quantity may go
   * negative: an agent can sell before their van is loaded.
   */
  async adjust(
    managerId: number,
    productId: number,
    delta: string,
    tx: Executor,
  ): Promise<void> {
    const updated = await tx
      .update(schema.managerStock)
      .set({
        quantity: sql`${schema.managerStock.quantity} + ${delta}::numeric`,
      })
      .where(
        and(
          eq(schema.managerStock.managerId, managerId),
          eq(schema.managerStock.productId, productId),
        ),
      )
      .returning({ id: schema.managerStock.id });

    if (updated.length) return;

    // First time this agent touches the product; a negative delta means it was
    // sold before being loaded.
    await tx
      .insert(schema.managerStock)
      .values({ managerId, productId, quantity: delta });
  }

  /** Sets an absolute quantity - how a van gets loaded. Always non-negative,
   * so the upsert form is safe here. */
  async setQuantity(
    managerId: number,
    productId: number,
    quantity: string,
  ): Promise<void> {
    await this.db
      .insert(schema.managerStock)
      .values({ managerId, productId, quantity })
      .onConflictDoUpdate({
        target: [schema.managerStock.managerId, schema.managerStock.productId],
        set: { quantity },
      });
  }
}
