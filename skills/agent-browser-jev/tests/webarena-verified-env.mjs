#!/usr/bin/env node
// Scoped lifecycle manager. Reset means replacing the persisted backend.
import { execFile } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs, promisify } from 'node:util';
import { redditImage, isolationProtocol, environmentIdentity, assertEnvironment,
  launchBackend, inspectBackend, readPersistedState, replaceBackend, checkCleanStart,
  qualifyIsolation, lockEnvironment, saveEnvironment } from './webarena-isolation.mjs';
const execute=promisify(execFile);
const {positionals,values}=parseArgs({allowPositionals:true,options:{
  'run-dir':{type:'string'},site:{type:'string'},help:{type:'boolean'},
}});
const action=positionals[0];
if(values.help||!['start','status','reset','check','qualify','stop'].includes(action)){
  console.log('node tests/webarena-verified-env.mjs start|status|reset|check|qualify|stop --run-dir /absolute/private/path [--site reddit]');
  process.exit(values.help?0:1);
}
if(!values['run-dir']||(values.site&&values.site!=='reddit'))throw new Error('Provide --run-dir; only reddit is supported');
const runDir=resolve(values['run-dir']),statePath=join(runDir,'environment.json');
const docker=(args,timeout=120_000)=>execute('docker',args,{timeout,maxBuffer:4e6});
const readState=async()=>{try{return JSON.parse(await readFile(statePath,'utf8'))}catch(error){if(error.code==='ENOENT')return null;throw error;}};
const prior=await readState();
if(action==='status'){
  let backend=null;
  if(prior&&!prior.resourcesRemoved)backend=await inspectBackend(prior).catch(()=>null);
  console.log(JSON.stringify({running:Boolean(backend),state:prior,backend}));
  process.exit(backend?0:1);
}
await mkdir(runDir,{recursive:true,mode:0o700});
const unlock=await lockEnvironment(statePath);
try{
  if(action==='stop'){
    if(!prior||prior.resourcesRemoved){console.log(JSON.stringify({stopped:false,reason:'not_started'}));}
    else{
      assertEnvironment(prior,statePath);
      await inspectBackend(prior);
      await docker(['rm','--force',prior.container]);
      await docker(['network','rm',prior.network]);
      await saveEnvironment(statePath,{...prior,stoppedAt:new Date().toISOString(),resourcesRemoved:true});
      console.log(JSON.stringify({stopped:true,container:prior.container,network:prior.network,statePath}));
    }
  }else if(action==='start'){
    if(prior&&!prior.resourcesRemoved){
      assertEnvironment(prior,statePath);await inspectBackend(prior);
      if(!prior.isolation)throw new Error('Legacy environment lacks clean-state evidence; stop it and start a fresh environment');
      console.log(JSON.stringify({state:'already_running',statePath}));
    }else{
      const {container,network}=environmentIdentity(statePath);
      const state={schema:2,kind:'webarena-verified-environment',site:'reddit',image:redditImage,
        platform:'linux/amd64',container,network,siteUrl:`http://${container}`,resetUrl:`http://${container}:8877`,
        createdAt:new Date().toISOString(),resourcesRemoved:false};
      await docker(['network','create','--label','agent-browser-jev.webarena-verified=true',network]);
      let launched=false;
      try{
        const backend=await launchBackend(state);launched=true;
        const reference=await readPersistedState(state);
        state.isolation={protocol:isolationProtocol,backend,reference};
        await saveEnvironment(statePath,state);
        console.log(JSON.stringify({state:'started',statePath,backend,referenceSha256:reference.sha256}));
      }catch(error){
        // Only these exact newly created resources belong to this start attempt.
        if(launched)await docker(['rm','--force',container]);
        await docker(['network','rm',network]).catch(()=>{});
        throw error;
      }
    }
  }else{
    if(!prior)throw new Error('Start the scoped environment first');
    assertEnvironment(prior,statePath);
    const result=action==='qualify'?await qualifyIsolation(prior,statePath):
      action==='reset'?await replaceBackend(prior,statePath):await checkCleanStart(prior,statePath);
    console.log(JSON.stringify(result));
  }
}finally{await unlock();}
