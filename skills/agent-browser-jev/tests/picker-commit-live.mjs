#!/usr/bin/env node
import {createServer} from 'node:http';import {execFile} from 'node:child_process';import {promisify,parseArgs} from 'node:util';import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';import {resolve,join,dirname} from 'node:path';import {pathToFileURL} from 'node:url';import {randomUUID,createHash} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';import {cases as baseCases,diagnosticCases,transferCases,page,verify} from './fixtures/picker-commit-pages.mjs';
import {workflowCases,workflowPage,verifyWorkflow} from './fixtures/picker-workflow-pages.mjs';
import {detachedCases,detachedPage,verifyDetached,detachedLabel,detachedItems} from './fixtures/detached-picker-pages.mjs';
import {discoveryCases,discoveryPage,verifyDiscovery} from './fixtures/discovery-phase-pages.mjs';
import {displayCases,displayPage,verifyDisplay} from './fixtures/readonly-display-pages.mjs';
import {discoverActions} from '../scripts/controls.mjs';
const {values}=parseArgs({options:{output:{type:'string'},'baseline-dir':{type:'string'},'candidate-dir':{type:'string'},qualify:{type:'boolean'},deadline:{type:'string'},'max-usd':{type:'string'},cohort:{type:'string'},cases:{type:'string'},'candidate-only':{type:'boolean'}}});
if(!values.output||!values.qualify&&(!values['baseline-dir']||!values['candidate-dir']||!(Number(values['max-usd'])>0)||!(Date.parse(values.deadline)>Date.now())))throw Error('Explicit frozen arms, output, deadline and spend required');
if(values.cohort&&!['diagnostic','workflow','transfer','detached','discovery','display'].includes(values.cohort))throw Error('Unknown cohort');
const availableCases=values.cohort==='display'?displayCases:values.cohort==='discovery'?discoveryCases:values.cohort==='detached'?detachedCases:values.cohort==='workflow'?workflowCases:values.cohort==='transfer'?transferCases:values.cohort==='diagnostic'?diagnosticCases:baseCases;
const requestedIds=values.cases?.split(',');
if(requestedIds&&(!requestedIds.length||new Set(requestedIds).size!==requestedIds.length||requestedIds.some(id=>!availableCases.some(d=>d.id===id))))throw Error('Invalid case selection');
const cases=requestedIds?availableCases.filter(d=>requestedIds.includes(d.id)):availableCases;
const binary=configuredBrowser(),apiKey=values.qualify?null:configuredApiKey(),execute=promisify(execFile),sessionId='jev-picker-commit-'+randomUUID(),output=resolve(values.output),report={kind:values.qualify?'no-model-picker-commit-controls':values['candidate-only']?'authored-picker-commit-retry':'authored-picker-commit-pairs',startedAt:new Date().toISOString(),trials:[],costUsd:0,sourceHashes:{},displayFixtureSha256:createHash('sha256').update(await readFile(new URL('./fixtures/readonly-display-pages.mjs',import.meta.url))).digest('hex'),discoveryFixtureSha256:createHash('sha256').update(await readFile(new URL('./fixtures/discovery-phase-pages.mjs',import.meta.url))).digest('hex'),detachedFixtureSha256:createHash('sha256').update(await readFile(new URL('./fixtures/detached-picker-pages.mjs',import.meta.url))).digest('hex'),workflowFixtureSha256:createHash('sha256').update(await readFile(new URL('./fixtures/picker-workflow-pages.mjs',import.meta.url))).digest('hex'),fixtureSha256:createHash('sha256').update(await readFile(new URL('./fixtures/picker-commit-pages.mjs',import.meta.url))).digest('hex'),cleanup:{}};
await mkdir(dirname(output),{recursive:true});await writeFile(output,'{}',{flag:'wx',mode:0o600});const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n'),helpers={};
if(!values.qualify)for(const arm of ['baseline','candidate']){const dir=resolve(values[arm+'-dir']);helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')));report.sourceHashes[arm]={};for(const name of await readdir(join(dir,'scripts')))report.sourceHashes[arm][name]=createHash('sha256').update(await readFile(join(dir,'scripts',name))).digest('hex');}
const browser=async args=>{const r=JSON.parse((await execute(binary,['--session',sessionId,'--json',...args],{timeout:15000,maxBuffer:2e6})).stdout);if(!r.success)throw Error('Browser failed');return r.data;};
let active,events=[];const server=createServer(async(req,res)=>{if(req.method==='POST'){let body='';for await(const c of req)body+=c;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(values.cohort==='display'?displayPage(active):values.cohort==='discovery'?discoveryPage(active):values.cohort==='detached'?detachedPage(active):values.cohort==='workflow'?workflowPage(active):page(active));});
const ref=async(role,name)=>{const s=await browser(['snapshot']);const found=Object.entries(s.refs).filter(([,v])=>v.role===role&&v.name===name);if(found.length!==1)throw Error('Control missing or ambiguous: '+name);return '@'+found[0][0];};
try{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));for(const [index,d] of cases.entries())for(const arm of values.qualify||values['candidate-only']?['candidate']:(index%2?['candidate','baseline']:['baseline','candidate'])){
 if(!values.qualify&&(Date.now()+90000>=Date.parse(values.deadline)||report.costUsd+.1>Number(values['max-usd'])))throw Error('Allowance exhausted');
 active=d;events=[];await browser(['open','http://127.0.0.1:'+server.address().port]);const trial={id:d.id,arm,expectedNegative:Boolean(d.negative)};report.trials.push(trial);await save();
 if(values.qualify){
  trial.observation=await browser(['snapshot']);
 if(values.cohort==='display'){
   if(!d.preserve){await browser(['click',await ref('combobox','Department')]);const seen=await browser(['snapshot']);
    if(Object.values(seen.refs).filter(c=>c.role==='option').length!==(d.items??['Glass studio','Metal studio']).length)throw Error('Display choices not reachable');
    if(!d.negative)await browser(['click',await ref('option','Glass studio')]);
    else if(Object.values(seen.refs).some(c=>c.role==='option'&&c.name==='Glass studio'))throw Error('Missing target present');}
   if(!d.negative){await browser(['fill',await ref('textbox','Message'),'Bench test']);await browser(['click',await ref('button','Save draft')]);}
  }else if(values.cohort==='discovery'){
   if(d.policy){if(!trial.observation.snapshot.includes('Policy is unavailable.'))throw Error('Missing policy not exposed');}
   else if(d.context){await browser(['click',await ref('button','Open Cedar details')]);if(d.context==='before_effect')await browser(['click',await ref('button','Back to service list')]);await browser(['click',await ref('button','Enable Cedar')]);}
   else {await browser(['click',await ref('button','Search services')]);const seen=await browser(['snapshot']);if(Object.values(seen.refs).filter(c=>c.role==='button'&&c.name.startsWith('Enable ')).length!==3)throw Error('Choices not reachable');if(!d.negative)await browser(['click',await ref('button','Enable '+d.target)]);}
  }else if(values.cohort==='detached'){
   await browser(['fill',await ref('textbox',detachedLabel(d)),d.query]);
   const seen=await browser(['snapshot']),items=Object.values(seen.refs).filter(c=>c.role==='listitem');if(items.length!==detachedItems(d).length)throw Error('Detached choice reachability failed');
   if(d.negative){if(seen.snapshot.includes(d.expected))throw Error('Expected missing value present');}
   else if(!d.queryOnly&&!d.freeText){const choices=discoverActions(seen).filter(a=>a.op==='click'&&a.role==='listitem'&&a.name===d.expected);if(choices.length!==1)throw Error('Rendered choice missing or ambiguous');await browser(['click',choices[0].ref]);}
  }else if(values.cohort==='workflow'){
   if(!d.queryOnly)for(const field of ['Team','Location']){
    if(field==='Team'&&d.preserveTeam)continue;
    await browser(['click',await ref('combobox',field)]);const seen=await browser(['snapshot']);
    const wanted=field==='Team'?'Design':d.location??'West';
    if(d.negative&&field==='Location'){if(Object.values(seen.refs).some(c=>c.role==='option'&&c.name===wanted)||Object.values(seen.refs).filter(c=>c.role==='option').length!==3)throw Error('Missing-location controls not qualified');}
    else await browser(['click',await ref('option',wanted)]);
   }
  }else if(d.negative){await browser(['click',await ref('combobox',d.label??'Recipient')]);const seen=await browser(['snapshot']);if(Object.values(seen.refs).some(c=>c.role==='option'&&c.name===d.expected)||Object.values(seen.refs).filter(c=>c.role==='option').length!==(d.items?.length??3))throw Error('Negative reachability not established');}
  else if(d.queryOnly||d.freeText){if(d.initialQuery!==d.expected)await browser(['fill',await ref(d.layout==='single'?'combobox':'textbox',d.layout==='single'?(d.label??(d.freeText?'Tag':'Recipient')):(d.queryLabel??'Recipient search')),d.expected]);}
  else if(!d.preserveSelection&&!d.queryOnly){await browser(['click',await ref('combobox',d.label??'Recipient')]);await browser(['click',await ref('option',d.expected)]);}
  if(d.save)await browser(['click',await ref('button',values.cohort==='detached'?'Save':'Save draft')]);
  trial.result={returnReason:d.negative?'handoff':'reported_complete',jev:{costUsd:0}};
 }else{trial.startedAt=new Date().toISOString();trial.chargeUnknown=true;await save();const trace=[];const raw=await helpers[arm].runTask({browser:{binary,sessionId},intentOrSteps:d.goal,suppliedValues:d.values??(values.cohort==='detached'?{query:d.query}:{}),budget:{maxActions:16,maxDecisions:60,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});trial.result=helpers[arm].summarize(raw,null);trial.trace=trace;trial.events=structuredClone(events);await save();if(!Number.isFinite(trial.result.jev?.costUsd))throw Error('Unknown charge');trial.chargeUnknown=false;report.costUsd+=trial.result.jev.costUsd;}
 trial.finalObservation=await browser(['snapshot']);trial.events=structuredClone(events);Object.assign(trial,values.cohort==='display'?verifyDisplay(d,events):values.cohort==='discovery'?verifyDiscovery(d,events):values.cohort==='detached'?verifyDetached(d,events):values.cohort==='workflow'?verifyWorkflow(d,events):verify(d,events));await save();if(values.qualify&&!(d.negative?trial.negativePassed:trial.goalReached&&trial.scopeCorrect))throw Error('No-model reachability/scope failed');console.log(JSON.stringify({id:d.id,arm,goal:trial.goalReached,scope:trial.scopeCorrect,reason:trial.result.returnReason}));
 }report.completed=true;}catch(e){report.failure=e.message;process.exitCode=1;}finally{try{await browser(['close']);report.cleanup.browserClosed=true;}catch{report.cleanup.browserClosed=false;}await new Promise(ok=>server.close(ok));report.cleanup.serverClosed=true;report.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({output,cost:report.costUsd,failure:report.failure}));}
