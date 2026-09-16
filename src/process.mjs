import { spawnSync } from 'node:child_process';

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: options.input ? undefined : 'utf8',
    input: options.input,
    shell: options.shell ?? false,
    stdio: options.capture || options.input ? 'pipe' : 'inherit',
    env: options.env ?? process.env,
  });

  if (result.error?.code === 'ENOENT') {
    throw new Error(`required command not found: ${command}`);
  }

  if (result.status !== 0 && !options.allowFailure) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString('utf8')
      : (result.stderr ?? '');
    throw new Error(
      stderr.trim() || `${command} exited with code ${result.status}`,
    );
  }

  return result;
}

export function runShell(command, cwd) {
  return run(command, [], { cwd, shell: true });
}
