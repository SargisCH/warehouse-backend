CREATE TABLE "client_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_accumulator" boolean DEFAULT false NOT NULL,
	"sales_zone_id" integer,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_groups" ADD CONSTRAINT "client_groups_sales_zone_id_sales_zones_id_fk" FOREIGN KEY ("sales_zone_id") REFERENCES "public"."sales_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_groups" ADD CONSTRAINT "client_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_zones" ADD CONSTRAINT "sales_zones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;