CREATE TABLE "assistant_plan_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"provider_message_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_plan_email_status" CHECK ("assistant_plan_emails"."status" in ('PENDING','SENDING','SENT','FAILED','SKIPPED','UNCERTAIN'))
);
--> statement-breakpoint
ALTER TABLE "assistant_plan_emails" ADD CONSTRAINT "assistant_plan_emails_plan_id_assistant_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."assistant_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_plan_emails" ADD CONSTRAINT "assistant_plan_emails_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_plan_email_recipient" ON "assistant_plan_emails" USING btree ("plan_id","recipient_id");--> statement-breakpoint
CREATE INDEX "assistant_plan_email_queue" ON "assistant_plan_emails" USING btree ("status","next_attempt_at");