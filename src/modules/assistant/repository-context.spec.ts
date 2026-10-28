import { repositoryRoots } from './repository-context';
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
