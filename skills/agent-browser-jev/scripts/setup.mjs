#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { configPath, readConfig, saveConfig, configuredBrowser } from './config.mjs';

const execute = promisify(execFile);
const { values } = parseArgs({ options: {
  binary: { type: 'string' }, 'install-browser': { type: 'boolean' },
  'key-stdin': { type: 'boolean' }, 'change-key': { type: 'boolean' }, help: { type: 'boolean' },
} });
async function hiddenKey() {
  if (!process.stdin.isTTY) throw new Error('Use OPENROUTER_API_KEY or --key-stdin for non-interactive setup.');
  const muted = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
  // Enter raw mode before displaying the prompt so an immediate paste cannot echo.
  process.stdout.write('Paste your OpenRouter API key (hidden): ');
  try {
    return await Promise.race([rl.question(''), new Promise((_, reject) => rl.once('SIGINT', () => reject(new Error('Setup cancelled.'))))]);
  } finally { rl.close(); process.stdout.write('\n'); }
}
async function main() {
  if (values.help) {
    console.log('node scripts/setup.mjs [--binary /path/to/agent-browser] [--install-browser] [--change-key] [--key-stdin]\nInstalls dependencies, reuses agent-browser or installs a local copy, and configures your OpenRouter key.');
    return;
  }
  const config = readConfig();
  let newKey;
  if (values['key-stdin']) {
    const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
    newKey = Buffer.concat(chunks).toString('utf8').trim();
  } else if (values['change-key'] || (!process.env.OPENROUTER_API_KEY && !config.apiKey)) {
    console.log('Create a key at https://openrouter.ai/settings/keys and add credit at https://openrouter.ai/settings/credits');
    newKey = (await hiddenKey()).trim();
  }
  if (newKey !== undefined) {
    if (!newKey) throw new Error('The API key was empty.');
    config.apiKey = newKey;
    await saveConfig(config);
    console.log(`Key saved in ${configPath()} (owner-only file permissions).`);
  } else console.log(process.env.OPENROUTER_API_KEY ? 'Using OPENROUTER_API_KEY from your environment.' : 'Using your saved OpenRouter key.');
  const skill = fileURLToPath(new URL('..', import.meta.url));
  console.log('Installing helper dependencies…');
  await execute('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: skill, timeout: 120_000 });
  let binary = values.binary || configuredBrowser();
  let install = values['install-browser'];
  if (!install) {
    try { await execute(binary, ['--version'], { timeout: 15_000 }); }
    catch {
      if (values.binary || process.env.AGENT_BROWSER_BINARY || config.browserBinary) throw new Error('Configured browser did not start. Check --binary or use --install-browser.');
      install = true;
    }
  }
  if (install) {
    console.log('Installing agent-browser 0.38.1 and downloading its browser…');
    const runtime = join(dirname(configPath()), 'runtime');
    await execute('npm', ['install', '--prefix', runtime, '--no-audit', '--no-fund', 'agent-browser@0.38.1'], { timeout: 180_000 });
    binary = join(runtime, 'node_modules', '.bin', 'agent-browser');
    await execute(binary, ['install'], { timeout: 240_000 });
  }
  config.browserBinary = binary;
  await saveConfig(config);
  const version = (await execute(binary, ['--version'], { timeout: 15_000 })).stdout.trim();
  console.log(`Ready: ${version}. Ask your agent to use agent-browser-jev, or run scripts/run.mjs --help.\nSetup checked local configuration; the first task will verify API access.`);
}
main().catch(error => {
  // Never print raw npm/provider output: it may contain environment information.
  console.error(error.code ? 'Setup could not finish an installation command. Check Node/npm, network access and agent-browser setup, then rerun.' : error.message);
  process.exitCode = 1;
});
