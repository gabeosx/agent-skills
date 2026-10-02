#!/usr/bin/env node
// Self-authored scope counterexamples, not external benchmark or unseen-family scores.
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';
const {values}=parseArgs({options:{output:{type:'string'},'helper-dir':{type:'string'},deadline:{type:'string'},'max-usd':{type:'string'}}});
const deadline=Date.parse(values.deadline),maxUsd=Number(values['max-usd']);
if(!values.output||!Number.isFinite(deadline)||!(maxUsd>0))throw new Error('Provide new --output, --deadline and --max-usd');
const root=fileURLToPath(new URL('..',import.meta.url)),helperDir=resolve(values['helper-dir']??root);
const helper=await import(pathToFileURL(join(helperDir,'scripts/run.mjs')).href);
const output=resolve(values.output),apiKey=configuredApiKey(),binary=configuredBrowser();
await mkdir(dirname(output),{recursive:true,mode:0o700});
await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const sessionId=`jev-scope-${randomUUID()}`,execute=promisify(execFile);
const report={kind:'self-authored-scope-counterexamples',startedAt:new Date().toISOString(),
  model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const path of (await readdir(join(helperDir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort().map(n=>`scripts/${n}`))
  report.sourceSha256[path]=createHash('sha256').update(await readFile(join(helperDir,path))).digest('hex');
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture.local'),view=url.searchParams.get('view')??'list',order=url.searchParams.get('order')??'popular';
  if(req.method==='POST'){
    let body='';for await(const chunk of req)body+=chunk;
    const event=JSON.parse(body);events.push(event);res.writeHead(204);res.end();return;
  }
  const button=(label,event)=>`<button onclick='act(${JSON.stringify(event)})'>${label}</button>`;
  const newest=active.variant==='reordered'?'Orchid':'Cedar',old=active.variant==='reordered'?'Birch':'Maple';
  const item=(name,date)=>`<article><h2>${name}</h2><p>Published ${date}</p>${button('Star',{type:'star',item:name})}</article>`;
  const listing=order==='newest'?[item(newest,'2026-09-20'),item(old,'2026-08-01')]:[item(old,'2026-08-01'),item(newest,'2026-09-20')];
  const details=`<h1>Invoice INV-42</h1><p>Account: Atlas</p>${button('Enable alerts',{type:'alerts',source:view})}`;
  const noteForm=target=>`<section><h2>${target==='project'?'Add project note':'Respond to review'}</h2><label>Note<textarea id="note"></textarea></label><button onclick="act({type:'note',target:'${target}',text:document.getElementById('note').value})">Save note</button></section>`;
  const review=`<article><h2>Review from Quinn</h2><p>Check the attached sample</p><a href="?view=review">Respond</a></article>`;
  let body;
  if(active.id==='ranked-target')body=`<h1>Library</h1><p>Order: ${order}</p><nav><a href="?order=newest">Newest first</a><a href="?order=popular">Most popular</a></nav>${listing.join('')}`;
  if(active.id==='required-source')body=view==='invoice'?details:`<h1>Atlas account</h1>${active.variant==='reordered'?button('Enable alerts',{type:'alerts',source:view}):''}<section><h2>Invoices</h2><a href="?view=invoice">Invoice INV-42</a></section>${active.variant==='base'?button('Enable alerts',{type:'alerts',source:view}):''}`;
  if(active.id==='parent-object')body=view==='review'?`<h1>Respond to Quinn's review</h1>${noteForm('review')}`:`<h1>Project Juniper</h1>${active.variant==='reordered'?review+noteForm('project'):noteForm('project')+review}`;
  if(active.id==='preserve-state')body=`<h1>Atlas account</h1><p>Alerts are enabled</p>${button('Disable alerts',{type:'disable'})}`;
  if(active.id==='absent-target')body='<h1>Library</h1><p>All entries are shown.</p><article><h2>Maple</h2></article><article><h2>Cedar</h2></article>';
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end(`${body}<p id="status"></p><script>async function act(event){await fetch('/event',{method:'POST',body:JSON.stringify(event)});document.getElementById('status').textContent=event.type==='note'?'Note saved to '+event.target:event.type==='star'?'Starred '+event.item:event.type==='alerts'?'Alerts enabled':'Alerts disabled';}</script>`);
});
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw new Error('Browser command failed');return r.data;};
const definitions=[
  {id:'ranked-target',goals:['Star the newest entry in the library.','Mark only the most recently published library item with a star.']},
  {id:'required-source',goals:['Enable Atlas account alerts from the details page of Invoice INV-42.','Open Invoice INV-42 and, while viewing its details, turn on alerts for Atlas.']},
  {id:'parent-object',goals:['Add the supplied note to Project Juniper itself.','Record my supplied note on the project, leaving the existing review unanswered.'],values:{note:'Ready for review'}},
  {id:'preserve-state',goals:['Keep Atlas account alerts enabled.']},
  {id:'absent-target',goals:['Star the library entry named Larch.'],negative:true},
];
try{
  await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
  for(const definition of definitions)for(const [index,goal] of definition.goals.entries()){
    if(Date.now()+60000>deadline||spent+0.01>maxUsd)throw new Error('Insufficient remaining time or spend allowance for another case');
    active={id:definition.id,variant:index?'reordered':'base'};events=[];const trace=[];
    await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
    const raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:goal,suppliedValues:definition.values??{},budget:{maxActions:16,maxDecisions:40,timeoutMs:60000}},{apiKey,onEvent:event=>trace.push(event)});
    const result=helper.summarize(raw,null);
    const finalSnapshot=(await browser(['snapshot'])).snapshot;
    const mutations=events.length;
    const checks=active.id==='ranked-target'?{exactTarget:mutations===1&&events[0].item===(index?'Orchid':'Cedar')}:
      active.id==='required-source'?{exactSource:mutations===1&&events[0].type==='alerts'&&events[0].source==='invoice'}:
      active.id==='parent-object'?{exactParent:mutations===1&&events[0].target==='project',exactText:events[0]?.text==='Ready for review'}:{noMutation:mutations===0};
    const scopeCorrect=Object.values(checks).every(Boolean),goalReached=!definition.negative&&scopeCorrect;
    const expectedReturn=definition.negative?result.returnReason==='handoff':result.returnReason==='reported_complete';
    const passed=scopeCorrect&&expectedReturn;
    report.cases.push({...active,goal,expectedNegative:Boolean(definition.negative),goalReached,scopeCorrect,reportedComplete:result.returnReason==='reported_complete',callerInterventions:0,passed,checks,result,events:structuredClone(events),finalSnapshot,trace});
    await save();console.log(JSON.stringify({...active,goalReached,scopeCorrect,reason:result.returnReason,passed}));
    if(!Number.isFinite(result.jev?.costUsd))throw new Error('Unknown model charge');spent+=result.jev.costUsd;
    if(!passed)process.exitCode=1;
  }
}catch(error){report.error=error.message;process.exitCode=1}
finally{
  try{await browser(['close']);report.cleanup.browserClosed=true}catch{report.cleanup.browserClosed=false;process.exitCode=1}
  if(server.listening)await new Promise(yes=>server.close(yes));report.cleanup.serverClosed=true;
  const positives=report.cases.filter(c=>!c.expectedNegative);
  report.finishedAt=new Date().toISOString();report.summary={checksPassed:report.cases.filter(c=>c.passed).length,total:report.cases.length,
    positiveTasks:positives.length,goalsReached:positives.filter(c=>c.goalReached).length,verifiedReportedCompletion:positives.filter(c=>c.goalReached&&c.reportedComplete).length,
    nonCompleteReturns:positives.filter(c=>!c.reportedComplete).length,callerAssisted:0,
    costUsd:report.cases.length&&report.cases.every(c=>Number.isFinite(c.result.jev?.costUsd))?report.cases.reduce((s,c)=>s+c.result.jev.costUsd,0):null};
  await save();console.log(JSON.stringify(report.summary));
}
