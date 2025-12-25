CREATE TABLE "supplies" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer,
	"warehouse_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"supply_id" integer,
	"product_id" integer,
	"amount" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_products" ADD CONSTRAINT "supply_products_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_products" ADD CONSTRAINT "supply_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;