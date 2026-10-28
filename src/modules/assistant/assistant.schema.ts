import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users, tenant } from '../../drizzle/schema';

export const assistantThreads = pgTable(
  'assistant_threads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenant.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    mode: text('mode').notNull(),
    page: text('page').notNull(),
    release: text('release').notNull().default('unknown'),
    browser: text('browser'),
    status: text('status').notNull().default('OPEN'),
    revision: integer('revision').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('assistant_threads_tenant_author').on(t.tenantId, t.authorId),
    check('assistant_thread_mode', sql`${t.mode} in ('QUESTION','FEEDBACK')`),
  ],
);

export const assistantMessages = pgTable('assistant_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id')
    .notNull()
    .references(() => assistantThreads.id),
  authorId: uuid('author_id').references(() => users.id),
  kind: text('kind').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assistantPlans = pgTable(
  'assistant_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => assistantThreads.id),
    version: integer('version').notNull(),
    threadRevision: integer('thread_revision').notNull(),
    body: text('body').notNull(),
    sourceRefs: jsonb('source_refs')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('assistant_plan_version').on(t.threadId, t.version)],
);

export const assistantRuns = pgTable(
  'assistant_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => assistantThreads.id),
    planId: uuid('plan_id').references(() => assistantPlans.id),
    kind: text('kind').notNull(),
    status: text('status').notNull().default('QUEUED'),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    error: text('error'),
    result: jsonb('result').$type<{
      summary?: string;
      pullRequests?: string[];
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('assistant_plan_implementation').on(t.planId, t.kind),
    index('assistant_run_queue').on(t.kind, t.status),
    check(
      'assistant_implementation_approval',
      sql`(${t.kind} = 'IMPLEMENT' and ${t.planId} is not null and ${t.approvedAt} is not null) or (${t.kind} in ('ANSWER','PLAN') and ${t.planId} is null and ${t.approvedAt} is null)`,
    ),
  ],
);

export const assistantPlanEmails = pgTable(
  'assistant_plan_emails',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => assistantPlans.id),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id),
    status: text('status').notNull().default('PENDING'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    providerMessageId: text('provider_message_id'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('assistant_plan_email_recipient').on(t.planId, t.recipientId),
    index('assistant_plan_email_queue').on(t.status, t.nextAttemptAt),
    check(
      'assistant_plan_email_status',
      sql`${t.status} in ('PENDING','SENDING','SENT','FAILED','SKIPPED','UNCERTAIN')`,
    ),
  ],
);
