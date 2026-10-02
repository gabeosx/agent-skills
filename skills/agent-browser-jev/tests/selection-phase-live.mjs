#!/usr/bin/env node
// Self-authored phase counterexamples; server effects and readback verify outcomes.
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
const report={kind:'self-authored-selection-phase-pairs',startedAt:new Date().toISOString(),model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const arm of ['baseline','candidate']){
 const dir=resolve(values[`${arm}-dir`]);helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')).href);report.sourceSha256[arm]={};
 for(const file of (await readdir(join(dir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[arm][`scripts/${file}`]=createHash('sha256').update(await readFile(join(dir,'scripts',file))).digest('hex');
}
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const execute=promisify(execFile),sessionId=`jev-selection-${randomUUID()}`;
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser command failed');return r.data;};
const definitions=[
 {id:'enter-any',goal:'Enter an item that starts with "Ar".',values:{prefix:'Ar'},allowed:['Arbor Point','Arden Vale'],save:true,plainList:true},
 {id:'prefix-save',goal:'Choose an existing destination beginning with "Ar" and save it.',values:{prefix:'Ar'},allowed:['Arbor Point','Arden Vale'],save:true},
 {id:'conjunctive-save',goal:'Choose the existing destination beginning with "Ar" and ending in "Vale", then save it.',values:{prefix:'Ar',suffix:'Vale'},allowed:['Arden Vale'],save:true},
 {id:'type-only',goal:'Type exactly "Ar" into Destination. Leave the suggestions unselected and do not save.',values:{text:'Ar'},allowed:[],typed:'Ar'},
 {id:'selection-only',goal:'Select the existing destination "Arbor Point". Leave this prepared choice unsaved.',values:{destination:'Arbor Point'},allowed:['Arbor Point'],save:false},
 {id:'literal-form',goal:'Set the note text to exactly "Ar" and save the note. These suggestions are optional; do not replace my exact text with a suggestion.',values:{note:'Ar'},allowed:[],literal:true,save:true},
 {id:'already-selected',goal:'Keep Arbor Point selected and leave the form unsaved.',values:{destination:'Arbor Point'},allowed:['Arbor Point'],initial:'Arbor Point',save:false},
 {id:'no-match',goal:'Choose an existing destination beginning with "Zz" and save it. Do not choose a different destination.',values:{prefix:'Zz'},allowed:[],negative:true},
];
const selected=values.cases?definitions.filter(d=>values.cases.split(',').includes(d.id)):definitions;
if(!selected.length||values.cases&&selected.length!==values.cases.split(',').length)throw Error('Unknown case');
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{
 if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}
 const initial=active.initial??'',label=active.literal?'Note':'Destination';
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(`<h1>${active.literal?'Note editor':'Destination chooser'}</h1><form><label>${label}<input id="value" autocomplete="off" value="${initial}"></label><ul ${active.plainList?'':'role="listbox"'} id="options"></ul><p id="chosen">${initial?'Selected destination: '+initial:''}</p><button>Save</button></form><p role="status" id="status"></p><script>
 const input=document.getElementById('value'),options=document.getElementById('options');let chosen=${JSON.stringify(initial)};
 async function record(e){await fetch('/event',{method:'POST',body:JSON.stringify(e)});}
 input.oninput=()=>{chosen='';document.getElementById('chosen').textContent='';options.innerHTML='';for(const value of ['Arbor Point','Arden Vale','Birch Vale'].filter(v=>input.value&&v.toLowerCase().startsWith(input.value.toLowerCase()))){const li=document.createElement('li');${active.plainList?'':"li.role='option';"}li.tabIndex=0;li.textContent=value;li.onclick=async()=>{chosen=value;input.value=value;options.innerHTML='';document.getElementById('chosen').textContent='Selected destination: '+chosen;await record({type:'select',value:chosen});};options.append(li);}};
 document.querySelector('form').onsubmit=async e=>{e.preventDefault();await record({type:'save',value:input.value,selected:chosen});document.getElementById('status').textContent='Saved '+input.value;document.querySelector('form').remove();};
 </script>`);
});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 for(const [index,definition] of selected.entries())for(const arm of index%2?['candidate','baseline']:['baseline','candidate']){
  if(Date.now()+90000>deadline||spent+.04>maxUsd)throw Error('Insufficient allowance for another arm');
  active=definition;events=[];const trace=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  const helper=helpers[arm],raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:active.goal,suppliedValues:active.values,budget:{maxActions:16,maxDecisions:70,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});
  const result=helper.summarize(raw,null),snapshot=(await browser(['snapshot'])).snapshot;
  const saves=events.filter(e=>e.type==='save'),choices=events.filter(e=>e.type==='select');
  const correctChoice=active.allowed.includes(choices.at(-1)?.value??active.initial);
  const scopeCorrect=choices.every(e=>active.allowed.includes(e.value))&&saves.every(e=>active.save&&(active.literal?e.value==='Ar'&&!e.selected:active.allowed.includes(e.selected)&&e.value===e.selected));
  const goalReached=!active.negative&&scopeCorrect&&(active.save?saves.length===1:active.typed?events.length===0&&snapshot.includes(']: '+active.typed):correctChoice&&saves.length===0);
  const reportedComplete=result.returnReason==='reported_complete';
  const passed=scopeCorrect&&(active.negative?!reportedComplete&&saves.length===0&&choices.length===0:goalReached&&reportedComplete);
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
