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

  run('git', ['config', 'user.name'], { cwd: root, capture: true });
  run('git', ['config', 'user.email'], { cwd: root, capture: true });
  run('git', ['init', '--initial-branch=main'], { cwd: root });
  run('git', ['add', '--all'], { cwd: root });
  run('git', ['commit', '-m', message], { cwd: root });
}
