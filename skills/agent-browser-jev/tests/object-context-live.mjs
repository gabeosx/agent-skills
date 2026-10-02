#!/usr/bin/env node
// Paired, self-authored structural-context checks. Server effects are the verifier.
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';
const {values}=parseArgs({options:{output:{type:'string'},'baseline-dir':{type:'string'},'candidate-dir':{type:'string'},deadline:{type:'string'},'max-usd':{type:'string'},cases:{type:'string'},variant:{type:'string',default:'base'}}});
const deadline=Date.parse(values.deadline),maxUsd=Number(values['max-usd']);
if(!values.output||!values['baseline-dir']||!Number.isFinite(deadline)||!(maxUsd>0))throw new Error('Provide output, baseline, deadline and max-usd');
const root=fileURLToPath(new URL('..',import.meta.url)),output=resolve(values.output),binary=configuredBrowser(),apiKey=configuredApiKey();
const dirs={baseline:resolve(values['baseline-dir']),candidate:resolve(values['candidate-dir']??root)},helpers={};
const report={kind:'self-authored-object-context-pairs',startedAt:new Date().toISOString(),variant:values.variant,model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const [arm,dir] of Object.entries(dirs)){
 helpers[arm]=await import(pathToFileURL(join(dir,'scripts/run.mjs')).href);report.sourceSha256[arm]={};
 for(const file of (await readdir(join(dir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[arm][`scripts/${file}`]=createHash('sha256').update(await readFile(join(dir,'scripts',file))).digest('hex');
}
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const execute=promisify(execFile),sessionId=`jev-objects-${randomUUID()}`;
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser command failed');return r.data;};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const reverse=values.variant==='reordered',note='Thanks for the update.',address='18 Garden Walk';
let active,events=[],spent=0;
const filler='The schedule and supporting documents are available to everyone in the group. Each person is sharing their own experience, and this discussion remains open for follow-up questions. ';
const definitions=[
 {id:'nested-recipient',goal:reverse?'Send my supplied response to the writer who says they operate a neighborhood bookstore. Respond to that message itself.':'Reply with my supplied response to the comment by the person who runs a neighborhood bookstore.',values:{response:note},expected:{type:'reply',target:'m9',value:note}},
 {id:'first-parent',goal:'Reply to the first top-level comment with my supplied response. Leave replies to that comment unanswered.',values:{response:note},expected:{type:'reply',target:'top',value:note}},
 {id:'table-owner',goal:'Approve only the June invoice for Atlas with amount 125.',expected:{type:'approve',target:'invoice-b'}},
 {id:'list-owner',goal:'Change the delivery address for North branch to the supplied address. Leave its billing address unchanged.',values:{address},expected:{type:'address',target:'delivery',value:address}},
 {id:'far-window',goal:'Flag the record assigned to the Sylvan crew on the night shift.',expected:{type:'flag',target:'record38'}},
 {id:'preserve-object',goal:'Keep notifications enabled for the North branch. Leave the South branch unchanged.',expected:null,alreadySatisfied:true},
 {id:'absent-owner',goal:'Reply with my supplied response to Jordan, the accountant. Do not reply to somebody else.',values:{response:note},negative:true,expected:null},
];
const selected=values.cases?definitions.filter(d=>values.cases.split(',').includes(d.id)):definitions;
if(!selected.length||values.cases&&selected.length!==values.cases.split(',').length)throw Error('Unknown fixture case');
const reply=(key,author,text,children='')=>`<article><h2>${esc(author)}</h2><p>${esc(text)}</p><button onclick="openReply('${key}',this)">Reply</button>${children}</article>`;
const server=createServer(async(req,res)=>{
 if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}
 let body='';
 if(active.id==='nested-recipient'||active.id==='absent-owner'){
  const items=Array.from({length:18},(_,i)=>{
   const own=i===9?'I run a neighborhood bookstore. I can help with ordering and stock.':`I work in the ${i%2?'warehouse':'delivery office'} and share shipment updates.`;
   return reply(`m${i}`,`Contributor ${i}`,own+' '+filler,reply(`c${i}`,'Visitor',filler+'I appreciate the information.'));
  });if(reverse)items.reverse();body='<h1>Community discussion</h1>'+items.join('');
 }
 if(active.id==='first-parent')body='<h1>Request discussion</h1>'+reply('top','Casey','Here is the first comment.',reply('child','Rory','This responds to Casey, rather than to the request.'))+reply('second','Avery','Another top-level comment.');
 if(active.id==='table-owner'){
  const rows=[['invoice-a','Atlas','May','125'],['invoice-b','Atlas','June','125'],['invoice-c','Boreal','June','125'],['invoice-d','Atlas','June','152']];if(reverse)rows.reverse();
  body='<h1>Invoice queue</h1><table><thead><tr><th>Account</th><th>Month</th><th>Amount</th><th>Action</th></tr></thead><tbody>'+rows.map(([key,name,month,amount])=>`<tr><td>${name}</td><td>${month}</td><td>${amount}</td><td><button onclick="save({type:'approve',target:'${key}'})">Approve</button></td></tr>`).join('')+'</tbody></table>';
 }
 if(active.id==='list-owner'){
  const rows=[['billing','North branch billing address','10 Old Road'],['delivery','North branch delivery address','12 Old Road'],['south','South branch delivery address','9 Lane']];if(reverse)rows.reverse();
  body='<h1>Addresses</h1><ul>'+rows.map(([key,label,current])=>`<li><h2>${label}</h2><p>${current}</p><button onclick="editAddress('${key}',this)">Edit</button></li>`).join('')+'</ul>';
 }
 if(active.id==='far-window'){
  const items=Array.from({length:65},(_,i)=>`<article><h2>Record ${i}</h2><p>Crew: ${i===38?'Sylvan':i===20?'Sylvan':'Cedar'}. Shift: ${i===38?'night':'day'}. ${filler.repeat(2)}</p><button onclick="save({type:'flag',target:'record${i}'})">Flag</button></article>`);if(reverse)items.reverse();body='<h1>Shift records</h1>'+items.join('');
 }
 if(active.id==='preserve-object')body='<h1>Branch preferences</h1><article><h2>North branch</h2><p>Notifications enabled</p><button onclick="save({type:\'disable\',target:\'north\'})">Disable</button></article><article><h2>South branch</h2><p>Notifications disabled</p><button onclick="save({type:\'enable\',target:\'south\'})">Enable</button></article>';
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(`${body}<p role="status" id="status"></p><script>
 async function save(event){await fetch('/event',{method:'POST',body:JSON.stringify(event)});document.getElementById('status').textContent='Saved '+event.type+' for '+event.target;document.querySelectorAll('form').forEach(f=>f.remove());}
 function openReply(key,button){document.querySelectorAll('form').forEach(f=>f.remove());const form=document.createElement('form');form.innerHTML='<h3>Reply to this comment</h3><label>Response<textarea name="response"></textarea></label><button>Post response</button>';form.onsubmit=e=>{e.preventDefault();save({type:'reply',target:key,value:form.elements.response.value});};button.after(form);}
 function editAddress(key,button){const form=document.createElement('form');form.innerHTML='<h3>Edit this address</h3><label>Address<input name="address"></label><button>Save address</button>';form.onsubmit=e=>{e.preventDefault();save({type:'address',target:key,value:form.elements.address.value});};button.after(form);}
 </script>`);
});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 for(const [index,definition] of selected.entries())for(const arm of index%2?['candidate','baseline']:['baseline','candidate']){
  if(Date.now()+90000>deadline||spent+.04>maxUsd)throw Error('Insufficient allowance for another arm');
  active=definition;events=[];const trace=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  const helper=helpers[arm];const raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:active.goal,suppliedValues:active.values??{},budget:{maxActions:20,maxDecisions:70,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});
  const result=helper.summarize(raw,null),finalSnapshot=(await browser(['snapshot'])).snapshot;
  const expected=active.expected;const exact=expected?events.length===1&&Object.entries(expected).every(([k,v])=>events[0][k]===v):events.length===0;
  const scopeCorrect=expected?events.every(e=>Object.entries(expected).every(([k,v])=>e[k]===v)):events.length===0;
  const goalReached=!active.negative&&exact,reportedComplete=result.returnReason==='reported_complete';
  const passed=scopeCorrect&&(active.negative?result.returnReason==='handoff':goalReached&&reportedComplete);
  report.cases.push({id:active.id,arm,variant:values.variant,goal:active.goal,expectedNegative:Boolean(active.negative),goalReached,scopeCorrect,reportedComplete,passed,callerInterventions:0,events:structuredClone(events),result,finalSnapshot,trace});await save();
  console.log(JSON.stringify({id:active.id,arm,goalReached,scopeCorrect,reason:result.returnReason,costUsd:result.jev?.costUsd}));
  if(!Number.isFinite(result.jev?.costUsd))throw Error('Unknown model charge');spent+=result.jev.costUsd;
 }
}catch(error){report.error=error.message;process.exitCode=1}
finally{
 try{await browser(['close']);report.cleanup.browserClosed=true}catch{report.cleanup.browserClosed=false;process.exitCode=1}
 if(server.listening)await new Promise(yes=>server.close(yes));report.cleanup.serverClosed=true;
 report.finishedAt=new Date().toISOString();report.summary={costUsd:report.cases.length&&report.cases.every(c=>Number.isFinite(c.result.jev?.costUsd))?report.cases.reduce((s,c)=>s+c.result.jev.costUsd,0):null,arms:{}};
 for(const arm of ['baseline','candidate']){const all=report.cases.filter(c=>c.arm===arm),positive=all.filter(c=>!c.expectedNegative);report.summary.arms[arm]={positiveTasks:positive.length,goalsReached:positive.filter(c=>c.goalReached).length,scopeCorrectGoals:positive.filter(c=>c.goalReached&&c.scopeCorrect).length,completionClaims:positive.filter(c=>c.reportedComplete).length,verifiedAndReportedComplete:positive.filter(c=>c.goalReached&&c.scopeCorrect&&c.reportedComplete).length,nonCompleteReturns:positive.filter(c=>!c.reportedComplete).length,wrongEffects:positive.filter(c=>!c.scopeCorrect).length,negativeChecks:all.filter(c=>c.expectedNegative&&c.passed).length,callerInterventions:0};}
 await save();console.log(JSON.stringify(report.summary));
}
