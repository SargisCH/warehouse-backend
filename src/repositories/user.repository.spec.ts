import { UserRepository } from './user.repository';

describe('user lookup with no matching account', () => {
  it.each([
    { tenant: true, role: true },
    { tenant: true, role: false },
    { tenant: false, role: true },
    { tenant: false, role: false },
  ])('returns null for include %p', async (include) => {
    const query: any = {
      then: (resolve: any) => Promise.resolve([]).then(resolve),
    };
    for (const method of ['from', 'where', 'leftJoin'])
      query[method] = jest.fn(() => query);
    const repository = new UserRepository({ select: () => query } as any);
    await expect(
      repository.find({ email: 'missing@example.com' }, include),
    ).resolves.toBeNull();
  });
});
