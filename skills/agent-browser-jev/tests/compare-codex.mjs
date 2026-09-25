// Compare actual Codex sessions, not GPT API calls substituted into Jev's loop.
import { createServer } from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { benchmarkPage } from './fixtures/benchmark-pages.mjs';
import { configuredBrowser, configuredApiKey } from '../scripts/config.mjs';

const execute=promisify(execFile);
const {values}=parseArgs({options:{output:{type:'string'},rounds:{type:'string',default:'3'},binary:{type:'string'},codex:{type:'string',default:'codex'},model:{type:'string',default:'gpt-5.5'},effort:{type:'string',default:'low'}}});
const rounds=Number(values.rounds);
if(!values.output||!Number.isSafeInteger(rounds)||rounds<1||rounds>10)throw new Error('Use --output new-report.json [--rounds 3] [--binary /path/to/agent-browser] [--codex /path/to/codex] [--model gpt-5.5] [--effort low]');
const apiKey=configuredApiKey(), binary=values.binary||configuredBrowser();
const skill=fileURLToPath(new URL('..',import.meta.url)),output=resolve(values.output);
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const root=await mkdtemp(join(tmpdir(),'jev-codex-comparison-'));
const scenarios=[
  {id:'help-article',route:'/articles',intent:'Read the Returns article, then go back to the article list.',expected:[{type:'article',article:'Returns'},{type:'back',article:'Returns'}]},
  {id:'reordered-articles',route:'/reordered',intent:'Read the Warranty article, then go back to the article list.',expected:[{type:'article',article:'Warranty'},{type:'back',article:'Warranty'}]},
  {id:'support-draft',route:'/support',intent:'Fill Subject with the supplied subject and Message with the supplied message. Leave the request as a draft; do not send it.',values:{subject:'Delivery question',message:'Please check order #42 — "blue" & green.\nThank you!'}},
  {id:'preferences',route:'/preferences',intent:'Open notification settings, enable Email updates, and save preferences.',expected:[{type:'open-settings'},{type:'email',enabled:true},{type:'save',email:true}]},
  {id:'search-topic',route:'/search',intent:'Search topics using the supplied query, open Account recovery, then go back to the results.',values:{query:'account'}},
  {id:'missing-article',route:'/articles',intent:'Read the Billing article. If it is not listed, return to the caller without clicking.',expected:[],status:'handoff'},
];
const report={schema:1,startedAt:new Date().toISOString(),version:JSON.parse(await readFile(join(skill,'package.json'),'utf8')).version,
  codexModel:values.model,reasoningEffort:values.effort,node:process.version,platform:`${process.platform}-${process.arch}`,rounds,
  timing:'Task delivery via /next to agent POST /done; includes navigation, Codex reasoning/tool orchestration, browser actions, and agent final readback. Excludes Codex session startup and independent harness verification.',
  sourceSha256:{},trials:[],sessions:[],cleanup:{}};
