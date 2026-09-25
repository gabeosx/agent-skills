// Fresh repeated measurements of the public default CLI, with independent assertions.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { benchmarkPage } from './fixtures/benchmark-pages.mjs';
import { configuredApiKey, configuredBrowser } from '../scripts/config.mjs';

const execute = promisify(execFile);
const { values } = parseArgs({ options: { binary:{type:'string'}, output:{type:'string'}, rounds:{type:'string',default:'5'} } });
const rounds = Number(values.rounds);
if (!values.output || !Number.isSafeInteger(rounds) || rounds < 1 || rounds > 100) throw new Error('Use --output new-report.json [--rounds 5] [--binary /path/to/agent-browser]');
configuredApiKey(); // Fail before starting the server if setup is incomplete.
const binary = values.binary || configuredBrowser();
const skill = fileURLToPath(new URL('..',import.meta.url));
const output = resolve(values.output);
await mkdir(dirname(output),{recursive:true,mode:0o700});
await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const temporary = await mkdtemp(join(tmpdir(),'jev-benchmark-'));
const session = `jev-benchmark-${randomUUID()}`;
let events=[];
const server=createServer(async(req,res)=>{
  if(req.method==='POST' && req.url==='/events'){
    let body='';for await(const chunk of req)body+=chunk;
    events.push(JSON.parse(body));res.writeHead(204);res.end();return;
  }
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(benchmarkPage(req.url));
});
const scenarios = [
  {id:'help-article',label:'Open Returns article and go back',route:'/articles',intent:'Read the Returns article, then go back to the article list.',expected:[{type:'article',article:'Returns'},{type:'back',article:'Returns'}]},
  {id:'reordered-articles',label:'Choose Warranty after articles reorder',route:'/reordered',intent:'Read the Warranty article, then go back to the article list.',expected:[{type:'article',article:'Warranty'},{type:'back',article:'Warranty'}]},
  {id:'support-draft',label:'Fill two fields without sending',route:'/support',intent:'Fill Subject with the supplied subject and Message with the supplied message. Leave the request as a draft; do not send it.',values:{subject:'Delivery question',message:'Please check order #42 — "blue" & green.\nThank you!'}},
  {id:'preferences',label:'Open settings, enable email and save',route:'/preferences',intent:'Open notification settings, enable Email updates, and save preferences.',expected:[{type:'open-settings'},{type:'email',enabled:true},{type:'save',email:true}]},
  {id:'search-topic',label:'Search, open matching result and return',route:'/search',intent:'Search topics using the supplied query, open Account recovery, then go back to the results.',values:{query:'account'}},
  {id:'missing-article',label:'Return control when article is absent',route:'/articles',intent:'Read the Billing article. If it is not listed, return to the caller without clicking.',expected:[],reason:'handoff'},
];
const report={schema:1,startedAt:new Date().toISOString(),version:JSON.parse(await readFile(join(skill,'package.json'),'utf8')).version,
  model:'typesafe/jev-1.13',sdk:'1.3.2',node:process.version,platform:`${process.platform}-${process.arch}`,rounds,
  mode:'Default permissive CLI; no task file, custom policy, browser mocks or provider mocks',sourceSha256:{},trials:[],cleanup:{}};
