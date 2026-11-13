ALTER TABLE assistant_threads ADD COLUMN project text NOT NULL DEFAULT 'warehouse';
--> statement-breakpoint
ALTER TABLE assistant_threads ADD CONSTRAINT assistant_thread_project CHECK (project IN ('warehouse', 'finit'));
