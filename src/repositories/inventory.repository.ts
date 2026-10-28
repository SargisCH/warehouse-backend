import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

type Executor = NodePgDatabase<typeof schema>;

/** Warehouse stock («Պահեստ»), counterpart of ManagerStockRepository. */
@Injectable()
export class InventoryRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Moves stock by `delta`. Update first, insert only when the warehouse has
   * never held the product: an upsert would test the CHECK against the raw
   * negative delta. The CHECK `amount_is_non_negative` refuses an overdraw.
   */
  async adjust(
    warehouseId: number,
    productId: number,
    delta: string,
    tx: Executor,
  ): Promise<void> {
    const updated = await tx
      .update(schema.inventory)
      .set({ quantity: sql`${schema.inventory.quantity} + ${delta}::numeric` })
      .where(
        and(
          eq(schema.inventory.warehouseId, warehouseId),
          eq(schema.inventory.productId, productId),
        ),
      )
      .returning({ productId: schema.inventory.productId });
    if (updated.length) return;
    await tx
      .insert(schema.inventory)
      .values({ warehouseId, productId, quantity: delta });
  }
}

/** Whether an error is the warehouse stock CHECK constraint tripping. */
export const isStockShortage = (e: any) =>
  String(e?.cause?.constraint ?? e?.constraint).includes(
    'amount_is_non_negative',
  );
