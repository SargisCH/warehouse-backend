import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ne } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';

@Injectable()
export class WarehouseRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private table = schema.warehouses;
  async find(where: { name?: string; id?: number }): Promise<schema.Warehouse> {
    const whereQuery = Object.entries(where).map(([key, value]) =>
      eq(this.table[key], value),
    );
    const [warehouse] = await this.db
      .select()
      .from(this.table)
      .where(and(...whereQuery));
    return warehouse;
  }
  /**
   * Find all users in the database
   */
  async findAll() {
    return this.db.select().from(this.table);
  }
  async findOne(id: number) {
    const [warehouse] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id));
    return warehouse;
  }

  async findWithProducts(id: number) {
    const warehouse = await this.db.query.warehouses.findFirst({
      where: eq(this.table.id, id),
      with: { products: true },
    });
    return warehouse;
  }

  async findStock(id: number) {
    const { inventory, products, units } = schema;
    return this.db
      .select({
        warehouseId: this.table.id,
        warehouseName: this.table.name,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
        unit: { id: units.id, name: units.name },
        quantity: inventory.quantity,
      })
      .from(this.table)
      .leftJoin(
        inventory,
        and(
          eq(inventory.warehouseId, this.table.id),
          ne(inventory.quantity, '0'),
        ),
      )
      .leftJoin(products, eq(products.id, inventory.productId))
      .leftJoin(units, eq(units.id, products.unitId))
      .where(eq(this.table.id, id))
      .orderBy(asc(products.name), asc(products.id));
  }

  async create(warehouse: schema.WarehouseInsert) {
    return this.db
      .insert(this.table)
      .values({ ...warehouse })
      .returning();
  }
  async update(id: number, warehouse: schema.WarehouseInsert) {
    return this.db
      .update(this.table)
      .set({ ...warehouse })
      .where(eq(this.table.id, id))
      .returning();
  }
}
