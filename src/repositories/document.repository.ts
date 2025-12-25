import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';

@Injectable()
export class DocumentRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private table = schema.documents;
  async find(where: { name?: string; id?: number }): Promise<schema.Document> {
    const whereQuery = Object.entries(where).map(([key, value]) =>
      eq(this.table[key], value),
    );
    const [document] = await this.db
      .select()
      .from(this.table)
      .where(and(...whereQuery));
    return document;
  }
  /**
   * Find all users in the database
   */
  async findAll() {
    return this.db.select().from(this.table);
  }

  async create(item: schema.DocumentInsert) {
    const [document] = await this.db
      .insert(this.table)
      .values(item)
      .returning();
    return document;
  }
}
