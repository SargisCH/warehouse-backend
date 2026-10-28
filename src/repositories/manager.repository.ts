import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { Manager, ManagerInsert } from 'src/drizzle/schema';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type ManagerListOptions = {
  searchTerm?: string;
  sortKey?: string;
  sortOrder?: string;
};

// A row as the list screen needs it: the agent plus the labels behind its links.
export type ManagerWithRelations = Manager & {
  salesZoneName: string | null;
  delivererCode: string | null;
  delivererName: string | null;
};

// The deliverer is another manager, so the self-join needs its own alias.
const deliverer = alias(schema.managers, 'deliverer') as typeof schema.managers;

const SORTABLE = {
  code: schema.managers.code,
  name: schema.managers.name,
  email: schema.managers.email,
  createdAt: schema.managers.createdAt,
  updatedAt: schema.managers.updatedAt,
};

@Injectable()
export class ManagerRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private get selection() {
    return {
      id: schema.managers.id,
      code: schema.managers.code,
      name: schema.managers.name,
      email: schema.managers.email,
      deviceId: schema.managers.deviceId,
      salesZoneId: schema.managers.salesZoneId,
      delivererId: schema.managers.delivererId,
      tenantId: schema.managers.tenantId,
      createdAt: schema.managers.createdAt,
      updatedAt: schema.managers.updatedAt,
      salesZoneName: schema.salesZones.name,
      delivererCode: deliverer.code,
      delivererName: deliverer.name,
    };
  }

  private get baseQuery() {
    return this.db
      .select(this.selection)
      .from(schema.managers)
      .leftJoin(
        schema.salesZones,
        eq(schema.managers.salesZoneId, schema.salesZones.id),
      )
      .leftJoin(deliverer, eq(schema.managers.delivererId, deliverer.id));
  }

  async findById(id: number): Promise<ManagerWithRelations> {
    const result = await this.baseQuery.where(eq(schema.managers.id, id));
    return result[0];
  }

  async findByTenant(
    tenantId: number,
    options: ManagerListOptions = {},
  ): Promise<ManagerWithRelations[]> {
    const { searchTerm, sortKey, sortOrder } = options;
    const column = SORTABLE[sortKey as keyof typeof SORTABLE];

    return this.baseQuery
      .where(
        and(
          eq(schema.managers.tenantId, tenantId),
          searchTerm
            ? or(
                ilike(schema.managers.name, `%${searchTerm}%`),
                ilike(schema.managers.code, `%${searchTerm}%`),
                ilike(schema.managers.email, `%${searchTerm}%`),
              )
            : undefined,
        ),
      )
      .orderBy(
        column
          ? sortOrder === 'desc'
            ? desc(column)
            : asc(column)
          : asc(schema.managers.code),
      );
  }

  async findByEmail(tenantId: number, email: string): Promise<Manager> {
    const result = await this.db
      .select()
      .from(schema.managers)
      .where(
        and(
          eq(schema.managers.tenantId, tenantId),
          eq(schema.managers.email, email),
        ),
      );
    return result[0];
  }

  // «Կոդ»: M001, M002, … The highest existing number wins rather than a count,
  // so deleting M002 doesn't hand the next agent a code that was already used.
  async nextCode(tenantId: number): Promise<string> {
    const result = await this.db
      .select({
        highest: sql<number>`coalesce(max(nullif(regexp_replace(${schema.managers.code}, '\\D', '', 'g'), '')::int), 0)`,
      })
      .from(schema.managers)
      .where(eq(schema.managers.tenantId, tenantId));
    const next = Number(result[0]?.highest ?? 0) + 1;
    return `M${String(next).padStart(3, '0')}`;
  }

  async create(data: ManagerInsert): Promise<Manager> {
    const result = await this.db
      .insert(schema.managers)
      .values(data)
      .returning();
    return result[0];
  }

  async update(id: number, data: Partial<ManagerInsert>): Promise<Manager> {
    const result = await this.db
      .update(schema.managers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.managers.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<Manager> {
    const result = await this.db
      .delete(schema.managers)
      .where(eq(schema.managers.id, id))
      .returning();
    return result[0];
  }

  async countByZone(salesZoneId: number): Promise<number> {
    const rows = await this.db
      .select({ id: schema.managers.id })
      .from(schema.managers)
      .where(eq(schema.managers.salesZoneId, salesZoneId));
    return rows.length;
  }
}
