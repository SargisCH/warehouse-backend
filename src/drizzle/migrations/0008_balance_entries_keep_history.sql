ALTER TABLE "balance_entries" DROP CONSTRAINT "balance_entries_sale_id_sales_id_fk";
--> statement-breakpoint
ALTER TABLE "balance_entries" ADD CONSTRAINT "balance_entries_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;