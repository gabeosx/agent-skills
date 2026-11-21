import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, realpath, rename, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import axe from 'axe-core';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const viewports = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};
const contextOptions = {
  colorScheme: 'light',
  deviceScaleFactor: 1,
  locale: 'en-US',
  reducedMotion: 'reduce',
  serviceWorkers: 'block',
  timezoneId: 'UTC',
};
const timeouts = { navigation: 10000, step: 2500, capture: 10000, accessibility: 10000 };
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const mimeTypes = {
  '.avif': 'image/avif', '.css': 'text/css; charset=utf-8', '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon', '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const actions = new Set(['click', 'fill', 'select', 'press', 'visible', 'hidden', 'text', 'count', 'attribute']);

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

function isInside(directory, path) {
  const subpath = relative(directory, path);
  return subpath !== '..' && !subpath.startsWith('../') && !subpath.startsWith('..\\') && !isAbsolute(subpath);
}

async function fingerprint(directory, included) {
  const files = [];
  async function visit(path) {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
      if (path === directory && included && !included.has(entry.name)) continue;
      const pathToEntry = join(path, entry.name);
      if (entry.isDirectory()) {
        await visit(pathToEntry);
      } else if (entry.isFile()) {
        files.push({ path: relative(directory, pathToEntry).replaceAll('\\', '/'), sha256: sha256(await readFile(pathToEntry)) });
      } else {
        throw new Error(`Expected a regular source file or directory at ${pathToEntry}`);
      }
    }
  }
  await visit(directory);
  return { sha256: sha256(JSON.stringify(files)), files };
}

function validateChecks(checks) {
  if (!Array.isArray(checks.scenarios) || checks.scenarios.length === 0) {
    throw new Error('checks.json requires a nonempty scenarios array');
  }
  const names = new Set();
  for (const scenario of checks.scenarios) {
    const { name, width, capture, steps } = scenario;
    if (typeof name !== 'string' || !name.trim() || names.has(name)) {
      throw new Error('Each scenario must have a unique, nonempty name');
    }
    names.add(name);
    scenario.viewport = Object.values(viewports).find((viewport) => viewport.width === width);
    if (!scenario.viewport && Number.isSafeInteger(width) && width > 0 && width <= 4096) {
      scenario.viewport = { width, height: 1000 };
    }
    if (!scenario.viewport || (capture !== undefined && typeof capture !== 'boolean') ||
        !Array.isArray(steps) || steps.length === 0) {
      throw new Error(`Invalid width, capture or steps for scenario ${name}`);
    }
    for (const step of steps) {
      const { action, id, value, count, name: attribute } = step;
      if (!actions.has(action) || typeof id !== 'string' || !id) {
        throw new Error(`Invalid step action or id for scenario ${name}`);
      }
      if (['fill', 'select', 'press', 'text'].includes(action) && typeof value !== 'string') {
        throw new Error(`Step ${action} requires a string value for scenario ${name}`);
      }
      if (action === 'count' && (!Number.isSafeInteger(count) || count < 0)) {
        throw new Error(`Step count requires a nonnegative integer for scenario ${name}`);
      }
      if (action === 'attribute' && (typeof attribute !== 'string' || !attribute ||
          (typeof value !== 'string' && value !== null))) {
        throw new Error(`Step attribute requires a name and a string or null value for scenario ${name}`);
      }
    }
  }
}

async function serve(directory) {
  const server = createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      let path = resolve(directory, `.${decodeURIComponent(url.pathname)}`);
      if (!isInside(directory, path)) throw new Error('Path outside site');
      if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
      path = await realpath(path);
      if (!isInside(directory, path)) throw new Error('Path outside site');
      const content = await readFile(path);
      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(path).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': content.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function launchBrowser() {
  const explicitExecutable = process.env.UX_BENCHMARK_CHROMIUM;
  const bundledExecutable = chromium.executablePath();
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = explicitExecutable ?? (existsSync(bundledExecutable) ? bundledExecutable : macChrome);
  const source = explicitExecutable ? 'explicit' : executablePath === bundledExecutable ? 'playwright' : 'system-chrome';
  const args = [
    '--disable-quic',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    '--no-proxy-server',
  ];
  const browser = await chromium.launch({ executablePath, headless: true, args });
  return { browser, identity: { version: browser.version(), source, executablePath, headless: true, args } };
}

function observedUrl(url) {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
}

