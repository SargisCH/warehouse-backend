CREATE TABLE "company_cash_entries" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenant_id" integer NOT NULL,
  "document_date" date NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "description" text NOT NULL,
  "comment" text NOT NULL,
  "return_of" uuid,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "company_cash_entry_positive_amount" CHECK ("company_cash_entries"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "company_cash_entries" ADD CONSTRAINT "company_cash_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "company_cash_entries" ADD CONSTRAINT "company_cash_entries_return_of_company_cash_entries_id_fk" FOREIGN KEY ("return_of") REFERENCES "public"."company_cash_entries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "company_cash_entries" ADD CONSTRAINT "company_cash_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "company_cash_entries_tenant" ON "company_cash_entries" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "company_cash_one_return" ON "company_cash_entries" USING btree ("return_of");
