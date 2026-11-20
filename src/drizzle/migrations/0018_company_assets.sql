ALTER TABLE "tenants" ADD COLUMN "company_cash_started_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "company_cash_opening" numeric(14, 2);
--> statement-breakpoint
CREATE TABLE "company_assets" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenant_id" integer NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "condition" text NOT NULL,
  "acquired_on" date NOT NULL,
  "purchase_price" numeric(14, 2) NOT NULL,
  "paid_from_cash" boolean NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "company_assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id"),
  CONSTRAINT "company_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id"),
  CONSTRAINT "company_asset_condition" CHECK ("condition" IN ('NEW', 'USED')),
  CONSTRAINT "company_asset_purchase_price" CHECK ("purchase_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "company_asset_entries" (
  "id" uuid PRIMARY KEY NOT NULL,
  "asset_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "document_date" date NOT NULL,
  "description" text NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "affects_cash" boolean NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "company_asset_entries_asset_id_company_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "company_assets"("id"),
  CONSTRAINT "company_asset_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id"),
  CONSTRAINT "company_asset_entry_kind" CHECK ("kind" IN ('REPAIR', 'SALE', 'REFUND')),
  CONSTRAINT "company_asset_entry_amount" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "company_asset_single_sale" ON "company_asset_entries" ("asset_id") WHERE "kind" = 'SALE';
