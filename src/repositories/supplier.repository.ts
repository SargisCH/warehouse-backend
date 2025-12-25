import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { Supplier, SupplierInsert } from 'src/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class SupplierRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findById(id: number): Promise<Supplier> {
    const result = await this.db
      .select()
      .from(schema.supplier)
      .where(eq(schema.supplier.id, id));
    return result[0];
  }

  async findByTenant(tenantId: number): Promise<Supplier[]> {
    return this.db
      .select()
      .from(schema.supplier)
      .where(eq(schema.supplier.tenantId, tenantId));
  }

  async create(data: SupplierInsert): Promise<Supplier> {
    const result = await this.db
      .insert(schema.supplier)
      .values(data)
      .returning();
    return result[0];
  }

  async update(id: number, data: Partial<SupplierInsert>): Promise<Supplier> {
    const result = await this.db
      .update(schema.supplier)
      .set(data)
      .where(eq(schema.supplier.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<Supplier> {
    const result = await this.db
      .delete(schema.supplier)
      .where(eq(schema.supplier.id, id))
      .returning();
    return result[0];
  }
}
