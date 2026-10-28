import { PgDialect } from 'drizzle-orm/pg-core';
import {
  enqueuePlanEmails,
  emailFailure,
  planEmail,
  planReviewUrl,
  PlanEmailWorker,
} from './assistant-email';
import { AssistantService } from './assistant.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { corsOrigins } from '../../configs/cors-origins';

function chain(rows: any[]) {
  const q: any = {
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  };
  for (const method of [
    'from',
    'where',
    'innerJoin',
    'orderBy',
    'limit',
    'for',
  ])
    q[method] = jest.fn(() => q);
  return q;
}
function database(rows: any[][]) {
  const queries: any[] = [];
  const writes: any[] = [];
  const conflict = jest.fn(() => Promise.resolve());
  const db: any = {
    select: jest.fn(() => {
      const q = chain(rows.shift() || []);
      queries.push(q);
      return q;
    }),
    insert: jest.fn(() => ({
      values: jest.fn((value) => {
        writes.push(value);
        return { onConflictDoNothing: conflict };
      }),
    })),
    update: jest.fn(() => ({
      set: jest.fn((value) => {
        writes.push(value);
        return { where: jest.fn(() => Promise.resolve()) };
      }),
    })),
    transaction: jest.fn((fn) => fn(db)),
  };
  return { db, queries, writes, conflict };
}
const savedEnv = { ...process.env };
beforeEach(() => {
  process.env = {
    ...savedEnv,
    ASSISTANT_EMAIL_ENABLED: 'true',
    RESEND_API_KEY: 'test-key',
    ASSISTANT_EMAIL_FROM: 'sender@example.com',
    ASSISTANT_APP_URL: 'https://assistant.example.com',
  };
});
afterEach(() => {
  process.env = { ...savedEnv };
});
const row = {
  id: 'email-job',
  planId: 'plan-id',
  recipientId: 'dev-id',
  attempts: 0,
};
const recipient = {
  email: 'developer@example.com',
  access: 'DEVELOPER',
  recipientTenant: 7,
  tenantId: 7,
  version: 2,
};

