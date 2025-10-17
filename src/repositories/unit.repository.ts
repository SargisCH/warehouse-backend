import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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
  /**
   * Find all users in the database
   */
  async findAll() {
    return this.db.select().from(this.table);
  }
}
