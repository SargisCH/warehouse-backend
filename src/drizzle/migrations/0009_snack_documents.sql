CREATE TABLE "credit_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_payment_id" integer,
	"source_return_id" integer,
	"target_sale_id" integer,
	"target_refund_id" integer,
	"repayment_id" integer,
	"amount" numeric(14, 2) NOT NULL,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allocation_amount_is_positive" CHECK ("credit_allocations"."amount" > 0),
	CONSTRAINT "allocation_has_one_source" CHECK (num_nonnulls("credit_allocations"."source_payment_id", "credit_allocations"."source_return_id") = 1),
	CONSTRAINT "allocation_has_one_target" CHECK (num_nonnulls("credit_allocations"."target_sale_id", "credit_allocations"."target_refund_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(16) NOT NULL,
	"kind" text DEFAULT 'IN' NOT NULL,
	"document_date" date NOT NULL,
	"manager_id" integer,
	"sales_zone_id" integer,
	"client_id" integer NOT NULL,
	"payment_type" text,
	"amount" numeric(14, 2) NOT NULL,
	"note" text,
	"external_status" text,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_amount_is_positive" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "repayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(16) NOT NULL,
	"document_date" date NOT NULL,
	"client_id" integer NOT NULL,
	"source" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"note" text,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfer_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "stock_transfer_item_quantity_is_positive" CHECK ("stock_transfer_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(16) NOT NULL,
	"kind" text NOT NULL,
	"document_date" date NOT NULL,
	"from_warehouse_id" integer,
	"to_warehouse_id" integer,
	"from_manager_id" integer,
	"to_manager_id" integer,
	"sender" text,
	"receiver" text,
	"price_list_id" integer,
	"note" text,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "managers" DROP CONSTRAINT "managers_deliverer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sales" DROP CONSTRAINT "sales_deliverer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "quantity" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "deliverer_id" SET DATA TYPE integer USING NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "deliverer_id" SET DATA TYPE integer USING NULL;--> statement-breakpoint
ALTER TABLE "supply_products" ALTER COLUMN "amount" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "balance_entries" ADD COLUMN "payment_id" integer;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "code" varchar(16);--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "document_date" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "receiver" text;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "price_list_id" integer;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "total_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "supply_products" ADD COLUMN "price" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "supply_products" ADD COLUMN "total" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_allocations" ADD CONSTRAINT "credit_allocations_source_payment_id_payments_id_fk" FOREIGN KEY ("source_payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_allocations" ADD CONSTRAINT "credit_allocations_source_return_id_sales_id_fk" FOREIGN KEY ("source_return_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_allocations" ADD CONSTRAINT "credit_allocations_target_sale_id_sales_id_fk" FOREIGN KEY ("target_sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_allocations" ADD CONSTRAINT "credit_allocations_target_refund_id_payments_id_fk" FOREIGN KEY ("target_refund_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_allocations" ADD CONSTRAINT "credit_allocations_repayment_id_repayments_id_fk" FOREIGN KEY ("repayment_id") REFERENCES "public"."repayments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_allocations" ADD CONSTRAINT "credit_allocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_sales_zone_id_sales_zones_id_fk" FOREIGN KEY ("sales_zone_id") REFERENCES "public"."sales_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_warehouse_id_warehouses_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_warehouse_id_warehouses_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_manager_id_managers_id_fk" FOREIGN KEY ("from_manager_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_manager_id_managers_id_fk" FOREIGN KEY ("to_manager_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_tenant_code" ON "payments" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "repayments_tenant_code" ON "repayments" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_transfers_tenant_code" ON "stock_transfers" USING btree ("tenant_id","code");--> statement-breakpoint
ALTER TABLE "balance_entries" ADD CONSTRAINT "balance_entries_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_deliverer_id_managers_id_fk" FOREIGN KEY ("deliverer_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_deliverer_id_managers_id_fk" FOREIGN KEY ("deliverer_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;