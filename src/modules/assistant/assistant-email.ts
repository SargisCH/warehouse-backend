import { deliverPlanEmail } from './resend-email';
import { and, asc, eq, lt, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../drizzle/schema';
import {
  assistantPlanEmails as emails,
  assistantPlans as plans,
  assistantThreads as threads,
} from './assistant.schema';

type EmailPlan = { id: string; version: number };
// Called inside the same transaction that saves an AI-generated plan. No provider calls here.
export async function enqueuePlanEmails(
  tx: any,
  plan: EmailPlan,
  tenantId: number,
) {
  const recipients = await tx
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, tenantId),
        eq(schema.users.assistantAccess, 'DEVELOPER'),
      ),
    );
  if (recipients.length)
    await tx
      .insert(emails)
      .values(
        recipients.map((user) => ({ planId: plan.id, recipientId: user.id })),
      )
      .onConflictDoNothing({ target: [emails.planId, emails.recipientId] });
}

export function planReviewUrl(base: string, planId: string) {
  const url = new URL(base);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  )
    throw new Error(
      'ASSISTANT_APP_URL must be an HTTP(S) origin without credentials or a path',
    );
  if (
    url.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
    throw new Error('ASSISTANT_APP_URL must use HTTPS outside localhost');
  return new URL(`/plans/${encodeURIComponent(planId)}`, url.origin).toString();
}
export function planEmail(version: number, url: string) {
  return {
    subject: `Warehouse: plan v${version} is ready for review`,
    text: `A new implementation plan (version ${version}) is ready for your review.\n\nOpen the plan:\n${url}\n\nSign in with your existing account. Developer access is required.\nOpening this link does not authorize implementation.`,
  };
}
export function emailFailure(code: string, attempts: number) {
  if (code === 'RATE_LIMIT')
    return {
      status: attempts < 6 ? 'PENDING' : 'FAILED',
      lastError:
        attempts < 6
          ? 'Email provider throttled delivery; retry scheduled.'
          : 'Email retry limit reached.',
    };
  if (code === 'REJECTED')
    return {
      status: 'FAILED',
      lastError:
        'Email provider rejected delivery. Check the sender, credentials and recipient configuration.',
    };
  // A timeout/crash may occur after the provider accepted the message. Do not blindly resend.
  return {
    status: 'UNCERTAIN',
    lastError:
      'Delivery outcome is unknown. Check provider activity before manually retrying.',
  };
}

export class PlanEmailWorker {
  private reportedConfigurationError = false;
  constructor(
    private db: NodePgDatabase<typeof schema>,
    private deliver = deliverPlanEmail,
  ) {}
  async tick() {
    if (
      process.env.ASSISTANT_EMAIL_ENABLED !== 'true' ||
      !process.env.ASSISTANT_APP_URL ||
      !process.env.ASSISTANT_EMAIL_FROM ||
      !process.env.RESEND_API_KEY?.trim()
    )
      return false;
    // Validate configuration before claiming anything. Invalid configuration cannot lose an email.
    try {
      planReviewUrl(process.env.ASSISTANT_APP_URL, 'configuration-check');
    } catch {
      if (!this.reportedConfigurationError)
        console.error(
          'Assistant email delivery is paused: ASSISTANT_APP_URL must be a valid HTTPS origin (HTTP is allowed for localhost).',
        );
      this.reportedConfigurationError = true;
      return false;
    }
    await this.db
      .update(emails)
      .set({
        status: 'UNCERTAIN',
        lastError:
          'Email worker was interrupted; verify delivery before retrying.',
      })
      .where(
        and(
          eq(emails.status, 'SENDING'),
          lt(emails.lockedAt, new Date(Date.now() - 5 * 60_000)),
        ),
      );
    const job = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(emails)
        .where(
          and(
            eq(emails.status, 'PENDING'),
            lte(emails.nextAttemptAt, new Date()),
          ),
        )
        .orderBy(asc(emails.createdAt))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!row) return null;
      const [context] = await tx
        .select({
          email: schema.users.email,
          access: schema.users.assistantAccess,
          recipientTenant: schema.users.tenantId,
          tenantId: threads.tenantId,
          version: plans.version,
        })
        .from(plans)
        .innerJoin(threads, eq(plans.threadId, threads.id))
        .innerJoin(schema.users, eq(schema.users.id, row.recipientId))
        .where(eq(plans.id, row.planId));
      if (
        !context ||
        context.access !== 'DEVELOPER' ||
        context.recipientTenant !== context.tenantId
      ) {
        await tx
          .update(emails)
          .set({
            status: 'SKIPPED',
            lastError:
              'Recipient no longer has developer access to this tenant.',
          })
          .where(eq(emails.id, row.id));
        return null;
      }
      await tx
        .update(emails)
        .set({
          status: 'SENDING',
          attempts: row.attempts + 1,
          lockedAt: new Date(),
        })
        .where(eq(emails.id, row.id));
      return { ...row, ...context, attempts: row.attempts + 1 };
    });
    if (!job) return false;
    try {
      const content = planEmail(
        job.version,
        planReviewUrl(process.env.ASSISTANT_APP_URL, job.planId),
      );
      const messageId = await this.deliver(
        job.email,
        content.subject,
        content.text,
        job.id,
      );
      await this.db
        .update(emails)
        .set({
          status: 'SENT',
          providerMessageId: messageId,
          sentAt: new Date(),
          lockedAt: null,
          lastError: null,
        })
        .where(eq(emails.id, job.id));
    } catch (error) {
      const outcome = emailFailure(error?.code, job.attempts);
      await this.db
        .update(emails)
        .set({
          ...outcome,
          lockedAt: null,
          nextAttemptAt: new Date(
            Date.now() + Math.min(3600000, 60000 * 2 ** (job.attempts - 1)),
          ),
        })
        .where(eq(emails.id, job.id));
    }
    return true;
  }
}
