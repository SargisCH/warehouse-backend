CREATE TABLE "stock_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"kind" text NOT NULL,
	"quantity" numeric(15, 3) NOT NULL,
	"document_date" date NOT NULL,
	"document_id" integer,
	"document_code" text,
	"reversed" boolean DEFAULT false NOT NULL,
	"from_warehouse_id" integer,
	"to_warehouse_id" integer,
	"from_manager_id" integer,
	"to_manager_id" integer,
	"before_quantity" numeric(14, 3),
	"after_quantity" numeric(14, 3),
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_history_positive_quantity" CHECK ("stock_history"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "stock_history_product" ON "stock_history" USING btree ("tenant_id", "product_id", "document_date", "id");
--> statement-breakpoint
CREATE INDEX "stock_history_from_warehouse" ON "stock_history" USING btree ("tenant_id", "from_warehouse_id", "document_date", "id");
--> statement-breakpoint
CREATE INDEX "stock_history_to_warehouse" ON "stock_history" USING btree ("tenant_id", "to_warehouse_id", "document_date", "id");
