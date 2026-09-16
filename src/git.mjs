import { resolve } from 'node:path';
import { run } from './process.mjs';

export function findGitRoot(cwd) {
  const result = run('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    capture: true,
    allowFailure: true,
  });

  if (result.status !== 0) {
    throw new Error('run this command inside a Git worktree');
  }

  return resolve(result.stdout.trim());
}

export function initializeGitRepository(root, message) {
  const existing = run('git', ['rev-parse', '--show-toplevel'], {
    cwd: root,
    capture: true,
    allowFailure: true,
  });

  if (existing.status === 0) {
    throw new Error('destination is already inside a Git worktree');
  }

  assertGitIdentity(root);
  run('git', ['init', '--initial-branch=main'], { cwd: root });
  run('git', ['add', '--all'], { cwd: root });
  run('git', ['commit', '-m', message], { cwd: root });
}

function assertGitIdentity(root) {
  const configuredName = run('git', ['config', 'user.name'], {
    cwd: root,
    capture: true,
    allowFailure: true,
  });
  const configuredEmail = run('git', ['config', 'user.email'], {
    cwd: root,
    capture: true,
    allowFailure: true,
  });
  const environmentIdentity = [
    'GIT_AUTHOR_NAME',
    'GIT_AUTHOR_EMAIL',
    'GIT_COMMITTER_NAME',
    'GIT_COMMITTER_EMAIL',
  ].every((key) => process.env[key]);

  if (
    (configuredName.status !== 0 || configuredEmail.status !== 0) &&
    !environmentIdentity
  ) {
    throw new Error(
      'configure Git user.name and user.email before creating a project',
    );
  }
}
