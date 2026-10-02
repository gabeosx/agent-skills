#!/usr/bin/env node
// Authored relative-numeric fixtures; rendered reachability, server events and readback verify scope.
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';
const {values}=parseArgs({options:{output:{type:'string'},'baseline-dir':{type:'string'},'candidate-dir':{type:'string'},deadline:{type:'string'},'max-usd':{type:'string'},qualify:{type:'boolean'},holdout:{type:'boolean'},cases:{type:'string'},arms:{type:'string'}}});
const deadline=Date.parse(values.deadline),maxUsd=Number(values['max-usd']);
const plannedArms=values.arms?values.arms.split(','):['baseline','candidate'];
if(!plannedArms.length||new Set(plannedArms).size!==plannedArms.length||plannedArms.some(arm=>!['baseline','candidate'].includes(arm)))throw Error('Invalid arms');
if(!values.output||!values['baseline-dir']||!values['candidate-dir']||!Number.isFinite(deadline)||!(maxUsd>0))throw Error('Provide output, frozen arms, deadline and max-usd');
const output=resolve(values.output),binary=configuredBrowser(),apiKey=values.qualify?null:configuredApiKey(),helpers={};
const report={kind:'self-authored-relative-numeric-pairs',plannedArms,comparison:plannedArms.length===2?'paired':'unpaired explicit continuation',startedAt:new Date().toISOString(),model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const arm of ['baseline','candidate']){
 const dir=resolve(values[`${arm}-dir`]);helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')).href);report.sourceSha256[arm]={};
 for(const file of (await readdir(join(dir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[arm][`scripts/${file}`]=createHash('sha256').update(await readFile(join(dir,'scripts',file))).digest('hex');
}
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const execute=promisify(execFile),sessionId=`jev-relative-numeric-${randomUUID()}`;
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser command failed');return r.data;};
const definitions=[
 {id:'percent-decrease',goal:'Reduce the Reserve ceiling by 10% and save.',label:'Reserve ceiling',old:'69.00',expected:'62.10'},
 {id:'decimal-add',goal:'Increase the Allowance by 0.20 and save. Keep the Batch number unchanged.',label:'Allowance',old:'0.10',expected:'0.30'},
 {id:'amount-decrease',goal:'Decrease the Spread by five and save.',label:'Spread',old:'48.00',expected:'43.00',reverse:true},
 {id:'absolute-set',goal:'Set the Limit to 10 and save.',label:'Limit',old:'69.00',expected:'10'},
 {id:'missing-operand',goal:'Reduce the Reserve ceiling by my adjustment and save.',label:'Reserve ceiling',old:'69.00',negative:true},
 {id:'readonly-source',goal:'Reduce the Reserve ceiling by 10% and save.',label:'Reserve ceiling',old:'69.00',readonly:true,negative:true},
];
const heldout=[
 {id:'percent-increase',goal:'Raise the Buffer by 12.5% and save. Preserve the Batch number.',label:'Buffer',old:'80.00',expected:'90.00',reverse:true},
 {id:'absolute-to',goal:'Change the Factor to 12.5 and save.',label:'Factor',old:'80.00',expected:'12.5'},
 {id:'signed-source',goal:'Increase the Balance by 3.25 and save.',label:'Balance',old:'-4.20',expected:'-0.95'},
 {id:'multiple-operands',goal:'Reduce the Ceiling by 15% and save. The Batch number is 17 and must stay unchanged.',label:'Ceiling',old:'48.00',expected:'40.80',reverse:true},
 {id:'unsupported-fraction',goal:'Reduce the Quota by one third and save.',label:'Quota',old:'90.00',negative:true},
];
const selectedDefinitions=values.holdout?heldout:definitions;
const selected=values.cases?selectedDefinitions.filter(d=>values.cases.split(',').includes(d.id)):selectedDefinitions;
if(!selected.length||values.cases&&selected.length!==values.cases.split(',').length)throw Error('Unknown case');
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{
 if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}
 const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const body=`<label>${active.label}<input id="body" value="${escape(active.old)}" ${active.readonly?'readonly':''}></label>`;
 const title='<label>Batch number<input id="title" value="17"></label>';
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(`<h1>Edit allocation</h1><form>${active.reverse?body+title:title+body}<button>Save</button></form><script>
 const form=document.querySelector('form'),body=document.getElementById('body'),title=document.getElementById('title');
 let queue=Promise.resolve();const record=event=>queue=queue.then(()=>fetch('/event',{method:'POST',body:JSON.stringify(event)}));
 for(const el of [body,title])el.addEventListener('input',()=>record({kind:'input',field:el.id,value:el.value}));
 form.onsubmit=async event=>{event.preventDefault();await record({kind:'saved',body:body.value,title:title.value});const text=body.value;form.remove();const status=document.createElement('pre');status.textContent='Saved allocation. Value: '+text;document.body.append(status);};
 </script>`);
});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 if(values.qualify){
  for(const definition of selected){active=definition;events=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);const o=await browser(['snapshot']);const target=Object.entries(o.refs??{}).find(([,c])=>c.role==='textbox'&&c.name===active.label);if(!target)throw Error('Rendered target missing');const ref='@'+target[0];if(String((await browser(['get','value',ref])).value)!==active.old)throw Error('Initial source wrong');if(active.negative){if(active.readonly&&String((await browser(['get','attr',ref,'readonly'])).value)!=='')throw Error('Readonly attribute missing');if(events.length)throw Error('Unexpected initial effects');}else{await browser(['fill',ref,active.expected]);const fresh=await browser(['snapshot']);const saveRef=Object.entries(fresh.refs??{}).find(([,c])=>c.role==='button'&&c.name==='Save');if(!saveRef)throw Error('Rendered Save missing');await browser(['click','@'+saveRef[0]]);await browser(['snapshot']);if(!events.some(e=>e.kind==='saved'&&e.body===active.expected&&e.title==='17'))throw Error('Saved goal unreachable');await browser(['open',`http://127.0.0.1:${server.address().port}/`]);const reset=await browser(['snapshot']);const resetRef=Object.entries(reset.refs??{}).find(([,c])=>c.name===active.label);if(String((await browser(['get','value','@'+resetRef[0]])).value)!==active.old)throw Error('Reload did not restore fixture');}report.cases.push({id:active.id,reachable:!active.negative,negativeChecked:Boolean(active.negative),modelCalls:0,passed:true});await save();}
  report.qualificationPassed=true;
 }else for(const [index,definition] of selected.entries())for(const arm of (index%2?['candidate','baseline']:['baseline','candidate']).filter(arm=>plannedArms.includes(arm))){
  if(Date.now()+90000>deadline||spent+.05>maxUsd)throw Error('Insufficient allowance for another arm');
  active=definition;events=[];const trace=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  report.incompleteArm={id:active.id,arm,stage:'helper_started',chargeUnknown:true};await save();
  const helper=helpers[arm],raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:active.goal,suppliedValues:{},budget:{maxActions:16,maxDecisions:70,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});
  const result=helper.summarize(raw,null);
  // Preserve paid work before any independent readback can fail. An incomplete
  // arm contributes charges, never an inferred goal or a complete comparison.
  report.incompleteArm={id:active.id,arm,stage:'awaiting_independent_readback',chargeUnknown:!Number.isFinite(result.jev?.costUsd),result,trace,events:structuredClone(events)};await save();
  const snapshot=(await browser(['snapshot'])).snapshot;
  const scopeCorrect=active.negative?events.length===0:events.every(e=>e.kind==='saved'?Number(e.body)===Number(active.expected)&&e.title==='17':e.field==='body')&&trace.filter(t=>t.type==='action'&&t.action.op==='fill').every(t=>Number(t.action.value)===Number(active.expected)&&t.action.name===active.label);
  const goalReached=!active.negative&&events.some(e=>e.kind==='saved'&&Number(e.body)===Number(active.expected));
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
 report.finishedAt=new Date().toISOString();report.summary={costUsd:!values.qualify&&chargedResults.length&&chargedResults.every(c=>Number.isFinite(c.result?.jev?.costUsd))?chargedResults.reduce((s,c)=>s+c.result.jev.costUsd,0):null,arms:{}};
 for(const arm of ['baseline','candidate']){const all=report.cases.filter(c=>c.arm===arm),positive=all.filter(c=>!c.expectedNegative);report.summary.arms[arm]={positiveTasks:positive.length,goalsReached:positive.filter(c=>c.goalReached).length,verifiedAndReportedComplete:positive.filter(c=>c.goalReached&&c.reportedComplete).length,nonCompleteReturns:positive.filter(c=>!c.reportedComplete).length,wrongEffects:all.filter(c=>!c.scopeCorrect).length,positiveWrongEffects:positive.filter(c=>!c.scopeCorrect).length,negativeWrongEffects:all.filter(c=>c.expectedNegative&&!c.scopeCorrect).length,negativeTasks:all.filter(c=>c.expectedNegative).length,negativeChecks:all.filter(c=>c.expectedNegative&&c.passed).length,callerInterventions:0};}
 await save();console.log(JSON.stringify(report.summary));
}