describe('plan email outbox', () => {
  it('enqueues once per developer recipient in the plan tenant', async () => {
    const { db, queries, writes, conflict } = database([[{ id: 'dev-id' }]]);
    await enqueuePlanEmails(db, { id: 'plan-id', version: 2 }, 7);
    expect(
      new PgDialect().sqlToQuery(queries[0].where.mock.calls[0][0]).params,
    ).toEqual([7, 'DEVELOPER']);
    expect(writes[0]).toEqual([{ planId: 'plan-id', recipientId: 'dev-id' }]);
    expect(conflict).toHaveBeenCalledWith({ target: expect.any(Array) });
  });
  it('does not call the provider or claim work when disabled', async () => {
    process.env.ASSISTANT_EMAIL_ENABLED = 'false';
    const { db } = database([]);
    const deliver = jest.fn();
    expect(await new PlanEmailWorker(db, deliver).tick()).toBe(false);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });
  it('keeps notifications queued until a Resend key is configured', async () => {
    delete process.env.RESEND_API_KEY;
    const { db } = database([]);
    const deliver = jest.fn();
    expect(await new PlanEmailWorker(db, deliver).tick()).toBe(false);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });
  it.each([
    { ...recipient, access: 'CONTRIBUTOR' },
    { ...recipient, recipientTenant: 99 },
  ])(
    'skips a recipient who lost permission or changed tenant',
    async (context) => {
      const { db, writes } = database([[row], [context]]);
      const deliver = jest.fn();
      await new PlanEmailWorker(db, deliver).tick();
      expect(deliver).not.toHaveBeenCalled();
      expect(writes).toContainEqual(
        expect.objectContaining({ status: 'SKIPPED' }),
      );
    },
  );
  it('claims with a lock, sends an authenticated exact-version link and records receipt', async () => {
    const { db, writes, queries } = database([[row], [recipient]]);
    const deliver = jest.fn().mockResolvedValue('provider-message');
    await new PlanEmailWorker(db, deliver).tick();
    expect(queries[0].for).toHaveBeenCalledWith('update', { skipLocked: true });
    expect(deliver).toHaveBeenCalledWith(
      'developer@example.com',
      'Warehouse: plan v2 is ready for review',
      expect.stringContaining('https://assistant.example.com/plans/plan-id'),
      'email-job',
    );
    expect(writes).toContainEqual(
      expect.objectContaining({
        status: 'SENT',
        providerMessageId: 'provider-message',
      }),
    );
  });
  it('retries a definite provider throttle without losing the plan', async () => {
    const { db, writes } = database([[row], [recipient]]);
    const deliver = jest.fn().mockRejectedValue({
      code: 'RATE_LIMIT',
      message: 'private provider details',
    });
    await expect(new PlanEmailWorker(db, deliver).tick()).resolves.toBe(true);
    expect(writes).toContainEqual(
      expect.objectContaining({
        status: 'PENDING',
        nextAttemptAt: expect.any(Date),
      }),
    );
    expect(JSON.stringify(writes)).not.toContain('private provider details');
  });
  it('does not blindly retry ambiguous outcomes or exhausted attempts', () => {
    expect(emailFailure('UNKNOWN', 1).status).toBe('UNCERTAIN');
    expect(emailFailure('RATE_LIMIT', 6).status).toBe('FAILED');
    expect(emailFailure('REJECTED', 1).status).toBe('FAILED');
  });
  it('rejects unsafe base URLs and does not include plan body or access tokens in email', () => {
    for (const url of [
      'https://user:secret@example.com',
      'javascript:alert(1)',
      'http://example.com',
      'https://example.com/path',
      'https://example.com?token=abc',
    ])
      expect(() => planReviewUrl(url, 'id')).toThrow();
    const content = planEmail(1, planReviewUrl('https://example.com', 'id'));
    expect(content.text).toContain('Developer access is required');
    expect(content.text).not.toMatch(/token=|Bearer/);
  });
});

describe('exact plan links and browser origins', () => {
  it('denies contributors before querying a plan', async () => {
    const { db } = database([]);
    await expect(
      new AssistantService(db).planDetail(
        { id: 'u', tenantId: 7, assistantAccess: 'CONTRIBUTOR' },
        'plan-id',
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(db.select).not.toHaveBeenCalled();
  });
  it('looks up exact versions with tenant isolation', async () => {
    const { db, queries } = database([[]]);
    await expect(
      new AssistantService(db).planDetail(
        { id: 'u', tenantId: 7, assistantAccess: 'DEVELOPER' },
        'private-plan',
      ),
    ).rejects.toThrow(NotFoundException);
    expect(
      new PgDialect().sqlToQuery(queries[0].where.mock.calls[0][0]).params,
    ).toEqual(['private-plan', 7]);
  });
  it('returns the requested version alongside its conversation', async () => {
    const { db } = database([[{ threadId: 'thread-id' }]]);
    const service = new AssistantService(db);
    jest
      .spyOn(service, 'detail')
      .mockResolvedValue({ id: 'thread-id', plans: [] } as any);
    const user = { id: 'u', tenantId: 7, assistantAccess: 'DEVELOPER' };
    expect(await service.planDetail(user, 'older-plan')).toMatchObject({
      selectedPlanId: 'older-plan',
    });
    expect(service.detail).toHaveBeenCalledWith(user, 'thread-id');
  });
  it('allows only the two configured browser origins', () => {
    expect(
      corsOrigins({
        FRONTEND_URL: 'https://warehouse.example.com/',
        ASSISTANT_APP_URL: 'https://assistant.example.com',
      }),
    ).toEqual([
      'https://warehouse.example.com',
      'https://assistant.example.com',
    ]);
    expect(corsOrigins({})).toEqual([]);
  });
});
