# UX Designer browser benchmark harness

Run the harness with Node.js 20 or later. Install pinned dependencies and the Playwright Chromium build from this directory.

```sh
npm ci
npx playwright install chromium
npm run qualify -- /tmp/ux-benchmark-qualification
```

The harness uses bundled Chromium when installed, with an installed Google Chrome fallback on macOS. Set `UX_BENCHMARK_CHROMIUM` to an executable path to choose a particular build. The report records the effective path and browser version. Capture requires permission to launch Chromium and bind a server to `127.0.0.1`.

```sh
node capture.mjs <task-dir> <site-dir> <fresh-artifact-dir>
```

Put the scenario manifest at `<task-dir>/checks.json` and a self-contained static implementation at `<site-dir>/index.html`. Keep the artifact directory outside the site directory. Use a fresh directory for each attempt. The read-only server serves the site directory on an ephemeral loopback port. The browser intercepts external page requests and WebSockets, and uses a new context for each viewport and scenario.

### Scenario manifest

```json
{
  "scenarios": [
    {
      "name": "Save changed preferences",
      "width": 390,
      "capture": true,
      "steps": [
        { "action": "select", "id": "density", "value": "compact" },
        { "action": "click", "id": "save" },
        { "action": "text", "id": "status", "value": "Preferences saved" },
        { "action": "attribute", "id": "status", "name": "role", "value": "status" }
      ]
    }
  ]
}
```

Every step addresses a `data-testid`. The reserved ID `root` addresses `body`. Available actions are `click`, `fill`, `select` (option value), `press` (Playwright key name), `visible`, `hidden`, `text` (case-sensitive substring after collapsing whitespace), `count` (exact nonnegative integer), and `attribute` (exact string or `null` for absence). Scenario widths of 1440, 834 and 390 use the corresponding standard viewport height. Other widths up to 4096 use a 1000px viewport height. Set `capture` to `true` to retain the page after the last successful action or first failed step.

### Capture evidence

- `desktop.png`, `tablet.png`, and `mobile.png` show the initial page at 1440×1000, 834×1112, and 390×844 viewport sizes. The images extend down the page and retain the viewport width.
- `scenario-XX-name.png` is optional scenario evidence. The report records each screenshot's SHA-256 and size.
- `report.json` records browser and runner configuration, elapsed time, the checks-file SHA-256, and sorted source-file fingerprints for the site and runner. Runner fingerprints cover `capture.mjs`, `package.json`, and `package-lock.json`. The site is fingerprinted again after capture to detect edits during the run.
- Per-viewport evidence includes document overflow, uncaught page errors, native browser dialogs, blocked requests, local HTTP errors and the initial-state axe WCAG 2.2 A/AA scan. Axe violations and rules requiring manual review remain in the report. Scenario results include each attempted step and observed assertion values. Visual review, scenario-state accessibility, and manual accessibility criteria require independent evaluation.

A successful capture exits **0**. A completed capture with a failed scenario, document-width overflow, uncaught page error, native browser dialog, failed navigation, or serious or critical axe violation exits **1**. Missing inputs or incomplete runner evidence exit **2**. See `criticalFailures` for product outcomes and `runnerErrors` for evidence or infrastructure errors.

Qualification uses the same CLI as benchmark captures. It verifies a form mutation through reload, fresh-context isolation for local storage, session storage, and cookies, network interception, a deliberate wrong result, page error, responsive overflow, axe violation, screenshot dimensions and fingerprints, and separate missing-site classification. It runs the positive fixture on both sides of the negative fixture. The generated `qualification.json` records the reports and their SHA-256 hashes.