for(const file of ['scripts/run.mjs','scripts/config.mjs','scripts/agent-browser-jev.mjs','scripts/jev-browser.mjs','tests/compare-codex.mjs','tests/fixtures/benchmark-pages.mjs'])report.sourceSha256[file]=createHash('sha256').update(await readFile(join(skill,file))).digest('hex');
const save=()=>writeFile(output,JSON.stringify(report,null,2));
const shellQuote=s=>`'${s.replaceAll("'","'\\''")}'`;
const owned=[];
async function lane(round,arm){
  const session=`jev-compare-${arm}-${randomUUID()}`,cwd=join(root,`${round}-${arm}`);await mkdir(cwd);
  let events=[],index=0,active;
  const browser=async args=>{
    const response=JSON.parse((await execute(binary,['--session',session,'--json',...args],{timeout:30_000,maxBuffer:2e6})).stdout);
    if(!response.success)throw new Error('Browser command failed');return response.data;
  };
  const ordered=scenarios.map((_,i)=>scenarios[(i+round-1)%scenarios.length]);
  const server=createServer(async(req,res)=>{
    const send=data=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(data));};
    try{
      if(req.url==='/next'){
        if(active){send({error:'Complete the active task before requesting another'});return;}
        if(index>=ordered.length){send({finished:true});return;}
        const scenario=ordered[index];events=[];
        const trial={round,arm,id:scenario.id,intent:scenario.intent,startedAt:new Date().toISOString()};
        active={scenario,trial,start:performance.now()};report.trials.push(trial);
        send({id:scenario.id,url:`http://127.0.0.1:${server.address().port}${scenario.route}`,intent:scenario.intent,suppliedValues:scenario.values??{}});return;
      }
      if(req.url==='/events'&&req.method==='POST'){
        let body='';for await(const chunk of req)body+=chunk;events.push(JSON.parse(body));send({recorded:true});return;
      }
      if(req.url==='/done'&&req.method==='POST'){
        if(!active){send({error:'No active task'});return;}
        const {trial,scenario,start}=active;trial.elapsedMs=Math.round(performance.now()-start);trial.finishedAt=new Date().toISOString();
        let body='';for await(const chunk of req)body+=chunk;
        try{
          trial.agentReportedStatus=JSON.parse(body).status;
          trial.finalSnapshot=(await browser(['snapshot'])).snapshot;trial.events=structuredClone(events);
          assert.equal(trial.agentReportedStatus,scenario.status??'complete');
          if(scenario.expected)assert.deepEqual(trial.events,scenario.expected);
          if(scenario.id==='support-draft'){
            trial.readbacks={subject:(await browser(['get','value','#subject'])).value,message:(await browser(['get','value','#message'])).value};
            assert.deepEqual(trial.readbacks,scenario.values);assert.ok(trial.events.length>=2);
            assert.ok(trial.events.every(e=>e.type==='input'&&['subject','message'].includes(e.field)));
          }
          if(scenario.id==='search-topic'){
            trial.readbacks={query:(await browser(['get','value','#search'])).value};assert.equal(trial.readbacks.query,'account');
            assert.deepEqual(trial.events.filter(e=>e.type!=='search'),[{type:'topic',name:'Account recovery'},{type:'close-topic'}]);
          }
          assert.doesNotMatch(trial.finalSnapshot,/dialog/);if(scenario.id==='preferences')assert.match(trial.finalSnapshot,/Preferences saved/);
          trial.verdict='passed';
        }catch(error){trial.verdict='failed';trial.failure=String(error.message);}
        active=undefined;index++;await save();console.log(JSON.stringify({round,arm,id:trial.id,elapsedMs:trial.elapsedMs,verdict:trial.verdict}));
        send({recorded:true});return; // Do not give the agent fixture answers or a chance to retry an assertion.
      }
      res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(benchmarkPage(req.url));
    }catch{res.writeHead(500);res.end('Harness error');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  owned.push({server,browser});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browserCommand=`${shellQuote(binary)} --session ${shellQuote(session)} --json`;
  const helperCommand=`node ${shellQuote(join(skill,'scripts/run.mjs'))} --binary ${shellQuote(binary)} --session ${shellQuote(session)}`;
  const method=arm==='direct'
    ? `Complete each task yourself using normal agent-browser CLI commands. Do not invoke Jev or any other model/helper. Use snapshots to choose refs, then click/fill/wait/get as appropriate. You may batch known independent commands as you normally would.`
    : `Complete each task by calling the Jev helper with the supplied intent and exact values: ${helperCommand} --intent '<task intent>' [--value 'name=text' ...]. Do not write a task file or policy. After handoff or failure, inspect the page and continue with ordinary browser commands if appropriate; retain time spent handling the exception.`;
  const prompt=`You are completing authorized browser tasks on synthetic local pages. Use only the browser UI as evidence. Do not inspect fixture source, test files, other sessions, reports, repository files or environment secrets. You have no preselected refs or expected action sequences. Do not delegate or call external model APIs.

Browser command: ${browserCommand}
Useful commands: open <url>, snapshot, click @eN, fill @eN <exact text>, get value @eN, wait 300. Use the existing credential-free test session. No more than 8 gestures per task; return handoff if progress is unavailable. Do not close the session yourself.

Method: ${method}

Workflow:
1. Get the next task with curl -s ${origin}/next. If finished is true, stop.
2. Open its URL with the browser command. Execute the intent using the method above. Only the requested changes are authorized.
3. Read a fresh browser snapshot to assess the final state. For a filled field, read back its value. Do not treat a helper success flag alone as success.
4. POST your assessment using curl -s -X POST ${origin}/done -H 'Content-Type: application/json' -d '{"status":"complete"}' (or status "handoff" if the task could not be completed).
5. Repeat from step 1 until finished. Be concise, avoid narration, and do not add research or unrelated checks.
`;
  const info={round,arm,commandCount:0,commands:[],prompt:prompt.replaceAll(binary,'<agent-browser>').replaceAll(skill,'<installed-skill>').replaceAll(session,'<session>').replaceAll(origin,'<fixture-origin>')};report.sessions.push(info);
  const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','-C',cwd,'-m',values.model,'-c',`model_reasoning_effort="${values.effort}"`,'-c','approval_policy="never"','--sandbox','danger-full-access','--json','-'];
  const child=spawn(values.codex,args,{cwd,env:{...process.env,OPENROUTER_API_KEY:apiKey},stdio:['pipe','pipe','pipe']});
  child.stdin.end(prompt);
  let buffer='';
  child.stdout.on('data',chunk=>{
    buffer+=chunk;let end;
    while((end=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let event;try{event=JSON.parse(line);}catch{continue;}
      if(event.type==='item.completed'&&event.item?.type==='command_execution'){
        info.commandCount++;info.commands.push({command:event.item.command.replaceAll(binary,'<agent-browser>').replaceAll(skill,'<installed-skill>').replaceAll(session,'<session>').replaceAll(origin,'<fixture-origin>').replaceAll(root,'<temporary-directory>'),exitCode:event.item.exit_code});
      }
      if(event.type==='turn.failed')info.failed=true;
    }
  });
  child.stderr.on('data',()=>{}); // Provider/system diagnostics never enter the public fixture report.
  const timer=setTimeout(()=>child.kill('SIGTERM'),600_000);
  try{info.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});}
  finally{clearTimeout(timer);}
  if(active){active.trial.verdict='failed';active.trial.failure='Codex exited before submitting an outcome';active.trial.elapsedMs=Math.round(performance.now()-active.start);}
  info.tasksSubmitted=index;await save();
}
try{
  report.codexVersion=(await execute(values.codex,['--version'])).stdout.trim();report.browserVersion=(await execute(binary,['--version'])).stdout.trim();
  for(let round=1;round<=rounds;round++)await Promise.all([lane(round,'direct'),lane(round,'jev')]);
}catch(error){report.failure=String(error.message);process.exitCode=1;}
finally{
  report.cleanup.browserSessionsClosed=true;
  for(const {server,browser}of owned){try{await browser(['close']);}catch{report.cleanup.browserSessionsClosed=false;}await new Promise(resolve=>server.close(resolve));}
  report.cleanup.serversClosed=true;await rm(root,{recursive:true,force:true});report.cleanup.temporaryDirectoriesRemoved=true;
  const median=a=>{const b=a.toSorted((x,y)=>x-y);return b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2;};
  report.summary=scenarios.map(s=>({id:s.id,...Object.fromEntries(['direct','jev'].map(arm=>{
    const trials=report.trials.filter(t=>t.id===s.id&&t.arm===arm),times=trials.map(t=>t.elapsedMs);
    return [arm,{passed:trials.filter(t=>t.verdict==='passed').length,total:trials.length,medianMs:times.length?median(times):null,minMs:times.length?Math.min(...times):null,maxMs:times.length?Math.max(...times):null}];
  }))}));
  report.finishedAt=new Date().toISOString();report.verdict=report.trials.length===rounds*scenarios.length*2&&report.trials.every(t=>t.verdict==='passed')&&report.cleanup.browserSessionsClosed?'passed':'failed';
  if(report.verdict!=='passed')process.exitCode=1;await save();console.log(JSON.stringify({verdict:report.verdict,report:output,summary:report.summary}));
}
