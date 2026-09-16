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
  initializeGitRepository(root, 'Initialize project');

  assert.equal(lstatSync(join(root, 'CLAUDE.md')).isSymbolicLink(), true);
  assert.equal(readlinkSync(join(root, 'CLAUDE.md')), 'AGENTS.md');
  assert.equal(captureGit(root, ['rev-list', '--count', 'HEAD']), '1');
  assert.equal(captureGit(root, ['status', '--porcelain']), '');
});

function captureGit(root, args) {
  return run('git', args, { cwd: root, capture: true }).stdout.trim();
}
