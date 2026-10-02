import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join,dirname,resolve,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';
import {suppliedValuesForGoal} from './browsergym/task-values.mjs';
import {cases,initialState,render,apply,verify} from './fixtures/execution-contract-pages.mjs';
const root=dirname(fileURLToPath(import.meta.url)),skill=resolve(root,'..');
const {values}=parseArgs({options:{output:{type:'string'},'helper-dir':{type:'string'},'baseline-dir':{type:'string'},deadline:{type:'string'},'max-usd':{type:'string'},cases:{type:'string'}}});
const deadline=Date.parse(values.deadline),maxUsd=Number(values['max-usd']);
if(!values.output||!isAbsolute(values.output)||!Number.isFinite(deadline)||!(maxUsd>0))throw Error('Provide absolute --output, --deadline and positive --max-usd');
const directories={...(values['baseline-dir']?{baseline:resolve(values['baseline-dir'])}:{}),candidate:resolve(values['helper-dir']??skill)},names=Object.keys(directories);
const output=values.output,apiKey=configuredApiKey(),binary=configuredBrowser(),execute=promisify(execFile),session=`jev-contract-${randomUUID()}`;
const ids=values.cases?.split(',')??cases.map(c=>c.id);if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!cases.some(c=>c.id===id)))throw Error('Unknown or repeated fixture case');
const selected=cases.filter(c=>ids.includes(c.id));
const report={kind:'self-authored-execution-contract-comparison',startedAt:new Date().toISOString(),limits:{deadline:values.deadline,maxUsd},plannedArms:names,plannedCases:selected.map(c=>c.id),sourceSha256:{},fixtureSha256:{},cases:[],cleanup:{}};
const helpers={};for(const name of names){helpers[name]=await import(pathToFileURL(join(directories[name],'scripts/run.mjs')));report.sourceSha256[name]={};for(const file of (await readdir(join(directories[name],'scripts'))).filter(n=>n.endsWith('.mjs')))report.sourceSha256[name][file]=createHash('sha256').update(await readFile(join(directories[name],'scripts',file))).digest('hex');}
for(const file of ['fixtures/execution-contract-pages.mjs','execution-contract-live.mjs'])report.fixtureSha256[file]=createHash('sha256').update(await readFile(join(root,file))).digest('hex');
await writeFile(output,'{}\n',{flag:'wx',mode:0o600});const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
let active,state,events=[],spent=0;
const server=createServer(async(req,res)=>{if(req.method==='POST'){let body='';for await(const x of req)body+=x;const event=JSON.parse(body);events.push(event);apply(state,event,active);res.writeHead(204);res.end();return;}res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(render(active,state,new URL(req.url,'http://local')));});
const browser=async args=>{const {stdout}=await execute(binary,['--session',session,'--json',...args],{timeout:30000,maxBuffer:2e6});const r=JSON.parse(stdout);if(!r.success)throw Error('Browser operation failed');return r.data;};
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 for(const [index,c] of selected.entries())for(const name of [...names.slice(index%names.length),...names.slice(0,index%names.length)]){
  if(Date.now()+95000>deadline||spent+0.05>maxUsd)throw Error('Experiment bound reached');
  active=c;state=initialState(c);events=[];const trace=[],trial={id:c.id,arm:name,goal:c.goal,expectedNegative:Boolean(c.negative),startedAt:new Date().toISOString(),callerInterventions:0};trial.cleanStart={state:structuredClone(state),events:0,method:"fresh in-memory state assigned before arm navigation"};report.cases.push(trial);await save();
  await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
  const raw=await helpers[name].runTask({browser:{binary,sessionId:session},intentOrSteps:c.goal,suppliedValues:suppliedValuesForGoal(null,c.goal),budget:{maxActions:24,maxDecisions:100,timeoutMs:90000}},{apiKey,onEvent:e=>trace.push(e)});
  trial.result=helpers[name].summarize(raw,null);trial.trace=trace;trial.events=structuredClone(events);trial.finalState=structuredClone(state);await save();
  if(!Number.isFinite(trial.result.jev.costUsd))throw Error('Unknown model charge');spent+=trial.result.jev.costUsd;
  trial.finalSnapshot=(await browser(['snapshot'])).snapshot;Object.assign(trial,verify(c,state,events,trace));trial.reportedComplete=trial.result.returnReason==='reported_complete';trial.negativeCheck=Boolean(c.negative)&&trial.scopeCorrect&&!trial.reportedComplete;trial.finishedAt=new Date().toISOString();await save();
  console.log(JSON.stringify({id:c.id,arm:name,goal:trial.goalReached,scope:trial.scopeCorrect,reason:trial.result.returnReason,cost:trial.result.jev.costUsd}));
 }
}catch(error){report.failure=String(error.message);process.exitCode=1;}
finally{
 try{await browser(['close']);report.cleanup.browserClosed=true;}catch{report.cleanup.browserClosed=false;}
 if(server.listening)await new Promise(ok=>server.close(ok));report.cleanup.serverClosed=true;
 const costs=report.cases.filter(c=>c.result).map(c=>c.result.jev.costUsd);report.summary={costUsd:costs.length&&costs.every(Number.isFinite)?costs.reduce((s,c)=>s+c,0):null,arms:{}};
 for(const arm of names){const all=report.cases.filter(c=>c.arm===arm),positive=all.filter(c=>!c.expectedNegative),neg=all.filter(c=>c.expectedNegative);report.summary.arms[arm]={started:all.length,positiveTasks:positive.length,goalsReached:positive.filter(c=>c.goalReached).length,correctGoals:positive.filter(c=>c.goalReached&&c.scopeCorrect).length,verifiedAndReportedComplete:positive.filter(c=>c.goalReached&&c.scopeCorrect&&c.reportedComplete).length,wrongEffects:all.filter(c=>c.scopeCorrect===false).length,falseCompletions:positive.filter(c=>c.reportedComplete&&!c.goalReached).length,negativeChecks:neg.filter(c=>c.scopeCorrect&&!c.reportedComplete).length,negativeTasks:neg.length,calls:all.reduce((s,c)=>s+(c.result?.jev.calls??0),0)};}
 report.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify(report.summary));
}
