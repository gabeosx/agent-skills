import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openResume, sealResume } from '../scripts/run.mjs';
import { agentBrowser } from '../scripts/agent-browser-jev.mjs';

const command = fileURLToPath(new URL('../scripts/run.mjs', import.meta.url));

test('native date action sends only observed refs and exact date digits through browser UI', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-native-date-'));
  try {
    const binary = join(root, 'browser.mjs'), argsPath = join(root, 'args.json');
    writeFileSync(binary, `#!${process.execPath}\nimport {writeFileSync} from 'node:fs';
const args=process.argv.slice(2);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(args));
console.log(JSON.stringify(args.slice(5).map(()=>({success:true,error:null,result:{}}))));`, { mode: 0o700 });
    const browser = agentBrowser({ binary, sessionId: 'date-test', sanitize: value => value });
    await browser.execute({ op: 'set_date', refs: { month: '@e3', day: '@e4', year: '@e5' }, value: '2026-11-08' });
    assert.deepEqual(JSON.parse(readFileSync(argsPath, 'utf8')), ['--session', 'date-test', '--json', 'batch', '--bail',
      'click @e3', 'press 1', 'press 1', 'click @e4', 'press 0', 'press 8', 'click @e5', 'press 2', 'press 0', 'press 2', 'press 6']);
    await assert.rejects(browser.execute({ op: 'set_date', refs: { month: '@e3', day: '@e4', year: '@e5' }, value: '2026-02-30' }), /Invalid native date/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('agent command documents direct structured output and no file control surface', () => {
  const stdout = execFileSync(process.execPath, [command, '--help'], { cwd: tmpdir(), encoding: 'utf8' });
  assert.match(stdout, /non-interactive and returns one JSON result on stdout/);
  for (const removed of ['--task', '--policy', '--output', 'result.json']) assert.ok(!stdout.includes(removed));
});

test('directory and file symlink entrypoints execute instead of silently exiting', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-skill-symlink-'));
  try {
    symlinkSync(fileURLToPath(new URL('..', import.meta.url)), join(root, 'skill'), 'dir');
    symlinkSync(command, join(root, 'run.mjs'));
    for (const entry of ['skill/scripts/run.mjs', 'run.mjs']) {
      const stdout = execFileSync(process.execPath, [entry, '--help'], { cwd: root, encoding: 'utf8' });
      assert.match(stdout, /Agent-only browser task helper/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('valid handoff returns final state and encrypted resume token without writing result files', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-direct-result-'));
  try {
    const binary = join(root, 'browser.mjs'), argsPath = join(root, 'args.json');
    writeFileSync(binary, `#!${process.execPath}\nimport {writeFileSync} from 'node:fs';
writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(process.argv.slice(2)));
console.log(JSON.stringify({success:true,data:{snapshot:'x'.repeat(46000),refs:{}}}));`, { mode: 0o700 });
    const apiKey = 'test-only-no-network';
    const stdout = execFileSync(process.execPath, [command, '--intent', 'Inspect the page', '--binary', binary, '--session', 'portal-test', '--allow', 'click:Save draft'], {
      cwd: root, env: { ...process.env, OPENROUTER_API_KEY: apiKey }, encoding: 'utf8',
    });
    const result = JSON.parse(stdout);
    assert.equal(result.returnReason, 'observation_too_large');
    assert.equal(result.resumable, true);
    assert.match(result.resumeToken, /^jev1\./);
    assert.deepEqual(openResume(result.resumeToken, apiKey).invocation.allowedActions, [{ operation: 'click', name: 'Save draft' }]);
    assert.deepEqual(JSON.parse(readFileSync(argsPath, 'utf8')), ['--session', 'portal-test', '--json', 'snapshot']);
    assert.deepEqual(readdirSync(root).sort(), ['args.json', 'browser.mjs']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('agent command rejects unsupported allowlist operations', () => {
  let failure;
  try {
    execFileSync(process.execPath, [command, '--intent', 'Inspect the page', '--allow', 'evaluate'], {
      env: { ...process.env, OPENROUTER_API_KEY: 'offline-no-network' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) { failure = error; }
  assert.equal(failure?.status, 1);
  assert.match(JSON.parse(failure.stdout).message, /Use --allow operation/);
});

test('removed file-oriented options fail instead of silently preserving compatibility', () => {
  let failure;
  try {
    execFileSync(process.execPath, [command, '--task', 'task.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) { failure = error; }
  assert.equal(failure?.status, 1);
  assert.equal(JSON.parse(failure.stdout).returnReason, 'invalid_invocation');
});

test('resume tokens are encrypted, authenticated and expire', () => {
  const value = {
    invocation: { browser: { binary: '/browser', sessionId: 'same' }, intentOrSteps: 'Finish', context: '' },
    continuation: { schema: 1, sessionId: 'same', intentOrSteps: ['Finish'], scope: 'scope', stepIndex: 0,
      suppliedValues: { subject: 'Exact original' }, history: [], progressAssessment: [] },
  };
  const token = sealResume(value, 'key', 1000);
  assert.ok(!token.includes('Exact original'));
  assert.deepEqual(openResume(token, 'key', 1001).continuation.suppliedValues, { subject: 'Exact original' });
  const parts = token.split('.');
  parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
  assert.throws(() => openResume(parts.join('.'), 'key', 1001), /Invalid or expired/);
  assert.throws(() => openResume(token, 'key', 1000 + 30 * 60 * 1000), /Invalid or expired/);
  assert.equal(sealResume({
    invocation: value.invocation,
    continuation: { ...value.continuation, suppliedValues: { oversized: 'x'.repeat(1_000_001) } },
  }, 'key', 1000), null);
});

test('direct resume preserves the absolute browser and needs no evidence file', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-token-resume-'));
  try {
    const binary = join(root, 'browser.mjs');
    writeFileSync(binary, `#!${process.execPath}\nconsole.log(JSON.stringify({success:true,data:{snapshot:'x'.repeat(46000),refs:{}}}));`, { mode: 0o700 });
    const env = { ...process.env, OPENROUTER_API_KEY: 'offline-no-network' };
    const first = JSON.parse(execFileSync(process.execPath, [command, '--intent', 'Continue the draft', '--binary', './browser.mjs', '--session', 'relative'], { cwd: root, env, encoding: 'utf8' }));
    const second = JSON.parse(execFileSync(process.execPath, [command, '--resume-token', first.resumeToken], { cwd: tmpdir(), env, encoding: 'utf8' }));
    assert.equal(second.returnReason, 'observation_too_large');
    assert.equal(second.resumable, true);
    assert.deepEqual(readdirSync(root).sort(), ['browser.mjs']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
