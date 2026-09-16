import { createProject } from './create.mjs';
import { initProject } from './init.mjs';
import { applyUpdate, getUpdatePlan, printUpdatePlan } from './update.mjs';
import { showStatus } from './status.mjs';

const HELP = `Usage:
  scaffold create <owner/repository[#ref]> <destination>
  scaffold init <owner/repository[#ref]> [--force]
  scaffold status
  scaffold update [--to <ref>] [--dry-run]
`;

export async function runCli(args, cwd = process.cwd()) {
  const [command, ...rest] = args;

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  if (command === 'create') {
    const [sourceInput, destinationInput] = rest;
    if (!sourceInput || !destinationInput || rest.length !== 2) {
      throw new Error(
        'usage: scaffold create <owner/repository[#ref]> <destination>',
      );
    }
    await createProject({ sourceInput, destinationInput });
    return;
  }

  if (command === 'status') {
    if (rest.length !== 0) throw new Error('usage: scaffold status');
    showStatus(cwd);
    return;
  }

  if (command === 'init') {
    const options = parseInitOptions(rest);
    initProject({ cwd, ...options });
    return;
  }

  if (command === 'update') {
    const options = parseUpdateOptions(rest);
    const plan = getUpdatePlan(cwd, options.targetRef);
    printUpdatePlan(cwd, plan);
    if (!options.dryRun) {
      applyUpdate(cwd, plan);
      if (!plan.current)
        console.log('Template update applied. Review and commit the changes.');
    }
    return;
  }

  throw new Error(`unknown command: ${command}\n\n${HELP}`);
}

function parseInitOptions(args) {
  const sourceInput = args[0];
  const remaining = args.slice(1);
  let force = false;

  if (!sourceInput || sourceInput.startsWith('-')) {
    throw new Error('usage: scaffold init <owner/repository[#ref]> [--force]');
  }

  for (const argument of remaining) {
    if (argument === '--force') {
      force = true;
    } else {
      throw new Error(
        'usage: scaffold init <owner/repository[#ref]> [--force]',
      );
    }
  }

  return { sourceInput, force };
}

function parseUpdateOptions(args) {
  let dryRun = false;
  let targetRef;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--dry-run') {
      dryRun = true;
    } else if (argument === '--to' && args[index + 1]) {
      targetRef = args[index + 1];
      index += 1;
    } else {
      throw new Error('usage: scaffold update [--to <ref>] [--dry-run]');
    }
  }

  return { dryRun, targetRef };
}
