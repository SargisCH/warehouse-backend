import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { Client, ClientInsert } from 'src/drizzle/schema';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type ClientListOptions = {
  searchTerm?: string;
  sortKey?: string;
  sortOrder?: string;
  // Narrows the list to one agent's outlets — what a Manager sees.
  managerId?: number;
};

// A row as the list screen needs it: the buyer plus the names behind its links.
export type ClientWithRelations = Client & {
  clientGroupName: string | null;
  salesZoneName: string | null;
  managerName: string | null;
};

const SORTABLE = {
  code: schema.clients.code,
  name: schema.clients.name,
  legalName: schema.clients.legalName,
  taxId: schema.clients.taxId,
  createdAt: schema.clients.createdAt,
  updatedAt: schema.clients.updatedAt,
};

@Injectable()
export class ClientRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private get selection() {
    return {
      id: schema.clients.id,
      code: schema.clients.code,
      name: schema.clients.name,
      legalName: schema.clients.legalName,
      taxId: schema.clients.taxId,
      legalAddress: schema.clients.legalAddress,
      address: schema.clients.address,
      phoneNumber: schema.clients.phoneNumber,
      otherPhoneNumber: schema.clients.otherPhoneNumber,
      email: schema.clients.email,
      clientGroupId: schema.clients.clientGroupId,
      priceListId: schema.clients.priceListId,
      paymentType: schema.clients.paymentType,
      paymentTermDays: schema.clients.paymentTermDays,
      debtLimit: schema.clients.debtLimit,
      overdueDebtLimit: schema.clients.overdueDebtLimit,
      salesZoneId: schema.clients.salesZoneId,
      managerId: schema.clients.managerId,
      tenantId: schema.clients.tenantId,
      createdAt: schema.clients.createdAt,
      updatedAt: schema.clients.updatedAt,
      clientGroupName: schema.clientGroups.name,
      salesZoneName: schema.salesZones.name,
      managerName: schema.managers.name,
    };
  }

  private get baseQuery() {
    return this.db
      .select(this.selection)
      .from(schema.clients)
      .leftJoin(
        schema.clientGroups,
        eq(schema.clients.clientGroupId, schema.clientGroups.id),
      )
      .leftJoin(
        schema.salesZones,
        eq(schema.clients.salesZoneId, schema.salesZones.id),
      )
      .leftJoin(
        schema.managers,
        eq(schema.clients.managerId, schema.managers.id),
      );
  }

  async findById(id: number): Promise<ClientWithRelations> {
    const result = await this.baseQuery.where(eq(schema.clients.id, id));
    return result[0];
  }

  async findByTenant(
    tenantId: number,
    options: ClientListOptions = {},
  ): Promise<ClientWithRelations[]> {
    const { searchTerm, sortKey, sortOrder, managerId } = options;
    const column = SORTABLE[sortKey as keyof typeof SORTABLE];

    return this.baseQuery
      .where(
        and(
          eq(schema.clients.tenantId, tenantId),
          managerId ? eq(schema.clients.managerId, managerId) : undefined,
          searchTerm
            ? or(
                ilike(schema.clients.name, `%${searchTerm}%`),
                ilike(schema.clients.code, `%${searchTerm}%`),
                ilike(schema.clients.taxId, `%${searchTerm}%`),
              )
            : undefined,
        ),
      )
      .orderBy(
        column
          ? sortOrder === 'desc'
            ? desc(column)
            : asc(column)
          : asc(schema.clients.code),
      );
  }

  // Six digits, matching the code the ERP screen pre-fills («001300»).
  async nextCode(tenantId: number): Promise<string> {
    const result = await this.db
      .select({
        highest: sql<number>`coalesce(max(nullif(regexp_replace(${schema.clients.code}, '\\D', '', 'g'), '')::int), 0)`,
      })
      .from(schema.clients)
      .where(eq(schema.clients.tenantId, tenantId));
    const next = Number(result[0]?.highest ?? 0) + 1;
    return String(next).padStart(6, '0');
  }

  async create(data: ClientInsert): Promise<Client> {
    const result = await this.db
      .insert(schema.clients)
      .values(data)
      .returning();
    return result[0];
  }

  async update(id: number, data: Partial<ClientInsert>): Promise<Client> {
    const result = await this.db
      .update(schema.clients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.clients.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<Client> {
    const result = await this.db
      .delete(schema.clients)
      .where(eq(schema.clients.id, id))
      .returning();
    return result[0];
  }

  async countByZone(salesZoneId: number): Promise<number> {
    const rows = await this.db
      .select({ id: schema.clients.id })
      .from(schema.clients)
      .where(eq(schema.clients.salesZoneId, salesZoneId));
    return rows.length;
  }

  async countByManager(managerId: number): Promise<number> {
    const rows = await this.db
      .select({ id: schema.clients.id })
      .from(schema.clients)
      .where(eq(schema.clients.managerId, managerId));
    return rows.length;
  }
}
