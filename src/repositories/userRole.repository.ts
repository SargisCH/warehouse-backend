import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';

@Injectable()
export class UserRoleRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private table = schema.userRole;

  async find(where: { name?: string; id?: number }): Promise<schema.Role> {
    const whereQuery = Object.keys(where).map((key) =>
      eq(this.table[key], where[key]),
    );
    const [role] = await this.db
      .select()
      .from(this.table)
      .where(and(...whereQuery));
    return role;
  }
}
