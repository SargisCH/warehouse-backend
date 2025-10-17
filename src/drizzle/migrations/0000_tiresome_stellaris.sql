CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"company_name" text,
	"role_id" integer,
	"tenant_id" integer,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