async function usePage(browser, origin, viewport, findings, run) {
  findings.pageErrors = [];
  findings.nativeDialogs = [];
  findings.blockedRequests = [];
  findings.localHttpErrors = [];
  const context = await browser.newContext({ ...contextOptions, viewport });
  try {
    await context.route('**/*', async (route) => {
      const request = route.request();
      if (new URL(request.url()).origin === origin) {
        await route.continue();
      } else {
        findings.blockedRequests.push({ type: request.resourceType(), url: observedUrl(request.url()) });
        await route.abort('blockedbyclient');
      }
    });
    // The static benchmark server offers no WebSocket services.
    await context.routeWebSocket(/.*/, (socket) => {
      findings.blockedRequests.push({ type: 'websocket', url: observedUrl(socket.url()) });
      socket.close();
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => findings.pageErrors.push(message(error)));
    page.on('dialog', (dialog) => {
      findings.nativeDialogs.push({ type: dialog.type(), message: dialog.message() });
      void dialog.dismiss().catch(() => {});
    });
    page.on('response', (response) => {
      if (response.status() >= 400 && new URL(response.url()).origin === origin) {
        findings.localHttpErrors.push({ url: observedUrl(response.url()), status: response.status() });
      }
    });
    await run(page);
  } finally {
    await context.close();
  }
}

async function navigate(page, origin) {
  const response = await page.goto(origin, { waitUntil: 'load', timeout: timeouts.navigation });
  if (!response?.ok()) throw new Error(`Site navigation returned HTTP ${response?.status() ?? 'unknown'}`);
}

async function screenshot(page, directory, name) {
  const { width, height: viewportHeight } = page.viewportSize();
  const pageHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0));
  const image = await page.screenshot({
    fullPage: true,
    clip: { x: 0, y: 0, width, height: Math.max(viewportHeight, pageHeight) },
    animations: 'disabled',
    caret: 'hide',
    timeout: timeouts.capture,
  });
  await writeFile(join(directory, name), image, { flag: 'wx' });
  return { path: name, bytes: image.length, sha256: sha256(image) };
}

async function measureLayout(page) {
  return page.evaluate(() => {
    const { clientWidth, scrollWidth } = document.documentElement;
    const bodyScrollWidth = document.body?.scrollWidth ?? 0;
    return { clientWidth, scrollWidth, bodyScrollWidth, horizontalOverflow: Math.max(scrollWidth, bodyScrollWidth) > clientWidth };
  });
}

async function runAxe(page) {
  let timer;
  const results = await Promise.race([
    (async () => {
      // Evaluate through DevTools so site content-security policies can stay enabled.
      await page.evaluate(axe.source);
      return page.evaluate((tags) => globalThis.axe.run({ runOnly: { type: 'tag', values: tags } }), axeTags);
    })(),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('axe scan timed out')), timeouts.accessibility);
    }),
  ]).finally(() => clearTimeout(timer));
  return {
    status: results.violations.length ? 'violations' : 'no-violations',
    counts: {
      passes: results.passes.length,
      violations: results.violations.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
    },
    violations: results.violations,
    incomplete: results.incomplete,
  };
}

async function waitForObservation(sample, condition) {
  const deadline = performance.now() + timeouts.step;
  let actual;
  do {
    actual = await sample();
    if (condition(actual)) return actual;
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  } while (performance.now() < deadline);
  const error = new Error(`Condition not met. Last observed value: ${JSON.stringify(actual)}`);
  error.actual = actual;
  throw error;
}

function normalized(text) {
  return text.replace(/\s+/g, ' ').trim();
}

async function performStep(page, step) {
  const { action, id, value, count, name } = step;
  const locator = id === 'root' ? page.locator('body') : page.getByTestId(id);
  const options = { timeout: timeouts.step };
  switch (action) {
    case 'click': return locator.click(options);
    case 'fill': return locator.fill(value, options);
    case 'select': return locator.selectOption(value, options);
    case 'press': return locator.press(value, options);
    case 'visible': return locator.waitFor({ ...options, state: 'visible' });
    case 'hidden': return locator.waitFor({ ...options, state: 'hidden' });
    case 'text': return waitForObservation(async () => {
      const texts = await locator.allInnerTexts();
      return texts.length === 1 ? normalized(texts[0]) : texts;
    }, (actual) => typeof actual === 'string' && actual.includes(normalized(value)));
    case 'count': return waitForObservation(() => locator.count(), (actual) => actual === count);
    case 'attribute': return waitForObservation(async () => {
      const values = await locator.evaluateAll((nodes, key) => nodes.map((node) => node.getAttribute(key)), name);
      return values.length === 1 ? values[0] : values;
    }, (actual) => actual === value);
  }
}

