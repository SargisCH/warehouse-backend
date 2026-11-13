import { finitSource, repositoryRoots } from './repository-context';
const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});
describe('worker checkout discovery', () => {
  it('finds the backend and sibling frontend without path settings', () => {
    delete process.env.ASSISTANT_BACKEND_REPO;
    delete process.env.ASSISTANT_FRONTEND_REPO;
    jest
      .spyOn(process, 'cwd')
      .mockReturnValue('/srv/warehouse/warehouse-backend');
    expect(repositoryRoots()).toEqual({
      backend: '/srv/warehouse/warehouse-backend',
      frontend: '/srv/warehouse/warehouse-frontend',
    });
  });
  it('preserves explicit overrides for custom worker hosts', () => {
    process.env.ASSISTANT_BACKEND_REPO = '/srv/api';
    process.env.ASSISTANT_FRONTEND_REPO = '/srv/web';
    expect(repositoryRoots()).toEqual({
      backend: '/srv/api',
      frontend: '/srv/web',
    });
  });
  it('treats empty path settings as defaults', () => {
    process.env.ASSISTANT_BACKEND_REPO = '';
    process.env.ASSISTANT_FRONTEND_REPO = '';
    jest
      .spyOn(process, 'cwd')
      .mockReturnValue('/srv/warehouse/warehouse-backend');
    expect(repositoryRoots().frontend).toBe(
      '/srv/warehouse/warehouse-frontend',
    );
  });
});

describe('Finit source evidence allowlist', () => {
  it('allows expense UI and model source in the monorepo', () => {
    expect(finitSource('apps/web/src/expenses.tsx')).toBe(true);
    expect(finitSource('apps/api/src/expense-model.ts')).toBe(true);
  });
  it.each([
    'apps/api/.env',
    'apps/api/src/auth.ts',
    'apps/api/src/database.ts',
    'apps/api/src/assistant.controller.ts',
    'apps/api/src/migrate.ts',
    'deploy/kamatera/api.env.example',
  ])('excludes credentials, auth and deployment paths: %s', (file) => {
    expect(finitSource(file)).toBe(false);
  });
});
