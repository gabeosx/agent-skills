#!/usr/bin/env node
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';
import {development,reserved,render,initialState,expectedState,assess} from './fixtures/field-binding-pages.mjs';

const {values}=parseArgs({options:{output:{type:'string'},'baseline-dir':{type:'string'},'candidate-dir':{type:'string'},deadline:{type:'string'},'max-usd':{type:'string'},qualify:{type:'boolean'},reserved:{type:'boolean'},cases:{type:'string'},arms:{type:'string'},'prefix-key':{type:'string'}}});
const deadline=Date.parse(values.deadline),maxUsd=Number(values['max-usd']);
if(!values.output||!values.qualify&&(!values['baseline-dir']||!values['candidate-dir']||!Number.isFinite(deadline)||!(maxUsd>0)))throw Error('Provide output; paid runs also require frozen arms, deadline and max-usd');
const plannedArms=values.arms?values.arms.split(','):['baseline','candidate'];
if(!plannedArms.length||new Set(plannedArms).size!==plannedArms.length||plannedArms.some(arm=>!['baseline','candidate'].includes(arm)))throw Error('Invalid arms');
const definitions=values.reserved?reserved:development,selected=values.cases?definitions.filter(d=>values.cases.split(',').includes(d.id)):definitions;
if(!selected.length||values.cases&&selected.length!==values.cases.split(',').length)throw Error('Unknown case');
if(values['prefix-key']&&!/^[a-z][a-z_]{1,60}$/.test(values['prefix-key']))throw Error('Invalid prefix key');
const output=resolve(values.output),binary=configuredBrowser(),apiKey=values.qualify?null:configuredApiKey(),helpers={};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={kind:'self-authored-field-binding-pairs',cohort:values.reserved?'reserved-authored-variants':'authored-development',inputProfile:values['prefix-key']??'original keys',startedAt:new Date().toISOString(),plannedArms,comparison:plannedArms.length===2?'paired':'unpaired',model:'typesafe/jev-1.13',sourceSha256:{},fixtureSha256:{runner:hash(await readFile(fileURLToPath(import.meta.url))),pages:hash(await readFile(new URL('./fixtures/field-binding-pages.mjs',import.meta.url)))},cases:[],cleanup:{},limits:{deadline:values.deadline??null,maxUsd:values.qualify?0:maxUsd}};
if(!values.qualify)for(const arm of plannedArms){const dir=resolve(values[`${arm}-dir`]);helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')).href);report.sourceSha256[arm]={};for(const file of (await readdir(join(dir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[arm][`scripts/${file}`]=hash(await readFile(join(dir,'scripts',file)));report.sourceSha256[arm]['SKILL.md']=hash(await readFile(join(dir,'SKILL.md')));}
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const execute=promisify(execFile),sessionId=`jev-field-binding-${randomUUID()}`;
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser command failed');return r.data;};
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(render(active));});
const observeValues=async()=>{
 const data=await browser(['snapshot']),lastSave=events.findLast(e=>e.kind==='saved');
 if(lastSave)return {current:{...lastSave.values},snapshot:data.snapshot};
 const current={};for(const field of [{id:'search',label:'Global search'},...active.fields]){
  const pair=Object.entries(data.refs??{}).find(([,control])=>['textbox','searchbox'].includes(control.role)&&control.name===field.label);if(!pair)throw Error('Rendered field missing: '+field.label);
  current[field.id]=String((await browser(['get','value','@'+pair[0]])).value??'');
 }return {current,snapshot:data.snapshot};
};
const reset=async task=>{active=task;events=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);const state=await observeValues();if(JSON.stringify(state.current)!==JSON.stringify(initialState(task))||events.length)throw Error('Fixture restoration failed');return state;};
const fillNamed=async(label,text)=>{const snapshot=await browser(['snapshot']),pair=Object.entries(snapshot.refs??{}).find(([,c])=>['textbox','searchbox'].includes(c.role)&&c.name===label);if(!pair)throw Error('Rendered destination missing');await browser(['fill','@'+pair[0],text]);};
const clickNamed=async name=>{const snapshot=await browser(['snapshot']),pair=Object.entries(snapshot.refs??{}).find(([,c])=>c.role==='button'&&c.name===name);if(!pair)throw Error('Rendered button missing: '+name);await browser(['click','@'+pair[0]]);};
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 if(values.qualify)for(const task of selected){
  await reset(task);
  if(!task.negative){for(const [id,text] of Object.entries(task.changes)){const field=task.fields.find(f=>f.id===id);await fillNamed(field.label,task.picker?.field===id?task.picker.prefix:text);if(task.picker?.field===id)await clickNamed(task.picker.option);}if(!task.prepareOnly)await clickNamed('Save record');const state=await observeValues(),review=assess(task,events,state.current,true);if(!review.passed){report.qualificationFailure={id:task.id,events:structuredClone(events),state,review};await save();throw Error('Rendered goal/scope control failed: '+task.id);}}
  else if(events.length)throw Error('Negative had unexpected initial events');
  await reset(task);report.cases.push({id:task.id,expectedNegative:Boolean(task.negative),reachable:!task.negative,restored:true,modelCalls:0,passed:true});await save();
 }else for(const [index,task] of selected.entries())for(const arm of (index%2?['candidate','baseline']:['baseline','candidate']).filter(a=>plannedArms.includes(a))){
  if(Date.now()+90000>deadline||spent+.05>maxUsd)throw Error('Insufficient allowance for another arm');
  await reset(task);const trace=[];
  report.incompleteArm={id:task.id,arm,stage:'helper_started',chargeUnknown:true};await save();
  const suppliedValues=values['prefix-key']&&Object.hasOwn(task.values,'prefix')?Object.fromEntries(Object.entries(task.values).map(([key,value])=>[key==='prefix'?values['prefix-key']:key,value])):task.values;
  const helper=helpers[arm],raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:task.goal,suppliedValues,budget:{maxActions:16,maxDecisions:80,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)}),result=helper.summarize(raw,null);
  report.incompleteArm={id:task.id,arm,stage:'awaiting_independent_readback',chargeUnknown:!Number.isFinite(result.jev?.costUsd),result,trace,events:structuredClone(events)};await save();
  const state=await observeValues(),review=assess(task,events,state.current,result.returnReason==='reported_complete');
  if(task.negative&&['helper_error','action_outcome_unknown','deadline'].includes(result.returnReason))review.passed=false;
  report.cases.push({id:task.id,arm,goal:task.goal,expectedNegative:Boolean(task.negative),...review,callerInterventions:0,result,trace,events:structuredClone(events),finalValues:state.current,finalSnapshot:state.snapshot});delete report.incompleteArm;await save();
  console.log(JSON.stringify({id:task.id,arm,...review,reason:result.returnReason,costUsd:result.jev?.costUsd}));
  if(!Number.isFinite(result.jev?.costUsd))throw Error('Unknown model charge');spent+=result.jev.costUsd;
 }
 if(values.qualify)report.qualificationPassed=true;
}catch(error){report.error=error.message;process.exitCode=1}
finally{
 try{await browser(['close']);report.cleanup.browserClosed=true}catch{report.cleanup.browserClosed=false;process.exitCode=1}
 if(server.listening)await new Promise(yes=>server.close(yes));report.cleanup.serverClosed=true;
 const charged=[...report.cases,...(report.incompleteArm?[report.incompleteArm]:[])];report.finishedAt=new Date().toISOString();report.summary={costUsd:!values.qualify&&charged.length&&charged.every(c=>Number.isFinite(c.result?.jev?.costUsd))?charged.reduce((sum,c)=>sum+c.result.jev.costUsd,0):values.qualify?0:null,arms:{}};
 for(const arm of plannedArms){const all=report.cases.filter(c=>c.arm===arm),positive=all.filter(c=>!c.expectedNegative),negative=all.filter(c=>c.expectedNegative);report.summary.arms[arm]={positiveTasks:positive.length,goalsReached:positive.filter(c=>c.goalReached).length,scopedGoals:positive.filter(c=>c.goalReached&&c.scopeCorrect).length,verifiedAndReportedComplete:positive.filter(c=>c.goalReached&&c.scopeCorrect&&c.reportedComplete).length,nonCompleteReturns:positive.filter(c=>!c.reportedComplete).length,wrongEffects:all.filter(c=>!c.scopeCorrect).length,negativeTasks:negative.length,negativeChecks:negative.filter(c=>c.passed).length,callerInterventions:0,requests:all.reduce((sum,c)=>sum+(c.result.jev?.calls??c.result.jev?.decisions??0),0)};}
 await save();console.log(JSON.stringify({qualificationPassed:report.qualificationPassed??false,error:report.error??null,summary:report.summary,cleanup:report.cleanup}));
}
