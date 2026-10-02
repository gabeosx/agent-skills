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
const sessionId=`jev-requirements-${randomUUID()}`,execute=promisify(execFile);
const report={kind:'self-authored-requirement-counterexamples',startedAt:new Date().toISOString(),
  model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const path of (await readdir(join(helperDir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort().map(n=>`scripts/${n}`))
  report.sourceSha256[path]=createHash('sha256').update(await readFile(join(helperDir,path))).digest('hex');
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
let active,events=[],spent=0;
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture.local'),view=url.searchParams.get('view')??'list';
  if(req.method==='POST'){
    let body='';for await(const chunk of req)body+=chunk;
    events.push(JSON.parse(body));res.writeHead(204);res.end();return;
  }
  let body;
  if(active.target!==undefined){
    body=`<h1>Preferences</h1><div>Quantity<div><span class="ui-slider-handle" tabindex="0"></span><span id="value">${active.initial}</span></div></div><button onclick="act({type:'save',value:Number(document.getElementById('value').textContent)})">Apply settings</button>`;
  }else{
    const enable=`<button onclick="act({type:'alerts',source:'${view}'})">Enable alerts</button>`;
    const detail='<a href="?view=invoice">Invoice INV-42 details</a>';
    const list='<a href="?view=list">Back to invoice list</a>';
    body=view==='invoice'?`<h1>Invoice INV-42 details</h1><p>Account: Atlas</p>${active.reordered?list+enable:enable+list}`:
      view==='receipt'?`<h1>Alerts enabled</h1><p>Change saved for Atlas.</p>${list}`:
      `<h1>Invoice list</h1><p>Account: Atlas</p>${active.reordered?enable+detail:detail+enable}`;
  }
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end(`<style>.ui-slider-handle{display:inline-block;width:30px;height:20px;background:#888}</style>${body}<p id="status"></p><script>
    const slider=document.querySelector('.ui-slider-handle');
    if(slider)slider.onkeydown=async e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const v=document.getElementById('value');v.textContent=Number(v.textContent)+(e.key==='ArrowRight'?1:-1);await fetch('/event',{method:'POST',body:JSON.stringify({type:'adjust',value:Number(v.textContent)})})};
    async function act(event){await fetch('/event',{method:'POST',body:JSON.stringify(event)});${active.redirect?'location.href="?view=receipt";':"document.getElementById('status').textContent=event.type==='save'?'Settings saved at '+event.value:'Alerts enabled';"}}
  </script>`);
});
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw new Error('Browser command failed');return r.data;};
const definitions=[
  {id:'compound-cardinal',target:21,initial:18,goals:['Set Quantity to twenty-one and apply the settings.']},
  {id:'compound-scale',target:100,initial:97,goals:['Make Quantity one hundred, then apply the settings.']},
  {id:'signed-compound',target:-42,initial:-39,goals:['Apply the settings with Quantity at negative forty-two.']},
  {id:'at-effect',goals:['Enable Atlas account alerts while viewing the details of Invoice INV-42.','From Invoice INV-42 details, turn on Atlas account alerts.']},
  {id:'at-effect-redirect',redirect:true,goals:['Enable Atlas account alerts from Invoice INV-42 details.']},
  {id:'before-effect',goals:['View Invoice INV-42 details, then return to the invoice list and enable Atlas account alerts there.']},
  {id:'final-screen',redirect:true,goals:['Enable Atlas account alerts from Invoice INV-42 details, then finish on the invoice list.']},
];
try{
  await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
  for(const definition of definitions)for(const [index,goal] of definition.goals.entries()){
    if(Date.now()+60000>deadline||spent+0.01>maxUsd)throw new Error('Insufficient remaining time or spend allowance for another case');
    active={...definition,variant:index?'reordered':'base',reordered:index===1};events=[];const trace=[];
    await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
    const raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:goal,suppliedValues:definition.values??{},budget:{maxActions:16,maxDecisions:40,timeoutMs:60000}},{apiKey,onEvent:event=>trace.push(event)});
    const result=helper.summarize(raw,null);
    const finalSnapshot=(await browser(['snapshot'])).snapshot;
    const effects=events.filter(e=>e.type!=='adjust'),last=effects.at(-1);
    const visits=trace.filter(e=>e.type==='action').map(e=>e.after?.snapshot??'');
    const checks=active.target!==undefined?{exactValue:last?.type==='save'&&last.value===active.target,singleCommit:effects.length===1,readback:finalSnapshot.includes('Settings saved at '+active.target)}:
      {enabled:last?.type==='alerts',singleCommit:effects.length===1,
        exactSource:last?.source===(active.id==='before-effect'?'list':'invoice'),
        ...(active.id==='before-effect'?{visitedFirst:visits.some(s=>s.includes('Invoice INV-42 details'))}:{}),
        ...(active.id==='final-screen'?{finalScreen:finalSnapshot.includes('heading "Invoice list"')}:{}),
        ...(active.id==='at-effect-redirect'?{readback:finalSnapshot.includes('Alerts enabled')}:{}),
      };
    const scopeCorrect=Object.values(checks).every(Boolean),goalReached=scopeCorrect;
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
