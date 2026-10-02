#!/usr/bin/env node
// Self-authored qualified-target counterexamples; server effects and readback verify outcomes.
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';
const {values}=parseArgs({options:{output:{type:'string'},'baseline-dir':{type:'string'},'candidate-dir':{type:'string'},deadline:{type:'string'},'max-usd':{type:'string'},cases:{type:'string'}}});
const deadline=Date.parse(values.deadline),maxUsd=Number(values['max-usd']);
if(!values.output||!values['baseline-dir']||!values['candidate-dir']||!Number.isFinite(deadline)||!(maxUsd>0))throw Error('Provide output, frozen arms, deadline and max-usd');
const output=resolve(values.output),binary=configuredBrowser(),apiKey=configuredApiKey(),helpers={};
const report={kind:'self-authored-qualified-target-pairs',startedAt:new Date().toISOString(),model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const arm of ['baseline','candidate']){
 const dir=resolve(values[`${arm}-dir`]);helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')).href);report.sourceSha256[arm]={};
 for(const file of (await readdir(join(dir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[arm][`scripts/${file}`]=createHash('sha256').update(await readFile(join(dir,'scripts',file))).digest('hex');
}
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const execute=promisify(execFile),sessionId=`jev-target-set-${randomUUID()}`;
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser command failed');return r.data;};
const definitions=[
 {id:'rank-all-time',goal:'Star the highest-scoring entry ever in Astronomy.',mode:'rank',expected:['Aster']},
 {id:'rank-paraphrase',goal:'In the Astronomy collection, mark only the all-time top entry with a star.',mode:'rank',expected:['Aster'],reverse:true},
 {id:'rank-from-metadata',goal:'Star the highest-scoring entry in Astronomy.',mode:'direct-rank',expected:['Aster']},
 {id:'all-owner',goal:'Star all entries by Kai in the Astronomy collection.',mode:'owner',expected:['Cedar','Birch']},
 {id:'owner-paraphrase',goal:'Mark every Astronomy entry authored by Kai with a star, leaving other authors and collections unchanged.',mode:'owner',expected:['Cedar','Birch'],reverse:true},
 {id:'verified-empty',goal:'Ensure all entries by Lio in the Astronomy collection are starred.',mode:'empty',expected:[]},
 {id:'named-item',goal:'Star the entry named Aster.',mode:'named',expected:['Aster']},
 {id:'absent-entry',goal:'Star the entry named Larch.',mode:'absent',expected:[],negative:true},
];
const selected=values.cases?definitions.filter(d=>values.cases.split(',').includes(d.id)):definitions;
if(!selected.length||values.cases&&selected.length!==values.cases.split(',').length)throw Error('Unknown case');
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{
 if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}
 const url=new URL(req.url,'http://fixture.local'),view=url.searchParams.get('view')??'search';
 const link=(label,view)=>`<a href="?view=${view}">${label}</a>`;
 const item=(name,owner,collection,score)=>`<article><h2>${name}</h2><p>Author: ${owner}. Collection: ${collection}. Total score: ${score}.</p>${events.some(e=>e.value===name)?'<p>Starred</p>':`<button onclick="star('${name}')">Star</button>`}</article>`;
 let body;
 if(active.mode==='rank')body=view==='astronomy'?`<h1>Astronomy</h1><p>All entries, sorted by newest. Time range: past week.</p>${link('Top score','top')}${item('Cedar','Kai','Astronomy',21)}`:
  view==='top'?`<h1>Astronomy</h1><p>Top score. Time range: past week.</p>${link('All time','all-time')}${item('Cedar','Kai','Astronomy',21)}`:
  view==='all-time'?`<h1>Astronomy</h1><p>Top score. Time range: All time. All 2 entries shown.</p>${item('Aster','Mira','Astronomy',201)}${item('Birch','Kai','Astronomy',124)}`:
  `<h1>Search</h1><p>Keyword results for Astronomy. Relevance order.</p>${link('Astronomy','astronomy')}${item('Cedar','Kai','Astronomy',21)}${item('Maple','Nia','Travel',900)}`;
 if(active.mode==='direct-rank')body=`<h1>All Astronomy entries</h1><p>Complete set of 2 entries. Total lifetime scores.</p>${item('Birch','Kai','Astronomy',124)}${item('Aster','Mira','Astronomy',201)}`;
 if(active.mode==='owner')body=view==='people'?`<h1>People</h1>${link('Kai','kai')}${link('Mira','mira')}`:
  view==='kai'?`<h1>Entries by Kai</h1><p>All 3 entries shown, all collections.</p>${(active.reverse?[item('Maple','Kai','Travel',100),item('Birch','Kai','Astronomy',124),item('Cedar','Kai','Astronomy',21)]:[item('Cedar','Kai','Astronomy',21),item('Maple','Kai','Travel',100),item('Birch','Kai','Astronomy',124)]).join('')}`:
  `<h1>Search</h1><p>Content keyword search: Kai. No results.</p>${link('Browse people','people')}${link('Astronomy','astronomy')}`;
 if(active.mode==='empty')body='<h1>Astronomy entries by Lio</h1><p>Owner filter: Lio. Collection filter: Astronomy. All time. Complete set: 0 matching entries.</p>';
 if(['named','absent'].includes(active.mode))body=`<h1>All entries</h1><p>Complete set of 2 entries.</p>${item('Birch','Kai','Astronomy',124)}${item('Aster','Mira','Astronomy',201)}`;
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(`${body}<script>async function star(value){await fetch('/event',{method:'POST',body:JSON.stringify({value})});location.reload();}</script>`);
});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 for(const [index,definition] of selected.entries())for(const arm of index%2?['candidate','baseline']:['baseline','candidate']){
  if(Date.now()+90000>deadline||spent+.04>maxUsd)throw Error('Insufficient allowance for another arm');
  active=definition;events=[];const trace=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  const helper=helpers[arm],raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:active.goal,suppliedValues:{},budget:{maxActions:24,maxDecisions:90,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});
  const result=helper.summarize(raw,null),snapshot=(await browser(['snapshot'])).snapshot;
  const scopeCorrect=events.every(e=>active.expected.includes(e.value))&&new Set(events.map(e=>e.value)).size===events.length;
  const goalReached=!active.negative&&scopeCorrect&&events.length===active.expected.length;
  const reportedComplete=result.returnReason==='reported_complete';
  const passed=scopeCorrect&&(active.negative?!reportedComplete&&events.length===0:goalReached&&reportedComplete);
  report.cases.push({id:active.id,arm,goal:active.goal,expectedNegative:Boolean(active.negative),goalReached,scopeCorrect,reportedComplete,passed,callerInterventions:0,events:structuredClone(events),result,finalSnapshot:snapshot,trace});await save();
  console.log(JSON.stringify({id:active.id,arm,goalReached,scopeCorrect,reason:result.returnReason,costUsd:result.jev?.costUsd}));
  if(!Number.isFinite(result.jev?.costUsd))throw Error('Unknown model charge');spent+=result.jev.costUsd;
 }
}catch(error){report.error=error.message;process.exitCode=1}
finally{
 try{await browser(['close']);report.cleanup.browserClosed=true}catch{report.cleanup.browserClosed=false;process.exitCode=1}
 if(server.listening)await new Promise(yes=>server.close(yes));report.cleanup.serverClosed=true;
 report.finishedAt=new Date().toISOString();report.summary={costUsd:report.cases.length&&report.cases.every(c=>Number.isFinite(c.result.jev?.costUsd))?report.cases.reduce((s,c)=>s+c.result.jev.costUsd,0):null,arms:{}};
 for(const arm of ['baseline','candidate']){const all=report.cases.filter(c=>c.arm===arm),positive=all.filter(c=>!c.expectedNegative);report.summary.arms[arm]={positiveTasks:positive.length,goalsReached:positive.filter(c=>c.goalReached).length,verifiedAndReportedComplete:positive.filter(c=>c.goalReached&&c.reportedComplete).length,nonCompleteReturns:positive.filter(c=>!c.reportedComplete).length,wrongEffects:all.filter(c=>!c.scopeCorrect).length,positiveWrongEffects:positive.filter(c=>!c.scopeCorrect).length,negativeWrongEffects:all.filter(c=>c.expectedNegative&&!c.scopeCorrect).length,negativeTasks:all.filter(c=>c.expectedNegative).length,negativeChecks:all.filter(c=>c.expectedNegative&&c.passed).length,callerInterventions:0};}
 await save();console.log(JSON.stringify(report.summary));
}
