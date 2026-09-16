import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_MANIFEST = {
  schemaVersion: 1,
  excludeFromUpdates: [
    'degit.json',
    '.scaffold/**',
    '.scaffold.json',
    'pnpm-lock.yaml',
  ],
  afterCreate: [],
  afterUpdate: [],
};

export function readClonedManifest(root) {
  const scaffoldDirectory = join(root, '.scaffold');
  const manifestPath = join(scaffoldDirectory, 'template.json');
  const manifest = existsSync(manifestPath)
    ? parseManifest(readFileSync(manifestPath, 'utf8'))
    : DEFAULT_MANIFEST;

  if (existsSync(scaffoldDirectory)) {
    rmSync(scaffoldDirectory, { recursive: true });
  }

  return manifest;
}

export function parseManifest(contents) {
  const value = JSON.parse(contents);

  if (value.schemaVersion !== 1) {
    throw new Error(
      `unsupported template manifest schema: ${value.schemaVersion}`,
    );
  }

  for (const field of ['excludeFromUpdates', 'afterCreate', 'afterUpdate']) {
    if (value[field] !== undefined && !isStringArray(value[field])) {
      throw new Error(
        `template manifest field ${field} must be an array of strings`,
      );
    }
  }

  return {
    ...DEFAULT_MANIFEST,
    ...value,
    excludeFromUpdates: [
      ...new Set([
        ...DEFAULT_MANIFEST.excludeFromUpdates,
        ...(value.excludeFromUpdates ?? []),
      ]),
    ],
  };
}

function isStringArray(value) {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}