for(const path of ['scripts/run.mjs','scripts/config.mjs','scripts/setup.mjs','scripts/jev-browser.mjs','scripts/agent-browser-jev.mjs','tests/benchmark.mjs','tests/fixtures/benchmark-pages.mjs']){
  report.sourceSha256[path]=createHash('sha256').update(await readFile(join(skill,path))).digest('hex');
}
const save=()=>writeFile(output,JSON.stringify(report,null,2));
const browser=async args=>{
  const {stdout}=await execute(binary,['--session',session,'--json',...args],{timeout:30_000,maxBuffer:2e6});
  const response=JSON.parse(stdout);if(!response.success)throw new Error('Browser operation failed');return response.data;
};
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  report.browserVersion=(await execute(binary,['--version'])).stdout.trim();
  for(let round=1;round<=rounds;round++)for(const scenario of scenarios){
    const trial={id:scenario.id,label:scenario.label,round};report.trials.push(trial);
    try{
      await browser(['open',origin+scenario.route]);events=[];
      const resultPath=join(temporary,`${round}-${scenario.id}.json`);
      const args=[join(skill,'scripts/run.mjs'),'--binary',binary,'--session',session,'--intent',scenario.intent,'--output',resultPath];
      for(const [name,value]of Object.entries(scenario.values??{}))args.push('--value',`${name}=${value}`);
      let command,code=0;const start=performance.now();
      try{command=await execute(process.execPath,args,{cwd:temporary,timeout:75_000,maxBuffer:2e6});}
      catch(error){command=error;code=error.code;}
      trial.elapsedMs=Math.round(performance.now()-start);trial.exitCode=code;
      assert.ok(command.stdout?.trim(),'CLI must emit a result');
      trial.result=JSON.parse(await readFile(resultPath,'utf8'));
      trial.finalSnapshot=(await browser(['snapshot'])).snapshot;
      trial.events=structuredClone(events);
      assert.equal(trial.result.returnReason,scenario.reason??'reported_complete');
      assert.equal(code,scenario.reason?2:0);
      if(scenario.expected)assert.deepEqual(trial.events,scenario.expected);
      if(scenario.id==='support-draft'){
        trial.readbacks={subject:(await browser(['get','value','#subject'])).value,message:(await browser(['get','value','#message'])).value};
        assert.deepEqual(trial.readbacks,scenario.values);
        assert.ok(trial.events.length>=2);
        assert.ok(trial.events.every(e=>e.type==='input'&&['subject','message'].includes(e.field)));
      }
      if(scenario.id==='search-topic'){
        trial.readbacks={query:(await browser(['get','value','#search'])).value};
        assert.equal(trial.readbacks.query,scenario.values.query);
        assert.deepEqual(trial.events.filter(e=>e.type!=='search'),[{type:'topic',name:'Account recovery'},{type:'close-topic'}]);
        assert.equal(trial.events.filter(e=>e.type==='search').at(-1)?.value,'account');
      }
      assert.doesNotMatch(trial.finalSnapshot,/dialog/);
      if(scenario.id==='preferences')assert.match(trial.finalSnapshot,/Preferences saved/);
      trial.verdict='passed';
    }catch(error){trial.verdict='failed';trial.failure=String(error.message);process.exitCode=1;}
    await save();console.log(JSON.stringify({round,id:trial.id,verdict:trial.verdict,elapsedMs:trial.elapsedMs}));
  }
}catch(error){report.failure=String(error.message);process.exitCode=1;}
finally{
  try{await browser(['close']);report.cleanup.browserClosed=true;}catch{report.cleanup.browserClosed=false;process.exitCode=1;}
  if(server.listening)await new Promise(resolve=>server.close(resolve));report.cleanup.serverClosed=true;
  await rm(temporary,{recursive:true,force:true});report.cleanup.temporaryFilesRemoved=true;
  const median=values=>{const a=values.toSorted((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
  report.summary=scenarios.map(s=>{
    const trials=report.trials.filter(t=>t.id===s.id), times=trials.filter(t=>Number.isFinite(t.elapsedMs)).map(t=>t.elapsedMs);
    const costs=trials.map(t=>{const ds=t.result?.decisions;return ds?.length&&ds.every(d=>Number.isFinite(d.cost))?ds.reduce((sum,d)=>sum+d.cost,0):null;});
    return {id:s.id,label:s.label,passed:trials.filter(t=>t.verdict==='passed').length,total:trials.length,
      medianMs:times.length?median(times):null,minMs:times.length?Math.min(...times):null,maxMs:times.length?Math.max(...times):null,
      meanCostUsd:costs.length&&costs.every(c=>c!==null)?costs.reduce((a,b)=>a+b,0)/costs.length:null,
      decisions:trials.reduce((sum,t)=>sum+(t.result?.decisions.length??0),0)};
  });
  report.finishedAt=new Date().toISOString();
  report.verdict=report.trials.length===rounds*scenarios.length&&report.trials.every(t=>t.verdict==='passed')&&report.cleanup.browserClosed?'passed':'failed';
  await save();console.log(JSON.stringify({verdict:report.verdict,trials:report.trials.length,report:output,summary:report.summary}));
}
