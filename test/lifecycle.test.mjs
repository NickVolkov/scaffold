import assert from 'node:assert/strict';
import { lstatSync, mkdtempSync, readlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { initializeGitRepository } from '../src/git.mjs';
import { run } from '../src/process.mjs';
import { restoreSymlinks } from '../src/symlinks.mjs';

test('create lifecycle restores symlinks and makes an initial commit', () => {
  const root = mkdtempSync(join(tmpdir(), 'scaffold-lifecycle-test-'));
  writeFileSync(join(root, 'AGENTS.md'), 'instructions\n');
  writeFileSync(join(root, 'CLAUDE.md'), 'copied by template transport\n');

  restoreSymlinks(root, { 'CLAUDE.md': 'AGENTS.md' });
  withGitIdentity(root, () =>
    initializeGitRepository(root, 'Initialize project'),
  );

  assert.equal(lstatSync(join(root, 'CLAUDE.md')).isSymbolicLink(), true);
  assert.equal(readlinkSync(join(root, 'CLAUDE.md')), 'AGENTS.md');
  assert.equal(captureGit(root, ['rev-list', '--count', 'HEAD']), '1');
  assert.equal(captureGit(root, ['status', '--porcelain']), '');
});

function withGitIdentity(root, callback) {
  const identity = {
    GIT_AUTHOR_NAME: 'Scaffold Test',
    GIT_AUTHOR_EMAIL: 'scaffold@example.com',
    GIT_COMMITTER_NAME: 'Scaffold Test',
    GIT_COMMITTER_EMAIL: 'scaffold@example.com',
    GIT_CONFIG_GLOBAL: join(root, 'missing-gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
  };
  const previous = Object.fromEntries(
    Object.keys(identity).map((key) => [key, process.env[key]]),
  );

  Object.assign(process.env, identity);
  try {
    callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function captureGit(root, args) {
  return run('git', args, { cwd: root, capture: true }).stdout.trim();
}
