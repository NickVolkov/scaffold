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
  symlinks: {},
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

  if (value.symlinks !== undefined && !isStringRecord(value.symlinks)) {
    throw new Error(
      'template manifest field symlinks must be an object of string targets',
    );
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
    symlinks: value.symlinks ?? {},
  };
}

function isStringArray(value) {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isStringRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}
