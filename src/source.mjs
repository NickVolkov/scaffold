import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { run } from './process.mjs';

export function parseSource(input) {
  if (existsSync(resolve(input))) {
    const remote = resolve(input);
    return { source: remote, remote, ref: 'HEAD', degitSource: null };
  }

  const separator = input.lastIndexOf('#');
  const source = separator === -1 ? input : input.slice(0, separator);
  const ref = separator === -1 ? 'HEAD' : input.slice(separator + 1);

  if (!/^[^/]+\/[^/]+$/.test(source)) {
    throw new Error(
      'template source must be a GitHub owner/repository or local path',
    );
  }

  return {
    source,
    remote: `https://github.com/${source}.git`,
    ref,
    degitSource: ref === 'HEAD' ? source : `${source}#${ref}`,
  };
}

export function resolveRemoteCommit(remote, ref, cwd = process.cwd()) {
  const result = run('git', ['ls-remote', remote, ref], { cwd, capture: true });
  const output = result.stdout.trim();

  if (!output) {
    throw new Error(`could not resolve ${ref} from ${remote}`);
  }

  return output.split(/\s+/)[0];
}
