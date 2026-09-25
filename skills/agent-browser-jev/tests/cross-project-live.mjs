#!/usr/bin/env node
// Controlled live comparison: same local fixtures, provider, model and browser runtime.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { componentCases, componentPage } from './fixtures/component-pages.mjs';
import { configuredApiKey, configuredBrowser } from '../scripts/config.mjs';
import { OPENROUTER_DECISIONS_ENDPOINT, COMPARISON_MODEL, forvelaResult, currentResult, independentVerdict, comparisonSummary } from './cross-project-lib.mjs';

const execute=promisify(execFile);
const {values}=parseArgs({options:{output:{type:'string'},'competitor-dir':{type:'string'},binary:{type:'string'},cases:{type:'string'},rounds:{type:'string',default:'1'},help:{type:'boolean'}}});
if(values.help){console.log('node tests/cross-project-live.mjs --competitor-dir /path/to/forvela/jev-agent-browser --output /absolute/path/to/new-report.json [--cases accordion,tabs] [--rounds 1] [--binary /path/to/agent-browser]');process.exit(0)}
const rounds=Number(values.rounds),selectedIds=values.cases?.split(',').map(x=>x.trim()).filter(Boolean)??componentCases.map(x=>x.id);
if(!values.output||!values['competitor-dir']||!Number.isSafeInteger(rounds)||rounds<1||rounds>5||!selectedIds.length||new Set(selectedIds).size!==selectedIds.length||selectedIds.some(id=>!componentCases.some(x=>x.id===id)))throw new Error('Use --competitor-dir, a new --output, --rounds 1..5 and optional comma-separated case IDs');
const apiKey=configuredApiKey(),binary=values.binary||configuredBrowser(),skill=fileURLToPath(new URL('..',import.meta.url));
const competitor=resolve(values['competitor-dir']),competitorCli=join(competitor,'src/cli.js'),output=resolve(values.output);
await access(competitorCli);await access(join(competitor,'node_modules/@typesafe-ai/sdk'));
const competitorPackage=JSON.parse(await readFile(join(competitor,'package.json'),'utf8'));
if(competitorPackage.name!=='jev-agent-browser')throw new Error('The comparison adapter currently requires forvela/jev-agent-browser');
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const temporary=await mkdtemp(join(tmpdir(),'jev-cross-project-')),systems=['agent-browser-jev','forvela/jev-agent-browser'];
const fixturePdf=join(temporary,'example-contract.pdf');await writeFile(fixturePdf,'%PDF-1.4\n% synthetic cross-project fixture\n',{mode:0o600});
const sessions=Object.fromEntries(systems.map((system,index)=>[system,`jev-cross-${index}-${randomUUID()}`]));
let events=[];
const server=createServer(async(req,res)=>{
  if(req.method==='POST'&&req.url==='/events'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(componentPage(req.url));
});
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const git=async(...args)=>(await execute('git',['-C',competitor,...args])).stdout.trim();
const report={schema:1,kind:'cross-project-component-matrix',startedAt:new Date().toISOString(),rounds,selectedCases:selectedIds,
  claimBoundary:'A one-run functional snapshot on synthetic fixtures, not a reliability estimate or a general project ranking.',
  measurement:'Elapsed time covers each project invocation after the identical fixture page is opened. Verdicts use server-side state and the final browser snapshot, never either project completion claim.',
  controls:{provider:'OpenRouter Decisions',endpoint:OPENROUTER_DECISIONS_ENDPOINT,model:COMPARISON_MODEL,browserRuntime:'agent-browser',maxActionsOrSteps:45,timeoutMs:150000,order:'Alternates by case and round'},
  systems:{'agent-browser-jev':{version:JSON.parse(await readFile(join(skill,'package.json'),'utf8')).version,source:'working tree'},
    'forvela/jev-agent-browser':{version:competitorPackage.version,repository:competitorPackage.repository?.url,commit:await git('rev-parse','HEAD')}},
  credentialScope:{openRouter:true,typeSafeDirect:false},sourceSha256:{},trials:[],cleanup:{}};
for(const [label,path] of Object.entries({'current/tests/cross-project-live.mjs':fileURLToPath(import.meta.url),'current/tests/cross-project-lib.mjs':fileURLToPath(new URL('./cross-project-lib.mjs',import.meta.url)),'current/tests/fixtures/component-pages.mjs':join(skill,'tests/fixtures/component-pages.mjs'),'current/scripts/run.mjs':join(skill,'scripts/run.mjs'),'current/scripts/controls.mjs':join(skill,'scripts/controls.mjs'),'current/scripts/jev-browser.mjs':join(skill,'scripts/jev-browser.mjs'),'current/scripts/agent-browser-jev.mjs':join(skill,'scripts/agent-browser-jev.mjs'),'competitor/src/cli.js':competitorCli,'competitor/src/decision.js':join(competitor,'src/decision.js'),'competitor/src/loop.js':join(competitor,'src/loop.js'),'competitor/src/browser.js':join(competitor,'src/browser.js')}))report.sourceSha256[label]=await hash(path);
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const browser=async(system,args)=>{const {stdout}=await execute(binary,['--session',sessions[system],'--json',...args],{timeout:30_000,maxBuffer:3e6});const response=JSON.parse(stdout);if(!response.success)throw new Error('Browser operation failed');return response.data};
const invokeCurrent=async(definition,url)=>{
  const args=[join(skill,'scripts/run.mjs'),'--binary',binary,'--session',sessions[systems[0]],'--url',url,'--intent',definition.intent,'--max-actions','45','--timeout','150000'];
  for(const [name,value]of Object.entries(definition.values??{}))args.push('--value',`${name}=${value}`);
  let command,exitCode=0;try{command=await execute(process.execPath,args,{cwd:temporary,env:{...process.env,OPENROUTER_API_KEY:apiKey},timeout:170_000,maxBuffer:4e6})}catch(error){command=error;exitCode=Number.isSafeInteger(error.code)?error.code:null}
  const result=JSON.parse(command.stdout);return {exitCode,result:currentResult(result),stdout:command.stdout?.trim()};
};
const invokeCompetitor=async(definition,url)=>{
  const args=[competitorCli,'--url',url,'--goal',definition.intent,'--input-values-json',JSON.stringify(definition.values??{}),'--api-key-env','OPENROUTER_API_KEY','--endpoint',OPENROUTER_DECISIONS_ENDPOINT,'--decision-transport','fetch','--browser-command',binary,'--session',sessions[systems[1]],'--model',COMPARISON_MODEL,'--max-steps','45','--jsonl'];
  let command,exitCode=0;try{command=await execute(process.execPath,args,{cwd:competitor,env:{...process.env,OPENROUTER_API_KEY:apiKey},timeout:170_000,maxBuffer:8e6})}catch(error){command=error;exitCode=Number.isSafeInteger(error.code)?error.code:null}
  try{return {exitCode,result:forvelaResult(command.stdout)}}catch(error){throw new Error(`${error.message}${command.stderr?.trim()?`: ${command.stderr.trim().slice(0,500)}`:''}`,{cause:error})}
};
try{
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});const origin=`http://127.0.0.1:${server.address().port}`;
  report.browserVersion=(await execute(binary,['--version'])).stdout.trim();await save();
  let ordinal=0;
  for(let round=1;round<=rounds;round++)for(const definition of componentCases.filter(item=>selectedIds.includes(item.id))){
    const order=ordinal++%2?systems.toReversed():systems;
    for(const system of order){
      const runnable={...definition,values:Object.fromEntries(Object.entries(definition.values??{}).map(([name,value])=>[name,value==='__COMPONENT_FIXTURE_PDF__'?fixturePdf:value]))};
      const trial={round,id:definition.id,family:definition.family,system,intent:definition.intent,expected:definition.expected,startedAt:new Date().toISOString()};report.trials.push(trial);
      try{
        events=[];const url=`${origin}/components/${encodeURIComponent(definition.id)}`;
        const started=performance.now(),invocation=system===systems[0]?await invokeCurrent(runnable,url):await invokeCompetitor(runnable,url);
        trial.elapsedMs=Math.round(performance.now()-started);trial.exitCode=invocation.exitCode;trial.result=invocation.result;
        trial.finalSnapshot=(await browser(system,['snapshot'])).snapshot;trial.events=structuredClone(events);
        Object.assign(trial,independentVerdict(definition,{events:trial.events,finalSnapshot:trial.finalSnapshot,status:trial.result.status,finished:true}));
      }catch(error){trial.verdict='failed';trial.reason='runner-error';trial.failure=String(error.message)}
      trial.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({round,id:trial.id,system,verdict:trial.verdict,reason:trial.reason,elapsedMs:trial.elapsedMs}));
    }
  }
}catch(error){report.harnessFailure=String(error.message);process.exitCode=1}
finally{
  for(const system of systems){try{await browser(system,['close']);report.cleanup[`${system}:browserClosed`]=true}catch{report.cleanup[`${system}:browserClosed`]=false;process.exitCode=1}}
  if(server.listening)await new Promise(ok=>server.close(ok));report.cleanup.serverClosed=true;await rm(temporary,{recursive:true,force:true});report.cleanup.temporaryFilesRemoved=true;
  report.summary=comparisonSummary(report.trials,systems);report.finishedAt=new Date().toISOString();
  report.verdict=!report.harnessFailure&&report.trials.length===rounds*selectedIds.length*systems.length&&Object.values(report.cleanup).every(Boolean)?'completed':'incomplete';
  if(report.verdict!=='completed')process.exitCode=1;await save();console.log(JSON.stringify({verdict:report.verdict,report:output,summary:report.summary}));
}
