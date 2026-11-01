import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {syncShared} from '../scripts/sync-shared.mjs';

/** Build divergent public/private fixtures with private-only content. */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'shared-sync-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const source = join(root, 'public');
  const target = join(root, 'private');
  for (const dir of [source, target]) {
    mkdirSync(join(dir, 'assets'), {recursive: true});
    writeFileSync(join(dir, 'lighting.js'), dir === source ? 'new shared lighting' : 'old lighting');
    writeFileSync(join(dir, 'water.js'), 'shared water');
    writeFileSync(join(dir, 'app.js'), dir === source ? 'public demo' : 'private gallery, chair details, octopus art, rugSources');
    writeFileSync(join(dir, 'index.html'), dir === source ? 'public index' : 'private index');
  }
  writeFileSync(join(target, 'assets', 'private-photo.jpg'), Buffer.from([0, 255, 3, 17]));
  writeFileSync(join(target, 'assets', 'private-art.json'), '{"art":"private octopus"}');
  return {root, source, target, files: ['lighting.js', 'water.js']};
}

/** Capture every byte and filename, including nested private assets. */
function snapshot(root) {
  return Object.fromEntries(readdirSync(root, {recursive: true, withFileTypes: true})
    .filter(entry => entry.isFile())
    .map(entry => [join(entry.parentPath, entry.name).slice(root.length + 1), readFileSync(join(entry.parentPath, entry.name)).toString('hex')]));
}

/** Check dry runs preserve all bytes and applying shared changes preserves private gallery and assets. */
test('safe shared update preserves private content', t => {
  const options = fixture(t);
  const before = snapshot(options.target);
  assert.deepEqual(syncShared(options), {apply: false, changed: ['lighting.js']});
  assert.deepEqual(snapshot(options.target), before);
  assert.deepEqual(syncShared({...options, apply: true}), {apply: true, changed: ['lighting.js']});
  const expected = {...before, 'lighting.js': readFileSync(join(options.source, 'lighting.js')).toString('hex')};
  assert.deepEqual(snapshot(options.target), expected);
  assert.deepEqual(syncShared({...options, apply: true}).changed, []);
});

/** Check unsafe requests reject the entire batch before updating any valid shared file. */
test('protected and unknown paths fail without partial writes', t => {
  const options = fixture(t);
  const before = snapshot(options.target);
  for (const unsafe of ['app.js', 'index.html', 'assets/private-photo.jpg', 'dining.js', '../lighting.js', '/lighting.js', 'unknown.js']) {
    assert.throws(() => syncShared({...options, files: ['lighting.js', unsafe], apply: true}), /Refusing/);
    assert.deepEqual(snapshot(options.target), before);
  }
});

/** Check a missing later module prevents earlier valid updates. */
test('preflight failure is all or nothing', t => {
  const options = fixture(t);
  const before = snapshot(options.target);
  unlinkSync(join(options.source, 'water.js'));
  assert.throws(() => syncShared({...options, apply: true}), /ENOENT/);
  assert.deepEqual(snapshot(options.target), before);
});

/** Check symlinked roots and modules cannot redirect writes outside the target. */
test('symlinks and identical roots are refused', t => {
  const options = fixture(t);
  const before = snapshot(options.source);
  assert.throws(() => syncShared({...options, target: options.source, apply: true}), /must differ/);
  const alias = join(options.root, 'alias');
  symlinkSync(options.target, alias);
  assert.throws(() => syncShared({...options, target: alias, apply: true}), /physical directory/);
  unlinkSync(join(options.target, 'lighting.js'));
  symlinkSync(join(options.source, 'lighting.js'), join(options.target, 'lighting.js'));
  assert.throws(() => syncShared({...options, apply: true}), /regular file/);
  assert.deepEqual(snapshot(options.source), before);
});
