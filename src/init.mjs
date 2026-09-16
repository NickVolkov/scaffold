import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findGitRoot } from './git.mjs';
import { parseSource, resolveRemoteCommit } from './source.mjs';
import { STATE_FILE, writeState } from './state.mjs';

export function initProject({ cwd, sourceInput, force = false }) {
  const root = findGitRoot(cwd);
  const statePath = join(root, STATE_FILE);

  if (existsSync(statePath) && !force) {
    throw new Error(`${STATE_FILE} already exists; pass --force to replace it`);
  }

  const source = parseSource(sourceInput);
  const commit = resolveRemoteCommit(source.remote, source.ref, root);

  writeState(root, {
    schemaVersion: 1,
    source: source.source,
    remote: source.remote,
    ref: source.ref,
    commit,
  });

  console.log(
    `Initialized scaffold from ${source.source}@${commit.slice(0, 7)}`,
  );
}
