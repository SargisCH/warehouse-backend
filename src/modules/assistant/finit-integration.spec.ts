import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  authenticateFinit,
  FinitIntegrationGuard,
  integrationIdentity,
} from './finit-integration';
import { FinitIntegrationController } from './finit-integration.controller';
const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});
beforeEach(() => {
  process.env.ASSISTANT_FINIT_INTEGRATION_KEY = 'x'.repeat(64);
  process.env.ASSISTANT_FINIT_TENANT_ID = '7';
});
const headers = () => ({
  authorization: `Bearer ${process.env.ASSISTANT_FINIT_INTEGRATION_KEY}`,
  'x-finit-user-id': 'finit-user-1',
});
describe('server-to-server Finit authentication', () => {
  it('fails closed when configuration is absent', () => {
    delete process.env.ASSISTANT_FINIT_INTEGRATION_KEY;
    expect(() => authenticateFinit(headers())).toThrow(
      ServiceUnavailableException,
    );
  });
  it('rejects missing/wrong credentials and invalid identities', () => {
    for (const input of [
      {},
      { ...headers(), authorization: 'Bearer wrong' },
      { ...headers(), 'x-finit-user-id': ['one', 'two'] },
      { ...headers(), 'x-finit-user-id': '../admin' },
    ])
      expect(() => authenticateFinit(input)).toThrow(UnauthorizedException);
  });
  it('uses stable project-specific identities without exposing real email', () => {
    expect(integrationIdentity('first')).toEqual(integrationIdentity('first'));
    expect(integrationIdentity('first').id).not.toBe(
      integrationIdentity('second').id,
    );
    expect(integrationIdentity('first').email).toMatch(
      /^finit-[a-f0-9]+@assistant.invalid$/,
    );
  });
  it('maps authenticated external users to contributor-only actors', async () => {
    const identity = authenticateFinit(headers());
    const inserted = jest.fn(() => ({
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    }));
    const db: any = {
      insert: jest.fn(() => ({ values: inserted })),
      select: jest.fn(() => ({
        from: () => ({
          where: async () => [
            {
              ...identity,
              assistantAccess: 'CONTRIBUTOR',
              roleId: null,
              password: null,
            },
          ],
        }),
      })),
    };
    const request: any = {
      headers: {
        ...headers(),
        'x-tenant-id': '999',
        'x-assistant-access': 'DEVELOPER',
      },
    };
    await expect(
      new FinitIntegrationGuard(db).canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as any),
    ).resolves.toBe(true);
    expect(request.user).toEqual({
      id: identity.id,
      tenantId: 7,
      assistantAccess: 'CONTRIBUTOR',
      project: 'finit',
    });
    expect(inserted).toHaveBeenCalledWith({
      ...identity,
      assistantAccess: 'CONTRIBUTOR',
    });
  });
  it.each([
    { assistantAccess: 'NONE' },
    { tenantId: 8 },
    { roleId: 1 },
    { assistantAccess: 'DEVELOPER' },
  ])('honors revoked or changed identities: %p', async (change) => {
    const identity = authenticateFinit(headers());
    const db: any = {
      insert: () => ({
        values: () => ({ onConflictDoNothing: async () => undefined }),
      }),
      select: () => ({
        from: () => ({
          where: async () => [
            {
              ...identity,
              assistantAccess: 'CONTRIBUTOR',
              roleId: null,
              password: null,
              ...change,
            },
          ],
        }),
      }),
    };
    await expect(
      new FinitIntegrationGuard(db).canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers: headers() }) }),
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });
  it('does not expose developer approval or plan editing routes', () => {
    expect(FinitIntegrationController.prototype).not.toHaveProperty('approve');
    expect(FinitIntegrationController.prototype).not.toHaveProperty('edit');
  });
});
