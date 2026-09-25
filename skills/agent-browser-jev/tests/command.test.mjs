import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTask } from '../scripts/run.mjs';

const cli = fileURLToPath(new URL('../scripts/run.mjs', import.meta.url));

test('command help works from an unrelated directory without project configuration', () => {
  const stdout = execFileSync(process.execPath, [cli, '--help'], { cwd: tmpdir(), encoding: 'utf8' });
  assert.match(stdout, /--task task.json --policy caller-policy.mjs/);
});

test('command uses caller browser/policy and creates private sanitized evidence outside any project', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-skill-command-'));
  try {
    const binary = join(root, 'browser-fixture.mjs');
    const argsPath = join(root, 'args.json');
    writeFileSync(binary, `#!/usr/bin/env node\nimport {writeFileSync} from 'node:fs';
writeFileSync(${JSON.stringify(argsPath)}, JSON.stringify(process.argv.slice(2)));
console.log(JSON.stringify({success:true,data:{snapshot:'PRIVATE_MARKER '+ 'x'.repeat(500),refs:{}}}));`, { mode: 0o700 });
    writeFileSync(join(root, 'policy.mjs'), `export const authorize = () => false;
export const sanitize = data => ({...data, snapshot:data.snapshot.replace('PRIVATE_MARKER','redacted')});
export const loadApiKey = () => 'test-only-no-network';`);
    writeFileSync(join(root, 'task.json'), JSON.stringify({
      browser: { binary, sessionId: 'portal-test' }, intentOrSteps: 'Read the test page', scope: 'Fixture only',
      budget: { maxObservationChars: 100 },
    }));
    const output = join(root, 'private', 'result.json');
    let failure;
    try {
      execFileSync(process.execPath, [cli, '--task', 'task.json', '--policy', 'policy.mjs', '--output', output], {
        cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) { failure = error; }
    assert.equal(failure?.status, 2);
    assert.equal(JSON.parse(failure.stdout).returnReason, 'observation_too_large');
    const evidence = readFileSync(output, 'utf8');
    assert.ok(!evidence.includes('PRIVATE_MARKER'));
    assert.ok(!evidence.includes('test-only-no-network'));
    assert.equal(statSync(output).mode & 0o777, 0o600);
    assert.equal(JSON.parse(evidence).actions.length, 0);
    assert.deepEqual(JSON.parse(readFileSync(argsPath, 'utf8')), ['--session', 'portal-test', '--json', 'snapshot']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing caller policy fails before loading credentials or using browser', async () => {
  let accessed = false;
  await assert.rejects(runTask({}, { loadApiKey: () => { accessed = true; } }), /authorize and sanitize/);
  assert.equal(accessed, false);
});

test('existing evidence is never overwritten and raw setup errors are not printed', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-skill-existing-'));
  try {
    const output = join(root, 'existing.json');
    writeFileSync(output, 'preserve-me');
    let failure;
    try {
      execFileSync(process.execPath, [cli, '--task', 'missing-task', '--policy', 'missing-policy', '--output', output], {
        cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) { failure = error; }
    assert.equal(failure?.status, 1);
    assert.equal(readFileSync(output, 'utf8'), 'preserve-me');
    assert.ok(!failure.stderr.includes(root));
    assert.ok(!failure.stderr.includes('EEXIST'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
