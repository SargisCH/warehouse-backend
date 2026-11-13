import assert from 'assert/strict';
import { execFileSync } from 'child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, test } from 'node:test';
import {
  refreshSource,
  SourceRefreshError,
} from '../src/modules/assistant/source-refresh';
import { repositoryContext } from '../src/modules/assistant/repository-context';

let directory: string;
let remote: string;
let publisher: string;
let checkout: string;
const originalEnv = { ...process.env };
function git(root: string, ...args: string[]) {
  return execFileSync(
    'git',
    [
      '-C',
      root,
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'user.name=Source Test',
      '-c',
      'user.email=source-test@example.com',
      ...args,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
}
async function commit(root: string, file: string, body: string) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), body);
  git(root, 'add', '--', file);
  git(root, 'commit', '-m', 'Test source update');
  return git(root, 'rev-parse', 'HEAD');
}
async function publish() {
  const sha = await commit(
    publisher,
    'apps/web/src/expenses.tsx',
    'REMOTE_EXPENSE_UPDATE',
  );
  git(publisher, 'push', 'origin', 'main');
  return sha;
}
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'assistant-source-refresh-'));
  remote = path.join(directory, 'remote.git');
  publisher = path.join(directory, 'publisher');
  checkout = path.join(directory, 'checkout');
  await mkdir(remote);
  await mkdir(publisher);
  git(remote, 'init', '--bare');
  git(publisher, 'init', '--initial-branch=main');
  await commit(publisher, '.gitignore', '.env\n');
  await commit(
    publisher,
    'apps/web/src/expenses.tsx',
    'INITIAL_EXPENSE_SOURCE',
  );
  await commit(
    publisher,
    'apps/api/src/auth.ts',
    'AUTH_CONTENT_MUST_NOT_BE_READ',
  );
  git(publisher, 'remote', 'add', 'origin', remote);
  git(publisher, 'push', 'origin', 'main');
  git(directory, 'clone', '--branch', 'main', remote, checkout);
});
afterEach(async () => {
  process.env = { ...originalEnv };
  await rm(directory, { recursive: true, force: true });
});
test('fetches and fast-forwards before reading Finit committed source', async () => {
  const sha = await publish();
  // Ignored server settings do not make the dedicated checkout dirty.
  await writeFile(path.join(checkout, '.env'), 'PRIVATE_SERVER_SETTING');
  process.env.ASSISTANT_FINIT_REPO = checkout;
  process.env.ASSISTANT_FINIT_SOURCE_BRANCH = 'main';
  const context = await repositoryContext('expense', 'finit');
  assert.equal(context.refs.finit, sha);
  assert.equal(git(checkout, 'rev-parse', 'HEAD'), sha);
  assert(context.text.includes('REMOTE_EXPENSE_UPDATE'));
  assert(!context.text.includes('AUTH_CONTENT_MUST_NOT_BE_READ'));
  assert(!context.text.includes('PRIVATE_SERVER_SETTING'));
});
test('uses the checked-out branch by default and supports repeated updates', async () => {
  const sha = await publish();
  assert.equal(await refreshSource(checkout), sha);
  assert.equal(await refreshSource(checkout), sha);
});
test('updates both warehouse source checkouts', async () => {
  const frontend = path.join(directory, 'frontend');
  git(directory, 'clone', '--branch', 'main', remote, frontend);
  const sha = await commit(
    publisher,
    'src/pages/expenses.tsx',
    'WAREHOUSE_SOURCE_UPDATE',
  );
  git(publisher, 'push', 'origin', 'main');
  process.env.ASSISTANT_BACKEND_REPO = checkout;
  process.env.ASSISTANT_FRONTEND_REPO = frontend;
  process.env.ASSISTANT_BACKEND_SOURCE_BRANCH = 'main';
  process.env.ASSISTANT_FRONTEND_SOURCE_BRANCH = 'main';
  const context = await repositoryContext('expense');
  assert.deepEqual(context.refs, { backend: sha, frontend: sha });
  assert(context.text.includes('WAREHOUSE_SOURCE_UPDATE'));
});
for (const file of ['apps/web/src/expenses.tsx', 'untracked-notes.txt']) {
  test(`rejects local changes without overwriting them: ${file}`, async () => {
    const before = git(checkout, 'rev-parse', 'HEAD');
    await writeFile(path.join(checkout, file), 'LOCAL_WORK');
    await assert.rejects(refreshSource(checkout), /local changes/);
    assert.equal(
      await readFile(path.join(checkout, file), 'utf8'),
      'LOCAL_WORK',
    );
    assert.equal(git(checkout, 'rev-parse', 'HEAD'), before);
  });
}
test('rejects local commits that diverge from the remote', async () => {
  const local = await commit(checkout, 'local.txt', 'LOCAL_COMMIT');
  await publish();
  await assert.rejects(refreshSource(checkout), /ahead of or diverges/);
  assert.equal(git(checkout, 'rev-parse', 'HEAD'), local);
});
test('rejects local commits ahead of origin instead of planning unpushed code', async () => {
  const local = await commit(checkout, 'local.txt', 'UNPUSHED_COMMIT');
  await assert.rejects(refreshSource(checkout), /ahead of or diverges/);
  assert.equal(git(checkout, 'rev-parse', 'HEAD'), local);
});
test('rejects detached HEAD and mismatched or invalid configured branches', async () => {
  await assert.rejects(refreshSource(checkout, 'other'), /does not match/);
  await assert.rejects(
    refreshSource(checkout, 'main; echo command'),
    /invalid/,
  );
  git(checkout, 'checkout', '--detach');
  await assert.rejects(refreshSource(checkout), /detached HEAD/);
});
test('fetch failures do not expose remote details or silently use stale source', async () => {
  const before = git(checkout, 'rev-parse', 'HEAD');
  git(
    checkout,
    'remote',
    'set-url',
    'origin',
    path.join(directory, 'private-remote-missing'),
  );
  await assert.rejects(
    refreshSource(checkout),
    (error) =>
      error instanceof SourceRefreshError &&
      error.message.includes('Could not fetch') &&
      !error.message.includes('private-remote'),
  );
  assert.equal(git(checkout, 'rev-parse', 'HEAD'), before);
});
test('serializes concurrent refreshes and releases the lock after failure', async () => {
  await writeFile(path.join(checkout, 'dirty.txt'), 'LOCAL_WORK');
  await assert.rejects(refreshSource(checkout), /local changes/);
  await rm(path.join(checkout, 'dirty.txt'));
  const sha = await publish();
  assert.deepEqual(
    await Promise.all([refreshSource(checkout), refreshSource(checkout)]),
    [sha, sha],
  );
});
test('waits for an existing filesystem lock', async () => {
  const lock = path.join(checkout, '.git', 'assistant-source-refresh.lock');
  await writeFile(lock, 'another worker');
  let finished = false;
  const pending = refreshSource(checkout).then((sha) => {
    finished = true;
    return sha;
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(finished, false);
  await rm(lock);
  assert.equal(await pending, git(checkout, 'rev-parse', 'HEAD'));
});
test('does not execute repository post-merge hooks', async () => {
  await writeFile(
    path.join(checkout, '.git/hooks/post-merge'),
    '#!/bin/sh\nprintf hook > assistant-hook-ran\n',
    { mode: 0o755 },
  );
  await publish();
  await refreshSource(checkout);
  await assert.rejects(readFile(path.join(checkout, 'assistant-hook-ran')), {
    code: 'ENOENT',
  });
});
test('rejects missing repositories and subdirectories', async () => {
  await assert.rejects(
    refreshSource(path.join(directory, 'missing')),
    SourceRefreshError,
  );
  await assert.rejects(
    refreshSource(path.join(checkout, 'apps/web')),
    SourceRefreshError,
  );
});
