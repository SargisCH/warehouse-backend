import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PgDialect } from 'drizzle-orm/pg-core';
import { AssistantService } from './assistant.service';
import { assertAssistantAccess, AssistantGuard } from './assistant.guard';
import { validateOperation } from './implementation.runner';
import { validate } from 'class-validator';
import { CreateThreadDto } from './assistant.dto';

const developer = { id: 'dev-id', tenantId: 7, assistantAccess: 'DEVELOPER' };
const contributor = {
  id: 'author-id',
  tenantId: 7,
  assistantAccess: 'CONTRIBUTOR',
};
function chain(rows: any[]) {
  const query: any = {
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  };
  for (const name of ['from', 'where', 'orderBy', 'limit', 'for'])
    query[name] = jest.fn(() => query);
  return query;
}
function database(rows: any[][]) {
  const queries: any[] = [];
  const writes: any[] = [];
  const db: any = {
    select: jest.fn(() => {
      const q = chain(rows.shift() || []);
      queries.push(q);
      return q;
    }),
    insert: jest.fn(() => ({
      values: jest.fn((value) => {
        writes.push(value);
        return {
          returning: () => Promise.resolve([{ id: 'new-run', ...value }]),
          then: (resolve) => Promise.resolve().then(resolve),
        };
      }),
    })),
    update: jest.fn(() => ({
      set: jest.fn((value) => {
        writes.push(value);
        return { where: () => Promise.resolve() };
      }),
    })),
    transaction: jest.fn((callback) => callback(db)),
  };
  return { db, queries, writes, service: new AssistantService(db) };
}
const thread = {
  id: 'thread',
  tenantId: 7,
  authorId: 'author-id',
  mode: 'FEEDBACK',
  revision: 3,
  status: 'NEEDS_REVIEW',
};
const plan = {
  id: 'plan',
  threadId: 'thread',
  threadRevision: 3,
  version: 2,
  body: 'Reviewed plan',
  sourceRefs: { frontend: 'a'.repeat(40), backend: 'b'.repeat(40) },
};

describe('assistant access boundaries', () => {
  it.each([
    undefined,
    {},
    { ...developer, assistantAccess: 'NONE' },
    { ...developer, tenantId: null },
    { ...developer, assistantAccess: 'ADMIN' },
  ])('denies users without explicit access: %p', (user) => {
    expect(() => assertAssistantAccess(user)).toThrow(ForbiddenException);
  });
  it('allows contributors to ask but denies approval access', () => {
    expect(() => assertAssistantAccess(contributor)).not.toThrow();
    expect(() => assertAssistantAccess(contributor, true)).toThrow(
      ForbiddenException,
    );
    expect(() => assertAssistantAccess(developer, true)).not.toThrow();
  });
  it('enforces developer metadata at the HTTP guard', () => {
    const guard = new AssistantGuard({ get: () => true } as any);
    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ user: contributor }) }),
        getHandler: () => null,
      } as any),
    ).toThrow(ForbiddenException);
  });
  it('scopes contributor conversation reads by tenant and author', async () => {
    const { service, queries } = database([[]]);
    await expect(service.thread(contributor, 'private-id')).rejects.toThrow(
      NotFoundException,
    );
    const query = new PgDialect().sqlToQuery(queries[0].where.mock.calls[0][0]);
    expect(query.params).toEqual(['private-id', 7, 'author-id']);
  });
  it('scopes developer reads by tenant too', async () => {
    const { service, queries } = database([[]]);
    await expect(service.thread(developer, 'other-tenant')).rejects.toThrow(
      NotFoundException,
    );
    expect(
      new PgDialect().sqlToQuery(queries[0].where.mock.calls[0][0]).params,
    ).toEqual(['other-tenant', 7]);
  });
  it('hides plans and implementation details from contributors', async () => {
    const { service } = database([[thread], [{ body: 'message' }], []]);
    const result = await service.detail(contributor, 'thread');
    expect(result.plans).toEqual([]);
  });
});

