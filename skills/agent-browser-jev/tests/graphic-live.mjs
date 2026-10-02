#!/usr/bin/env node
// Self-authored graphic-text control counterexamples; server effects and readback verify outcomes.
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
const report={kind:'self-authored-graphic-text-pairs',startedAt:new Date().toISOString(),model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const arm of ['baseline','candidate']){
 const dir=resolve(values[`${arm}-dir`]);helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')).href);report.sourceSha256[arm]={};
 for(const file of (await readdir(join(dir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[arm][`scripts/${file}`]=createHash('sha256').update(await readFile(join(dir,'scripts',file))).digest('hex');
}
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const execute=promisify(execFile),sessionId=`jev-graphic-${randomUUID()}`;
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser command failed');return r.data;};
const definitions=[
 {id:'named-sequence',goal:'Click Aster, then Birch, in the diagram.',labels:['Birch','Cedar','Aster'],expected:['Aster','Birch']},
 {id:'reordered-sequence',goal:'Select the diagram nodes Birch and then Aster, in that order.',labels:['Aster','Cedar','Birch'],expected:['Birch','Aster'],reverse:true},
 {id:'ascending-values',goal:'Click all diagram values from smallest to largest.',labels:['12','-2','3'],expected:['-2','3','12']},
 {id:'single-branch',goal:'Open the diagram node named Cedar.',labels:['Aster','Cedar','Birch'],expected:['Cedar']},
 {id:'duplicate-text',goal:'Click Aster in the diagram.',labels:['Aster','Birch'],expected:[],duplicate:true,negative:true},
 {id:'absent-node',goal:'Select the diagram node Larch.',labels:['Aster','Birch'],expected:[],negative:true},
];
const selected=values.cases?definitions.filter(d=>values.cases.split(',').includes(d.id)):definitions;
if(!selected.length||values.cases&&selected.length!==values.cases.split(',').length)throw Error('Unknown case');
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{
 if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}
 const labels=active.labels;
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(`<h1>Diagram</h1>${active.duplicate?'<p>Aster</p>':''}<svg width="500" height="240">${labels.map((label,i)=>`<text x="${30+i*140}" y="${active.reverse?150:75}" font-size="24">${label}</text>`).join('')}</svg><p role="status" id="status">No nodes selected.</p><script>
 let count=0;for(const el of document.querySelectorAll('svg text'))el.addEventListener('click',async()=>{const value=el.textContent;await fetch('/event',{method:'POST',body:JSON.stringify({value})});el.remove();count++;document.getElementById('status').textContent='Selected '+value+'. '+(count===${active.expected.length}?'Selection complete.':'Continue the requested sequence.');});
 </script>`);

});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 for(const [index,definition] of selected.entries())for(const arm of index%2?['candidate','baseline']:['baseline','candidate']){
  if(Date.now()+90000>deadline||spent+.04>maxUsd)throw Error('Insufficient allowance for another arm');
  active=definition;events=[];const trace=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  const helper=helpers[arm],raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:active.goal,suppliedValues:{},budget:{maxActions:16,maxDecisions:70,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});
  const result=helper.summarize(raw,null),snapshot=(await browser(['snapshot'])).snapshot;
  const scopeCorrect=events.every((e,i)=>e.value===active.expected[i]);
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
