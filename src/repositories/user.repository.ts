import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';

type User = schema.User & { tenant?: schema.Tenant; role?: string };
type UserInsert = schema.UserInsert;

@Injectable()
export class UserRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private table = schema.users;

  buildUserResponse(
    user: User,
    tenant?: schema.Tenant,
    role?: schema.Role,
  ): User {
    if (tenant && role) {
      return {
        ...user,
        role: role.name,
        tenant: { ...tenant },
      };
    }
    if (tenant) {
      return {
        ...user,
        tenant: { ...tenant },
      };
    }
    if (role) {
      return {
        ...user,
        role: role.name,
      };
    }
    return { ...user };
  }
  /**
   * Find a user by their id
   * @param id the id of the user to find
   * @returns user the full user object if the user exists or null otherwise
   */
  async find(
    where: { email?: string; id?: number },
    include: { tenant?: boolean; role?: boolean } = {
      tenant: true,
      role: true,
    },
  ): Promise<User> {
    const whereQuery = Object.keys(where).map((key) =>
      eq(this.table[key], where[key]),
    );
    const baseQuery = this.db
      .select()
      .from(this.table)
      .where(and(...whereQuery));

    if (include?.role && include.tenant) {
      const [{ users: user, tenants: tenant, user_role: role }] =
        await baseQuery
          .leftJoin(schema.userRole, eq(this.table.roleId, schema.userRole.id))
          .leftJoin(schema.tenant, eq(this.table.tenantId, schema.tenant.id));

      return this.buildUserResponse(user, tenant, role);
    }
    if (include?.role) {
      const [{ users: user, user_role: role }] = await baseQuery.leftJoin(
        schema.userRole,
        eq(this.table.roleId, schema.userRole.id),
      );

      return this.buildUserResponse(user, null, role);
    }
    if (include?.tenant) {
      const [{ users: user, tenants: tenant }] = await baseQuery.leftJoin(
        schema.tenant,
        eq(this.table.tenantId, schema.tenant.id),
      );

      return this.buildUserResponse(user, tenant);
    }
    const [user] = await baseQuery;
    return this.buildUserResponse(user);
  }

  /**
   * Find all users in the database
   */
  async findAll() {
    return this.db.select().from(this.table);
  }
  async create(user: UserInsert) {
    return this.db
      .insert(this.table)
      .values({ ...user })
      .returning();
  }
}
