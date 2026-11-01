import {lstatSync, realpathSync, readFileSync, writeFileSync, renameSync, unlinkSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

// Mixed application/data files must be split before they can enter this allowlist.
export const sharedModules = Object.freeze([
  'dimensions.js',
  'flood-visual.js',
  'flood.js',
  'furniture-wood.js',
  'handle-clearance.js',
  'lighting.js',
  'stainless.js',
  'surfaces.js',
  'turning.js',
  'viewpoints.js',
  'water.js',
]);

/** Reject symlinked roots and ancestors. */
function physicalRoot(path) {
  const root = resolve(path);
  if (realpathSync(root) !== root || !lstatSync(root).isDirectory()) throw new Error(`Not a physical directory: ${root}`);
  return root;
}

/** Read a regular module without following a symlink. */
function moduleBytes(path) {
  if (!lstatSync(path).isFile()) throw new Error(`Not a regular file: ${path}`);
  return readFileSync(path);
}

/** Preflight every module; default to read-only, staging replacements and rolling back write failures. */
export function syncShared({source, target, files, apply = false}) {
  if (!source || !target || !files?.length) throw new Error('Require source, target and at least one file.');
  const from = physicalRoot(source);
  const to = physicalRoot(target);
  if (from === to) throw new Error('Source and target must differ.');
  const names = [...new Set(files)];
  for (const name of names) {
    if (!sharedModules.includes(name)) throw new Error(`Refusing ${name}: only standalone shared modules allowed; split mixed app.js code first.`);
  }
  const plan = names.map(name => ({
    name,
    destination: join(to, name),
    before: moduleBytes(join(to, name)),
    after: moduleBytes(join(from, name)),
  }));
  const changed = plan.filter(item => !item.before.equals(item.after));
  if (!apply) return {apply, changed: changed.map(item => item.name)};
  const staged = [];
  const committed = [];
  try {
    for (const item of changed) {
      const temporary = join(to, `.sync-shared-${randomUUID()}`);
      staged.push({...item, temporary});
      writeFileSync(temporary, item.after, {flag: 'wx', mode: lstatSync(item.destination).mode});
    }
    // Check every destination again before replacing any file.
    for (const item of plan) {
      if (!moduleBytes(item.destination).equals(item.before)) throw new Error(`Target changed: ${item.name}`);
    }
    for (const item of staged) {
      renameSync(item.temporary, item.destination);
      committed.push(item);
    }
  } catch (error) {
    for (const item of committed.reverse()) {
      writeFileSync(item.temporary, item.before, {flag: 'wx'});
      renameSync(item.temporary, item.destination);
    }
    throw error;
  } finally {
    for (const item of staged) {
      try { unlinkSync(item.temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  return {apply, changed: changed.map(item => item.name)};
}

/** Parse explicit options; never accept a blanket directory copy. */
function main(args) {
  const options = {files: []};
  for (const arg of args) {
    if (arg === '--apply') options.apply = true;
    else if (arg.startsWith('--source=')) options.source = arg.slice(9);
    else if (arg.startsWith('--target=')) options.target = arg.slice(9);
    else if (arg.startsWith('--file=')) options.files.push(arg.slice(7));
    else throw new Error(`Unknown option: ${arg}`);
  }
  console.log(JSON.stringify(syncShared(options), null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
