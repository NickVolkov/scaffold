import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from '../src/cli.mjs';
import { run } from '../src/process.mjs';

test('update applies a template diff and advances scaffold state', async () => {
  const fixture = createFixture();
  writeFileSync(join(fixture.template, 'template.txt'), 'version two\n');
  writeFileSync(join(fixture.template, 'added.txt'), 'new file\n');
  commitAll(fixture.template, 'template v2');

  await runCli(['update'], fixture.project);

  assert.equal(
    readFileSync(join(fixture.project, 'template.txt'), 'utf8'),
    'version two\n',
  );
  assert.equal(
    readFileSync(join(fixture.project, 'added.txt'), 'utf8'),
    'new file\n',
  );
  const state = JSON.parse(
    readFileSync(join(fixture.project, '.scaffold.json'), 'utf8'),
  );
  assert.equal(state.commit, revParse(fixture.template, 'HEAD'));
});

test('update refuses to overwrite overlapping project changes', async () => {
  const fixture = createFixture();
  writeFileSync(join(fixture.project, 'template.txt'), 'project change\n');
  commitAll(fixture.project, 'project customization');
  writeFileSync(join(fixture.template, 'template.txt'), 'template change\n');
  commitAll(fixture.template, 'template v2');

  await assert.rejects(() => runCli(['update'], fixture.project));
  assert.equal(
    readFileSync(join(fixture.project, 'template.txt'), 'utf8'),
    'project change\n',
  );
});

test('update applies engineering documentation changes', async () => {
  const fixture = createFixture();
  writeFileSync(
    join(fixture.template, 'docs/engineering/guide.md'),
    'version two\n',
  );
  commitAll(fixture.template, 'update engineering guide');

  await runCli(['update'], fixture.project);

  assert.equal(
    readFileSync(join(fixture.project, 'docs/engineering/guide.md'), 'utf8'),
    'version two\n',
  );
});

test('update advances scaffold state before running validation hooks', async () => {
  const fixture = createFixture();
  writeFileSync(join(fixture.template, 'template.txt'), 'version two\n');
  writeFileSync(
    join(fixture.template, '.scaffold/template.json'),
    `${JSON.stringify(
      { schemaVersion: 1, afterUpdate: ['exit 7'] },
      null,
      2,
    )}\n`,
  );
  commitAll(fixture.template, 'template v2 with failing hook');
  const targetCommit = revParse(fixture.template, 'HEAD');

  await assert.rejects(() => runCli(['update'], fixture.project));

  const state = JSON.parse(
    readFileSync(join(fixture.project, '.scaffold.json'), 'utf8'),
  );
  assert.equal(state.commit, targetCommit);
  assert.equal(
    readFileSync(join(fixture.project, 'template.txt'), 'utf8'),
    'version two\n',
  );
});

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'scaffold-test-'));
  const template = join(root, 'template');
  const project = join(root, 'project');
  mkdirSync(join(template, '.scaffold'), { recursive: true });
  mkdirSync(join(template, 'docs/engineering'), { recursive: true });
  mkdirSync(project);
  mkdirSync(join(project, 'docs/engineering'), { recursive: true });
  initializeRepository(template);
  initializeRepository(project);

  writeFileSync(join(template, 'template.txt'), 'version one\n');
  writeFileSync(join(template, 'docs/engineering/guide.md'), 'version one\n');
  writeFileSync(
    join(template, '.scaffold/template.json'),
    `${JSON.stringify({ schemaVersion: 1, afterUpdate: [] }, null, 2)}\n`,
  );
  commitAll(template, 'template v1');
  const baseCommit = revParse(template, 'HEAD');

  writeFileSync(join(project, 'template.txt'), 'version one\n');
  writeFileSync(join(project, 'docs/engineering/guide.md'), 'version one\n');
  writeFileSync(
    join(project, '.scaffold.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        source: template,
        remote: template,
        ref: 'HEAD',
        commit: baseCommit,
      },
      null,
      2,
    )}\n`,
  );
  commitAll(project, 'project created');

  return { project, template };
}

function initializeRepository(root) {
  run('git', ['init', '--initial-branch=main'], { cwd: root, capture: true });
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
