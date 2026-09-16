import { readState } from './state.mjs';
import { resolveRemoteCommit } from './source.mjs';

export function showStatus(root) {
  const state = readState(root);
  const latest = resolveRemoteCommit(state.remote, state.ref, root);
  const current = latest === state.commit;

  console.log(`Template: ${state.source}`);
  console.log(`Current:  ${state.commit}`);
  console.log(`Latest:   ${latest}`);
  console.log(`Status:   ${current ? 'up to date' : 'update available'}`);
}
