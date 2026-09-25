#!/usr/bin/env node
// Real Jev + real browser coverage over a broad, local component matrix.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { componentCases, componentPage } from './fixtures/component-pages.mjs';
import { configuredApiKey, configuredBrowser } from '../scripts/config.mjs';

const execute=promisify(execFile);
const {values}=parseArgs({options:{output:{type:'string'},binary:{type:'string'},cases:{type:'string'},help:{type:'boolean'}}});
if(values.help){console.log('node tests/component-live.mjs --output /absolute/path/to/new-report.json [--cases accordion,tabs] [--binary /path/to/agent-browser]');process.exit(0)}
const selectedIds=values.cases?.split(',').map(x=>x.trim()).filter(Boolean)??componentCases.map(x=>x.id);
if(!values.output||!selectedIds.length||new Set(selectedIds).size!==selectedIds.length||selectedIds.some(id=>!componentCases.some(x=>x.id===id)))throw new Error('Use a new --output and optional comma-separated component case IDs');
configuredApiKey();
const skill=fileURLToPath(new URL('..',import.meta.url)),binary=values.binary||configuredBrowser(),output=resolve(values.output);
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const temporary=await mkdtemp(join(tmpdir(),'jev-components-')),session=`jev-components-${randomUUID()}`;
const fixturePdf=join(temporary,'example-contract.pdf');await writeFile(fixturePdf,'%PDF-1.4\n% synthetic component fixture\n',{mode:0o600});
let events=[];
const server=createServer(async(req,res)=>{
  if(req.method==='POST'&&req.url==='/events'){
    let body='';for await(const chunk of req)body+=chunk;
    events.push(JSON.parse(body));res.writeHead(204);res.end();return;
  }
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(componentPage(req.url));
});
const hash=async path=>createHash('sha256').update(await readFile(join(skill,path))).digest('hex');
const report={schema:1,kind:'component-matrix',version:JSON.parse(await readFile(join(skill,'package.json'),'utf8')).version,startedAt:new Date().toISOString(),model:'typesafe/jev-1.13',sdk:'1.3.2',node:process.version,platform:`${process.platform}-${process.arch}`,
  selectedCases:selectedIds,sourceBasis:[
    {name:'WAI-ARIA APG patterns',url:'https://www.w3.org/WAI/ARIA/apg/patterns/'},
    {name:'Base UI components',url:'https://base-ui.com/react/components'},
    {name:'Radix Primitives',url:'https://www.radix-ui.com/primitives'},
    {name:'MUI component inventory',url:'https://mui.com/material-ui/all-components/'},
    {name:'shadcn/ui component inventory',url:'https://ui.shadcn.com/docs/components'},
  ],
  measurement:'Elapsed time covers one helper invocation. Verdicts come from server-side events and the final browser snapshot, not Jev completion claims.',sourceSha256:{},cases:[],cleanup:{}};
for(const path of ['tests/component-live.mjs','tests/fixtures/component-pages.mjs','scripts/run.mjs','scripts/controls.mjs','scripts/jev-browser.mjs','scripts/agent-browser-jev.mjs'])report.sourceSha256[path]=await hash(path);
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const browser=async args=>{const {stdout}=await execute(binary,['--session',session,'--json',...args],{timeout:30_000,maxBuffer:2e6});const response=JSON.parse(stdout);if(!response.success)throw new Error('Browser operation failed');return response.data};
try{
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  const origin=`http://127.0.0.1:${server.address().port}`;
  report.browserVersion=(await execute(binary,['--version'])).stdout.trim();await save();
  for(const definition of componentCases.filter(x=>selectedIds.includes(x.id))){
    const trial={id:definition.id,family:definition.family,intent:definition.intent,expected:definition.expected,startedAt:new Date().toISOString()};report.cases.push(trial);
    try{
      await browser(['open',`${origin}/components/${encodeURIComponent(definition.id)}`]);events=[];
      const args=[join(skill,'scripts/run.mjs'),'--binary',binary,'--session',session,'--intent',definition.intent,'--max-actions','45','--timeout','150000'];
      for(const [name,value] of Object.entries(definition.values??{}))args.push('--value',`${name}=${value==='__COMPONENT_FIXTURE_PDF__'?fixturePdf:value}`);
      let command,exitCode=0;const started=performance.now();
      try{command=await execute(process.execPath,args,{cwd:temporary,timeout:170_000,maxBuffer:2e6})}catch(error){command=error;exitCode=Number.isSafeInteger(error.code)?error.code:null}
      trial.elapsedMs=Math.round(performance.now()-started);trial.exitCode=exitCode;
      assert.ok(command.stdout?.trim(),'Helper must emit a result');const result=JSON.parse(command.stdout);trial.result={...result,resumeToken:result.resumeToken?'[redacted]':null};
      trial.finalSnapshot=(await browser(['snapshot'])).snapshot;trial.events=structuredClone(events);
      assert.equal(trial.result.returnReason,definition.reason??'reported_complete');
      assert.equal(exitCode,0);
      if(definition.expected!==null){
        const completed=events.filter(x=>x.type==='complete'&&x.caseId===definition.id);
        assert.equal(completed.length,1,'fixture must record one completion');assert.deepEqual(completed[0].value,definition.expected);
        assert.match(trial.finalSnapshot,/recorded the requested state|Sync complete/);
      }else{
        assert.equal(events.some(x=>x.type==='complete'),false,'boundary case must not be completed');
      }
      trial.verdict='passed';
    }catch(error){trial.verdict='failed';trial.failure=String(error.message);process.exitCode=1}
    trial.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({id:trial.id,family:trial.family,verdict:trial.verdict,returnReason:trial.result?.returnReason,elapsedMs:trial.elapsedMs}));
  }
}catch(error){report.failure=String(error.message);process.exitCode=1}
finally{
  try{await browser(['close']);report.cleanup.browserClosed=true}catch{report.cleanup.browserClosed=false;process.exitCode=1}
  if(server.listening)await new Promise(ok=>server.close(ok));report.cleanup.serverClosed=true;
  await rm(temporary,{recursive:true,force:true});report.cleanup.temporaryFilesRemoved=true;
  const passed=report.cases.filter(x=>x.verdict==='passed').length,costs=report.cases.map(x=>x.result?.jev?.costUsd);
  report.summary={passed,total:report.cases.length,byFamily:Object.fromEntries([...new Set(report.cases.map(x=>x.family))].map(family=>{const items=report.cases.filter(x=>x.family===family);return[family,{passed:items.filter(x=>x.verdict==='passed').length,total:items.length}]})),jevCostUsd:costs.length&&costs.every(Number.isFinite)?costs.reduce((a,b)=>a+b,0):null};
  report.finishedAt=new Date().toISOString();report.verdict=passed===selectedIds.length&&report.cleanup.browserClosed?'passed':'failed';if(report.verdict!=='passed')process.exitCode=1;
  await save();console.log(JSON.stringify({verdict:report.verdict,report:output,summary:report.summary}));
}
