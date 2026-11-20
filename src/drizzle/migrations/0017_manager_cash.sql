ALTER TABLE "managers" ADD COLUMN "cash_tracking_started_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cash_collected_by_manager" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "manager_cash_entries" (
  "id" uuid PRIMARY KEY NOT NULL,
  "manager_id" integer NOT NULL,
  "kind" text NOT NULL,
  "document_date" date NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "note" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "manager_cash_entries_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "managers"("id"),
  CONSTRAINT "manager_cash_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id"),
  CONSTRAINT "manager_cash_entry_amount" CHECK (("kind" = 'OPENING' AND "amount" >= 0) OR ("kind" = 'RECEIPT' AND "amount" > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "manager_cash_one_opening" ON "manager_cash_entries" ("manager_id") WHERE "kind" = 'OPENING';