describe('plan approval gate', () => {
  it('rejects contributor approval before querying storage', async () => {
    const { service, db } = database([]);
    await expect(
      service.approve(contributor, 'thread', 'plan'),
    ).rejects.toThrow(ForbiddenException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each([
    [{ ...plan, id: 'newer-plan' }, thread],
    [{ ...plan, threadRevision: 2 }, thread],
    [plan, { ...thread, status: 'DISMISSED' }],
  ])('rejects stale or unreviewable plans', async (latest, current) => {
    const { service, db } = database([[current], [latest]]);
    await expect(service.approve(developer, 'thread', 'plan')).rejects.toThrow(
      ConflictException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('does not approve while another job is active', async () => {
    const { service, db } = database([[thread], [plan], [{ id: 'active' }]]);
    await expect(service.approve(developer, 'thread', 'plan')).rejects.toThrow(
      ConflictException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('rejects duplicate approval even when the previous run failed', async () => {
    const { service, db } = database([
      [thread],
      [plan],
      [],
      [{ status: 'FAILED' }],
    ]);
    await expect(service.approve(developer, 'thread', 'plan')).rejects.toThrow(
      ConflictException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('records exact plan, actor and approval time in the transaction', async () => {
    const { service, writes, queries } = database([[thread], [plan], [], []]);
    await service.approve(developer, 'thread', 'plan');
    expect(queries[0].for).toHaveBeenCalledWith('update');
    expect(writes[0]).toMatchObject({
      planId: 'plan',
      kind: 'IMPLEMENT',
      requestedBy: 'dev-id',
      approvedAt: expect.any(Date),
    });
    expect(writes[1]).toMatchObject({ status: 'IN_PROGRESS' });
  });
  it('feedback creation queues planning, never implementation', async () => {
    const { service, writes } = database([]);
    await service.create(contributor, {
      mode: 'FEEDBACK',
      body: ' Improve sales ',
      page: '/admin/sales?token=secret#private',
    });
    expect(writes[0]).toMatchObject({
      tenantId: 7,
      authorId: 'author-id',
      page: '/admin/sales',
    });
    expect(writes[1].body).toBe('Improve sales');
    expect(writes[2].kind).toBe('PLAN');
    expect(writes.some((w) => w.kind === 'IMPLEMENT')).toBe(false);
  });
  it('contributor replies invalidate a draft without starting coding', async () => {
    const { service, writes } = database([[thread]]);
    await service.reply(contributor, 'thread', 'Also keep the existing filter');
    expect(writes).toHaveLength(2);
    expect(writes[1]).toMatchObject({ revision: 4 });
  });
});

describe('input and coding path validation', () => {
  it('rejects invalid modes and oversized messages', async () => {
    const input = Object.assign(new CreateThreadDto(), {
      mode: 'IMPLEMENT',
      body: 'x'.repeat(8001),
      page: '/admin',
    });
    expect((await validate(input)).map((e) => e.property)).toEqual(
      expect.arrayContaining(['mode', 'body']),
    );
  });
  it.each([
    '../../.env',
    '/tmp/pwn.ts',
    'src/modules/../../.env',
    'src/modules/auth/auth.service.ts',
    'src/modules/exclude/foo.ts',
    'src/modules/a\\b.ts',
    '.github/workflows/deploy.yml',
    'package.json',
  ])('rejects unsafe coding path %s', (file) => {
    expect(() =>
      validateOperation({
        action: 'write',
        repo: 'backend',
        path: file,
        content: 'bad',
      }),
    ).toThrow();
  });
  it('allows focused application source edits', () => {
    expect(() =>
      validateOperation({
        action: 'write',
        repo: 'frontend',
        path: 'src/pages/sale/SaleList.tsx',
        content: 'code',
      }),
    ).not.toThrow();
  });
});
