import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {runStages} from '../scripts/timed-stages.mjs';

/** Check successful stages run once in order and persist elapsed timings. */
test('successful stages retain ordered timing evidence', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'stage-timing-'));
  try {
    const artifact = join(cwd, 'timings.json');
    const stages = ['first', 'second'].map(label => ({
      label,
      args: [
        '--input-type=module',
        '-e',
        `import {appendFileSync} from 'node:fs'; appendFileSync('order', ${JSON.stringify(label + '\n')});`,
      ],
    }));
    const report = runStages(stages, {cwd, artifact, label: 'success'});
    assert.equal(readFileSync(join(cwd, 'order'), 'utf8'), 'first\nsecond\n');
    assert.equal(report.exitCode, 0);
    assert.equal(report.runtime, process.version);
    assert.equal(report.sourceVersion, null);
    assert.deepEqual(JSON.parse(readFileSync(artifact, 'utf8')), report);
    assert.ok(report.stages.every(stage => stage.durationMs > 0));
    assert.ok(report.totalDurationMs >= report.stages.reduce((sum, stage) => sum + stage.durationMs, 0));
  } finally {
    rmSync(cwd, {recursive: true, force: true});
  }
});

/** Check a failed stage preserves its exit code and prevents later execution. */
test('failure stops subsequent stages and persists evidence', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'stage-timing-'));
  try {
    const artifact = join(cwd, 'timings.json');
    const report = runStages([
      {label: 'failure', args: ['-e', 'process.exit(7)']},
      {label: 'must-not-run', args: ['-e', "require('node:fs').writeFileSync('unexpected', '')"]},
    ], {cwd, artifact, label: 'failure'});
    assert.equal(report.exitCode, 7);
    assert.equal(report.stages.length, 1);
    assert.equal(existsSync(join(cwd, 'unexpected')), false);
    assert.equal(JSON.parse(readFileSync(artifact, 'utf8')).exitCode, 7);
  } finally {
    rmSync(cwd, {recursive: true, force: true});
  }
});
