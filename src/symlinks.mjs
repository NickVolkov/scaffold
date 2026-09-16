import { rmSync, symlinkSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

export function restoreSymlinks(root, symlinks) {
  for (const [path, target] of Object.entries(symlinks)) {
    const absolutePath = resolve(root, path);
    assertInsideRoot(root, absolutePath, `symlink path ${path}`);

    if (isAbsolute(target)) {
      throw new Error(`symlink target must be relative: ${target}`);
    }

    assertInsideRoot(
      root,
      resolve(dirname(absolutePath), target),
      `symlink target ${target}`,
    );
    rmSync(absolutePath, { force: true });
    symlinkSync(target, absolutePath);
  }
}

function assertInsideRoot(root, path, label) {
  const pathFromRoot = relative(resolve(root), path);
  if (
    isAbsolute(pathFromRoot) ||
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
  ) {
    throw new Error(`${label} escapes the project root`);
  }
}
