import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { refreshSource } from './source-refresh';
const exec = promisify(execFile);
export const repositoryRoots = () => {
  // npm worker commands run from warehouse-backend; the frontend is its sibling.
  // Overrides are only needed when a worker host uses a different checkout layout.
  const backend = process.env.ASSISTANT_BACKEND_REPO || process.cwd();
  return {
    backend,
    frontend:
      process.env.ASSISTANT_FRONTEND_REPO ||
      path.resolve(backend, '..', 'warehouse-frontend'),
  };
};
export async function git(root: string, args: string[]) {
  return (
    await exec('git', ['-C', root, ...args], {
      maxBuffer: 2_000_000,
      timeout: 15000,
    })
  ).stdout.trimEnd();
}
export function allowedSource(file: string) {
  return (
    /^(src\/(pages|components|layouts|modules|repositories|drizzle|helpers)\/|src\/routes\.tsx$)/.test(
      file,
    ) &&
    /\.(tsx?|css)$/.test(file) &&
    !/(^|\/)(auth|exclude|logger|migrations)(\/|\.)/i.test(file)
  );
}
export function finitSource(file: string) {
  return (
    /^apps\/(web|api)\/src\//.test(file) &&
    /\.(tsx?|css)$/.test(file) &&
    !/(^|\/)(auth|database|migrate|main|assistant[^/]*)(\.|\/)/i.test(file)
  );
}
export async function repositoryContext(text: string, project = 'warehouse') {
  const refs: Record<string, string> = {};
  const sections: string[] = [];
  const tokens = text.toLowerCase().match(/[a-z]{4,}/g) || [];
  for (const [name, root] of Object.entries(
    project === 'finit'
      ? { finit: process.env.ASSISTANT_FINIT_REPO }
      : repositoryRoots(),
  )) {
    if (!root || !path.isAbsolute(root))
      throw new Error(
        `Configure ASSISTANT_${name.toUpperCase()}_REPO as an absolute writable source checkout path before generating plans`,
      );
    const sha = await refreshSource(
      root,
      process.env[`ASSISTANT_${name.toUpperCase()}_SOURCE_BRANCH`],
    );
    refs[name] = sha;
    const files = (await git(root, ['ls-tree', '-r', '--name-only', sha]))
      .split('\n')
      .filter(project === 'finit' ? finitSource : allowedSource);
    const score = (file: string) =>
      tokens.filter((t) => file.toLowerCase().includes(t)).length;
    files.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
    sections.push(
      `${name} commit ${sha}\nAvailable source files:\n${files.join('\n')}`,
    );
    let remaining = 100000;
    for (const file of files.slice(0, 30)) {
      const body = await git(root, ['show', `${sha}:${file}`]);
      const excerpt = body.slice(0, Math.min(12000, remaining));
      if (!excerpt) break;
      sections.push(
        `${name}/${file}\n${excerpt}${
          excerpt.length < body.length ? '\n[excerpt truncated]' : ''
        }`,
      );
      remaining -= excerpt.length;
    }
  }
  return { refs, text: sections.join('\n\n') };
}
