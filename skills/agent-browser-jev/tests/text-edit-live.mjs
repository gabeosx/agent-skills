#!/usr/bin/env node
// Self-authored append-preserving text-edit counterexamples; server effects and readback verify outcomes.
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';
const {values}=parseArgs({options:{output:{type:'string'},'baseline-dir':{type:'string'},'candidate-dir':{type:'string'},deadline:{type:'string'},'max-usd':{type:'string'},cases:{type:'string'},arms:{type:'string'}}});
const deadline=Date.parse(values.deadline),maxUsd=Number(values['max-usd']);
const plannedArms=values.arms?values.arms.split(','):['baseline','candidate'];
if(!plannedArms.length||new Set(plannedArms).size!==plannedArms.length||plannedArms.some(arm=>!['baseline','candidate'].includes(arm)))throw Error('Invalid arms');
if(!values.output||!values['baseline-dir']||!values['candidate-dir']||!Number.isFinite(deadline)||!(maxUsd>0))throw Error('Provide output, frozen arms, deadline and max-usd');
const output=resolve(values.output),binary=configuredBrowser(),apiKey=configuredApiKey(),helpers={};
const report={kind:'self-authored-text-edit-pairs',plannedArms,comparison:plannedArms.length===2?'paired':'unpaired explicit continuation',startedAt:new Date().toISOString(),model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const arm of ['baseline','candidate']){
 const dir=resolve(values[`${arm}-dir`]);helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')).href);report.sourceSha256[arm]={};
 for(const file of (await readdir(join(dir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[arm][`scripts/${file}`]=createHash('sha256').update(await readFile(join(dir,'scripts',file))).digest('hex');
}
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const execute=promisify(execFile),sessionId=`jev-text-edit-${randomUUID()}`;
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser command failed');return r.data;};
const definitions=[
 {id:'append-body',goal:'Add a line saying "Update: available Tuesday" to the existing Body, keeping its current content, and save.',old:'Original paragraph.',addition:'Update: available Tuesday',expected:'Original paragraph.\nUpdate: available Tuesday'},
 {id:'multiline-reordered',goal:'Append "Reviewed by the team" as a new line at the end of the Notes and save. Keep all existing notes.',label:'Notes',old:'First line\n  Indented line  \nLast line',addition:'Reviewed by the team',expected:'First line\n  Indented line  \nLast line\nReviewed by the team',reverse:true},
 {id:'trailing-newline',goal:'Add the line "Ready for review" to the existing Description and save.',label:'Description',old:'Current text\n',addition:'Ready for review',expected:'Current text\nReady for review'},
 {id:'replacement',goal:'Replace the entire Body with "New content only" and save.',old:'Discard this old body.',addition:'New content only',expected:'New content only'},
 {id:'already-present',goal:'Ensure the Body ends with the line "Reviewed by the team" and save. Do not add it again if present.',old:'Original paragraph.\nReviewed by the team',addition:'Reviewed by the team',expected:'Original paragraph.\nReviewed by the team'},
 {id:'empty-field',goal:'Add "First note" to the empty Notes and save.',label:'Notes',old:'',addition:'First note',expected:'First note'},
 {id:'missing-addition',goal:'Append my update to the Body and save.',old:'Preserve this paragraph.',negative:true},
 {id:'readonly-body',goal:'Add "Approved" on a new line to the Body and save.',old:'Preserve this paragraph.',addition:'Approved',readonly:true,negative:true},
];
const selected=values.cases?definitions.filter(d=>values.cases.split(',').includes(d.id)):definitions;
if(!selected.length||values.cases&&selected.length!==values.cases.split(',').length)throw Error('Unknown case');
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{
 if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}
 const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const body=`<label>${active.label??'Body'}<textarea id="body" ${active.readonly?'readonly':''}>${escape(active.old)}</textarea></label>`;
 const title='<label>Title<input id="title" value="Quarterly note"></label>';
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(`<h1>Edit note</h1><form>${active.reverse?body+title:title+body}<button>Save</button></form><script>
 const form=document.querySelector('form'),body=document.getElementById('body'),title=document.getElementById('title');
 let queue=Promise.resolve();const record=event=>queue=queue.then(()=>fetch('/event',{method:'POST',body:JSON.stringify(event)}));
 for(const el of [body,title])el.addEventListener('input',()=>record({kind:'input',field:el.id,value:el.value}));
 form.onsubmit=async event=>{event.preventDefault();await record({kind:'saved',body:body.value,title:title.value});const text=body.value;form.remove();const status=document.createElement('pre');status.textContent='Saved note. Body: '+text;document.body.append(status);};
 </script>`);
});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 for(const [index,definition] of selected.entries())for(const arm of (index%2?['candidate','baseline']:['baseline','candidate']).filter(arm=>plannedArms.includes(arm))){
  if(Date.now()+90000>deadline||spent+.04>maxUsd)throw Error('Insufficient allowance for another arm');
  active=definition;events=[];const trace=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  report.incompleteArm={id:active.id,arm,stage:'helper_started',chargeUnknown:true};await save();
  const helper=helpers[arm],raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:active.goal,suppliedValues:active.addition?{addition:active.addition}:{},budget:{maxActions:16,maxDecisions:70,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});
  const result=helper.summarize(raw,null);
  // Preserve paid work before any independent readback can fail. An incomplete
  // arm contributes charges, never an inferred goal or a complete comparison.
  report.incompleteArm={id:active.id,arm,stage:'awaiting_independent_readback',chargeUnknown:!Number.isFinite(result.jev?.costUsd),result,trace,events:structuredClone(events)};await save();
  const snapshot=(await browser(['snapshot'])).snapshot;
  const scopeCorrect=active.negative?events.length===0:events.every(e=>e.kind==='saved'?e.body===active.expected&&e.title==='Quarterly note':e.field==='body')&&trace.filter(t=>t.type==='action'&&t.action.op==='fill').every(t=>t.action.value===active.expected&&t.action.name===(active.label??'Body'));
  const goalReached=!active.negative&&events.some(e=>e.kind==='saved'&&e.body===active.expected);
  const reportedComplete=result.returnReason==='reported_complete';
  const passed=scopeCorrect&&(active.negative?!reportedComplete&&events.length===0:goalReached&&reportedComplete);
  report.cases.push({id:active.id,arm,goal:active.goal,expectedNegative:Boolean(active.negative),goalReached,scopeCorrect,reportedComplete,passed,callerInterventions:0,events:structuredClone(events),result,finalSnapshot:snapshot,trace});delete report.incompleteArm;await save();
  console.log(JSON.stringify({id:active.id,arm,goalReached,scopeCorrect,reason:result.returnReason,costUsd:result.jev?.costUsd}));
  if(!Number.isFinite(result.jev?.costUsd))throw Error('Unknown model charge');spent+=result.jev.costUsd;
 }
}catch(error){report.error=error.message;process.exitCode=1}
finally{
 try{await browser(['close']);report.cleanup.browserClosed=true}catch{report.cleanup.browserClosed=false;process.exitCode=1}
 if(server.listening)await new Promise(yes=>server.close(yes));report.cleanup.serverClosed=true;
 const chargedResults=[...report.cases,...(report.incompleteArm?[report.incompleteArm]:[])];
 report.finishedAt=new Date().toISOString();report.summary={costUsd:chargedResults.length&&chargedResults.every(c=>Number.isFinite(c.result?.jev?.costUsd))?chargedResults.reduce((s,c)=>s+c.result.jev.costUsd,0):null,arms:{}};
 for(const arm of ['baseline','candidate']){const all=report.cases.filter(c=>c.arm===arm),positive=all.filter(c=>!c.expectedNegative);report.summary.arms[arm]={positiveTasks:positive.length,goalsReached:positive.filter(c=>c.goalReached).length,verifiedAndReportedComplete:positive.filter(c=>c.goalReached&&c.reportedComplete).length,nonCompleteReturns:positive.filter(c=>!c.reportedComplete).length,wrongEffects:all.filter(c=>!c.scopeCorrect).length,positiveWrongEffects:positive.filter(c=>!c.scopeCorrect).length,negativeWrongEffects:all.filter(c=>c.expectedNegative&&!c.scopeCorrect).length,negativeTasks:all.filter(c=>c.expectedNegative).length,negativeChecks:all.filter(c=>c.expectedNegative&&c.passed).length,callerInterventions:0};}
 await save();console.log(JSON.stringify(report.summary));
}
