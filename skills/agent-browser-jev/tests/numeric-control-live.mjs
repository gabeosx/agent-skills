#!/usr/bin/env node
// Self-authored numeric-control counterexamples; server effects and readback verify outcomes.
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
const report={kind:'self-authored-numeric-control-pairs',startedAt:new Date().toISOString(),model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const arm of ['baseline','candidate']){
 const dir=resolve(values[`${arm}-dir`]);helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')).href);report.sourceSha256[arm]={};
 for(const file of (await readdir(join(dir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[arm][`scripts/${file}`]=createHash('sha256').update(await readFile(join(dir,'scripts',file))).digest('hex');
}
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const execute=promisify(execFile),sessionId=`jev-numeric-${randomUUID()}`;
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser command failed');return r.data;};
const definitions=[
 {id:'integer',goal:'Set Amount to 3 and save.',initial:0,step:1,target:3,save:true},
 {id:'negative',goal:'Set Amount to minus two and save.',initial:0,step:1,target:-2,save:true},
 {id:'fractional',goal:'Set Amount to 1.5 and save.',initial:0,step:.5,target:1.5,save:true},
 {id:'nonunit-step',goal:'Set Amount to six and save.',initial:2,step:2,target:6,save:true},
 {id:'preserve',goal:'Keep Amount at two. Leave the form unsaved.',initial:2,step:1,target:2,save:false},
 {id:'two-controls',goal:'Set Amount to two, leave Limit at five, and save.',initial:0,step:1,target:2,save:true,second:true},
 {id:'readonly',goal:'Set Amount to four and save.',initial:0,step:1,target:4,readonly:true,negative:true},
 {id:'unreachable',goal:'Set Amount to twelve and save.',initial:8,step:1,target:12,negative:true},
];
const selected=values.cases?definitions.filter(d=>values.cases.split(',').includes(d.id)):definitions;
if(!selected.length||values.cases&&selected.length!==values.cases.split(',').length)throw Error('Unknown case');
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{
 if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(`<h1>Numeric settings</h1><form><label>Amount<input id="amount" type="number" min="-10" max="10" step="${active.step}" value="${active.initial}" ${active.readonly?'readonly':''}></label>${active.second?'<label>Limit<input id="limit" type="number" value="5"></label>':''}<button>Save</button></form><p role="status" id="status"></p><script>
 document.querySelector('form').onsubmit=async e=>{e.preventDefault();const amount=Number(document.getElementById('amount').value),limit=document.getElementById('limit');await fetch('/event',{method:'POST',body:JSON.stringify({type:'save',amount,limit:limit?Number(limit.value):null})});document.getElementById('status').textContent='Saved Amount '+amount;document.querySelector('form').remove();};
 </script>`);
});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 for(const [index,definition] of selected.entries())for(const arm of index%2?['candidate','baseline']:['baseline','candidate']){
  if(Date.now()+90000>deadline||spent+.04>maxUsd)throw Error('Insufficient allowance for another arm');
  active=definition;events=[];const trace=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  const helper=helpers[arm],raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:active.goal,suppliedValues:{},budget:{maxActions:16,maxDecisions:70,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});
  const result=helper.summarize(raw,null),snapshot=(await browser(['snapshot'])).snapshot;
  const scopeCorrect=events.every(e=>active.save&&e.amount===active.target&&e.limit===(active.second?5:null));
  const goalReached=!active.negative&&scopeCorrect&&(active.save?events.length===1:events.length===0&&snapshot.includes(']: '+active.target));
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
 for(const arm of ['baseline','candidate']){const all=report.cases.filter(c=>c.arm===arm),positive=all.filter(c=>!c.expectedNegative);report.summary.arms[arm]={positiveTasks:positive.length,goalsReached:positive.filter(c=>c.goalReached).length,verifiedAndReportedComplete:positive.filter(c=>c.goalReached&&c.reportedComplete).length,nonCompleteReturns:positive.filter(c=>!c.reportedComplete).length,wrongEffects:positive.filter(c=>!c.scopeCorrect).length,negativeChecks:all.filter(c=>c.expectedNegative&&c.passed).length,callerInterventions:0};}
 await save();console.log(JSON.stringify(report.summary));
}
