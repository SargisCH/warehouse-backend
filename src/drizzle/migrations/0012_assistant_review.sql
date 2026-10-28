CREATE TABLE "assistant_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"thread_revision" integer NOT NULL,
	"body" text NOT NULL,
	"source_refs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"plan_id" uuid,
	"kind" text NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"requested_by" uuid NOT NULL,
	"approved_at" timestamp with time zone,
	"error" text,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_implementation_approval" CHECK (("assistant_runs"."kind" = 'IMPLEMENT' and "assistant_runs"."plan_id" is not null and "assistant_runs"."approved_at" is not null) or ("assistant_runs"."kind" in ('ANSWER','PLAN') and "assistant_runs"."plan_id" is null and "assistant_runs"."approved_at" is null))
);
--> statement-breakpoint
CREATE TABLE "assistant_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"author_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"page" text NOT NULL,
	"release" text DEFAULT 'unknown' NOT NULL,
	"browser" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_thread_mode" CHECK ("assistant_threads"."mode" in ('QUESTION','FEEDBACK'))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "assistant_access" varchar(20) DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_plans" ADD CONSTRAINT "assistant_plans_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_plan_id_assistant_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."assistant_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_threads" ADD CONSTRAINT "assistant_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_threads" ADD CONSTRAINT "assistant_threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_plan_version" ON "assistant_plans" USING btree ("thread_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_plan_implementation" ON "assistant_runs" USING btree ("plan_id","kind");--> statement-breakpoint
CREATE INDEX "assistant_run_queue" ON "assistant_runs" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX "assistant_threads_tenant_author" ON "assistant_threads" USING btree ("tenant_id","author_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_assistant_access" CHECK ("users"."assistant_access" in ('NONE','CONTRIBUTOR','DEVELOPER'));