import { Injectable } from '@nestjs/common';
import * as schema from 'src/drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { toMilli } from 'src/shared/helpers/money';

type Executor = NodePgDatabase<typeof schema>;

export class WarehouseStockShortage extends Error {}

/** Warehouse stock («Պահեստ»), counterpart of ManagerStockRepository. */
@Injectable()
export class InventoryRepository {
  async adjust(
    warehouseId: number,
    productId: number,
    delta: string,
    tx: Executor,
    allowNegative = false,
  ): Promise<void> {
    const { inventory } = schema;
    const nextQuantity = sql`${inventory.quantity} + ${delta}::numeric`;
    if (!allowNegative && toMilli(delta) < 0n) {
      // The condition is checked under the update's row lock, including when
      // another transfer has just debited the same stock.
      const updated = await tx
        .update(inventory)
        .set({ quantity: nextQuantity })
        .where(
          and(
            eq(inventory.warehouseId, warehouseId),
            eq(inventory.productId, productId),
            sql`${nextQuantity} >= 0`,
          ),
        )
        .returning({ productId: inventory.productId });
      if (!updated.length) throw new WarehouseStockShortage();
      return;
    }

    // Credits can replenish negative stock. An authorized debit can also
    // create a negative row for an item never stocked in this warehouse.
    await tx
      .insert(inventory)
      .values({ warehouseId, productId, quantity: delta })
      .onConflictDoUpdate({
        target: [inventory.productId, inventory.warehouseId],
        set: { quantity: nextQuantity },
      });
  }
}
