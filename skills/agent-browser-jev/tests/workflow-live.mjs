// Real Jev + real agent-browser. No fixture selectors or expected steps enter the helper.
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {workflowPage,workflowIntent,workflowValues,workflowExpected} from './fixtures/workflow-pages.mjs';
import {configuredBrowser,configuredApiKey} from '../scripts/config.mjs';
const exec=promisify(execFile),{values}=parseArgs({options:{output:{type:'string'},binary:{type:'string'}}});
if(!values.output)throw Error('--output new-report.json required');
const binary=values.binary||configuredBrowser(),key=configuredApiKey(),output=resolve(values.output),skill=fileURLToPath(new URL('..',import.meta.url));
await mkdir(dirname(output),{recursive:true});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const root=await mkdtemp(join(tmpdir(),'jev-workflow-')),session='jev-workflow-'+randomUUID();
let events=[];const server=createServer(async(req,res)=>{if(req.url==='/events'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}res.setHeader('content-type','text/html');res.end(workflowPage(req.url));});
let origin;
const report={schema:1,version:JSON.parse(await readFile(join(skill,'package.json'),'utf8')).version,startedAt:new Date().toISOString(),sourceSha256:{},cases:[],cleanup:{}};
for(const file of ['scripts/controls.mjs','scripts/jev-browser.mjs','scripts/agent-browser-jev.mjs','scripts/run.mjs','tests/workflow-live.mjs','tests/fixtures/workflow-pages.mjs'])report.sourceSha256[file]=createHash('sha256').update(await readFile(join(skill,file))).digest('hex');
const browser=async args=>{const r=JSON.parse((await exec(binary,['--session',session,'--json',...args],{timeout:30000,maxBuffer:2e6})).stdout);if(!r.success)throw Error('Browser failed');return r.data;};
async function helper(args){let stdout,code=0;try{({stdout}=await exec(process.execPath,[join(skill,'scripts/run.mjs'),...args],{env:{...process.env,OPENROUTER_API_KEY:key},timeout:150000,maxBuffer:3e6}));}catch(e){stdout=e.stdout;code=e.code;}return {code,result:JSON.parse(stdout)};}
const startArgs=(route,intent)=>['--binary',binary,'--session',session,'--url',origin+route,'--intent',intent];
const addValues=Object.entries(workflowValues).flatMap(([k,v])=>['--value',k+'='+v]);
async function check(id,fn){const entry={id};report.cases.push(entry);events=[];try{await fn(entry);entry.verdict='passed';}catch(e){entry.verdict='failed';entry.failure=e.message;process.exitCode=1;}entry.events=structuredClone(events);await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({id,verdict:entry.verdict,reason:entry.runs?.at(-1)?.returnReason}));}
function record(entry,run){const published={...run.result,resumeToken:run.result.resumeToken?'[redacted]':null};(entry.runs??=[]).push(published);assert.equal(run.result.observation.fresh,true);}
async function verifyWorkflow(entry){entry.independentSnapshot=(await browser(['snapshot'])).snapshot;assert.match(entry.independentSnapshot,/Saved draft/);assert.doesNotMatch(entry.independentSnapshot,/Publish report/);assert.deepEqual(events.filter(e=>e.type==='save').map(e=>e.data),[workflowExpected]);assert.ok(!events.some(e=>e.type==='publish'));}
try{
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});origin='http://127.0.0.1:'+server.address().port;
report.browserVersion=(await exec(binary,['--version'])).stdout.trim();
await check('continuous-report-12-actions',async e=>{const r=await helper([...startArgs('/workflow',workflowIntent),...addValues],'continuous');record(e,r);assert.equal(r.code,0);assert.equal(r.result.returnReason,'reported_complete');await verifyWorkflow(e);});
await check('input-request-and-resume',async e=>{const first=await helper(startArgs('/workflow',workflowIntent));record(e,first);assert.equal(first.result.returnReason,'input_required');assert.equal(first.code,0);assert.equal(events.filter(x=>x.type==='save').length,0);const second=await helper(['--resume-token',first.result.resumeToken,...addValues]);record(e,second);assert.equal(second.code,0);await verifyWorkflow(e);assert.equal(events.filter(x=>x.type==='start').length,1);});
await check('budget-pause-and-resume',async e=>{const first=await helper([...startArgs('/workflow',workflowIntent),...addValues,'--max-actions','5']);record(e,first);assert.equal(first.result.returnReason,'action_budget');const second=await helper(['--resume-token',first.result.resumeToken,'--max-actions','30']);record(e,second);assert.equal(second.code,0);await verifyWorkflow(e);assert.equal(events.filter(x=>x.type==='start').length,1);});
await check('keyboard-search-and-back',async e=>{const r=await helper([...startArgs('/keyboard','Search guides for the supplied query, open the Recovery guide, then use browser back to return to Guides.'),'--value','query=recovery']);record(e,r);assert.equal(r.code,0);e.independentSnapshot=(await browser(['snapshot'])).snapshot;assert.match(e.independentSnapshot,/heading "Guides"/);assert.ok(r.result.actions.some(x=>x.operation==='press'));assert.ok(r.result.actions.some(x=>x.operation==='back'));assert.deepEqual(events,[{type:'search',query:'recovery'}]);});
await check('scroll-to-reveal-control',async e=>{const r=await helper(startArgs('/scroll','Scroll down to load the Continue button, activate it, and stop when Updates complete is visible.'));record(e,r);assert.equal(r.code,0);assert.ok(r.result.actions.some(x=>x.operation==='scroll'));assert.deepEqual(events,[{type:'continue'}]);assert.match((await browser(['snapshot'])).snapshot,/Updates complete/);});
}finally{try{await browser(['close']);report.cleanup.browserClosed=true;}catch{report.cleanup.browserClosed=false;}if(server.listening)await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});report.cleanup.serverClosed=!server.listening;report.cleanup.temporaryDirectoryRemoved=true;report.finishedAt=new Date().toISOString();report.verdict=report.cases.length===5&&report.cases.every(x=>x.verdict==='passed')&&report.cleanup.browserClosed?'passed':'failed';await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({verdict:report.verdict,output}));if(report.verdict!=='passed')process.exitCode=1;}