function findingsFailures(findings, where, report) {
  for (const error of findings.pageErrors ?? []) {
    report.criticalFailures.push({ ...where, kind: 'page-error', error });
  }
  for (const dialog of findings.nativeDialogs ?? []) {
    report.criticalFailures.push({ ...where, kind: 'native-dialog', ...dialog });
  }
}

async function main(taskInput, siteInput, artifactInput) {
  const taskPath = resolve(taskInput);
  const sitePath = resolve(siteInput);
  const requestedArtifactPath = resolve(artifactInput);
  const siteDirectory = await realpath(sitePath).catch(() => sitePath);
  if (isInside(sitePath, requestedArtifactPath) || isInside(siteDirectory, requestedArtifactPath)) {
    throw new Error('Artifact directory must be outside the served site');
  }
  const artifactDirectory = await mkdir(requestedArtifactPath, { recursive: true }).then(() => realpath(requestedArtifactPath));
  if (isInside(siteDirectory, artifactDirectory)) throw new Error('Artifact directory must be outside the served site');
  const reportPath = join(artifactDirectory, 'report.json');
  const started = performance.now();
  const report = {
    schemaVersion: 1,
    status: 'incomplete',
    browser: null,
    config: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      playwright: require('playwright/package.json').version,
      axe: axe.version,
      axeTags,
      context: contextOptions,
      viewports,
      timeoutsMs: timeouts,
      network: 'localhost-static-origin-only',
    },
    source: {},
    timing: { startedAt: new Date().toISOString(), completedAt: null, elapsedMs: null },
    viewports: [],
    scenarios: [],
    criticalFailures: [],
    runnerErrors: [],
  };
  // Reserve each evidence directory once and flush a readable report between captures.
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  async function publish() {
    const temporary = join(artifactDirectory, '.report-next.json');
    await writeFile(temporary, JSON.stringify(report, null, 2) + '\n');
    await rename(temporary, reportPath);
  }

  let browser;
  let server;
  let phase = 'source';
  let failureKind = 'missing-artifact';
  try {
    if (!(await stat(join(siteDirectory, 'index.html'))).isFile()) {
      throw new Error('Expected site-dir/index.html to be a regular file');
    }
    const checksBuffer = await readFile(join(taskPath, 'checks.json'));
    report.source.checksSha256 = sha256(checksBuffer);
    failureKind = 'invalid-input';
    const checks = JSON.parse(checksBuffer);
    validateChecks(checks);
    report.source.site = await fingerprint(siteDirectory);
    report.source.harness = await fingerprint(fileURLToPath(new URL('.', import.meta.url)), new Set(['capture.mjs', 'package.json', 'package-lock.json']));
    failureKind = 'runner-error';
    phase = 'server';
    const service = await serve(siteDirectory);
    server = service.server;
    phase = 'browser';
    const launched = await launchBrowser();
    browser = launched.browser;
    report.browser = launched.identity;

    phase = 'viewport';
    for (const [name, viewport] of Object.entries(viewports)) {
      const result = { name, viewport, status: 'incomplete' };
      report.viewports.push(result);
      const failuresBefore = report.criticalFailures.length;
      const runnerErrorsBefore = report.runnerErrors.length;
      try {
        await usePage(browser, service.origin, viewport, result, async (page) => {
          try {
            await navigate(page, service.origin);
          } catch (error) {
            if (page.isClosed() || !browser.isConnected()) throw error;
            report.criticalFailures.push({ viewport: name, kind: 'navigation', error: message(error) });
          }
          try {
            result.screenshot = await screenshot(page, artifactDirectory, `${name}.png`);
            result.layout = await measureLayout(page);
            if (result.layout.horizontalOverflow) {
              report.criticalFailures.push({ viewport: name, kind: 'horizontal-overflow', layout: result.layout });
            }
          } catch (error) {
            report.runnerErrors.push({ viewport: name, kind: 'render-capture-error', error: message(error) });
          }
          try {
            result.accessibility = await runAxe(page);
            for (const violation of result.accessibility.violations) {
              if (['serious', 'critical'].includes(violation.impact)) {
                report.criticalFailures.push({
                  viewport: name, kind: 'accessibility', rule: violation.id, impact: violation.impact,
                });
              }
            }
          } catch (error) {
            result.accessibility = { status: 'incomplete', error: message(error) };
            report.runnerErrors.push({ viewport: name, kind: 'axe-capture-error', error: message(error) });
          }
        });
      } catch (error) {
        report.runnerErrors.push({ viewport: name, kind: 'browser-context-error', error: message(error) });
      }
      findingsFailures(result, { viewport: name }, report);
      result.status = report.runnerErrors.length > runnerErrorsBefore ? 'incomplete'
        : report.criticalFailures.length > failuresBefore ? 'failed' : 'passed';
      await publish();
    }

    phase = 'scenario';
    for (const [index, scenario] of checks.scenarios.entries()) {
      const { name, viewport, capture, steps } = scenario;
      const result = { name, viewport, captureRequested: Boolean(capture), status: 'incomplete', steps: [] };
      report.scenarios.push(result);
      const failuresBefore = report.criticalFailures.length;
      const runnerErrorsBefore = report.runnerErrors.length;
      try {
        await usePage(browser, service.origin, viewport, result, async (page) => {
          try {
            await navigate(page, service.origin);
          } catch (error) {
            if (page.isClosed() || !browser.isConnected()) throw error;
            report.criticalFailures.push({ scenario: name, kind: 'navigation', error: message(error) });
          }
          if (report.criticalFailures.length === failuresBefore) {
            for (const [stepIndex, step] of steps.entries()) {
              const evidence = { index: stepIndex + 1, expected: step, status: 'incomplete' };
              result.steps.push(evidence);
              const startedStep = performance.now();
              try {
                evidence.actual = await performStep(page, step);
                evidence.status = 'passed';
              } catch (error) {
                evidence.error = message(error);
                evidence.actual = error.actual;
                if (page.isClosed() || !browser.isConnected()) throw error;
                evidence.status = 'failed';
                report.criticalFailures.push({ scenario: name, kind: 'scenario-step', step: evidence.index, error: evidence.error });
              } finally {
                evidence.elapsedMs = Math.round(performance.now() - startedStep);
              }
              if (evidence.status === 'failed') break;
            }
          }
          if (capture) {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
            const filename = `scenario-${String(index + 1).padStart(2, '0')}-${slug || 'state'}.png`;
            try {
              result.screenshot = await screenshot(page, artifactDirectory, filename);
            } catch (error) {
              report.runnerErrors.push({ scenario: name, kind: 'scenario-capture-error', error: message(error) });
            }
          }
        });
      } catch (error) {
        report.runnerErrors.push({ scenario: name, kind: 'browser-context-error', error: message(error) });
      }
      findingsFailures(result, { scenario: name }, report);
      result.status = report.runnerErrors.length > runnerErrorsBefore ? 'incomplete'
        : report.criticalFailures.length > failuresBefore ? 'failed' : 'passed';
      result.unrunSteps = steps.length - result.steps.length;
      await publish();
    }
    phase = 'source-readback';
    const finalSource = await fingerprint(siteDirectory);
    if (finalSource.sha256 !== report.source.site.sha256) {
      report.runnerErrors.push({ phase, kind: 'source-changed', finalSha256: finalSource.sha256 });
    }
  } catch (error) {
    report.runnerErrors.push({ phase, kind: failureKind, error: message(error) });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        report.runnerErrors.push({ phase: 'cleanup', kind: 'browser-close-error', error: message(error) });
      }
    }
    if (server) {
      await new Promise((resolveClose) => {
        server.close((error) => {
          if (error) report.runnerErrors.push({ phase: 'cleanup', kind: 'server-close-error', error: message(error) });
          resolveClose();
        });
        server.closeAllConnections();
      });
    }
    report.timing.completedAt = new Date().toISOString();
    report.timing.elapsedMs = Math.round(performance.now() - started);
    report.status = report.runnerErrors.length ? 'incomplete' : report.criticalFailures.length ? 'failed' : 'passed';
    await publish();
  }
  console.log(JSON.stringify({
    status: report.status,
    report: reportPath,
    criticalFailures: report.criticalFailures.length,
    runnerErrors: report.runnerErrors.length,
  }));
  return { passed: 0, failed: 1, incomplete: 2 }[report.status];
}

const args = process.argv.slice(2);
if (args.length !== 3) {
  console.error('Usage: node capture.mjs <task-dir> <site-dir> <artifact-dir>');
  process.exitCode = 2;
} else {
  try {
    process.exitCode = await main(...args);
  } catch (error) {
    console.error(message(error));
    process.exitCode = 2;
  }
}
