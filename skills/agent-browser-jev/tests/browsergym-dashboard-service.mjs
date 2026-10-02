#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const {positionals,values}=parseArgs({allowPositionals:true,options:{
  'campaign-root':{type:'string'},port:{type:'string'},help:{type:'boolean'},
}});
if(values.help||!['start','status','stop'].includes(positionals[0])){
  console.log('node tests/browsergym-dashboard-service.mjs start|status|stop --campaign-root /absolute/runs [--port 8765]');
  process.exit(values.help?0:1);
}
if(!values['campaign-root'])throw new Error('Provide --campaign-root');
const action=positionals[0],root=resolve(values['campaign-root']);
const port=values.port===undefined?8765:Number(values.port);
if(!Number.isSafeInteger(port)||port<1||port>65535)throw new Error('Port must be 1..65535');
const statePath=join(root,'.dashboard-service.json');
const logPath=join(root,'.dashboard-service.log');
const dashboard=fileURLToPath(new URL('./browsergym-dashboard.mjs',import.meta.url));
const exists=path=>stat(path).then(()=>true,()=>false);

async function readState(){
  if(!await exists(statePath))return null;
  try{return JSON.parse(await readFile(statePath,'utf8'))}catch{return null}
}

function alive(pid){
  try{process.kill(pid,0);return true}catch{return false}
}

function ownsDashboard(state){
  if(!state||!alive(state.pid))return false;
  try{
    const command=execFileSync('ps',['-p',String(state.pid),'-o','command='],{encoding:'utf8'});
    return command.includes(dashboard)&&command.includes('--campaign-root')&&
      command.includes(state.campaignRoot);
  }catch{return false}
}

async function probe(url){
  try{
    const response=await fetch(`${url}health.json`,{signal:AbortSignal.timeout(1000)});
    if(!response.ok)return false;
    const health=await response.json();
    return health.kind==='browsergym-dashboard-health'&&health.ready===true;
  }catch{return false}
}

if(action==='status'){
  const state=await readState();
  const running=Boolean(ownsDashboard(state)&&await probe(state.url));
  console.log(JSON.stringify({running,...(state??{}),statePath,logPath}));
  process.exit(running?0:1);
}

if(action==='stop'){
  const state=await readState();
  if(!state){console.log(JSON.stringify({stopped:false,reason:'not_started'}));process.exit(0)}
  if(!ownsDashboard(state)){
    await unlink(statePath).catch(()=>{});
    console.log(JSON.stringify({stopped:false,reason:'stale_state',pid:state.pid}));process.exit(0);
  }
  process.kill(state.pid,'SIGTERM');
  for(let attempt=0;attempt<30&&alive(state.pid);attempt++)
    await new Promise(resolveWait=>setTimeout(resolveWait,100));
  if(alive(state.pid))throw new Error(`Dashboard PID ${state.pid} did not stop`);
  await unlink(statePath).catch(()=>{});
  console.log(JSON.stringify({stopped:true,pid:state.pid,url:state.url}));
  process.exit(0);
}

const existing=await readState();
if(existing&&ownsDashboard(existing)){
  if(await probe(existing.url)){
    console.log(JSON.stringify({state:'already_running',...existing,statePath,logPath}));process.exit(0);
  }
  throw new Error('The recorded dashboard process is running but unhealthy; stop it before restarting.');
}
if(existing)await unlink(statePath).catch(()=>{});
const log=openSync(logPath,'a',0o600);
const child=spawn(process.execPath,[dashboard,'--campaign-root',root,'--port',String(port)],{
  cwd:dirname(dashboard),detached:true,stdio:['ignore',log,log],
});
child.unref();
const state={pid:child.pid,url:`http://127.0.0.1:${port}/`,campaignRoot:root,
  startedAt:new Date().toISOString(),persistent:true};
await writeFile(statePath,JSON.stringify(state,null,2)+'\n',{mode:0o600});
for(let attempt=0;attempt<50;attempt++){
  if(await probe(state.url)){
    console.log(JSON.stringify({state:'started',...state,statePath,logPath}));process.exit(0);
  }
  if(!alive(child.pid))break;
  await new Promise(resolveWait=>setTimeout(resolveWait,100));
}
// A failed readiness probe must not leave an untracked server behind.
if(ownsDashboard(state)){
  process.kill(child.pid,'SIGTERM');
  for(let attempt=0;attempt<30&&alive(child.pid);attempt++)
    await new Promise(resolveWait=>setTimeout(resolveWait,100));
  if(alive(child.pid))throw new Error(`Dashboard failed startup and PID ${child.pid} did not stop; state retained at ${statePath}`);
}
await unlink(statePath).catch(()=>{});
throw new Error(`Dashboard failed to start; inspect ${logPath}`);
