import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';

@Injectable()
export class UnitRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private table = schema.units;
  async find(where: { name?: string; id?: number }): Promise<schema.Unit> {
    const whereQuery = Object.entries(where).map(([key, value]) =>
      eq(this.table[key], value),
    );
    const [unit] = await this.db
      .select()
      .from(this.table)
      .where(and(...whereQuery));
    return unit;
  }
  async create(name: string): Promise<schema.Unit> {
    return this.db.transaction(async (tx) => {
      // Serialize matching names, including case variants, across concurrent requests.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('unit-name'), hashtext(lower(${name})))`,
      );
      const [existing] = await tx
        .select()
        .from(this.table)
        .where(sql`lower(${this.table.name}) = lower(${name})`);
      if (existing) return existing;
      const [created] = await tx
        .insert(this.table)
        .values({ name })
        .returning();
      return created;
    });
  }

  /**
   * Find all users in the database
   */
  async findAll() {
    return this.db.select().from(this.table);
  }
}
