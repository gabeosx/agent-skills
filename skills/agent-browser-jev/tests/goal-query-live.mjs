#!/usr/bin/env node
// Self-authored exact goal-span discovery fixtures; negative boundaries are separate.
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
const root=fileURLToPath(new URL('..',import.meta.url)),helperDir=resolve(values['helper-dir']??root),output=resolve(values.output);
const helper=await import(pathToFileURL(join(helperDir,'scripts/run.mjs')).href);
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const sessionId=`jev-goal-query-${randomUUID()}`,execute=promisify(execFile),binary=configuredBrowser();
const report={kind:'self-authored-goal-query-fixtures',startedAt:new Date().toISOString(),model:'typesafe/jev-1.13',sourceSha256:{},cases:[],cleanup:{},limits:{deadline:values.deadline,maxUsd}};
for(const file of (await readdir(join(helperDir,'scripts'))).filter(n=>n.endsWith('.mjs')).sort())report.sourceSha256[`scripts/${file}`]=createHash('sha256').update(await readFile(join(helperDir,'scripts',file))).digest('hex');
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');let active,events=[],queries=[],spent=0;
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture.local');
 if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}
 const query=url.searchParams.get('q');if(query!==null)queries.push(query);
 let html;
 if(active.negative)html='<h1>Profile settings</h1><label>City<input id="field"></label><button onclick="save({type:\'city\',value:field.value})">Save city</button>';
 else if(url.pathname==='/entry')html=`<h1>${active.target}</h1><section id="input-area">${active.question?'<label>Question<textarea id="field"></textarea></label><button onclick="save({type:\'question\',target:document.querySelector(\'h1\').textContent,value:field.value})">Submit question</button>':`<button onclick='save({type:"bookmark",target:${JSON.stringify(active.target)}})'>Bookmark entry</button>`}</section>`;
 else html=`<h1>Directory</h1><form><label>Search directory<input type="search" name="q"></label><button>Search</button></form>${query===null?'<p>Search to find an entry.</p>':query.toLowerCase()===active.target.toLowerCase()?`<h2>1 result</h2><a href="/entry">${active.target}</a>`:'<p>No matching entries.</p>'}`;
 const replyForm='<label>Comment<textarea id="field"></textarea></label><button onclick="save({type:\'comment\',target:document.querySelector(\'h1\').textContent,value:field.value})">Post comment</button>';
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(`${html}<p id="status"></p><script>async function save(event){await fetch('/event',{method:'POST',body:JSON.stringify(event)});document.getElementById('status').textContent=event.type==='bookmark'?'Bookmarked '+event.target:event.type==='question'?'Question submitted to '+event.target:event.type==='comment'?'Question submitted and comment posted to '+event.target:'City saved';if(${Boolean(active.reply)}&&event.type==='question')document.getElementById('input-area').innerHTML=${JSON.stringify(replyForm)};else if(event.type==='comment')document.getElementById('input-area').textContent='Saved';}</script>`);
});
const browser=async args=>{const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw new Error('Browser command failed');return r.data;};
const definitions=[
 {id:'unquoted-place',target:'Cedar Harbor',goal:'Find the Cedar Harbor directory entry and bookmark it.'},
 {id:'paraphrased-place',target:'Orchid Bay',goal:'Locate Orchid Bay in the directory, then save it to my bookmarks.'},
 {id:'unicode-place',target:'Côte Nord',goal:'Find the Côte Nord directory entry and bookmark it.'},
 {id:'query-versus-message',target:'Maple Point',question:'Can I change the date?',goal:'Find Maple Point in the directory and submit my question there: "Can I change the date?"',values:{question:'Can I change the date?'}},
 {id:'same-literal-two-roles',target:'Juniper Cove',question:'Is this available?',reply:'Is this available?',goal:'Find Juniper Cove in the directory and submit my question: "Is this available?". Then comment on that question with the same text: "Is this available?".',values:{question:'Is this available?',comment:'Is this available?'}},
 {id:'distinct-literals-two-roles',target:'Silver Reach',question:'When does the office open?',reply:'Thanks for checking.',goal:'Find Silver Reach in the directory and submit my question: "When does the office open?". Then comment on that question: "Thanks for checking."',values:{question:'When does the office open?',comment:'Thanks for checking.'}},
 {id:'missing-final-value',negative:true,goal:'Update my profile city to my preferred destination.'},
];
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 for(const definition of definitions){
  if(Date.now()+60000>deadline||spent+0.03>maxUsd)throw new Error('Insufficient allowance for another case');
  active=definition;events=[];queries=[];const trace=[];await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  const raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:active.goal,suppliedValues:active.values??{},budget:{maxActions:16,maxDecisions:60,timeoutMs:60000}},{apiKey:configuredApiKey(),onEvent:e=>trace.push(e)});
  const result=helper.summarize(raw,null),finalSnapshot=(await browser(['snapshot'])).snapshot;
  const expected=active.negative?[]:active.question?[{type:'question',target:active.target,value:active.question},...(active.reply?[{type:'comment',target:active.target,value:active.reply}]:[])]:[{type:'bookmark',target:active.target}];
  const sameEvent=(event,wanted)=>Boolean(wanted)&&Object.keys(wanted).every(key=>event[key]===wanted[key]);
  const checks=active.negative?{noEffect:events.length===0,missingInput:result.returnReason==='input_required'}:
    {correctEffectCount:events.length===expected.length,correctOrderedEffects:events.every((event,index)=>sameEvent(event,expected[index]))};
  const scopeCorrect=events.length<=expected.length&&events.every((event,index)=>sameEvent(event,expected[index]));
  const goalReached=!active.negative&&Object.values(checks).every(Boolean);
  const passed=scopeCorrect&&(active.negative?checks.missingInput:goalReached&&result.returnReason==='reported_complete');
  report.cases.push({...active,expectedNegative:Boolean(active.negative),checks,scopeCorrect,goalReached,passed,callerInterventions:0,result,events:structuredClone(events),queries:structuredClone(queries),finalSnapshot,trace});await save();
  console.log(JSON.stringify({id:active.id,goalReached,scopeCorrect,reason:result.returnReason,passed}));
  if(!Number.isFinite(result.jev?.costUsd))throw new Error('Unknown model charge');spent+=result.jev.costUsd;if(!passed)process.exitCode=1;
 }
}catch(error){report.error=error.message;process.exitCode=1}
finally{
 try{await browser(['close']);report.cleanup.browserClosed=true}catch{report.cleanup.browserClosed=false;process.exitCode=1}
 if(server.listening)await new Promise(yes=>server.close(yes));report.cleanup.serverClosed=true;
 const positive=report.cases.filter(c=>!c.expectedNegative);report.finishedAt=new Date().toISOString();report.summary={total:report.cases.length,positiveTasks:positive.length,goalsReached:positive.filter(c=>c.goalReached).length,reportedComplete:positive.filter(c=>c.result.returnReason==='reported_complete').length,expectedNegativePassed:report.cases.filter(c=>c.expectedNegative&&c.passed).length,callerAssisted:0,costUsd:report.cases.length&&report.cases.every(c=>Number.isFinite(c.result.jev?.costUsd))?report.cases.reduce((s,c)=>s+c.result.jev.costUsd,0):null};await save();console.log(JSON.stringify(report.summary));
}
