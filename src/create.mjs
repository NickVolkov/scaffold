import { basename, resolve } from 'node:path';
import degit from 'degit';
import { writeState } from './state.mjs';
import { parseSource, resolveRemoteCommit } from './source.mjs';
import { readClonedManifest } from './template.mjs';
import { runShell } from './process.mjs';

export async function createProject({ sourceInput, destinationInput }) {
  const source = parseSource(sourceInput);
  if (!source.degitSource) {
    throw new Error(
      'create currently supports GitHub owner/repository sources only',
    );
  }

  const destination = resolve(destinationInput);
  const projectName = basename(destination);
  const commit = resolveRemoteCommit(source.remote, source.ref);
  const previousProjectName = process.env.PROJECT_NAME;
  process.env.PROJECT_NAME = projectName;

  try {
    const emitter = degit(source.degitSource, {
      cache: false,
      force: false,
      verbose: true,
    });
    emitter.on('info', ({ message }) => console.log(message));
    emitter.on('warn', ({ message }) => console.warn(message));
    await emitter.clone(destinationInput);
  } finally {
    if (previousProjectName === undefined) {
      delete process.env.PROJECT_NAME;
    } else {
      process.env.PROJECT_NAME = previousProjectName;
    }
  }

  const manifest = readClonedManifest(destination);
  writeState(destination, {
    schemaVersion: 1,
    source: source.source,
    remote: source.remote,
    ref: source.ref,
    commit,
  });

  for (const command of manifest.afterCreate) {
    console.log(`> ${command}`);
    runShell(command, destination);
  }

  console.log(
    `\nCreated ${projectName} from ${source.source}@${commit.slice(0, 7)}`,
  );
}
