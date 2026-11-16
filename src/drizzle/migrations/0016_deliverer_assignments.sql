ALTER TABLE "clients" ADD COLUMN "deliverer_id" integer;
--> statement-breakpoint
ALTER TABLE "sales_zones" ADD COLUMN "deliverer_id" integer;
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_deliverer_id_managers_id_fk" FOREIGN KEY ("deliverer_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_zones" ADD CONSTRAINT "sales_zones_deliverer_id_managers_id_fk" FOREIGN KEY ("deliverer_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;
