import {
  AnyPgColumn,
  date,
  integer,
  serial,
  text,
  pgTable,
  uuid,
  timestamp,
  boolean,
  primaryKey,
  check,
  numeric,
  uniqueIndex,
  varchar,
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
  assistantAccess: varchar('assistant_access', { length: 20 }).notNull().default('NONE'),
}, t => [check('users_assistant_access', sql`${t.assistantAccess} in ('NONE','CONTRIBUTOR','DEVELOPER')`)]);

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
  // «Արտադրող»
  manufacturer: text('manufacturer'),
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
    quantity: numeric('quantity', { precision: 14, scale: 3 })
      .notNull()
      .default('0'),
  },
  (t) => [
    uniqueIndex('product_warehouse_id').on(t.productId, t.warehouseId),
    check('amount_is_non_negative', sql`${t.quantity} >= 0`),
  ],
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

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  name: text('name'),
});

export const supplier = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenant.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const supplies = pgTable('supplies', {
  id: serial('id').primaryKey(),
  // «Փաստաթղթի N», assigned by the server.
  code: varchar('code', { length: 16 }),
  documentDate: date('document_date').notNull().defaultNow(),
  documentId: integer('document_id').references(() => documents.id),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  // «Ընդունող»
  receiver: text('receiver'),
  note: text('note'),
  priceListId: integer('price_list_id').references(() => priceLists.id),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const supplyProducts = pgTable('supply_products', {
  id: serial('id').primaryKey(),
  supplyId: integer('supply_id').references(() => supplies.id),
  productId: integer('product_id').references(() => products.id),
  // The quantity received, not money - the name predates prices on receipts.
  amount: numeric('amount', { precision: 14, scale: 3 }).notNull(),
  price: numeric('price', { precision: 14, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
});

export const supplyRelations = relations(supplies, ({ one, many }) => ({
  document: one(documents, {
    fields: [supplies.documentId],
    references: [documents.id],
  }),
  warehouse: one(warehouses, {
    fields: [supplies.warehouseId],
    references: [warehouses.id],
  }),
  supplyProducts: many(supplyProducts),
}));

export const supplyProductsRelations = relations(supplyProducts, ({ one }) => ({
  supply: one(supplies, {
    fields: [supplyProducts.supplyId],
    references: [supplies.id],
  }),
  product: one(products, {
    fields: [supplyProducts.productId],
    references: [products.id],
  }),
}));

export const salesZones = pgTable(
  'sales_zones',
  {
    id: serial('id').primaryKey(),
    // Sequential per tenant, assigned by the server: 000001, …
    code: varchar('code', { length: 16 }).notNull(),
    name: text('name').notNull(),
    // «Մենեջեր»: the agent responsible for the zone.
    managerId: integer('manager_id').references(() => managers.id),
    // «Փակվել է»: a retired zone, kept for history rather than deleted.
    isClosed: boolean('is_closed').notNull().default(false),
    // «Կուտակիչ»: the zone this one rolls up into - itself a sales zone, so a
    // zone nests under its accumulator (Վայոց ձոր -> Ջերմուկ).
    parentId: integer('parent_id').references((): AnyPgColumn => salesZones.id),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('sales_zones_tenant_code').on(t.tenantId, t.code)],
);

export const clientGroups = pgTable('client_groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  // «Կուտակիչ»: the group this one rolls up into - itself a client group, the
  // same way a sales zone nests under its accumulator.
  parentId: integer('parent_id').references(
    (): AnyPgColumn => clientGroups.id,
  ),
  salesZoneId: integer('sales_zone_id').references(() => salesZones.id),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenant.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clientGroupRelations = relations(
  clientGroups,
  ({ one, many }) => ({
    salesZone: one(salesZones, {
      fields: [clientGroups.salesZoneId],
      references: [salesZones.id],
    }),
    parent: one(clientGroups, {
      fields: [clientGroups.parentId],
      references: [clientGroups.id],
      relationName: 'clientGroupAccumulator',
    }),
    children: many(clientGroups, { relationName: 'clientGroupAccumulator' }),
  }),
);

export const salesZoneRelations = relations(salesZones, ({ one, many }) => ({
  clientGroups: many(clientGroups),
  manager: one(managers, {
    fields: [salesZones.managerId],
    references: [managers.id],
  }),
  parent: one(salesZones, {
    fields: [salesZones.parentId],
    references: [salesZones.id],
    relationName: 'salesZoneAccumulator',
  }),
  children: many(salesZones, { relationName: 'salesZoneAccumulator' }),
}));

// «Առևտրային գործակալ»: a sales agent who works a zone and draws stock from a
// deliverer. Kept separate from `users` because an agent is a commercial record
// that outlives whatever login is (or isn't) attached to it.
export const managers = pgTable(
  'managers',
  {
    id: serial('id').primaryKey(),
    // «Կոդ»: M001, M002, … assigned by the server, never typed in.
    code: varchar('code', { length: 8 }).notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    // «Սարքի նույնականացման համար»: the handheld the agent signs in from.
    deviceId: text('device_id'),
    salesZoneId: integer('sales_zone_id').references(() => salesZones.id),
    // «Առաքիչ»: the agent whose van this one's goods come off. Deliverers are
    // managers themselves (M001 delivers for M001), so stock stays per manager.
    delivererId: integer('deliverer_id').references(
      (): AnyPgColumn => managers.id,
    ),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('managers_tenant_code').on(t.tenantId, t.code),
    uniqueIndex('managers_tenant_email').on(t.tenantId, t.email),
  ],
);

// «Գնորդ»: an outlet an agent sells to.
export const clients = pgTable(
  'clients',
  {
    id: serial('id').primaryKey(),
    // Sequential per tenant, like the manager code but six digits: 000001, …
    code: varchar('code', { length: 16 }).notNull(),
    name: text('name').notNull(),
    // «Լրիվ անվանում»: the registered name, when it differs from the trading one.
    legalName: text('legal_name'),
    // «ՀՎՀՀ»
    taxId: text('tax_id'),
    // «Իրավաբանական հասցե»
    legalAddress: text('legal_address'),
    // «Գործունեության հասցե»
    address: text('address'),
    phoneNumber: text('phone_number'),
    otherPhoneNumber: text('other_phone_number'),
    email: text('email'),
    // «Խումբ»
    clientGroupId: integer('client_group_id').references(() => clientGroups.id),
    // «Գնացուցակ»: the price list this buyer is served from by default.
    priceListId: integer('price_list_id').references(() => priceLists.id),
    // «Վճարման տեսակ»: offered first on this buyer's sales.
    paymentType: text('payment_type'),
    // «Վճարման ուշացման օրեր»: days a sale may stay unpaid before it is
    // overdue («ժամկետանց»).
    paymentTermDays: integer('payment_term_days').notNull().default(0),
    // «Պարտքի սահմանաչափ» / «Ժամկետանց պարտքի սահմանաչափ». Zero means none.
    debtLimit: numeric('debt_limit', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    overdueDebtLimit: numeric('overdue_debt_limit', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    salesZoneId: integer('sales_zone_id').references(() => salesZones.id),
    managerId: integer('manager_id').references(() => managers.id),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('clients_tenant_code').on(t.tenantId, t.code)],
);

// «Գնացուցակ»: a named set of prices («01 - Հիմնական գնացուցակ»). A buyer carries
// a default one; a sale picks the list its lines are priced from.
export const priceLists = pgTable(
  'price_lists',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 16 }).notNull(),
    name: text('name').notNull(),
    // The list offered when a buyer has none of its own.
    isDefault: boolean('is_default').notNull().default(false),
    isClosed: boolean('is_closed').notNull().default(false),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('price_lists_tenant_code').on(t.tenantId, t.code)],
);

export const priceListItems = pgTable(
  'price_list_items',
  {
    id: serial('id').primaryKey(),
    priceListId: integer('price_list_id')
      .notNull()
      .references(() => priceLists.id),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    price: numeric('price', { precision: 14, scale: 2 }).notNull(),
  },
  (t) => [
    uniqueIndex('price_list_items_list_product').on(t.priceListId, t.productId),
    check('price_is_non_negative', sql`${t.price} >= 0`),
  ],
);

// «Ապրանքները մենեջերի մոտ»: the stock an agent carries and sells from. A sale
// draws this down; deleting one puts the goods back.
export const managerStock = pgTable(
  'manager_stock',
  {
    id: serial('id').primaryKey(),
    managerId: integer('manager_id')
      .notNull()
      .references(() => managers.id),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    quantity: numeric('quantity', { precision: 14, scale: 3 })
      .notNull()
      .default('0'),
  },
  (t) => [
    // No non-negative CHECK: an agent may sell before their van is loaded.
    uniqueIndex('manager_stock_manager_product').on(t.managerId, t.productId),
  ],
);

// «Վաճառք». `isReturn` marks «Վաճառքի վերադարձ», which carries the same shape.
export const sales = pgTable(
  'sales',
  {
    id: serial('id').primaryKey(),
    // «Փաստաթղթի N», assigned by the server per tenant.
    code: varchar('code', { length: 16 }).notNull(),
    // «Ամսաթիվ»: the trading day. An agent may not move it off today.
    documentDate: date('document_date').notNull(),
    managerId: integer('manager_id')
      .notNull()
      .references(() => managers.id),
    salesZoneId: integer('sales_zone_id').references(() => salesZones.id),
    clientId: integer('client_id')
      .notNull()
      .references(() => clients.id),
    // «Առաքիչ» - a manager, see `managers.delivererId`.
    delivererId: integer('deliverer_id').references(() => managers.id),
    priceListId: integer('price_list_id').references(() => priceLists.id),
    // «Փաստաթղթի խումբ»: the document type, e.g. with or without an invoice.
    documentId: integer('document_id').references(() => documents.id),
    // «Վճարման տեսակ»
    paymentType: text('payment_type').notNull().default('CASH'),
    note: text('note'),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    // «Վճարվածա արդեն»: settled at the counter, the rest becomes debt. Anything
    // settled later lives in `credit_allocations`, not here.
    paidAmount: numeric('paid_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    isReturn: boolean('is_return').notNull().default(false),
    // «Այլ համակարգ ուղարկման վիճակ». Nothing writes this yet; the column is
    // here so the list filter has something to read.
    externalStatus: text('external_status'),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('sales_tenant_code').on(t.tenantId, t.code)],
);

export const saleItems = pgTable(
  'sale_items',
  {
    id: serial('id').primaryKey(),
    saleId: integer('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
    price: numeric('price', { precision: 14, scale: 2 }).notNull(),
    // quantity * price, stored so a later price-list edit can't rewrite history.
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  },
  (t) => [check('sale_item_quantity_is_positive', sql`${t.quantity} > 0`)],
);

// The buyer's running account, append-only. A positive balance is «պարտք»; a
// negative one is «կանխավճար». `before`/`result` make every movement auditable.
export const balanceEntries = pgTable('balance_entries', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id),
  // SALE, PAYMENT, RETURN or ADJUSTMENT - what moved the account.
  kind: text('kind').notNull(),
  // Signed: positive adds to the debt, negative settles it.
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  before: numeric('before', { precision: 14, scale: 2 }).notNull(),
  result: numeric('result', { precision: 14, scale: 2 }).notNull(),
  // Deliberately NOT cascade: removing a document must never rewrite history,
  // or the running before/result chain on surviving rows goes stale. A removal
  // posts a reversal entry instead and leaves these rows orphaned but intact.
  saleId: integer('sale_id').references(() => sales.id, {
    onDelete: 'set null',
  }),
  paymentId: integer('payment_id').references(() => payments.id, {
    onDelete: 'set null',
  }),
  note: text('note'),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenant.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// «Վճարում» (IN) and «Վճարում գնորդին» (REFUND). Money in lowers the buyer's
// balance; a refund raises it back, eating into «կանխավճար».
export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 16 }).notNull(),
    kind: text('kind').notNull().default('IN'),
    documentDate: date('document_date').notNull(),
    // Optional: a transfer to the card may never pass through an agent.
    managerId: integer('manager_id').references(() => managers.id),
    salesZoneId: integer('sales_zone_id').references(() => salesZones.id),
    clientId: integer('client_id')
      .notNull()
      .references(() => clients.id),
    paymentType: text('payment_type'),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    note: text('note'),
    externalStatus: text('external_status'),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('payments_tenant_code').on(t.tenantId, t.code),
    check('payment_amount_is_positive', sql`${t.amount} > 0`),
  ],
);

// «Մարում»: applies credit the buyer already has - «կանխավճար» or a
// «վերադարձ» - to their open sales. It never moves the balance itself.
export const repayments = pgTable(
  'repayments',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 16 }).notNull(),
    documentDate: date('document_date').notNull(),
    clientId: integer('client_id')
      .notNull()
      .references(() => clients.id),
    // «Մարման աղբյուր»: PREPAYMENT or RETURN.
    source: text('source').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    note: text('note'),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('repayments_tenant_code').on(t.tenantId, t.code)],
);

