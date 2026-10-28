ALTER TABLE "client_groups" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "payment_type" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "payment_term_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "debt_limit" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "overdue_debt_limit" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "manufacturer" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "document_id" integer;--> statement-breakpoint
ALTER TABLE "client_groups" ADD CONSTRAINT "client_groups_parent_id_client_groups_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."client_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;