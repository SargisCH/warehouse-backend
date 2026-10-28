CREATE TABLE "balance_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"before" numeric(14, 2) NOT NULL,
	"result" numeric(14, 2) NOT NULL,
	"sale_id" integer,
	"note" text,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	CONSTRAINT "manager_stock_is_non_negative" CHECK ("manager_stock"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "price_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"price_list_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	CONSTRAINT "price_is_non_negative" CHECK ("price_list_items"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	CONSTRAINT "sale_item_quantity_is_positive" CHECK ("sale_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(16) NOT NULL,
	"document_date" date NOT NULL,
	"manager_id" integer NOT NULL,
	"sales_zone_id" integer,
	"client_id" integer NOT NULL,
	"deliverer_id" uuid,
	"price_list_id" integer,
	"payment_type" text DEFAULT 'CASH' NOT NULL,
	"note" text,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_return" boolean DEFAULT false NOT NULL,
	"external_status" text,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "price_list_id" integer;--> statement-breakpoint
ALTER TABLE "balance_entries" ADD CONSTRAINT "balance_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_entries" ADD CONSTRAINT "balance_entries_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_entries" ADD CONSTRAINT "balance_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_stock" ADD CONSTRAINT "manager_stock_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_stock" ADD CONSTRAINT "manager_stock_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_sales_zone_id_sales_zones_id_fk" FOREIGN KEY ("sales_zone_id") REFERENCES "public"."sales_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_deliverer_id_users_id_fk" FOREIGN KEY ("deliverer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "manager_stock_manager_product" ON "manager_stock" USING btree ("manager_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_list_items_list_product" ON "price_list_items" USING btree ("price_list_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_lists_tenant_code" ON "price_lists" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_tenant_code" ON "sales" USING btree ("tenant_id","code");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;