/**
 * Where a buyer's credit went. Each row takes `amount` from one source (a
 * payment or a return) and puts it on one target (a sale, or a refund paid back
 * out). Outstanding debt per sale and unused credit per source are both sums
 * over this table, so nothing is kept in a counter that could drift.
 *
 * Every link cascades: removing any document simply frees what it held.
 */
export const creditAllocations = pgTable(
  'credit_allocations',
  {
    id: serial('id').primaryKey(),
    sourcePaymentId: integer('source_payment_id').references(
      () => payments.id,
      { onDelete: 'cascade' },
    ),
    sourceReturnId: integer('source_return_id').references(() => sales.id, {
      onDelete: 'cascade',
    }),
    targetSaleId: integer('target_sale_id').references(() => sales.id, {
      onDelete: 'cascade',
    }),
    targetRefundId: integer('target_refund_id').references(
      () => payments.id,
      { onDelete: 'cascade' },
    ),
    // Set when a «մարում» made the link rather than the source itself.
    repaymentId: integer('repayment_id').references(() => repayments.id, {
      onDelete: 'cascade',
    }),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('allocation_amount_is_positive', sql`${t.amount} > 0`),
    check(
      'allocation_has_one_source',
      sql`num_nonnulls(${t.sourcePaymentId}, ${t.sourceReturnId}) = 1`,
    ),
    check(
      'allocation_has_one_target',
      sql`num_nonnulls(${t.targetSaleId}, ${t.targetRefundId}) = 1`,
    ),
  ],
);

