import {spawnSync} from 'node:child_process';
import {mkdirSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';

/** Run each stage once, stop at failure, and retain measured wall-clock evidence. */
export function runStages(stages, {cwd, artifact, label, sourceVersion = null}) {
  const started = performance.now();
  const report = {
    label,
    startedAt: new Date().toISOString(),
    runtime: process.version,
    sourceVersion,
    stages: [],
  };
  let exitCode = 0;
  let signal = null;
  for (const stage of stages) {
    const stageStarted = performance.now();
    console.log(`\n[timing] Starting ${stage.label}`);
    const result = spawnSync(process.execPath, stage.args, {cwd, stdio: 'inherit'});
    const durationMs = performance.now() - stageStarted;
    exitCode = result.status ?? 1;
    signal = result.signal;
    report.stages.push({
      label: stage.label,
      command: [process.execPath, ...stage.args],
      durationMs,
      exitCode,
      signal,
      error: result.error?.message ?? null,
    });
    console.log(`[timing] ${stage.label}: ${(durationMs / 1000).toFixed(3)} s (exit ${exitCode}${signal ? `, ${signal}` : ''})`);
    if (exitCode !== 0 || signal) break;
  }
  report.totalDurationMs = performance.now() - started;
  report.exitCode = exitCode;
  report.signal = signal;
  mkdirSync(dirname(artifact), {recursive: true});
  writeFileSync(artifact, JSON.stringify(report, null, 2) + '\n');
  console.log(`[timing] ${label} total: ${(report.totalDurationMs / 1000).toFixed(3)} s; ${artifact}`);
  return report;
}

/** Report a commit only when this directory itself is the Git working tree. */
function sourceVersion(cwd) {
  /** Query this checkout without printing Git errors or changing it. */
  const git = args => spawnSync('git', args, {cwd, encoding: 'utf8'});
  const top = git(['rev-parse', '--show-toplevel']);
  if (top.status !== 0 || resolve(top.stdout.trim()) !== cwd) return null;
  const revision = git(['rev-parse', 'HEAD']);
  const status = git(['status', '--porcelain']);
  return revision.status === 0
    ? {commit: revision.stdout.trim(), dirty: status.status === 0 ? Boolean(status.stdout.trim()) : null}
    : null;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cwd = fileURLToPath(new URL('../', import.meta.url)).replace(/[\\/]$/, '');
  const [label = 'check', ...extraArgs] = process.argv.slice(2);
  const unit = {label: 'unit', args: ['--test', ...readdirSync(resolve(cwd, 'tests')).filter(name => name.endsWith('.test.mjs')).sort().map(name => `tests/${name}`)]};
  const audit = {label: 'public-audit', args: ['scripts/audit-public.mjs']};
  const browser = {label: 'browser', args: ['tests/browser-check.mjs']};
  const commands = {
    check: [unit, audit, browser, {label: 'viewpoints', args: ['tests/viewpoints.mjs']}, {label: 'startup', args: ['tests/startup.mjs']}],
    unit: [unit],
    'public-audit': [audit],
    browser: [browser],
    render: [{label: 'render', args: ['tests/camera-sweep.mjs', ...extraArgs]}],
    flood: [{label: 'flood', args: ['tests/flood-browser.mjs', ...extraArgs]}],
    extractor: [{label: 'extractor', args: ['tests/extractor-review.mjs', ...extraArgs]}],
  };
  if (!Object.hasOwn(commands, label)) throw new Error(`Unknown stage group: ${label}`);
  if (extraArgs.length && !['render', 'flood', 'extractor'].includes(label)) throw new Error(`Arguments are unsupported for ${label}`);
  const artifact = resolve(cwd, 'test-results', 'timings', `${label}-${Date.now()}-${process.pid}.json`);
  const report = runStages(commands[label], {cwd, artifact, label, sourceVersion: sourceVersion(cwd)});
  if (report.signal) process.kill(process.pid, report.signal);
  else process.exitCode = report.exitCode;
}
