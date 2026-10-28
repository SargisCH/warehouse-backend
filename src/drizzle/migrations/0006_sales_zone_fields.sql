-- «Կոդ» is added nullable, backfilled per tenant, then locked down: adding it
-- NOT NULL outright would fail on zones that already exist.
ALTER TABLE "sales_zones" ADD COLUMN "code" varchar(16);--> statement-breakpoint
UPDATE "sales_zones" AS z
SET "code" = lpad(numbered.rn::text, 6, '0')
FROM (
	SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY id) AS rn
	FROM "sales_zones"
) AS numbered
WHERE z.id = numbered.id;--> statement-breakpoint
ALTER TABLE "sales_zones" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_zones" ADD COLUMN "manager_id" integer;--> statement-breakpoint
ALTER TABLE "sales_zones" ADD COLUMN "is_closed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_zones" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "sales_zones" ADD CONSTRAINT "sales_zones_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_zones" ADD CONSTRAINT "sales_zones_parent_id_sales_zones_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sales_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_zones_tenant_code" ON "sales_zones" USING btree ("tenant_id","code");
