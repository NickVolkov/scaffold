import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from '../src/cli.mjs';
import { run } from '../src/process.mjs';

test('init records an upstream for an existing Git repository', async () => {
  const fixture = createFixture();

  await runCli(['init', fixture.upstream], fixture.project);

  const state = JSON.parse(
    readFileSync(join(fixture.project, '.scaffold.json'), 'utf8'),
  );
  assert.equal(state.source, fixture.upstream);
  assert.equal(state.remote, fixture.upstream);
  assert.equal(state.ref, 'HEAD');
  assert.equal(state.commit, revParse(fixture.upstream, 'HEAD'));
  assert.equal(
    readFileSync(join(fixture.project, 'project.txt'), 'utf8'),
    'project\n',
  );
  assert.equal(
    captureGit(fixture.project, ['status', '--porcelain']),
    '?? .scaffold.json',
  );
});

test('init requires force before replacing scaffold state', async () => {
  const fixture = createFixture();
  await runCli(['init', fixture.upstream], fixture.project);
  writeFileSync(join(fixture.upstream, 'upstream.txt'), 'version two\n');
  commitAll(fixture.upstream, 'upstream v2');

  await assert.rejects(() =>
    runCli(['init', fixture.upstream], fixture.project),
  );
  await runCli(['init', fixture.upstream, '--force'], fixture.project);

  const state = JSON.parse(
    readFileSync(join(fixture.project, '.scaffold.json'), 'utf8'),
  );
  assert.equal(state.commit, revParse(fixture.upstream, 'HEAD'));
});

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'scaffold-init-test-'));
  const upstream = join(root, 'upstream');
  const project = join(root, 'project');
  initializeRepository(upstream);
  initializeRepository(project);
  writeFileSync(join(upstream, 'upstream.txt'), 'version one\n');
  writeFileSync(join(project, 'project.txt'), 'project\n');
  commitAll(upstream, 'upstream v1');
  commitAll(project, 'project v1');
  return { upstream, project };
}

function initializeRepository(root) {
  run('git', ['init', '--initial-branch=main', root], { capture: true });
  run('git', ['config', 'user.name', 'Scaffold Test'], { cwd: root });
  run('git', ['config', 'user.email', 'scaffold@example.com'], { cwd: root });
}

function commitAll(root, message) {
  run('git', ['add', '--all'], { cwd: root });
  run('git', ['commit', '-m', message], { cwd: root, capture: true });
}

function revParse(root, ref) {
  return run('git', ['rev-parse', ref], {
    cwd: root,
    capture: true,
  }).stdout.trim();
}

function captureGit(root, args) {
  return run('git', args, { cwd: root, capture: true }).stdout.trim();
}
