import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from '../../drizzle/drizzle.provider';
import * as schema from '../../drizzle/schema';
import {
  assistantThreads as threads,
  assistantMessages as messages,
  assistantPlans as plans,
  assistantRuns as runs,
} from './assistant.schema';
import { CreateThreadDto } from './assistant.dto';
import { assertAssistantAccess } from './assistant.guard';

type Actor = { id: string; tenantId: number; assistantAccess: string };
@Injectable()
export class AssistantService {
  constructor(
    @Inject(DrizzleAsyncProvider) private db: NodePgDatabase<typeof schema>,
  ) {}

  async access(user: Actor) {
    const [current] = await this.db
      .select({ assistantAccess: schema.users.assistantAccess })
      .from(schema.users)
      .where(eq(schema.users.id, user.id));
    return {
      userId: user.id,
      tenantId: user.tenantId,
      assistantAccess: current?.assistantAccess || 'NONE',
      aiConfigured: !!process.env.GEMINI_API_KEY,
    };
  }
  async list(user: Actor) {
    assertAssistantAccess(user);
    const rows = await this.db
      .select()
      .from(threads)
      .where(
        and(
          eq(threads.tenantId, user.tenantId),
          user.assistantAccess === 'DEVELOPER'
            ? undefined
            : eq(threads.authorId, user.id),
        ),
      )
      .orderBy(desc(threads.updatedAt))
      .limit(100);
    return Promise.all(
      rows.map(async (thread) => {
        const [first] = await this.db
          .select({ body: messages.body })
          .from(messages)
          .where(eq(messages.threadId, thread.id))
          .orderBy(asc(messages.createdAt), asc(messages.id))
          .limit(1);
        return { ...thread, preview: first?.body || '' };
      }),
    );
  }
  async thread(user: Actor, id: string, db: any = this.db, lock = false) {
    assertAssistantAccess(user);
    let query = db
      .select()
      .from(threads)
      .where(
        and(
          eq(threads.id, id),
          eq(threads.tenantId, user.tenantId),
          user.assistantAccess === 'DEVELOPER'
            ? undefined
            : eq(threads.authorId, user.id),
        ),
      );
    if (lock) query = query.for('update');
    const [thread] = await query;
    if (!thread) throw new NotFoundException('Conversation not found');
    return thread;
  }
  async detail(user: Actor, id: string) {
    const thread = await this.thread(user, id);
    const conversation = await this.db
      .select()
      .from(messages)
      .where(eq(messages.threadId, id))
      .orderBy(asc(messages.createdAt), asc(messages.id));
    const developer = user.assistantAccess === 'DEVELOPER';
    return {
      ...thread,
      messages: conversation,
      plans: developer
        ? await this.db
            .select()
            .from(plans)
            .where(eq(plans.threadId, id))
            .orderBy(desc(plans.version))
        : [],
      runs: await this.db
        .select({
          id: runs.id,
          kind: runs.kind,
          status: runs.status,
          createdAt: runs.createdAt,
          ...(developer
            ? { error: runs.error, result: runs.result, planId: runs.planId }
            : {}),
        })
        .from(runs)
        .where(eq(runs.threadId, id))
        .orderBy(desc(runs.createdAt)),
    };
  }
  async planDetail(user: Actor, planId: string) {
    assertAssistantAccess(user, true);
    const [match] = await this.db
      .select({ threadId: plans.threadId })
      .from(plans)
      .innerJoin(threads, eq(plans.threadId, threads.id))
      .where(and(eq(plans.id, planId), eq(threads.tenantId, user.tenantId)));
    if (!match) throw new NotFoundException('Plan not found');
    return {
      ...(await this.detail(user, match.threadId)),
      selectedPlanId: planId,
    };
  }
  async create(user: Actor, input: CreateThreadDto) {
    assertAssistantAccess(user);
    const body = input.body.trim();
    if (!body) throw new BadRequestException('Write a message first');
    // Store a path only. Query strings and hashes can contain tokens or business data.
    const page = input.page.split(/[?#]/)[0];
    if (!page.startsWith('/') || page.startsWith('//'))
      throw new BadRequestException('Page must be an application path');
    return this.db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(threads)
        .values({
          tenantId: user.tenantId,
          authorId: user.id,
          mode: input.mode,
          page,
          release: input.release || 'unknown',
          browser: input.browser,
          revision: 1,
        })
        .returning();
      await tx
        .insert(messages)
        .values({ threadId: thread.id, authorId: user.id, kind: 'USER', body });
      await tx.insert(runs).values({
        threadId: thread.id,
        kind: input.mode === 'QUESTION' ? 'ANSWER' : 'PLAN',
        requestedBy: user.id,
      });
      return { id: thread.id };
    });
  }
  async reply(user: Actor, id: string, body: string) {
    if (!body.trim()) throw new BadRequestException('Write a message first');
    await this.db.transaction(async (tx) => {
      const thread = await this.thread(user, id, tx, true);
      await tx.insert(messages).values({
        threadId: id,
        authorId: user.id,
        kind: 'USER',
        body: body.trim(),
      });
      await tx
        .update(threads)
        .set({ revision: thread.revision + 1, updatedAt: new Date() })
        .where(eq(threads.id, id));
      if (thread.mode === 'QUESTION')
        await tx
          .insert(runs)
          .values({ threadId: id, kind: 'ANSWER', requestedBy: user.id });
      // Feedback replies invalidate unapproved plans, never expand an approved job.
    });
    return { saved: true };
  }
  async requestPlan(user: Actor, id: string) {
    assertAssistantAccess(user, true);
    return this.db.transaction(async (tx) => {
      const thread = await this.thread(user, id, tx, true);
      const active = await tx
        .select()
        .from(runs)
        .where(
          and(
            eq(runs.threadId, id),
            sql`${runs.status} in ('QUEUED','RUNNING')`,
          ),
        );
      if (active.length)
        throw new ConflictException('A job is already queued or running');
      await tx
        .update(threads)
        .set({ status: 'OPEN', updatedAt: new Date() })
        .where(eq(threads.id, id));
      const [run] = await tx
        .insert(runs)
        .values({
          threadId: id,
          kind: thread.mode === 'FEEDBACK' ? 'PLAN' : 'ANSWER',
          requestedBy: user.id,
        })
        .returning();
      return run;
    });
  }
  async editPlan(user: Actor, id: string, basePlanId: string, body: string) {
    assertAssistantAccess(user, true);
    if (!body.trim()) throw new BadRequestException('Plan cannot be empty');
    return this.db.transaction(async (tx) => {
      const thread = await this.thread(user, id, tx, true);
      const [latest] = await tx
        .select()
        .from(plans)
        .where(eq(plans.threadId, id))
        .orderBy(desc(plans.version))
        .limit(1);
      if (!latest || latest.id !== basePlanId)
        throw new ConflictException('The plan changed; reload before editing');
      const [active] = await tx
        .select()
        .from(runs)
        .where(
          and(
            eq(runs.threadId, id),
            sql`${runs.status} in ('QUEUED','RUNNING')`,
          ),
        );
      if (active)
        throw new ConflictException('Wait for the current job before editing');
      if (latest.threadRevision !== thread.revision)
        throw new ConflictException(
          'Feedback changed; regenerate the plan first',
        );
      const [plan] = await tx
        .insert(plans)
        .values({
          threadId: id,
          version: latest.version + 1,
          threadRevision: thread.revision,
          body: body.trim(),
          sourceRefs: latest.sourceRefs,
        })
        .returning();
      await tx
        .update(threads)
        .set({ status: 'NEEDS_REVIEW', updatedAt: new Date() })
        .where(eq(threads.id, id));
      return plan;
    });
  }
  async approve(user: Actor, id: string, planId: string) {
    assertAssistantAccess(user, true);
    return this.db.transaction(async (tx) => {
      const thread = await this.thread(user, id, tx, true);
      const [latest] = await tx
        .select()
        .from(plans)
        .where(eq(plans.threadId, id))
        .orderBy(desc(plans.version))
        .limit(1);
      if (
        !latest ||
        latest.id !== planId ||
        latest.threadRevision !== thread.revision
      )
        throw new ConflictException(
          'Plan or feedback changed; review a current plan',
        );
      if (thread.status !== 'NEEDS_REVIEW')
        throw new ConflictException(
          'This conversation is not awaiting approval',
        );
      const [active] = await tx
        .select()
        .from(runs)
        .where(
          and(
            eq(runs.threadId, id),
            sql`${runs.status} in ('QUEUED','RUNNING')`,
          ),
        );
      if (active)
        throw new ConflictException('A job is already queued or running');
      const [previous] = await tx
        .select()
        .from(runs)
        .where(and(eq(runs.planId, planId), eq(runs.kind, 'IMPLEMENT')));
      if (previous)
        throw new ConflictException(
          'This plan was already approved. Save a new version to authorize another run.',
        );
      const [run] = await tx
        .insert(runs)
        .values({
          threadId: id,
          planId,
          kind: 'IMPLEMENT',
          requestedBy: user.id,
          approvedAt: new Date(),
        })
        .returning();
      await tx
        .update(threads)
        .set({ status: 'IN_PROGRESS', updatedAt: new Date() })
        .where(eq(threads.id, id));
      return run;
    });
  }
  async setStatus(user: Actor, id: string, status: string) {
    return this.db.transaction(async (tx) => {
      const thread = await this.thread(user, id, tx, true);
      if (
        user.assistantAccess !== 'DEVELOPER' &&
        !(
          thread.status === 'READY_TO_TEST' &&
          ['RESOLVED', 'OPEN'].includes(status)
        )
      )
        assertAssistantAccess(user, true);
      if (status === 'READY_TO_TEST' && thread.status !== 'CODE_REVIEW')
        throw new ConflictException(
          'Review the implementation before marking it ready to test',
        );
      if (['DEFERRED', 'DISMISSED'].includes(status)) {
        // Unstarted AI drafts may be cancelled; an approved coding job is never cancelled implicitly.
        await tx
          .update(runs)
          .set({ status: 'CANCELLED', updatedAt: new Date() })
          .where(
            and(
              eq(runs.threadId, id),
              eq(runs.status, 'QUEUED'),
              sql`${runs.kind} in ('ANSWER','PLAN')`,
            ),
          );
      }
      const [active] = await tx
        .select()
        .from(runs)
        .where(
          and(
            eq(runs.threadId, id),
            sql`${runs.status} in ('QUEUED','RUNNING')`,
          ),
        );
      if (active)
        throw new ConflictException('Wait for the active job to finish');
      await tx
        .update(threads)
        .set({ status, updatedAt: new Date() })
        .where(eq(threads.id, id));
      await tx.insert(messages).values({
        threadId: id,
        kind: 'SYSTEM',
        body:
          status === 'READY_TO_TEST'
            ? 'Ready to test. Open the linked page and let us know how it works.'
            : `Status: ${status.toLowerCase().replace(/_/g, ' ')}`,
      });
      return { saved: true };
    });
  }
}
