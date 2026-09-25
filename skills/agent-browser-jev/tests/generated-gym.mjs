#!/usr/bin/env node
// Hidden-answer, seeded browser challenge driven by a real isolated Codex caller.
import { createServer } from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createTravelChallenge } from './fixtures/generated-travel.mjs';
import { configuredBrowser, configuredApiKey } from '../scripts/config.mjs';

const execute=promisify(execFile);
const {values}=parseArgs({options:{output:{type:'string'},seed:{type:'string'},cases:{type:'string',default:'1'},binary:{type:'string'},codex:{type:'string',default:'codex'},model:{type:'string',default:'gpt-5.5'},effort:{type:'string',default:'low'},help:{type:'boolean'}}});
if(values.help){console.log('node tests/generated-gym.mjs --output /absolute/path/to/new-report.json [--seed 1234] [--cases 3] [--binary /path/to/agent-browser]');process.exit(0);}
const cases=Number(values.cases),seed=values.seed===undefined?randomBytes(4).readUInt32BE(0):Number(values.seed);
if(!values.output||!Number.isSafeInteger(cases)||cases<1||cases>10||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new Error('Use a new --output, --cases 1..10 and an optional unsigned 32-bit --seed');
const skill=fileURLToPath(new URL('..',import.meta.url)),output=resolve(values.output),binary=values.binary||configuredBrowser(),apiKey=configuredApiKey();
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const root=await mkdtemp(join(tmpdir(),'jev-generated-gym-'));
const hash=async path=>createHash('sha256').update(await readFile(join(skill,path))).digest('hex');
const report={schema:1,kind:'generated-travel-isolated-caller',version:JSON.parse(await readFile(join(skill,'package.json'),'utf8')).version,startedAt:new Date().toISOString(),seed,casesRequested:cases,model:values.model,effort:values.effort,
  timing:'Task delivery to caller POST /done; includes caller reasoning, Jev, browser actions and final caller assessment. Excludes Codex startup and independent verification.',
  cost:'Jev amounts are provider-reported. Codex tokens are reported separately; no dollar equivalent is assumed.',
  sourceSha256:Object.fromEntries(await Promise.all(['tests/generated-gym.mjs','tests/fixtures/generated-travel.mjs','SKILL.md','scripts/run.mjs','scripts/controls.mjs','scripts/jev-browser.mjs','scripts/agent-browser-jev.mjs'].map(async p=>[p,await hash(p)]))),trials:[],cleanup:{}};
const save=()=>writeFile(output,JSON.stringify(report,null,2));
const quote=s=>`'${s.replaceAll("'","'\\''")}'`;
const active=[];
try{
  report.codexVersion=(await execute(values.codex,['--version'])).stdout.trim();report.browserVersion=(await execute(binary,['--version'])).stdout.trim();await save();
  for(let i=0;i<cases;i++){
    const caseSeed=(seed+i)>>>0,challenge=createTravelChallenge(caseSeed),session=`jev-generated-${randomUUID()}`,cwd=join(root,String(i));
    await mkdir(cwd);
    const trial={index:i,seed:caseSeed,features:challenge.features,goal:challenge.publicTask.goal,suppliedValues:challenge.publicTask.suppliedValues,startedAt:new Date().toISOString(),commandCount:0,commands:[]};report.trials.push(trial);await save();
    let deliveredAt,submittedAt,agentStatus=null;
    const server=createServer(async(req,res)=>{
      const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
      try{
        if(req.url==='/task'&&req.method==='GET'){
          if(!deliveredAt)deliveredAt=performance.now();
          send(200,{goal:challenge.publicTask.goal,suppliedValues:challenge.publicTask.suppliedValues,url:`http://127.0.0.1:${server.address().port}${challenge.publicTask.startingPath}`});return;
        }
        if(req.url==='/done'&&req.method==='POST'){
          let body='';for await(const part of req)body+=part;
          agentStatus=JSON.parse(body).status;submittedAt=performance.now();send(200,{recorded:true});return;
        }
        if(req.url==='/action'&&req.method==='POST'){
          let body='';for await(const part of req)body+=part;
          send(200,challenge.act(JSON.parse(body)));return;
        }
        if(req.method==='GET'){
          res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
          res.end(challenge.render(req.url));return;
        }
        send(404,{error:'not found'});
      }catch{send(500,{error:'fixture error'});}
    });
    await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
    const origin=`http://127.0.0.1:${server.address().port}`;
    active.push({server,session});
    const browserCommand=`${quote(binary)} --session ${quote(session)} --json`;
    const helperCommand=`node ${quote(join(skill,'scripts/run.mjs'))} --binary ${quote(binary)} --session ${quote(session)}`;
    const prompt=`You are the caller agent in a browser-control evaluation on a local, fake travel site. The goal is an authorized demo itinerary hold, with no payment or outside effects. Get the task with curl -s ${origin}/task. You may inspect only that response, the browser UI, ${quote(join(skill,'SKILL.md'))}, and the helper result. Do not read fixture source, reports, test files, or other local data. Do not call other models directly or delegate. The hidden correct outcome is not in your prompt.

Read the specified SKILL.md, then delegate the entire goal to Jev with one invocation of the installed helper: ${helperCommand} --url '<task URL>' --intent '<task goal>' --value 'name=exact text' for EVERY suppliedValues entry --max-actions 60 --timeout 180000. Build one command with repeated --value flags; do not split the goal into clicks. The helper returns its complete result directly on stdout and writes no task or result file. This lane measures Jev's autonomous execution. After the helper, you may use ${browserCommand} snapshot for final readback, but do not use any direct browser gesture, eval, script, or helper resume to finish the task. If the helper hands back incomplete work, report handoff. Do not close the browser session.

After the task, POST your assessment to ${origin}/done as JSON with status "complete" only if you established the requested outcome, otherwise "handoff". A model success flag alone is insufficient. Be concise.`;
    const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','-C',cwd,'-m',values.model,'-c',`model_reasoning_effort="${values.effort}"`,'-c','approval_policy="never"','--sandbox','danger-full-access','--json','-'];
    const child=spawn(values.codex,args,{cwd,env:{...process.env,OPENROUTER_API_KEY:apiKey},stdio:['pipe','pipe','pipe']});child.stdin.end(prompt);
    let buffer='',stderr='',timer;
    const starts=new Map();
    child.stdout.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);let event;try{event=JSON.parse(line)}catch{continue}
      if(event.type==='item.started'&&event.item?.type==='command_execution')starts.set(event.item.id,performance.now());
      if(event.type==='item.completed'&&event.item?.type==='command_execution'){
        trial.commandCount++;
        if(/tests\/|references\/evidence|\/action\b/.test(event.item.command))trial.prohibitedCommand=true;
        trial.commands.push({command:event.item.command.replaceAll(binary,'<agent-browser>').replaceAll(skill,'<skill>').replaceAll(session,'<session>').replaceAll(origin,'<fixture>').replaceAll(cwd,'<temporary-directory>').slice(0,500),exitCode:event.item.exit_code,elapsedMs:starts.has(event.item.id)?Math.round(performance.now()-starts.get(event.item.id)):null});
        if(event.item.command.includes('scripts/run.mjs'))try{
          const raw=JSON.parse(event.item.aggregated_output.trim());
          trial.helper={returnReason:raw.returnReason,totalMs:raw.timing?.totalMs??null,actions:raw.actions?.length??null,
            actionTrace:raw.actions?.map(action=>({op:action.operation,name:action.target,outcome:action.outcome}))??[],
            latestSnapshot:raw.observation?.snapshot?.slice(0,6000)??null,costUsd:raw.jev?.costUsd??null,decisionCount:raw.jev?.calls??null};
        }catch{trial.helperOutputInvalid=true}
      }
      if(event.type==='turn.completed')trial.codexUsage=event.usage??null;
      if(event.type==='turn.failed')trial.codexFailed=true;
    }});
    child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-1000)});
    timer=setTimeout(()=>child.kill('SIGTERM'),420_000);
    try{trial.codexExitCode=await new Promise((ok,fail)=>{child.once('error',fail);child.once('exit',ok)})}finally{clearTimeout(timer)}
    trial.agentStatus=agentStatus;trial.elapsedMs=deliveredAt&&submittedAt?Math.round(submittedAt-deliveredAt):null;
    trial.independent=challenge.verify();
    if(!trial.helper)trial.helperResultMissing=true;
    let waitStreak=0,maxWaitStreak=0;
    for(const action of trial.helper?.actionTrace??[]){waitStreak=action.op==='wait'?waitStreak+1:0;maxWaitStreak=Math.max(maxWaitStreak,waitStreak)}
    trial.longestWaitStreak=maxWaitStreak;
    const helperIndex=trial.commands.findIndex(x=>x.command.includes('scripts/run.mjs'));
    trial.directBrowserGestures=trial.commands.slice(helperIndex+1).filter(x=>x.command.includes('<agent-browser>')&&!/\s--json snapshot['"]?$/.test(x.command));
    trial.verdict=trial.independent.passed&&agentStatus==='complete'&&!trial.helperResultMissing&&trial.codexExitCode===0&&trial.directBrowserGestures.length===0&&!trial.prohibitedCommand?'passed':'failed';
    if(trial.verdict==='failed')trial.failureCategory=trial.prohibitedCommand?'caller_protocol_violation':trial.directBrowserGestures.length?'caller_browser_takeover':!trial.helper?'helper_result_missing':maxWaitStreak>=5?'repeated_waits':trial.independent.stageReached==='search'?'search_incomplete':`incomplete_at_${trial.independent.stageReached}`;
    if(!deliveredAt)trial.failure='Caller did not request task';else if(!submittedAt)trial.failure='Caller did not submit assessment';
    if(trial.codexExitCode!==0)trial.failure=`Codex exit ${trial.codexExitCode}${stderr?' (diagnostics withheld)':''}`;
    trial.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({seed:caseSeed,verdict:trial.verdict,elapsedMs:trial.elapsedMs,mismatches:trial.independent.mismatches}));
    try{await execute(binary,['--session',session,'close'],{timeout:30_000})}catch{report.cleanup.browserSessionsClosed=false}
    await new Promise(ok=>server.close(ok));active.pop();await save();
  }
}catch(error){report.failure=String(error.message);process.exitCode=1}
finally{
  report.cleanup.browserSessionsClosed=report.cleanup.browserSessionsClosed!==false;
  for(const {server,session} of active){try{await execute(binary,['--session',session,'close'],{timeout:30_000})}catch{report.cleanup.browserSessionsClosed=false}await new Promise(ok=>server.close(ok))}
  report.cleanup.serversClosed=true;await rm(root,{recursive:true,force:true});report.cleanup.temporaryDirectoriesRemoved=true;
  report.finishedAt=new Date().toISOString();report.summary={passed:report.trials.filter(t=>t.verdict==='passed').length,total:report.trials.length,medianEndToEndMs:(()=>{const a=report.trials.map(t=>t.elapsedMs).filter(Number.isFinite).sort((x,y)=>x-y);return a.length?a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2:null})(),jevCostUsd:report.trials.every(t=>Number.isFinite(t.helper?.costUsd))?report.trials.reduce((n,t)=>n+t.helper.costUsd,0):null};
  report.verdict=report.trials.length===cases&&report.trials.every(t=>t.verdict==='passed')&&report.cleanup.browserSessionsClosed?'passed':'failed';
  if(report.verdict!=='passed')process.exitCode=1;await save();console.log(JSON.stringify({verdict:report.verdict,report:output,summary:report.summary}));
}
