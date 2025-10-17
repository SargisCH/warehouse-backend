import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';

@Injectable()
export class ProductGroupsRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private table = schema.productGroups;

  async find(where: {
    name?: string;
    id?: number;
  }): Promise<schema.ProductGroup> {
    const whereQuery = Object.keys(where).map((key) =>
      eq(this.table[key], where[key]),
    );
    const baseQuery = this.db
      .select()
      .from(this.table)
      .where(and(...whereQuery));
    const [productGroup] = await baseQuery;
    return productGroup;
  }

  async findAll() {
    return this.db.select().from(this.table);
  }
  async create(productGroup: schema.ProductGroupInsert) {
    return this.db
      .insert(this.table)
      .values({ ...productGroup })
      .returning();
  }
}
