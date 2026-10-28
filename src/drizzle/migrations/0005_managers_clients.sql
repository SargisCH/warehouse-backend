CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"tax_id" text,
	"legal_address" text,
	"address" text,
	"phone_number" text,
	"other_phone_number" text,
	"email" text,
	"client_group_id" integer,
	"sales_zone_id" integer,
	"manager_id" integer,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(8) NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"device_id" text,
	"sales_zone_id" integer,
	"deliverer_id" uuid,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_client_group_id_client_groups_id_fk" FOREIGN KEY ("client_group_id") REFERENCES "public"."client_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_sales_zone_id_sales_zones_id_fk" FOREIGN KEY ("sales_zone_id") REFERENCES "public"."sales_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_sales_zone_id_sales_zones_id_fk" FOREIGN KEY ("sales_zone_id") REFERENCES "public"."sales_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_deliverer_id_users_id_fk" FOREIGN KEY ("deliverer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_tenant_code" ON "clients" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "managers_tenant_code" ON "managers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "managers_tenant_email" ON "managers" USING btree ("tenant_id","email");