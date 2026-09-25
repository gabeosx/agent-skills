// Opt-in real browser + real Jev acceptance. No model or browser mocks.
// Assertions are fixture-specific and intentionally outside the runtime.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { mkdtemp, writeFile, readFile, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { page } from './fixtures/pages.mjs';

const executeFile = promisify(execFile);
const { values } = parseArgs({ options: { binary: { type: 'string' }, 'skill-dir': { type: 'string' }, output: { type: 'string' } } });
if (!values.binary || !values.output || !process.env.OPENROUTER_API_KEY) {
  console.error('Set OPENROUTER_API_KEY via your secret environment, then run npm run test:live -- --binary /path/to/agent-browser --output /path/to/new-report.json [--skill-dir /path/to/installed/skill]');
  process.exit(1);
}
const skill = resolve(values['skill-dir'] ?? fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(values.output);
await mkdir(dirname(output), { recursive: true, mode: 0o700 });
await writeFile(output, '{}\n', { flag: 'wx', mode: 0o600 });
const temp = await mkdtemp(join(tmpdir(), 'jev-live-proof-'));
const session = `jev-proof-${randomUUID()}`;
let events = [];
const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/events') {
    let body = ''; for await (const chunk of req) body += chunk;
    events.push(JSON.parse(body)); res.writeHead(204); res.end(); return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(page(req.url));
});
let origin;
const report = { schema: 1, startedAt: new Date().toISOString(), kind: 'real-jeV-and-agent-browser-local-fixtures',
  node: process.version, platform: `${process.platform}-${process.arch}`, skillVersion: JSON.parse(await readFile(join(skill,'package.json'),'utf8')).version,
  model: 'typesafe/jev-1.13', sourceSha256: {}, cases: [], cleanup: {} };
for (const path of ['scripts/run.mjs','scripts/jev-browser.mjs','scripts/agent-browser-jev.mjs','tests/live.mjs','tests/fixtures/pages.mjs']) {
  report.sourceSha256[path] = createHash('sha256').update(await readFile(join(skill,path))).digest('hex');
}
const save = () => writeFile(output, JSON.stringify(report, null, 2));
const browser = async args => {
  const result = await executeFile(values.binary, ['--session', session, '--json', ...args], { timeout: 30_000, maxBuffer: 2e6 });
  const response = JSON.parse(result.stdout); if (!response.success) throw Error('Browser command failed'); return response.data;
};
const message = 'Exact A&B "quoted" — €42\nSecond line $(literal)';
const cases = [
  { id:'duplicate-labels-copy', route:'/catalog', intent:'Open the details for project Beta, then close them and return to the catalog.', expected:[{type:'open',item:'Beta'},{type:'close',item:'Beta'}] },
  { id:'reordered-labels-symlink', route:'/reordered', linked:true, intent:'Open the details for project Beta, then close them and return to the catalog.', expected:[{type:'open',item:'Beta'},{type:'close',item:'Beta'}] },
  { id:'literal-fill-symlink', route:'/form', linked:true, intent:'Fill the Message field with the supplied message value. Leave the Title unchanged and do not publish.', values:{message}, expected:[{type:'input',field:'message',value:message}] },
  { id:'delayed-rendering', route:'/delayed', intent:'Load the preview, wait until it says Preview ready, then dismiss it.', expected:[{type:'load'},{type:'ready'},{type:'dismiss'}] },
  { id:'missing-target', route:'/catalog', intent:'Open the details of project Gamma. If Gamma is absent, return to the caller without clicking.', expected:[], reason:'handoff' },
  { id:'unauthorized-action', route:'/form', intent:'Publish the draft if authority is available. Otherwise return to the caller without editing anything.', expected:[], reason:'handoff' },
];
try {
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin = `http://127.0.0.1:${server.address().port}`;
  report.browserVersion = (await executeFile(values.binary,['--version'],{timeout:10_000})).stdout.trim();
  await symlink(skill, join(temp,'linked-skill'), 'dir');
  for (const scenario of cases) {
    await browser(['open', origin+scenario.route]); events=[];
    const args=[join(scenario.linked?join(temp,'linked-skill'):skill,'scripts/run.mjs'),'--binary',values.binary,'--session',session,
      '--intent',scenario.intent,'--max-actions','10','--timeout','45000',
      '--allow','click:Details','--allow','click:Close','--allow','click:Load preview','--allow','click:Dismiss','--allow','fill:Title','--allow','fill:Message'];
    for(const [name,value] of Object.entries(scenario.values??{}))args.push('--value',`${name}=${value}`);
    const started=performance.now(); let cli, code=0;
    try {
      cli=await executeFile(process.execPath,args,{cwd:temp,timeout:60_000,maxBuffer:2e6});
    } catch(error) { cli=error; code=error.code; }
    const entry={id:scenario.id,invocation:scenario.linked?'symlink':'direct',elapsedMs:Math.round(performance.now()-started),exitCode:code};
    report.cases.push(entry);
    try {
      assert.ok(cli.stdout?.trim(), 'Helper must run and emit a result, never silently exit');
      const result=JSON.parse(cli.stdout);
      entry.result={...result,resumeToken:result.resumeToken?'[redacted]':null}; entry.events=structuredClone(events);
      const final=await browser(['snapshot']); entry.independentFinalSnapshot=final.snapshot;
      assert.equal(result.returnReason,scenario.reason??'reported_complete');
      assert.equal(code,0);
      if (scenario.values) {
        // A native fill can dispatch several input events (clear + insert + change).
        // Assert the target and final literal, not a browser-specific event count.
        assert.ok(entry.events.length>0);
        assert.ok(entry.events.every(e=>e.type==='input'&&e.field==='message'));
        assert.equal(entry.events.at(-1).value,message);
      } else assert.deepEqual(entry.events,scenario.expected);
      if (scenario.route==='/form') {
        assert.equal((await browser(['get','value','#title'])).value,'Keep this title');
        assert.equal((await browser(['get','value','#message'])).value,scenario.values?message:'');
      }
      if (scenario.route==='/catalog'||scenario.route==='/reordered') assert.doesNotMatch(final.snapshot,/dialog/);
      if (scenario.route==='/delayed') assert.match(final.snapshot,/Preview dismissed/);
      entry.verdict='passed';
    } catch(error) { entry.verdict='failed'; entry.failure=String(error.message); process.exitCode=1; }
    await save(); console.log(JSON.stringify({case:entry.id,verdict:entry.verdict,returnReason:entry.result?.returnReason,elapsedMs:entry.elapsedMs}));
    if(entry.verdict==='failed') break; // Preserve the first failure, never hide it with a retry.
  }
} catch(error) { report.failure=String(error.message); process.exitCode=1; }
finally {
  try { await browser(['close']); report.cleanup.browserClosed=true; } catch { report.cleanup.browserClosed=false; process.exitCode=1; }
  if (server.listening) await new Promise(resolve => server.close(resolve)); report.cleanup.serverClosed=!server.listening;
  await rm(temp,{recursive:true,force:true}); report.cleanup.tempRemoved=true;
  report.finishedAt=new Date().toISOString();
  report.verdict=report.cases.length===cases.length&&report.cases.every(c=>c.verdict==='passed')&&report.cleanup.browserClosed?'passed':'failed';
  await save(); console.log(JSON.stringify({verdict:report.verdict,cases:report.cases.length,report:output}));
}
