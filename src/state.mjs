import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const STATE_FILE = '.scaffold.json';

export function readState(root) {
  let state;

  try {
    state = JSON.parse(readFileSync(join(root, STATE_FILE), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `${STATE_FILE} not found; this project is not managed by scaffold`,
      );
    }
    throw error;
  }

  if (
    state.schemaVersion !== 1 ||
    typeof state.source !== 'string' ||
    typeof state.remote !== 'string' ||
    typeof state.ref !== 'string' ||
    typeof state.commit !== 'string'
  ) {
    throw new Error(`${STATE_FILE} is invalid`);
  }

  return state;
}

export function writeState(root, state) {
  writeFileSync(join(root, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}
