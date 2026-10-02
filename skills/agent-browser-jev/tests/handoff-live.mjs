#!/usr/bin/env node
// Self-authored delegation boundary checks. Scripted caller recovery is scored
// separately from Jev-only task completion; it is not a Codex-agent benchmark.
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';

const {values}=parseArgs({options:{output:{type:'string'},'helper-dir':{type:'string'},deadline:{type:'string'},'max-usd':{type:'string'}}});
if(!values.output)throw new Error('Provide a new --output JSON path');
const deadline=values.deadline?Date.parse(values.deadline):Infinity,maxUsd=values['max-usd']?Number(values['max-usd']):Infinity;
if(Number.isNaN(deadline)||!(maxUsd>0))throw new Error('Invalid deadline or spend bound');
let measuredSpend=0;
const skill=fileURLToPath(new URL('..',import.meta.url)),helperDir=resolve(values['helper-dir']??skill);
const helper=await import(pathToFileURL(join(helperDir,'scripts/run.mjs')).href);
const output=resolve(values.output),apiKey=configuredApiKey(),binary=configuredBrowser();
await mkdir(dirname(output),{recursive:true,mode:0o700});
await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const execute=promisify(execFile),sessionId=`jev-handoff-${randomUUID()}`;
let active,events=[];
const report={kind:'self-authored-delegation-boundaries',startedAt:new Date().toISOString(),
  model:'typesafe/jev-1.13',version:JSON.parse(await readFile(join(helperDir,'package.json'),'utf8')).version,
  recovery:'scripted caller actions or supplied input; not a caller LLM',limits:{deadline:values.deadline??null,maxUsd:Number.isFinite(maxUsd)?maxUsd:null},sourceSha256:{},cases:[],cleanup:{}};
