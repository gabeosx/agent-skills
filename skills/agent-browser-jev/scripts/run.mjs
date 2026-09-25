#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { act } from './jev-browser.mjs';
import { agentBrowser, createJevClient, jevDecider } from './agent-browser-jev.mjs';

export async function runTask(task, policy) {
  if (typeof policy.authorize !== 'function' || typeof policy.sanitize !== 'function') {
    throw new Error('Caller policy must export authorize and sanitize functions');
  }
  const browser = agentBrowser({ binary: task.browser?.binary,
    sessionId: task.browser?.sessionId, sanitize: policy.sanitize });
  const api = createJevClient(policy.loadApiKey ? await policy.loadApiKey() : undefined);
  return act({ browser, decide: jevDecider(api), intentOrSteps: task.intentOrSteps,
    suppliedValues: task.suppliedValues, scope: task.scope, authorize: policy.authorize, budget: task.budget });
}

async function main() {
  const { values } = parseArgs({ options: {
    task: { type: 'string' }, policy: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('node scripts/run.mjs --task task.json --policy caller-policy.mjs --output private/result.json\nUses the existing agent-browser session. Policy exports authorize, sanitize and optional loadApiKey. Output must be a new file.');
    return;
  }
  if (!values.task || !values.policy || !values.output) throw new Error('Task, policy and private output path required');
  const output = resolve(values.output);
  // Reserve a private evidence file before performing any browser gesture.
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, '{}\n', { flag: 'wx', mode: 0o600 });
  const task = JSON.parse(await readFile(resolve(values.task), 'utf8'));
  const policy = await import(pathToFileURL(resolve(values.policy)).href);
  const result = await runTask(task, policy);
  await writeFile(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ returnReason: result.returnReason,
    actions: result.actions.length, progressAssessment: result.progressAssessment, evidence: output }));
  if (result.returnReason !== 'reported_complete') process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch(() => {
    console.error('agent-browser-jev could not run. Check task/policy paths, dependencies, credentials and that the output file is new.');
    process.exitCode = 1;
  });
}
