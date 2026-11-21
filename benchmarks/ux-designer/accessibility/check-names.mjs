import { createHash } from 'node:crypto';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../harness/node_modules/playwright/index.mjs';

const [hooksPath, sitePath, outputPath] = process.argv.slice(2);
if (!hooksPath || !sitePath || !outputPath) {
  console.error('Usage: node check-names.mjs <name-hooks.json> <site-dir> <names.json>');
  process.exit(2);
}

const hooksBytes = await readFile(hooksPath);
const { buttons } = JSON.parse(hooksBytes);
if (!Array.isArray(buttons) || !buttons.length ||
    buttons.some(hook => typeof hook !== 'string' || !hook.trim()) ||
    new Set(buttons).size !== buttons.length) {
  throw new Error('name-hooks.json needs distinct, nonempty button hooks.');
}

const site = await realpath(sitePath);
const siteURL = pathToFileURL(site + sep).href;
const entry = pathToFileURL(resolve(site, 'index.html')).href;
const viewports = [
  { width: 1440, height: 1000 },
  { width: 834, height: 1112 },
  { width: 390, height: 844 },
];

const browser = await chromium.launch({
  executablePath: process.env.UX_BENCHMARK_CHROMIUM || chromium.executablePath(),
  args: ['--disable-quic', '--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND'],
});
const report = {
  browser: browser.version(),
  hookSha256: createHash('sha256').update(hooksBytes).digest('hex'),
  method: 'Playwright role/name match with the complete visible button text as an ordered substring, ignoring case and collapsed whitespace',
  viewports: [],
};
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, locale: 'en-US', serviceWorkers: 'block' });
    try {
      await context.route('**/*', route => route.request().url().startsWith(siteURL)
        ? route.continue() : route.abort('blockedbyclient'));
      await context.routeWebSocket(/.*/, socket => socket.close());
      const page = await context.newPage();
      await page.goto(entry, { waitUntil: 'load', timeout: 10000 });
      const controls = [];
      for (const hook of buttons) {
        const locator = page.getByTestId(hook);
        if (await locator.count() !== 1 || !await locator.isVisible()) {
          controls.push({ hook, pass: false, error: 'Expected one visible control' });
          continue;
        }
        const visibleLabel = (await locator.innerText()).replace(/\s+/gu, ' ').trim();
        const nameMatches = visibleLabel &&
          await locator.and(page.getByRole('button', { name: visibleLabel })).count() === 1;
        controls.push({ hook, visibleLabel, pass: Boolean(nameMatches), ariaSnapshot: await locator.ariaSnapshot() });
      }
      report.viewports.push({ ...viewport, pass: controls.every(control => control.pass), controls });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

report.status = report.viewports.every(viewport => viewport.pass) ? 'passed' : 'failed';
await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, report: outputPath }));
process.exitCode = report.status === 'passed' ? 0 : 1;
