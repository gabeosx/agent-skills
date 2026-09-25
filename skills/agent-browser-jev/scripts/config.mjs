import { readFileSync } from 'node:fs';
import { mkdir, writeFile, rename, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export function configPath() {
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'agent-browser-jev', 'config.json');
}
export function readConfig() {
  try { return JSON.parse(readFileSync(configPath(), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw new Error('Cannot read Jev configuration. Run setup.mjs again.'); }
}
export async function saveConfig(config) {
  const path = configPath();
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(config, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  await rename(temporary, path);
  await chmod(path, 0o600);
}
export function configuredApiKey() {
  const key = process.env.OPENROUTER_API_KEY || readConfig().apiKey;
  if (typeof key !== 'string' || !key.trim()) throw new Error('Run setup.mjs to save an OpenRouter key, or set OPENROUTER_API_KEY.');
  return key.trim();
}
export function configuredBrowser() {
  return process.env.AGENT_BROWSER_BINARY || readConfig().browserBinary || 'agent-browser';
}