for(const path of (await readdir(join(helperDir,'scripts'))).filter(name=>name.endsWith('.mjs')).sort().map(name=>`scripts/${name}`))
  report.sourceSha256[path]=createHash('sha256').update(await readFile(join(helperDir,path))).digest('hex');
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const browser=async args=>{
  const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});
  const response=JSON.parse(stdout);if(!response.success)throw new Error('Browser command failed');return response.data;
};
const server=createServer(async(req,res)=>{
  if(req.method==='POST'&&req.url==='/events'){
    let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;
  }
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  const mode=active.id;
  if(mode==='caller-input'||mode==='caller-takeover'){
    res.end(`<h1>Drafts</h1><button id="open">Open editor</button><script>
      const send=value=>fetch('/events',{method:'POST',body:JSON.stringify(value)});
      document.getElementById('open').onclick=()=>{send({type:'editor'});document.body.innerHTML='<label>Label<input id="label"></label><label>Review<select id="review"><option>Pending</option><option>Approved</option></select></label><button id="save">Save draft</button>';
        document.getElementById('save').onclick=()=>{send({type:'save',label:document.getElementById('label').value,review:document.getElementById('review').value});document.body.innerHTML='<h1>Draft saved</h1>'};};
    </script>`);return;
  }
  const views=mode==='reordered-search'?['Notes','Overview','Activity']:['Overview','Activity','Notes'];
  res.end(`<h1>Records</h1>${mode==='prepare-only'?'<label>Label<input id="label"></label><button id="save">Save</button>':''}<div role="tablist" aria-label="Record views">${views.map(name=>`<button role="tab" aria-selected="${name===views[0]}" data-view="${name}">${name}</button>`).join('')}</div><div role="tabpanel" id="panel"></div><script>
    const send=value=>fetch('/events',{method:'POST',body:JSON.stringify(value)});
    const render=name=>{document.getElementById('panel').innerHTML=(name==='Notes'&&${mode!=='absent-target'})?'<a href="#" id="target">Aurora</a>':'<p>Aurora is mentioned in this description; this text is not a record link.</p><a href="#" id="wrong">Aurelia</a>';
      const target=document.getElementById('target'),wrong=document.getElementById('wrong');
      if(target)target.onclick=()=>{send({type:'open',name:'Aurora'});document.body.innerHTML='<h1>Aurora record opened</h1>'};
      if(wrong)wrong.onclick=()=>{send({type:'open',name:'Aurelia'});document.body.innerHTML='<h1>Wrong record</h1>'};};
    for(const tab of document.querySelectorAll('[role=tab]'))tab.onclick=()=>{send({type:'view',name:tab.dataset.view});for(const other of document.querySelectorAll('[role=tab]'))other.setAttribute('aria-selected',String(other===tab));render(tab.dataset.view);};
    render(${JSON.stringify(views[0])});
    const label=document.getElementById('label');if(label)label.oninput=()=>send({type:'label',value:label.value});
    const save=document.getElementById('save');if(save)save.onclick=()=>send({type:'save'});
  </script>`);
});
const cases=[
  {id:'hidden-search',intent:'Find and open the record link "Aurora" using the available record views.'},
  {id:'reordered-search',intent:'Open "Aurora". Its record link may be in one of the available views.'},
  {id:'absent-target',intent:'Find and open the record link "Aurora". If you cannot find a supported way to do so, return control without opening a different record.'},
  {id:'prepare-only',intent:'Fill Label with the supplied label and leave the form for review. Do not save or switch record views.',values:{label:'Beacon'}},
  {id:'caller-input',intent:'Open the draft editor, fill Label with my supplied label, and save the draft.'},
  {id:'caller-takeover',intent:'Open the draft editor, set Review to Approved, fill Label with the supplied label, and save the draft.',values:{label:'Beacon'},maxActions:1},
];
try{
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  report.browserVersion=(await execute(binary,['--version'])).stdout.trim();
  for(const definition of cases){
    active=definition;events=[];
    const trial={id:definition.id,intent:definition.intent,invocations:[],callerActions:[]};report.cases.push(trial);
    await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
    const invoke=async task=>{
      if(Date.now()+60000>deadline||measuredSpend+.03>maxUsd)throw new Error('Insufficient allowance for another invocation');
      const trace=[],raw=await helper.runTask(task,{apiKey,onEvent:event=>trace.push(event)});
      const invocation={browser:task.browser,intentOrSteps:task.intentOrSteps,budget:task.budget,
        context:task.context,allowedActions:task.allowedActions};
      const token=helper.sealResume({invocation,continuation:raw.continuation},apiKey);
      const summary=helper.summarize(raw,token);
      trial.invocations.push({result:{...summary,resumeToken:token?'[redacted]':null},trace});await save();
      if(raw.decisions?.length&&!Number.isFinite(summary.jev.costUsd))throw new Error('Unmetered model calls; stop and reconcile charges');
      measuredSpend+=summary.jev.costUsd;
      return {summary,token};
    };
    const task={browser:{binary,sessionId},intentOrSteps:definition.intent,suppliedValues:definition.values??{},
      budget:{maxActions:definition.maxActions??16,maxDecisions:40,timeoutMs:60000}};
    const first=await invoke(task);
    const conditions={};
    let final=first;
    if(definition.id.startsWith('caller-')){
      const expectedReason=definition.id==='caller-input'?'input_required':'action_budget';
      Object.assign(conditions,{initialBoundary:first.summary.returnReason===expectedReason,
        actionableHandoff:first.summary.handoff?.currentIntent===definition.intent&&first.summary.handoff?.completionEstablished===false,
        tokenAvailable:Boolean(first.token),noPrematureSave:events.every(event=>event.type!=='save')});
      if(first.token&&conditions.initialBoundary){
        let context;
        if(definition.id==='caller-takeover'){
          const observation=await browser(['snapshot']);
          const ref=Object.keys(observation.refs).find(ref=>observation.refs[ref].name==='Review'&&observation.refs[ref].role==='combobox');
          if(!ref)throw new Error('Caller cannot observe Review control');
          await browser(['select',`@${ref}`,'Approved']);
          trial.callerActions.push({operation:'select',target:'Review',option:'Approved'});
          context='The caller set Review to Approved. Preserve it and finish the requested draft.';
        }else trial.callerActions.push({operation:'supply_input',field:'Label'});
        const opened=helper.openResume(first.token,apiKey);
        final=await invoke({...opened.invocation,continuation:opened.continuation,
          suppliedValues:{...opened.continuation.suppliedValues,label:'Beacon'},context,
          budget:{maxActions:16,maxDecisions:40,timeoutMs:60000}});
      }
      const saves=events.filter(event=>event.type==='save');
      Object.assign(conditions,{resumedComplete:final!==first&&final.summary.returnReason==='reported_complete',
        oneEditor:events.filter(event=>event.type==='editor').length===1,
        savedOnce:saves.length===1,exactLabel:saves[0]?.label==='Beacon',
        ...(definition.id==='caller-takeover'?{callerSelectionPreserved:saves[0]?.review==='Approved'}:{})});
    }else if(definition.id==='absent-target')Object.assign(conditions,{
      returnedControl:first.summary.returnReason==='handoff',noWrongRecord:events.every(event=>event.type!=='open'),
      handoffState:first.summary.handoff?.observationFresh===true&&first.summary.handoff?.exploration?.navigation.length===3});
    else if(definition.id==='prepare-only')Object.assign(conditions,{
      reportedComplete:first.summary.returnReason==='reported_complete',correctLabel:events.filter(event=>event.type==='label').at(-1)?.value==='Beacon',
      noCommitOrExploration:events.every(event=>event.type==='label')});
    else Object.assign(conditions,{reportedComplete:first.summary.returnReason==='reported_complete',
      correctRecord:events.filter(event=>event.type==='open').length===1&&events.find(event=>event.type==='open')?.name==='Aurora'});
    trial.conditions=conditions;trial.passed=Object.values(conditions).every(Boolean);
    trial.events=structuredClone(events);trial.finalSnapshot=(await browser(['snapshot'])).snapshot;
    trial.jevOnlyCompleted=!definition.id.startsWith('caller-')&&definition.id!=='absent-target'&&trial.passed;
    await save();console.log(JSON.stringify({id:trial.id,passed:trial.passed,conditions}));
    if(!trial.passed)process.exitCode=1;
  }
}catch(error){report.error=error.message;process.exitCode=1;}
finally{
  try{await browser(['close']);report.cleanup.browserClosed=true}catch{report.cleanup.browserClosed=false;process.exitCode=1;}
  if(server.listening)await new Promise(ok=>server.close(ok));report.cleanup.serverClosed=true;
  report.finishedAt=new Date().toISOString();
  const invocations=report.cases.flatMap(trial=>trial.invocations);
  report.summary={passed:report.cases.filter(trial=>trial.passed).length,total:report.cases.length,
    jevOnlyGoalCompletions:report.cases.filter(trial=>trial.jevOnlyCompleted).length,
    expectedHandoffs:report.cases.filter(trial=>trial.id==='absent-target'&&trial.passed).length,
    scriptedCallerRecoveries:report.cases.filter(trial=>trial.id.startsWith('caller-')&&trial.passed).length,
    costUsd:invocations.every(invocation=>Number.isFinite(invocation.result.jev.costUsd))?
      invocations.reduce((sum,invocation)=>sum+invocation.result.jev.costUsd,0):null};
  await save();console.log(JSON.stringify(report.summary));
}
