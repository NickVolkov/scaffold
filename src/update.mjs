import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, runShell } from './process.mjs';
import { readState, writeState } from './state.mjs';
import { parseManifest, DEFAULT_MANIFEST } from './template.mjs';

export function getUpdatePlan(root, targetRef) {
  ensureCleanWorktree(root);
  const state = readState(root);
  const ref = targetRef ?? state.ref;

  run('git', ['fetch', '--no-tags', state.remote, ref], { cwd: root });
  const targetCommit = captureGit(root, ['rev-parse', 'FETCH_HEAD']);

  if (state.commit === targetCommit) {
    return {
      state,
      ref,
      targetCommit,
      current: true,
      patch: Buffer.alloc(0),
      manifest: null,
    };
  }

  run('git', ['cat-file', '-e', `${state.commit}^{commit}`], { cwd: root });
  const manifest = readManifestFromCommit(root, targetCommit);
  const pathspec = [
    '.',
    ...manifest.excludeFromUpdates.map((path) => `:(exclude)${path}`),
  ];
  const patchResult = run(
    'git',
    [
      'diff',
      '--binary',
      '--full-index',
      state.commit,
      targetCommit,
      '--',
      ...pathspec,
    ],
    { cwd: root, capture: true },
  );
  const patch = Buffer.from(patchResult.stdout);

  if (patch.length > 0) {
    checkPatchInTemporaryWorktree(root, patch);
  }

  return { state, ref, targetCommit, current: false, patch, manifest };
}

export function applyUpdate(root, plan) {
  if (plan.current) return;

  if (plan.patch.length > 0) {
    run('git', ['apply', '--3way', '-'], { cwd: root, input: plan.patch });
    run('git', ['reset'], { cwd: root, capture: true });
  }

  writeState(root, {
    ...plan.state,
    ref: plan.ref,
    commit: plan.targetCommit,
  });

  for (const command of plan.manifest.afterUpdate) {
    console.log(`> ${command}`);
    runShell(command, root);
  }
}

export function printUpdatePlan(root, plan) {
  if (plan.current) {
    console.log(`Already up to date at ${plan.targetCommit.slice(0, 7)}`);
    return;
  }

  console.log(
    `Template update ${plan.state.commit.slice(0, 7)} -> ${plan.targetCommit.slice(0, 7)}`,
  );

  if (plan.patch.length === 0) {
    console.log('No project files changed after applying template exclusions.');
    return;
  }

  const stat = run('git', ['apply', '--stat', '-'], {
    cwd: root,
    input: plan.patch,
  })
    .stdout.toString('utf8')
    .trim();
  console.log(stat);
}

function ensureCleanWorktree(root) {
  const status = captureGit(root, ['status', '--porcelain']);
  if (status) {
    throw new Error('working tree must be clean before scaffold update');
  }
}

function readManifestFromCommit(root, commit) {
  const result = run('git', ['show', `${commit}:.scaffold/template.json`], {
    cwd: root,
    capture: true,
    allowFailure: true,
  });

  if (result.status !== 0) return DEFAULT_MANIFEST;
  return parseManifest(result.stdout);
}

function captureGit(root, args) {
  return run('git', args, { cwd: root, capture: true }).stdout.trim();
}

function checkPatchInTemporaryWorktree(root, patch) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'scaffold-preflight-'));
  const worktree = join(temporaryRoot, 'worktree');
  let worktreeAdded = false;

  try {
    run('git', ['worktree', 'add', '--detach', worktree, 'HEAD'], {
      cwd: root,
      capture: true,
    });
    worktreeAdded = true;
    run('git', ['apply', '--3way', '-'], { cwd: worktree, input: patch });
  } finally {
    if (worktreeAdded) {
      run('git', ['worktree', 'remove', '--force', worktree], {
        cwd: root,
        capture: true,
        allowFailure: true,
      });
    }
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}
