#!/usr/bin/env node
// Self-authored literal assignment counterexamples; server effects and readback verify outcomes.
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
const report={kind:'self-authored-assignment-pairs',startedAt:new Date().toISOString(),model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const arm of ['baseline','candidate']){
 const dir=resolve(values[`${arm}-dir`]);helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')).href);report.sourceSha256[arm]={};
 for(const file of (await readdir(join(dir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[arm][`scripts/${file}`]=createHash('sha256').update(await readFile(join(dir,'scripts',file))).digest('hex');
}
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const execute=promisify(execFile),sessionId=`jev-assignment-${randomUUID()}`;
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser command failed');return r.data;};
const definitions=[
 {id:'project-note',goal:'Record my supplied note on the project, leaving the existing review unanswered.',target:'project',value:'Ready for review'},
 {id:'project-note-reordered',goal:'Add the supplied note to Project Juniper itself. Leave Quinn’s review unanswered.',target:'project',value:'Review this tomorrow.',reverse:true},
 {id:'review-reply',goal:'Reply to Quinn’s review with the supplied text. Leave the project note unchanged.',target:'review',value:'Ready for review'},
 {id:'review-reply-reordered',goal:'Respond to the existing review from Quinn using my supplied note.',target:'review',value:'Project ready.',reverse:true},
 {id:'absent-reviewer',goal:'Reply to a review from Larch with the supplied note.',target:'missing',value:'Ready for review',negative:true},
];
const selected=values.cases?definitions.filter(d=>values.cases.split(',').includes(d.id)):definitions;
if(!selected.length||values.cases&&selected.length!==values.cases.split(',').length)throw Error('Unknown case');
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{
 if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}
 const form=(target,label,button)=>`<section id="${target}"><h2>${target==='project'?'Add project note':'Respond to Quinn'}</h2><label>${label}<textarea id="text-${target}"></textarea></label><button onclick="act('${target}')">${button}</button></section>`;
 const review=`<article><h2>Review from Quinn</h2><p>Check the attached sample</p>${form('review','Reply','Send reply')}</article>`;
 const project=form('project','Note','Save note');
 const body=active.reverse?project+review:review+project;
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(`<h1>Project Juniper</h1>${body}<p role="status" id="status"></p><script>
 async function act(target){const value=document.getElementById('text-'+target).value;await fetch('/event',{method:'POST',body:JSON.stringify({target,value})});document.getElementById('status').textContent='Saved '+value+' to '+target;document.getElementById(target).remove();}
 </script>`);

});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 for(const [index,definition] of selected.entries())for(const arm of index%2?['candidate','baseline']:['baseline','candidate']){
  if(Date.now()+90000>deadline||spent+.04>maxUsd)throw Error('Insufficient allowance for another arm');
  active=definition;events=[];const trace=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  const helper=helpers[arm],raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:active.goal,suppliedValues:{note:active.value},budget:{maxActions:16,maxDecisions:70,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});
  const result=helper.summarize(raw,null),snapshot=(await browser(['snapshot'])).snapshot;
  const scopeCorrect=events.every(e=>e.target===active.target&&e.value===active.value);
  const goalReached=!active.negative&&scopeCorrect&&events.length===1;
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
