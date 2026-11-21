import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const harness = fileURLToPath(new URL('.', import.meta.url));
const requested = process.argv[2];
const artifacts = requested ? resolve(requested) : await mkdtemp(join(tmpdir(), 'ux-designer-qualification-'));
await mkdir(artifacts, { recursive: true });

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function capture(caseName, fixture, expectedCode, siteFixture = fixture) {
  const directory = join(artifacts, caseName);
  const result = spawnSync(process.execPath, [
    join(harness, 'capture.mjs'),
    join(harness, 'fixtures', fixture, 'task'),
    join(harness, 'fixtures', siteFixture, 'site'),
    directory,
  ], { encoding: 'utf8', timeout: 90000 });
  const reportPath = join(directory, 'report.json');
  let report;
  try {
    report = JSON.parse(await readFile(reportPath, 'utf8'));
  } catch (error) {
    throw new Error(`Qualification report missing at ${reportPath}. ${result.stderr || result.error || error.message}`);
  }
  assert.equal(result.status, expectedCode, JSON.stringify(report.runnerErrors.length ? report.runnerErrors : report.criticalFailures));
  return { directory, reportPath, report };
}

async function verifyPng(directory, evidence, width) {
  const bytes = await readFile(join(directory, evidence.path));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), width);
  assert.ok(bytes.readUInt32BE(20) > 0);
  assert.equal(bytes.length, evidence.bytes);
  assert.equal(sha256(bytes), evidence.sha256);
}

const roster = [
  { name: 'positive-first', fixture: 'positive', exitCode: 0 },
  { name: 'negative', fixture: 'negative', exitCode: 1 },
  { name: 'positive-after-negative', fixture: 'positive', exitCode: 0 },
  { name: 'missing-site', fixture: 'positive', exitCode: 2, site: 'absent' },
];
const records = [];
for (const item of roster) {
  const { directory, reportPath, report } = await capture(item.name, item.fixture, item.exitCode, item.site);
  if (item.name === 'missing-site') {
    assert.equal(report.status, 'incomplete');
    assert.equal(report.viewports.length, 0);
    assert.deepEqual(report.criticalFailures, []);
    assert.equal(report.runnerErrors[0].kind, 'missing-artifact');
  } else {
    assert.deepEqual(report.runnerErrors, []);
    assert.ok(report.browser.version);
    assert.deepEqual(report.viewports.map(({ viewport }) => viewport.width), [1440, 834, 390]);
    assert.equal(report.source.checksSha256.length, 64);
    assert.equal(report.source.site.sha256.length, 64);
    assert.equal(report.source.harness.sha256.length, 64);
    assert.ok(report.timing.elapsedMs > 0);
    for (const viewport of report.viewports) {
      await verifyPng(directory, viewport.screenshot, viewport.viewport.width);
      assert.ok(viewport.accessibility.counts.passes > 0);
    }
    for (const scenario of report.scenarios) {
      await verifyPng(directory, scenario.screenshot, scenario.viewport.width);
    }
  }
  if (item.fixture === 'positive' && !item.site) {
    assert.equal(report.status, 'passed');
    assert.deepEqual(report.criticalFailures, []);
    assert.ok(report.viewports.every((viewport) => !viewport.layout.horizontalOverflow));
    assert.ok(report.viewports.every((viewport) => viewport.accessibility.violations.length === 0));
    assert.ok(report.scenarios.every((scenario) => scenario.status === 'passed' && scenario.unrunSteps === 0));
    assert.ok([...report.viewports, ...report.scenarios].every((page) =>
      page.blockedRequests.some(({ type, url }) => type === 'fetch' && url === 'https://benchmark-fixture.invalid/probe')));
    const [mutated, fresh] = report.scenarios;
    assert.match(mutated.steps[10].actual, /Restored from local storage/);
    assert.match(fresh.steps[1].actual, /^No saved note\. Session: null\. Cookie: false\.$/);
  }
  if (item.fixture === 'negative') {
    assert.equal(report.status, 'failed');
    assert.ok(report.criticalFailures.some(({ kind, viewport }) => kind === 'horizontal-overflow' && viewport === 'mobile'));
    assert.ok(report.criticalFailures.some(({ kind, rule }) => kind === 'accessibility' && rule === 'button-name'));
    assert.ok(report.criticalFailures.some(({ kind, error }) => kind === 'page-error' && error === 'Deliberate click failure'));
    const [scenario] = report.scenarios;
    assert.equal(scenario.status, 'failed');
    assert.equal(scenario.unrunSteps, 1);
    assert.equal(scenario.steps[2].actual, 'Incorrect result');
    assert.ok(scenario.screenshot);
  }
  records.push({
    case: item.name,
    exitCode: item.exitCode,
    report: reportPath,
    reportSha256: sha256(await readFile(reportPath)),
    status: report.status,
  });
}
const summary = { qualifiedAt: new Date().toISOString(), status: 'qualified', cases: records };
const summaryPath = join(artifacts, 'qualification.json');
await writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: summary.status, summary: summaryPath }));
