import { NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('aws-sdk', () => ({ config: { update: jest.fn() } }));

describe('Warehouse account lookup', () => {
  const findUser = jest.fn();
  const service = new AuthService(null, { findUser } as any, null);
  beforeEach(() => jest.resetAllMocks());

  it('returns the existing account without exposing or mutating its password', async () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      password: 'private-hash',
      tenantId: 7,
    };
    findUser.mockResolvedValue(user);
    await expect(service.getUser(user.email)).resolves.toEqual({
      id: user.id,
      email: user.email,
      tenantId: 7,
    });
    expect(user.password).toBe('private-hash');
  });

  it('reports a missing account instead of returning an empty successful response', async () => {
    findUser.mockResolvedValue(null);
    await expect(service.getUser('missing@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('propagates database failures instead of reporting success', async () => {
    const error = new Error('Database unavailable');
    findUser.mockRejectedValue(error);
    await expect(service.getUser('user@example.com')).rejects.toBe(error);
  });
});
