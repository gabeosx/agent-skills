#!/usr/bin/env node
// Scoped lifecycle manager for the official WebArena-Verified site containers.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs, promisify } from 'node:util';

const execute=promisify(execFile);
const {positionals,values}=parseArgs({allowPositionals:true,options:{
  'run-dir':{type:'string'},site:{type:'string'},help:{type:'boolean'},
}});
const action=positionals[0];
if(values.help||!['start','status','reset','stop'].includes(action)){
  console.log('node tests/webarena-verified-env.mjs start|status|reset|stop --run-dir /absolute/private/path [--site reddit]');
  process.exit(values.help?0:1);
}
if(!values['run-dir'])throw new Error('Provide --run-dir');
const runDir=resolve(values['run-dir']),statePath=join(runDir,'environment.json');
const sites={
  reddit:{image:'am1n3e/webarena-verified-reddit@sha256:0594908059a03e5f610005689440a95c05e776e734006197c7b1eba12734cb46',
    webPort:80,controlPort:8877,platform:'linux/amd64'},
};
const exists=path=>stat(path).then(()=>true,()=>false);
const docker=(args,timeout=120_000)=>execute('docker',args,{timeout,maxBuffer:4e6});
const readState=async()=>await exists(statePath)?JSON.parse(await readFile(statePath,'utf8')):null;
const resourceSuffix=createHash('sha256').update(runDir).digest('hex').slice(0,10);

async function inspectContainer(name){
  try{return JSON.parse((await docker(['container','inspect',name])).stdout)[0]}catch{return null}
}

async function resetEnvironment(state){
  for(let attempt=0;attempt<180;attempt++){
    try{
      const ready=await docker(['exec',state.container,'curl','-fsS','--max-time','5',
        'http://127.0.0.1:8877/status'],10_000);
      if(JSON.parse(ready.stdout).success===true)break;
    }catch{}
    if(attempt===179)throw new Error('WebArena-Verified environment control did not start');
    await new Promise(resolveWait=>setTimeout(resolveWait,1000));
  }
  try{
    await docker(['exec',state.container,'curl','-fsS','--max-time','30','-X','POST',
      'http://127.0.0.1:8877/init'],60_000);
  }catch(error){
    // The environment controller intentionally restarts its own process during
    // init, so curl can receive an empty reply after the reset was accepted.
    if(!String(error.stderr).includes('Empty reply from server'))throw error;
  }
  for(let attempt=0;attempt<180;attempt++){
    try{
      const result=await docker(['exec',state.container,'curl','-fsS','--max-time','5',
        'http://127.0.0.1:8877/status'],10_000);
      if(JSON.parse(result.stdout).success===true)return;
    }catch{}
    await new Promise(resolveWait=>setTimeout(resolveWait,1000));
  }
  throw new Error('WebArena-Verified environment did not become ready after reset');
}

if(action==='status'){
  const state=await readState(),container=state?await inspectContainer(state.container):null;
  console.log(JSON.stringify({running:Boolean(container?.State?.Running),state,containerStatus:container?.State?.Status??null}));
  process.exit(container?.State?.Running?0:1);
}

if(action==='stop'){
  const state=await readState();
  if(!state){console.log(JSON.stringify({stopped:false,reason:'not_started'}));process.exit(0)}
  await docker(['container','rm','--force',state.container]).catch(()=>{});
  await docker(['network','rm',state.network]).catch(()=>{});
  const stopped={...state,stoppedAt:new Date().toISOString(),resourcesRemoved:true};
  await writeFile(statePath,JSON.stringify(stopped,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({stopped:true,container:state.container,network:state.network,statePath}));
  process.exit(0);
}

if(action==='reset'){
  const state=await readState();
  if(!state||!(await inspectContainer(state.container))?.State?.Running)
    throw new Error('Start the scoped WebArena-Verified environment first');
  await resetEnvironment(state);
  console.log(JSON.stringify({reset:true,site:state.site,container:state.container}));
  process.exit(0);
}

const site=values.site??'reddit',config=sites[site];
if(!config)throw new Error(`Supported contained sites: ${Object.keys(sites).join(', ')}`);
const prior=await readState();
if(prior&&!prior.resourcesRemoved&&(await inspectContainer(prior.container))?.State?.Running){
  console.log(JSON.stringify({state:'already_running',...prior,statePath}));process.exit(0);
}
await mkdir(runDir,{recursive:true,mode:0o700});
await docker(['info','--format','{{.ServerVersion}}'],20_000);
const network=`jev-wav-${resourceSuffix}`,container=`jev-wav-${site}-${resourceSuffix}`;
let networkCreated=false,containerCreated=false;
try{
  await docker(['network','create','--label','agent-browser-jev.webarena-verified=true',network]);
  networkCreated=true;
  await docker(['run','--detach','--name',container,'--network',network,
    '--platform',config.platform,'--memory','6g','--cpus','4','--pids-limit','1024',
    '--label','agent-browser-jev.webarena-verified=true',config.image],900_000);
  containerCreated=true;
  const state={schema:1,kind:'webarena-verified-environment',site,image:config.image,
    platform:config.platform,container,network,
    siteUrl:`http://${container}${config.webPort===80?'':`:${config.webPort}`}`,
    resetUrl:`http://${container}:${config.controlPort}`,createdAt:new Date().toISOString(),
    resourcesRemoved:false};
  await resetEnvironment(state);
  await writeFile(statePath,JSON.stringify(state,null,2)+'\n',{flag:'w',mode:0o600});
  console.log(JSON.stringify({state:'started',...state,statePath}));
}catch(error){
  if(containerCreated)await docker(['container','rm','--force',container]).catch(()=>{});
  if(networkCreated)await docker(['network','rm',network]).catch(()=>{});
  throw error;
}
