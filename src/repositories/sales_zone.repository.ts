import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { SalesZone, SalesZoneInsert } from 'src/drizzle/schema';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type SalesZoneListOptions = {
  searchTerm?: string;
  sortKey?: string;
  sortOrder?: string;
};

// A row as the list screen needs it: the zone plus the names behind its links.
export type SalesZoneWithRelations = SalesZone & {
  managerName: string | null;
  parentName: string | null;
};

// «Կուտակիչ» points at another sales zone, so the join needs its own alias. The
// self-referencing FK makes drizzle infer the aliased table as `any`, so the
// cast is what restores column typing; it does not change the emitted SQL,
// which still qualifies these columns with "parent_zone".
const parentZone = alias(
  schema.salesZones,
  'parent_zone',
) as typeof schema.salesZones;

const SORTABLE = {
  code: schema.salesZones.code,
  name: schema.salesZones.name,
  isClosed: schema.salesZones.isClosed,
  createdAt: schema.salesZones.createdAt,
  updatedAt: schema.salesZones.updatedAt,
};

@Injectable()
export class SalesZoneRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private get selection() {
    return {
      id: schema.salesZones.id,
      code: schema.salesZones.code,
      name: schema.salesZones.name,
      managerId: schema.salesZones.managerId,
      isClosed: schema.salesZones.isClosed,
      parentId: schema.salesZones.parentId,
      tenantId: schema.salesZones.tenantId,
      createdAt: schema.salesZones.createdAt,
      updatedAt: schema.salesZones.updatedAt,
      managerName: schema.managers.name,
      parentName: parentZone.name,
    };
  }

  private get baseQuery() {
    return this.db
      .select(this.selection)
      .from(schema.salesZones)
      .leftJoin(
        schema.managers,
        eq(schema.salesZones.managerId, schema.managers.id),
      )
      .leftJoin(parentZone, eq(schema.salesZones.parentId, parentZone.id));
  }

  async findById(id: number): Promise<SalesZoneWithRelations> {
    const result = await this.baseQuery.where(eq(schema.salesZones.id, id));
    return result[0];
  }

  async findByTenant(
    tenantId: number,
    options: SalesZoneListOptions = {},
  ): Promise<SalesZoneWithRelations[]> {
    const { searchTerm, sortKey, sortOrder } = options;
    const column = SORTABLE[sortKey as keyof typeof SORTABLE];

    return this.baseQuery
      .where(
        and(
          eq(schema.salesZones.tenantId, tenantId),
          searchTerm
            ? or(
                ilike(schema.salesZones.name, `%${searchTerm}%`),
                ilike(schema.salesZones.code, `%${searchTerm}%`),
              )
            : undefined,
        ),
      )
      .orderBy(
        column
          ? sortOrder === 'desc'
            ? desc(column)
            : asc(column)
          : asc(schema.salesZones.code),
      );
  }

  // Six digits, matching the code the ERP grid shows («000001»).
  async nextCode(tenantId: number): Promise<string> {
    const result = await this.db
      .select({
        highest: sql<number>`coalesce(max(nullif(regexp_replace(${schema.salesZones.code}, '\\D', '', 'g'), '')::int), 0)`,
      })
      .from(schema.salesZones)
      .where(eq(schema.salesZones.tenantId, tenantId));
    const next = Number(result[0]?.highest ?? 0) + 1;
    return String(next).padStart(6, '0');
  }

  async create(data: SalesZoneInsert): Promise<SalesZone> {
    const result = await this.db
      .insert(schema.salesZones)
      .values(data)
      .returning();
    return result[0];
  }

  async update(id: number, data: Partial<SalesZoneInsert>): Promise<SalesZone> {
    const result = await this.db
      .update(schema.salesZones)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.salesZones.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<SalesZone> {
    const result = await this.db
      .delete(schema.salesZones)
      .where(eq(schema.salesZones.id, id))
      .returning();
    return result[0];
  }

  /**
   * The ids on the accumulator chain above `id`, nearest first.
   * Used to keep a zone from being nested under one of its own descendants.
   */
  async ancestorIds(id: number): Promise<number[]> {
    const rows = await this.db.execute<{ id: number }>(sql`
      WITH RECURSIVE chain(id, depth) AS (
        SELECT parent_id, 1 FROM sales_zones WHERE id = ${id}
        UNION ALL
        SELECT z.parent_id, c.depth + 1
        FROM sales_zones z
        JOIN chain c ON z.id = c.id
        -- A cycle cannot be written through this service, but a bounded walk
        -- means a hand-edited row can never hang the request either.
        WHERE c.depth < 100
      )
      SELECT id FROM chain WHERE id IS NOT NULL
    `);
    return rows.rows.map((row) => Number(row.id));
  }

  async countByParent(parentId: number): Promise<number> {
    const rows = await this.db
      .select({ id: schema.salesZones.id })
      .from(schema.salesZones)
      .where(eq(schema.salesZones.parentId, parentId));
    return rows.length;
  }
}
