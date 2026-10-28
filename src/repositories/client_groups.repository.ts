import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { ClientGroup, ClientGroupInsert } from 'src/drizzle/schema';
import { and, asc, desc, eq, ilike } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type ClientGroupListOptions = {
  searchTerm?: string;
  sortKey?: string;
  sortOrder?: string;
};

// A row as the list screen needs it: the group plus its zone and accumulator.
export type ClientGroupWithZone = ClientGroup & {
  salesZoneName: string | null;
  parentName: string | null;
};

// The accumulator is another client group, so the self-join needs an alias.
const parent = alias(schema.clientGroups, 'parent_group');

const SORTABLE = {
  name: schema.clientGroups.name,
  createdAt: schema.clientGroups.createdAt,
  updatedAt: schema.clientGroups.updatedAt,
};

@Injectable()
export class ClientGroupsRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private get selection() {
    return {
      id: schema.clientGroups.id,
      name: schema.clientGroups.name,
      parentId: schema.clientGroups.parentId,
      salesZoneId: schema.clientGroups.salesZoneId,
      tenantId: schema.clientGroups.tenantId,
      createdAt: schema.clientGroups.createdAt,
      updatedAt: schema.clientGroups.updatedAt,
      salesZoneName: schema.salesZones.name,
      parentName: parent.name,
    };
  }

  async findById(id: number): Promise<ClientGroupWithZone> {
    const result = await this.db
      .select(this.selection)
      .from(schema.clientGroups)
      .leftJoin(
        schema.salesZones,
        eq(schema.clientGroups.salesZoneId, schema.salesZones.id),
      )
      .leftJoin(parent, eq(schema.clientGroups.parentId, parent.id))
      .where(eq(schema.clientGroups.id, id));
    return result[0];
  }

  async findByTenant(
    tenantId: number,
    options: ClientGroupListOptions = {},
  ): Promise<ClientGroupWithZone[]> {
    const { searchTerm, sortKey, sortOrder } = options;
    const column = SORTABLE[sortKey as keyof typeof SORTABLE];

    return this.db
      .select(this.selection)
      .from(schema.clientGroups)
      .leftJoin(
        schema.salesZones,
        eq(schema.clientGroups.salesZoneId, schema.salesZones.id),
      )
      .leftJoin(parent, eq(schema.clientGroups.parentId, parent.id))
      .where(
        and(
          eq(schema.clientGroups.tenantId, tenantId),
          searchTerm
            ? ilike(schema.clientGroups.name, `%${searchTerm}%`)
            : undefined,
        ),
      )
      .orderBy(
        column
          ? sortOrder === 'desc'
            ? desc(column)
            : asc(column)
          : asc(schema.clientGroups.name),
      );
  }

  async create(data: ClientGroupInsert): Promise<ClientGroup> {
    const result = await this.db
      .insert(schema.clientGroups)
      .values(data)
      .returning();
    return result[0];
  }

  async update(
    id: number,
    data: Partial<ClientGroupInsert>,
  ): Promise<ClientGroup> {
    const result = await this.db
      .update(schema.clientGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.clientGroups.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<ClientGroup> {
    const result = await this.db
      .delete(schema.clientGroups)
      .where(eq(schema.clientGroups.id, id))
      .returning();
    return result[0];
  }

  async countChildren(parentId: number): Promise<number> {
    const rows = await this.db
      .select({ id: schema.clientGroups.id })
      .from(schema.clientGroups)
      .where(eq(schema.clientGroups.parentId, parentId));
    return rows.length;
  }

  async countByZone(salesZoneId: number): Promise<number> {
    const rows = await this.db
      .select({ id: schema.clientGroups.id })
      .from(schema.clientGroups)
      .where(eq(schema.clientGroups.salesZoneId, salesZoneId));
    return rows.length;
  }
}
