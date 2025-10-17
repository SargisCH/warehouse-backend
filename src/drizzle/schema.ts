import {
  integer,
  serial,
  text,
  pgTable,
  uuid,
  timestamp,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';
import {
  InferInsertModel,
  InferSelectModel,
  relations,
  sql,
} from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password'),
  companyName: text('company_name'),
  roleId: integer('role_id'),
  tenantId: integer('tenant_id'),
});

export const userRole = pgTable('user_role', {
  id: serial('id').primaryKey(),
  name: text('name'),
});

export const tenant = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name'),
});

export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  name: text('name'),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name'),
  sku: text('sku'),
  officialName: text('official_name'),
  fractional: boolean('fractional').default(false),
  unitId: integer('unit_id'),
  groupId: integer('group_id'),
  forSale: boolean('for_sale').default(false),
  returnable: boolean('returnable').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const ingredients = pgTable(
  'ingredients',
  {
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    ingredientId: integer('ingredient_id')
      .references(() => products.id)
      .notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitId: integer('unit_id'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.ingredientId] }),
  }),
);
export const productRelations = relations(products, ({ one }) => ({
  unit: one(units, {
    fields: [products.unitId],
    references: [units.id],
  }),
  group: one(productGroups, {
    fields: [products.groupId],
    references: [productGroups.id],
  }),
}));

export const ingredientRelations = relations(ingredients, ({ one }) => ({
  unit: one(units, {
    fields: [ingredients.unitId],
    references: [units.id],
  }),
  products: one(products, {
    fields: [ingredients.productId],
    references: [products.id],
  }),
}));

export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  name: text('name'),
});

export const inventory = pgTable(
  'inventory',
  {
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    warehouseId: integer('warehouse_id')
      .references(() => warehouses.id)
      .notNull(),
    quantity: integer('quantity').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.warehouseId] }),
  }),
);

export const productGroups = pgTable('product_groups', {
  id: serial('id').primaryKey(),
  name: text('name'),
  skuPrefix: text('sku_prefix'),
});

export const usersRelations = relations(users, ({ one }) => ({
  user_role: one(userRole, {
    fields: [users.roleId],
    references: [userRole.id],
  }),
  tenant: one(tenant, {
    fields: [users.tenantId],
    references: [tenant.id],
  }),
}));

// Infer select model type
export type User = InferSelectModel<typeof users>;

// Infer insert model type
export type UserInsert = InferInsertModel<typeof users>;

export type Tenant = InferSelectModel<typeof tenant>;
export type TenantInsert = InferInsertModel<typeof tenant>;
export type Role = InferSelectModel<typeof userRole>;
export type Unit = InferSelectModel<typeof units>;
export type Warehouse = InferSelectModel<typeof warehouses>;
export type WarehouseInsert = InferInsertModel<typeof warehouses>;
export type ProductGroup = InferSelectModel<typeof productGroups>;
export type ProductGroupInsert = InferInsertModel<typeof productGroups>;
export type Product = InferSelectModel<typeof products>;
export type ProductInsert = InferInsertModel<typeof products>;
export type IngredientInsert = InferInsertModel<typeof ingredients>;
export type Ingredient = InferSelectModel<typeof ingredients>;
