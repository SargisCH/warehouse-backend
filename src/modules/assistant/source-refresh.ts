import { execFile } from 'child_process';
import { open, realpath, unlink } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
const exec = promisify(execFile);

// Only these controlled errors may be exposed in assistant job status.
export class SourceRefreshError extends Error {}
async function sourceGit(root: string, args: string[], timeout = 15000) {
  return (
    await exec(
      'git',
      [
        '-C',
        root,
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'core.fsmonitor=false',
        ...args,
      ],
      {
        maxBuffer: 2_000_000,
        timeout,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GCM_INTERACTIVE: 'Never',
          GIT_SSH_COMMAND:
            process.env.GIT_SSH_COMMAND ||
            'ssh -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=yes',
        },
      },
    )
  ).stdout.trimEnd();
}
async function acquireLock(file: string) {
  const deadline = Date.now() + 90000;
  for (;;) {
    try {
      return await open(file, 'wx', 0o600);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline)
        throw new SourceRefreshError(
          'Source checkout is busy. Retry the plan; if the lock persists, stop workers and check the source-refresh lock.',
        );
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}
/** Fixed origin + configured/current branch only. Never accepts conversation content. */
export async function refreshSource(root: string, configuredBranch?: string) {
  let directory: string;
  let lockFile: string;
  try {
    directory = await realpath(root);
    if (
      (await realpath(
        await sourceGit(directory, ['rev-parse', '--show-toplevel']),
      )) !== directory
    )
      throw new Error();
    const common = await sourceGit(directory, [
      'rev-parse',
      '--git-common-dir',
    ]);
    lockFile = path.resolve(directory, common, 'assistant-source-refresh.lock');
  } catch {
    throw new SourceRefreshError(
      'Source checkout is unavailable. Configure a readable, writable Git repository root for the worker.',
    );
  }
  const lock = await acquireLock(lockFile);
  try {
    await lock.writeFile(`${process.pid}\n`);
    if (
      await sourceGit(directory, [
        'status',
        '--porcelain',
        '--untracked-files=all',
      ])
    )
      throw new SourceRefreshError(
        'Source checkout has local changes. Commit or remove them before retrying the plan.',
      );
    let current: string;
    try {
      current = await sourceGit(directory, [
        'symbolic-ref',
        '--quiet',
        '--short',
        'HEAD',
      ]);
    } catch {
      throw new SourceRefreshError(
        'Source checkout has a detached HEAD. Check out the intended source branch before retrying.',
      );
    }
    const branch = configuredBranch || current;
    if (!/^[a-zA-Z0-9_][a-zA-Z0-9._/-]*$/.test(branch))
      throw new SourceRefreshError('Source branch configuration is invalid.');
    try {
      await sourceGit(directory, ['check-ref-format', `refs/heads/${branch}`]);
    } catch {
      throw new SourceRefreshError('Source branch configuration is invalid.');
    }
    if (branch !== current)
      throw new SourceRefreshError(
        'Source checkout branch does not match the configured source branch. Check out that branch before retrying.',
      );
    try {
      await sourceGit(
        directory,
        [
          'fetch',
          '--no-tags',
          '--no-recurse-submodules',
          '--no-auto-maintenance',
          'origin',
          `+refs/heads/${branch}:refs/remotes/origin/${branch}`,
        ],
        60000,
      );
    } catch {
      throw new SourceRefreshError(
        'Could not fetch source from origin. Check worker Git access, network connectivity and the configured branch, then retry.',
      );
    }
    const sha = await sourceGit(directory, [
      'rev-parse',
      '--verify',
      `refs/remotes/origin/${branch}^{commit}`,
    ]);
    try {
      await sourceGit(directory, ['merge-base', '--is-ancestor', 'HEAD', sha]);
    } catch {
      throw new SourceRefreshError(
        'Source checkout is ahead of or diverges from origin. Resolve it manually before retrying; no reset or merge was performed.',
      );
    }
    // Fast-forward only: do not reset local work or create merge commits.
    await sourceGit(directory, ['merge', '--ff-only', '--no-edit', sha]);
    return sha;
  } catch (error) {
    if (error instanceof SourceRefreshError) throw error;
    // Git errors may contain credential-bearing remote URLs; never expose them.
    throw new SourceRefreshError(
      'Could not refresh the source checkout. Check worker Git access and checkout permissions, then retry.',
    );
  } finally {
    try {
      await lock.close();
    } finally {
      await unlink(lockFile);
    }
  }
}
