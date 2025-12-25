CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text
);
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "warehouse_id";