/**
 * Stock moved without a sale. One table for the four ERP documents:
 *   WAREHOUSE - «Ապրանքների տեղաշարժ պահեստների միջև»
 *   DELIVERER - «Ապրանքների տեղաշարժ առաքիչների միջև»
 *   ISSUE     - warehouse -> deliverer, how a van gets loaded
 *   RETURN    - deliverer -> warehouse
 */
export const stockTransfers = pgTable(
  'stock_transfers',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 16 }).notNull(),
    kind: text('kind').notNull(),
    documentDate: date('document_date').notNull(),
    fromWarehouseId: integer('from_warehouse_id').references(
      () => warehouses.id,
    ),
    toWarehouseId: integer('to_warehouse_id').references(() => warehouses.id),
    fromManagerId: integer('from_manager_id').references(() => managers.id),
    toManagerId: integer('to_manager_id').references(() => managers.id),
    // «Հանձնող» / «Ընդունող» as free text, the way the ERP form takes them.
    sender: text('sender'),
    receiver: text('receiver'),
    priceListId: integer('price_list_id').references(() => priceLists.id),
    note: text('note'),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('stock_transfers_tenant_code').on(t.tenantId, t.code)],
);

export const stockTransferItems = pgTable(
  'stock_transfer_items',
  {
    id: serial('id').primaryKey(),
    transferId: integer('transfer_id')
      .notNull()
      .references(() => stockTransfers.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
    price: numeric('price', { precision: 14, scale: 2 }).notNull().default('0'),
    amount: numeric('amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
  },
  (t) => [
    check('stock_transfer_item_quantity_is_positive', sql`${t.quantity} > 0`),
  ],
);

export const priceListRelations = relations(priceLists, ({ many }) => ({
  items: many(priceListItems),
}));

export const priceListItemRelations = relations(priceListItems, ({ one }) => ({
  priceList: one(priceLists, {
    fields: [priceListItems.priceListId],
    references: [priceLists.id],
  }),
  product: one(products, {
    fields: [priceListItems.productId],
    references: [products.id],
  }),
}));

export const saleRelations = relations(sales, ({ one, many }) => ({
  manager: one(managers, {
    fields: [sales.managerId],
    references: [managers.id],
  }),
  client: one(clients, {
    fields: [sales.clientId],
    references: [clients.id],
  }),
  salesZone: one(salesZones, {
    fields: [sales.salesZoneId],
    references: [salesZones.id],
  }),
  priceList: one(priceLists, {
    fields: [sales.priceListId],
    references: [priceLists.id],
  }),
  items: many(saleItems),
}));

export const saleItemRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const managerRelations = relations(managers, ({ one, many }) => ({
  salesZone: one(salesZones, {
    fields: [managers.salesZoneId],
    references: [salesZones.id],
  }),
  deliverer: one(managers, {
    fields: [managers.delivererId],
    references: [managers.id],
    relationName: 'managerDeliverer',
  }),
  delivers: many(managers, { relationName: 'managerDeliverer' }),
  clients: many(clients),
}));

export const clientRelations = relations(clients, ({ one }) => ({
  clientGroup: one(clientGroups, {
    fields: [clients.clientGroupId],
    references: [clientGroups.id],
  }),
  salesZone: one(salesZones, {
    fields: [clients.salesZoneId],
    references: [salesZones.id],
  }),
  manager: one(managers, {
    fields: [clients.managerId],
    references: [managers.id],
  }),
}));

// Infer select model type
export type User = InferSelectModel<typeof users>;
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
export type Document = InferSelectModel<typeof documents>;
export type DocumentInsert = InferInsertModel<typeof documents>;
export type Supplier = InferSelectModel<typeof supplier>;
export type SupplierInsert = InferInsertModel<typeof supplier>;
export type Supply = InferSelectModel<typeof supplies>;
export type SupplyInsert = InferInsertModel<typeof supplies>;
export type SupplyProduct = InferSelectModel<typeof supplyProducts>;
export type SupplyProductInsert = InferInsertModel<typeof supplyProducts>;
export type SalesZone = InferSelectModel<typeof salesZones>;
export type SalesZoneInsert = InferInsertModel<typeof salesZones>;
export type ClientGroup = InferSelectModel<typeof clientGroups>;
export type ClientGroupInsert = InferInsertModel<typeof clientGroups>;
export type Manager = InferSelectModel<typeof managers>;
export type ManagerInsert = InferInsertModel<typeof managers>;
export type Client = InferSelectModel<typeof clients>;
export type ClientInsert = InferInsertModel<typeof clients>;
export type PriceList = InferSelectModel<typeof priceLists>;
export type PriceListInsert = InferInsertModel<typeof priceLists>;
export type PriceListItem = InferSelectModel<typeof priceListItems>;
export type PriceListItemInsert = InferInsertModel<typeof priceListItems>;
export type ManagerStock = InferSelectModel<typeof managerStock>;
export type ManagerStockInsert = InferInsertModel<typeof managerStock>;
export type Sale = InferSelectModel<typeof sales>;
export type SaleInsert = InferInsertModel<typeof sales>;
export type SaleItem = InferSelectModel<typeof saleItems>;
export type SaleItemInsert = InferInsertModel<typeof saleItems>;
export type BalanceEntry = InferSelectModel<typeof balanceEntries>;
export type BalanceEntryInsert = InferInsertModel<typeof balanceEntries>;
export type Payment = InferSelectModel<typeof payments>;
export type PaymentInsert = InferInsertModel<typeof payments>;
export type Repayment = InferSelectModel<typeof repayments>;
export type RepaymentInsert = InferInsertModel<typeof repayments>;
export type CreditAllocation = InferSelectModel<typeof creditAllocations>;
export type CreditAllocationInsert = InferInsertModel<typeof creditAllocations>;
export type StockTransfer = InferSelectModel<typeof stockTransfers>;
export type StockTransferInsert = InferInsertModel<typeof stockTransfers>;
export type StockTransferItem = InferSelectModel<typeof stockTransferItems>;
export type StockTransferItemInsert = InferInsertModel<
  typeof stockTransferItems
>;

export { assistantThreads, assistantMessages, assistantPlans, assistantRuns, assistantPlanEmails } from '../modules/assistant/assistant.schema';
