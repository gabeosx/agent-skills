import {createServer} from 'node:http';import {execFile} from 'node:child_process';import {promisify,parseArgs} from 'node:util';import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';import {join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {randomUUID,createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';
import {scenarios,initialState,render,apply,verify,originalNote} from './fixtures/caller-workflow-pages.mjs';
import {allResourcesClosed} from './caller-workflow-evidence.mjs';
import {runCaller,validateBrowserArgs,isGesture,CALLER_MODEL} from './caller-workflow-agent.mjs';
const {values}=parseArgs({options:{'run-dir':{type:'string'},'helper-dir':{type:'string'},deadline:{type:'string'},'max-usd':{type:'string'},preflight:{type:'boolean'},cases:{type:'string'},'caller-model':{type:'string'}}});
if(!values['run-dir']||!values['helper-dir'])throw Error('Use --run-dir and --helper-dir');
const root=resolve(values['run-dir']),helper=resolve(values['helper-dir']),deadline=Date.parse(values.deadline),maxUsd=Number(values['max-usd']);
if(!values.preflight&&(!Number.isFinite(deadline)||!(maxUsd>0)))throw Error('Paid study requires --deadline and --max-usd');
if(!values.preflight&&values['caller-model']!==CALLER_MODEL)throw Error('Legacy API caller requires explicit --caller-model '+CALLER_MODEL);
await mkdir(root,{recursive:true});const binary=configuredBrowser(),execute=promisify(execFile),sha=x=>createHash('sha256').update(x).digest('hex');
const selected=values.cases?scenarios.filter(c=>values.cases.split(',').includes(c.id)):scenarios;if(!selected.length)throw Error('No cases');
const sourceSha256={};for(const file of ['caller-workflow-study.mjs','caller-workflow-agent.mjs','caller-workflow-evidence.mjs','fixtures/caller-workflow-pages.mjs'])sourceSha256[file]=sha(await readFile(new URL(file,import.meta.url)));
const report={kind:values.preflight?'caller-workflow-no-model-qualification':'caller-workflow-three-arm-study',startedAt:new Date().toISOString(),sourceSha256,helperManifestSha256:sha(await readFile(join(root,'source-manifest.json'))),model:CALLER_MODEL,limits:{deadline:values.deadline,maxUsd},scope:'Fresh self-authored workflow instances; no official benchmark reward. Composition requires supplemental semantic audit.',trials:[],costUsd:0,cleanup:{}};
const out=join(root,values.preflight?'preflight.json':'report.json');await writeFile(out,'{}\n',{flag:'wx',mode:0o600});const tokens=new Set();
const sanitize=x=>typeof x==='string'?[...tokens].reduce((s,t)=>s.replaceAll(t,'[private resume token]'),x):Array.isArray(x)?x.map(sanitize):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='resumeToken'&&v?'[private resume token]':sanitize(v)])):x;
const save=()=>writeFile(out,JSON.stringify(sanitize(report),null,2)+'\n');
const {runTask,summarize,sealResume,openResume}=await import(pathToFileURL(join(helper,'scripts/run.mjs')));
const skill=await readFile(join(helper,'SKILL.md'),'utf8'),apiKey=values.preflight?null:configuredApiKey();
function guard(reserve=0.5){if(report.unknownCharge)throw Object.assign(Error('Unreconciled charge'),{stopStudy:true});if(!values.preflight&&(Date.now()+1000>=deadline||report.costUsd+reserve>maxUsd))throw Object.assign(Error('Study time or spend limit reached'),{stopStudy:true});}
async function environment(c,arm){
 const state=initialState(),events=[],session=`jev-caller-${randomUUID()}`;let actor='harness';
 const browser=async args=>{const {stdout}=await execute(binary,['--session',session,'--json',...args],{timeout:30000,maxBuffer:2e6});const d=JSON.parse(stdout);if(!d.success)throw Error('Browser operation failed');return d.data;};
 const server=createServer(async(req,res)=>{try{if(req.method==='POST'&&req.url==='/event'){let text='';for await(const chunk of req)text+=chunk;const event=JSON.parse(text);events.push({...event,actor});apply(state,event);res.writeHead(204);res.end();return;}res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(render(c,state,new URL(req.url,'http://local')));}catch{res.writeHead(500);res.end('Page error');}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const env={state,events,browser,session,setActor:x=>actor=x,async close(){let closed=true;try{await browser(['close']);}catch{closed=false;}await new Promise(ok=>server.close(ok));return {browserClosed:closed,serverClosed:true};}};
 try{await browser(['open',`http://127.0.0.1:${server.address().port}/`]);assert.deepEqual(state,initialState());assert.equal(events.length,0);env.initialObservation=await browser(['snapshot']);return env;}catch(error){await env.close();throw error;}
}
// No-model positive controls operate rendered browser controls, then fresh arm
// creation proves restoration using the very same runner path as scoring.
async function qualify(c){
 for(const order of [['caller_only','caller_with_jev'],['caller_with_jev','caller_only']]){
  const env=await environment(c,order[0]),receipt={id:c.id,order,cleanStart:true};report.trials.push(receipt);await save();env.setActor('scripted_qualification');
  const snapshot=async()=>await env.browser(['snapshot']);
  const find=async(role,name)=>{const d=await snapshot();const entries=Object.entries(d.refs??{}).filter(([,v])=>v.role===role&&v.name===name);if(entries.length!==1)throw Error(`Preflight expected unique ${role}:${name}: ${entries.length}`);return entries[0][0];};
  const click=async(role,name)=>env.browser(['click','@'+await find(role,name)]);
  const fill=async(name,text)=>env.browser(['fill','@'+await find('textbox',name),text]);
  try{
   if(c.id==='forum-ranking'){await click('link','Explore forums');const d=await snapshot();const lines=d.snapshot.split('\n'),start=lines.findIndex(l=>l.includes('heading "River watch"'));const ref=lines.slice(start+1).find(l=>l.includes('button "Subscribe"'))?.match(/\[ref=(e\d+)\]/)?.[1];assert.ok(ref);await env.browser(['click','@'+ref]);}
   if(c.id==='ranked-votes'){for(const title of ['Window restoration','Bench plans','Lime plaster']){const d=await snapshot(),lines=d.snapshot.split('\n');const start=lines.findIndex(l=>l.includes(`heading "${title}"`));const line=lines.slice(start+1).find(l=>l.includes('button "Downvote"'));const ref=line?.match(/\[ref=(e\d+)\]/)?.[1];assert.ok(ref);await env.browser(['click','@'+ref]);}}
   if(c.id==='author-pages'){await click('link','Trail Journal');for(let page=1;page<=3;page++){const d=await snapshot(),lines=d.snapshot.split('\n');for(let i=0;i<lines.length;i++)if(lines[i].includes('Written by Rowan Vale.')){const ref=lines.slice(i+1).find(l=>l.includes('button "Favorite"'))?.match(/\[ref=(e\d+)\]/)?.[1];assert.ok(ref);await env.browser(['click','@'+ref]);}if(page<3)await click('link','Next page');}}
   if(c.id==='preferences'){await click('link','Notification settings');await env.browser(['check','@'+await find('checkbox','Email updates')]);await env.browser(['select','@'+await find('combobox','Digest'),'Weekly']);await env.browser(['select','@'+await find('combobox','Timezone'),'Europe/Paris']);await click('button','Save changes');}
   if(c.id==='append-note'){await click('link','Cedar launch note');await fill('Note text',originalNote+'\nBudget review complete.');await click('button','Save changes');}
   if(c.id==='compose-announcement'){await click('link','Event brief');const d=await snapshot();assert.ok(d.snapshot.includes('East Pavilion')&&d.snapshot.includes('09:30'));await click('link','Create announcement');await fill('Title','Saturday workshop update');await fill('Message','The Saturday workshop has moved from Old Mill to East Pavilion; please arrive at 09:30.');await click('button','Save draft');}
   receipt.finalSnapshot=await snapshot();receipt.state=structuredClone(env.state);receipt.events=structuredClone(env.events);receipt.verification=verify(c,env.state,env.events);assert.equal(receipt.verification.necessaryConditionsReached,!c.negative);assert.notEqual(receipt.verification.scopeCorrect,false);
   if(c.negative)assert.equal(env.events.length,0);
  }finally{receipt.cleanup=await env.close();await save();}
  const restored=await environment(c,order[1]);try{assert.deepEqual(restored.state,initialState());assert.equal(restored.events.length,0);receipt.restored=true;receipt.restoredState=structuredClone(restored.state);}finally{receipt.restoredCleanup=await restored.close();await save();}
 }
}
async function trial(c,arm){
 guard();const t={id:c.id,arm,goal:c.goal,values:c.values,expectedNegative:Boolean(c.negative),startedAt:new Date().toISOString(),callerCalls:[],callerTools:[],helperCalls:[],browserActions:0,callerBrowserActions:0,helperBrowserActions:0,callerCostUsd:0,jevCostUsd:0};report.trials.push(t);await save();const env=await environment(c,arm);t.cleanStart={passed:true,stateSha256:sha(JSON.stringify(env.state)),events:0};const started=performance.now(),end=Math.min(deadline,Date.now()+180000);await save();
 const helperCall=async args=>{
  guard();if(t.helperCalls.length>=3)throw Error('Helper invocation limit reached');const remaining=30-t.browserActions;if(remaining<1)throw Error('Shared browser-action limit reached');if(Date.now()>=end)throw Error('Trial deadline reached');
  let task;if(args.resumeToken){const saved=openResume(args.resumeToken,apiKey);task={...saved.invocation,continuation:saved.continuation,suppliedValues:{...saved.invocation.suppliedValues,...(args.values??{})},...(args.context!==undefined?{context:args.context}:{})};}
  else task={browser:{binary,sessionId:env.session},intentOrSteps:c.goal,suppliedValues:{...c.values,...(args.values??{})},...(args.context!==undefined?{context:args.context}:{})};
  const actions=Math.min(remaining,args.maxActions??30);task.budget={maxActions:actions,maxDecisions:Math.min(60,2*actions),timeoutMs:Math.max(1,Math.min(120000,end-Date.now()))};
  const h={startedAt:new Date().toISOString(),resumed:Boolean(args.resumeToken),callerValues:args.values??{},callerContext:args.context??null,trace:[]};t.helperCalls.push(h);await save();env.setActor('jev');let raw;
  try{raw=await runTask(task,{apiKey,onEvent:e=>h.trace.push(e)});}catch(error){error.unknownCharge=true;throw error;}
  const token=raw.returnReason==='reported_complete'?null:sealResume({invocation:task,continuation:raw.continuation},apiKey);if(token)tokens.add(token);
  const result=summarize(raw,token);h.result=result;h.finishedAt=new Date().toISOString();h.stateAfter=structuredClone(env.state);h.eventsAfter=structuredClone(env.events);h.verification=verify(c,env.state,env.events);await save();
  if(!Number.isFinite(result.jev.costUsd))throw Object.assign(Error('Unknown Jev charge'),{unknownCharge:true});report.costUsd+=result.jev.costUsd;t.jevCostUsd+=result.jev.costUsd;
  const count=result.actions.filter(a=>a.operation!=='inspect_context').length;t.browserActions+=count;t.helperBrowserActions+=count;await save();return result;
 };
 try{
  if(arm==='jev_only'){const result=await helperCall({});t.finalAssessment={status:result.returnReason==='reported_complete'?'complete':'handoff',helperReturnReason:result.returnReason};}
  else t.finalAssessment=await runCaller({model:values['caller-model'],goal:c.goal,values:c.values,initialObservation:env.initialObservation,skill,delegated:arm==='caller_with_jev',apiKey,deadline:end,
   beforeRequest:async body=>{guard(Buffer.byteLength(JSON.stringify(body))*0.0000025+1600*0.000015+0.5);t.callerCalls.push({startedAt:new Date().toISOString(),request:structuredClone(body)});await save();},
   recordCall:async call=>{Object.assign(t.callerCalls.at(-1),call);const cost=call.response.usage?.cost;if(Number.isFinite(cost)){report.costUsd+=cost;t.callerCostUsd+=cost;}else report.unknownCharge=true;await save();},
   recordTool:async tool=>{t.callerTools.push(tool);await save();},
   dispatch:async(name,args)=>{guard();if(Date.now()>=end)throw Error('Trial deadline reached');if(name==='jev')return helperCall(args);if(name==='skill_reference'){const permitted=['README.md','SKILL.md',...(await readdir(join(helper,'references'))).filter(x=>x.endsWith('.md')).map(x=>'references/'+x)];if(!permitted.includes(args.path))throw Error('Only linked skill guidance is available');return {text:await readFile(join(helper,args.path),'utf8')};}if(name!=='browser')throw Error('Unknown tool');validateBrowserArgs(args.args);if(isGesture(args.args)){if(t.browserActions>=30)throw Error('Shared browser-action limit reached');t.browserActions++;t.callerBrowserActions++;}env.setActor('caller');return env.browser(args.args);}
  });
 }catch(error){t.failure=String(error.message);t.finalAssessment??={status:'handoff',explanation:t.failure};if(error.unknownCharge){report.unknownCharge=true;t.unknownCharge=true;}if(error.stopStudy)t.studyLimit=true;}
 finally{t.elapsedMs=performance.now()-started;t.finalState=structuredClone(env.state);t.events=structuredClone(env.events);t.verification=verify(c,env.state,env.events);await save();try{t.finalObservation=await env.browser(['snapshot']);}catch{t.finalObservationUnavailable=true;}t.cleanup=await env.close();t.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({id:c.id,arm,verification:t.verification,reported:t.finalAssessment.status,callerCalls:t.callerCalls.length,callerActions:t.callerBrowserActions,jevInvocations:t.helperCalls.length,cost:t.callerCostUsd+t.jevCostUsd,failure:t.failure}));}
 if(report.unknownCharge||!t.cleanup.browserClosed)throw Error('Study stopped pending charge or cleanup reconciliation');
}
try{
 if(values.preflight){for(const c of selected)await qualify(c);assert.equal(allResourcesClosed(report.trials,true),true,'Qualification cleanup must be explicit and complete');report.passed=true;}
 else{const q=JSON.parse(await readFile(join(root,'preflight.json')));assert.equal(q.passed,true);assert.equal(allResourcesClosed(q.trials,true),true,'Qualification cleanup must be explicit and complete');assert.deepEqual(q.sourceSha256,sourceSha256);assert.equal(q.helperManifestSha256,report.helperManifestSha256);for(const [i,c] of selected.entries()){const arms=['caller_only','jev_only','caller_with_jev'];for(const arm of [...arms.slice(i%3),...arms.slice(0,i%3)])await trial(c,arm);}}
}catch(error){report.failure=String(error.message);process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();report.cleanup.allRecordedClosed=allResourcesClosed(report.trials,Boolean(values.preflight));await save();console.log(JSON.stringify({file:out,costUsd:report.costUsd,trials:report.trials.length,passed:report.passed,failure:report.failure}));}
