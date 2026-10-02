#!/usr/bin/env node
// The only host dependency of this external benchmark lane is Docker.
import { execFile } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { assertEnvironment, lockEnvironment, replaceBackend, checkCleanStart, readPersistedState,
  harnessFingerprint, assertQualified, runIsolatedArm, saveEnvironment } from './webarena-isolation.mjs';
import { configuredApiKey } from '../scripts/config.mjs';
import { assertSeed } from './study-lib.mjs';
import { recoverBrowserGymReceipts } from './browsergym-receipts.mjs';
import { analyzeBrowserGym, browserGymActor, browserGymAssistanceCost, browserGymCases, integrationCases, webarenaVerifiedCases,
  webarenaVerifiedSupportedCases } from './browsergym-study-lib.mjs';

const execute=promisify(execFile),skill=fileURLToPath(new URL('..',import.meta.url));
const bridge=join(skill,'tests/browsergym'),image='agent-browser-jev-browsergym:0.14.3-wav1';
const {values}=parseArgs({options:{output:{type:'string'},'baseline-dir':{type:'string'},
  'candidate-dir':{type:'string'},cases:{type:'string'},
  suite:{type:'string',default:'miniwob'},arm:{type:'string'},
  seeds:{type:'string'},smoke:{type:'boolean'},'positive-control':{type:'boolean'},headed:{type:'boolean'},
  'webarena-environment':{type:'string'},
  'viewer-port':{type:'string'},'watch-delay-ms':{type:'string'},rebuild:{type:'boolean'},
  'cleanup-image':{type:'boolean'},help:{type:'boolean'}}});
if(values.help){
  console.log('node tests/browsergym-study.mjs --baseline-dir /absolute/path/to/baseline/skill --output /absolute/path/to/new-report.json [--candidate-dir /path] [--suite miniwob|integration|webarena-verified] [--arm baseline|candidate] [--cases id,id] [--seeds 1,2,3] [--webarena-environment /path/environment.json] [--headed] [--viewer-port 6080] [--watch-delay-ms 5000] [--rebuild] [--cleanup-image]\nNo-key same-page/evaluator check: --smoke [--positive-control] --output /absolute/path/to/new-smoke.json');
  process.exit(0);
}
const suite=values.suite,smoke=Boolean(values.smoke),positiveControl=Boolean(values['positive-control']),
  defaultCases=suite==='integration'?
  integrationCases:suite==='webarena-verified'?webarenaVerifiedCases:
  ['click-button','choose-list','click-checkboxes','enter-text','use-autocomplete'],
  cases=(values.cases??defaultCases.join(',')).split(',').map(x=>x.trim()),
  seeds=(values.seeds??(suite==='webarena-verified'?'0':'1,2,3')).split(',').map(x=>assertSeed(Number(x.trim()))),
  headed=Boolean(values.headed),
  watchDelayMs=values['watch-delay-ms']===undefined?(headed&&smoke?5000:0):Number(values['watch-delay-ms']),
  requestedPort=values['viewer-port']===undefined?null:Number(values['viewer-port']);
const supportedCases=suite==='miniwob'?browserGymCases:suite==='integration'?
  integrationCases:webarenaVerifiedSupportedCases;
if(!values.output || (!smoke&&!values['baseline-dir']) || (positiveControl&&(!smoke||suite!=='webarena-verified')) ||
    (values.arm&&(!['baseline','candidate'].includes(values.arm)||smoke)) ||
    !['miniwob','integration','webarena-verified'].includes(suite) ||
    (smoke&&suite==='integration') || (suite==='webarena-verified'&&!values['webarena-environment']) || !cases.length ||
    cases.some(x=>!supportedCases.includes(x)) || new Set(cases).size!==cases.length ||
    !seeds.length || new Set(seeds).size!==seeds.length ||
    !Number.isSafeInteger(watchDelayMs) || watchDelayMs<0 || watchDelayMs>60000 ||
    (requestedPort!==null&&(!headed||!Number.isSafeInteger(requestedPort)||requestedPort<1||requestedPort>65535)) ||
    (!headed&&watchDelayMs!==0))
  throw new Error('Provide a new output, a baseline for scored studies, and unique supported cases and seeds');
const output=resolve(values.output),baseline=smoke?null:resolve(values['baseline-dir']),
  candidate=smoke?null:resolve(values['candidate-dir']??skill);
const webarenaEnvironment=suite==='webarena-verified'?
  JSON.parse(await readFile(resolve(values['webarena-environment']),'utf8')):null;
if(webarenaEnvironment&&(webarenaEnvironment.kind!=='webarena-verified-environment'||
  webarenaEnvironment.resourcesRemoved||!webarenaEnvironment.siteUrl||!webarenaEnvironment.resetUrl||
  !webarenaEnvironment.network||!webarenaEnvironment.site))
  throw new Error('WebArena-Verified environment file is not an active scoped environment');
const apiKey=smoke?null:configuredApiKey();
const name=`jev-bgym-${randomUUID().slice(0,12)}`;
const report={schema:1,kind:`browsergym-${suite}-study`,startedAt:new Date().toISOString(),
  image,casesSelected:cases,seedsSelected:seeds,smoke,headed,arms:{},cleanup:{},
  modelDispatch:{started:false}};
report.positiveControl=positiveControl;
if(values.arm)report.selectedArm=values.arm;
if(webarenaEnvironment)report.environment={site:webarenaEnvironment.site,image:webarenaEnvironment.image,
  container:webarenaEnvironment.container,network:webarenaEnvironment.network};
let built=false,containerStarted=false,receiptsCreated=false,unlock=null;
const environmentPath=webarenaEnvironment?resolve(values['webarena-environment']):null;
const cancellation=new AbortController();
let interrupted=null;
const onInterrupt=signal=>{interrupted=signal;cancellation.abort()};
const onSigint=()=>onInterrupt('SIGINT'),onSigterm=()=>onInterrupt('SIGTERM');
process.once('SIGINT',onSigint);process.once('SIGTERM',onSigterm);
const docker=(args,options={})=>execute('docker',args,{timeout:options.timeout??30_000,
  maxBuffer:options.maxBuffer??2e6,env:options.env??process.env,signal:options.signal});
const freePort=()=>new Promise((resolvePort,reject)=>{
  const server=createServer();server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
    const port=server.address().port;server.close(error=>error?reject(error):resolvePort(port));
  });
});
try{
  if(webarenaEnvironment){
    assertEnvironment(webarenaEnvironment,environmentPath);
    unlock=await lockEnvironment(environmentPath);
    if(!smoke)assertQualified(webarenaEnvironment,await harnessFingerprint());
  }
  await execute('docker',['info','--format','{{.ServerVersion}}'],{timeout:20_000});
  let imageExists=true;
  try{await docker(['image','inspect',image,'--format','{{.Id}}'])}catch{imageExists=false}
  if(!imageExists||values.rebuild){
    await docker(['build','--tag',image,bridge],{timeout:900_000,maxBuffer:5e6,
      signal:cancellation.signal});
    built=!imageExists;
  }
  if(cancellation.signal.aborted)throw new Error('Study interrupted');
  report.imageId=(await docker(['image','inspect',image,'--format','{{.Id}}'])).stdout.trim();
  report.bridgeSha256={};
  for(const file of ['Dockerfile','episode.py','integration_tasks.py','receipts.py','run-helper.mjs','task-values.mjs'])
    report.bridgeSha256[file]=createHash('sha256').update(await readFile(join(bridge,file))).digest('hex');
  if(!smoke){
    for(const [arm,path] of [['baseline',baseline],['candidate',candidate]]){
      const sourceSha256={};
      for(const file of ['SKILL.md','package.json','package-lock.json',...(await readdir(join(path,'scripts'))).filter(name=>name.endsWith('.mjs')).sort().map(name=>`scripts/${name}`)])
        sourceSha256[file]=createHash('sha256').update(await readFile(join(path,file))).digest('hex');
      report.arms[arm]={directory:path,version:JSON.parse(await readFile(join(path,'package.json'),'utf8')).version,
        sourceSha256};
    }
  }
  const args=['run','--init','--rm','--name',name,'--network',webarenaEnvironment?.network??'bridge',
    '--memory','4g','--cpus','2',
    '--pids-limit','512','--shm-size','512m',
    '--mount',`type=bind,source=${bridge},target=/bridge,readonly`];
  // All episodes and helper receipts survive container/evaluator failures.
  // A new private directory prevents mixing an earlier interrupted invocation.
  await mkdir(dirname(output),{recursive:true,mode:0o700});
  await mkdir(output+'.receipts',{mode:0o700});
  receiptsCreated=true;
  args.push('--mount',`type=bind,source=${output}.receipts,target=/receipts`,
    '--env','JEV_GYM_RECEIPTS=/receipts','--env','JEV_CALLER_RECEIPTS=/receipts');
  if(!smoke){
    for(const variable of ['JEV_CALLER_DEADLINE','JEV_CALLER_MAX_USD','JEV_CALLER_MAX_INVOCATIONS','JEV_CALLER_QUALIFICATION'])
      if(process.env[variable])args.push('--env',variable);
  }
  const viewerPort=headed?(requestedPort??await freePort()):null;
  const viewerPassword=headed?randomBytes(6).toString('base64url'):null;
  if(headed){
    args.push('--publish',`127.0.0.1:${viewerPort}:6080`,
      '--env','JEV_GYM_VIEWER_PASSWORD');
    report.viewer={url:`http://127.0.0.1:${viewerPort}/vnc.html?autoconnect=true`,
      port:viewerPort,watchDelayMs};
  }
  if(!smoke){
    args.push('--mount',`type=bind,source=${baseline},target=/input/baseline,readonly`,
      '--mount',`type=bind,source=${candidate},target=/input/candidate,readonly`,
      '--env','OPENROUTER_API_KEY');
  }
  if(webarenaEnvironment){
    const names={reddit:'WA_REDDIT',gitlab:'WA_GITLAB',shopping:'WA_SHOPPING',
      shopping_admin:'WA_SHOPPING_ADMIN',wikipedia:'WA_WIKIPEDIA',map:'WA_MAP'};
    for(const variable of Object.values(names))args.push('--env',`${variable}=todo`);
    args.push('--env',`${names[webarenaEnvironment.site]}=${webarenaEnvironment.siteUrl}`,
      '--env',`WA_HOMEPAGE=${webarenaEnvironment.siteUrl}`,
      '--env',`WA_FULL_RESET=${webarenaEnvironment.resetUrl}`);
  }
  const commonArgs=[...args,image,'python','/bridge/episode.py','--suite',suite];
  if(webarenaEnvironment)commonArgs.push('--webarena-site',webarenaEnvironment.site,
    '--webarena-reset-url',webarenaEnvironment.resetUrl);
  if(smoke)commonArgs.push('--smoke');
  else commonArgs.push('--baseline-dir','/input/baseline','--candidate-dir','/input/candidate');
  if(headed)commonArgs.push('--headed','--watch-delay-ms',String(watchDelayMs));
  if(positiveControl)commonArgs.push('--positive-control');
  if(headed)console.error(`Headed viewer: ${report.viewer.url}\nViewer password: ${viewerPassword}\nThe viewer closes when this run finishes.`);
  const raw={kind:report.kind,smoke,cases:[]};
  report.cases=raw.cases;
  async function invoke(selectedCases,selectedSeeds,arm=null,cleanStart=null){
    if(cancellation.signal.aborted)throw new Error('Study interrupted');
    const launch=[...commonArgs,'--cases',selectedCases.join(','),'--seeds',selectedSeeds.join(',')];
    if(arm)launch.push('--arm',arm);
    // The proof is consumed by the harness, never by the helper prompt.
    if(cleanStart)launch.splice(launch.indexOf(image),0,'--env','JEV_WEBARENA_CLEAN_START');
    containerStarted=true;
    // Failures after dispatch remain conservatively charge-unknown until usage is known.
    if(!smoke)report.modelDispatch={started:true,at:new Date().toISOString()};
    const result=await docker(launch,{timeout:Math.max(300_000,selectedCases.length*selectedSeeds.length*400_000),
      maxBuffer:100e6,signal:cancellation.signal,env:{...process.env,
        ...(apiKey?{OPENROUTER_API_KEY:apiKey}:{}),
        ...(cleanStart?{JEV_WEBARENA_CLEAN_START:JSON.stringify(cleanStart)}:{}),
        ...(viewerPassword?{JEV_GYM_VIEWER_PASSWORD:viewerPassword}:{})}});
    const episode=JSON.parse(result.stdout);
    if(result.stderr.trim())report.containerStderr=result.stderr.slice(-12_000);
    raw.cases.push(...episode.cases);
    for(const trial of episode.cases)
      trial.actor=browserGymActor(trial.result,smoke);
    for(const key of ['browsergymVersion','miniwobCommit','webarenaVerifiedVersion'])report[key]=episode[key];
    if(episode.error)throw new Error(episode.error);
    if(webarenaEnvironment){
      if(episode.cases.length!==1)throw new Error('Expected exactly one isolated arm');
      const trial=episode.cases[0];
      trial.actionScope={verdict:'unassessed',method:'requires separate trace and persisted-effect audit'};
      const partialDir=output+'.arms';
      await mkdir(partialDir,{recursive:true,mode:0o700});
      const partialPath=join(partialDir,String(raw.cases.length).padStart(3,'0')+'.json');
      await writeFile(partialPath,JSON.stringify(trial,null,2)+'\n',{flag:'wx',mode:0o600});
      trial.persistedAfter=await readPersistedState(webarenaEnvironment);
      await writeFile(partialPath,JSON.stringify(trial,null,2)+'\n',{mode:0o600});
      if(trial.failureClass==='infrastructure'||(!smoke&&(!Number.isFinite(trial.result?.jev?.costUsd)||
          browserGymAssistanceCost(trial.result)===null)))
        throw new Error('Isolated arm failed or has unknown charges; preserved result, stopped before next arm');
    }
  }
  if(webarenaEnvironment){
    for(const seed of (smoke?seeds.slice(0,1):seeds)){
      for(const [index,id] of (smoke?cases.slice(0,1):cases).entries()){
        const order=smoke?[null]:values.arm?[values.arm]:(seed+index)%2?['baseline','candidate']:['candidate','baseline'];
        for(const arm of order)await runIsolatedArm({
          restore:()=>replaceBackend(webarenaEnvironment,environmentPath),
          verify:()=>checkCleanStart(webarenaEnvironment,environmentPath),
          run:cleanStart=>invoke([id],[seed],arm,cleanStart),
        });
      }
    }
    // Positive controls and the last scored arm must not leave dirty shared state.
    report.cleanup.backendRestored=await replaceBackend(webarenaEnvironment,environmentPath);
    if(smoke&&raw.cases[0]?.verification?.passed){
      webarenaEnvironment.isolation.evaluatorControls??={};
      webarenaEnvironment.isolation.evaluatorControls[positiveControl?'positive':'negative']={
        passed:true,harnessFingerprint:await harnessFingerprint(),report:output,
        restored:report.cleanup.backendRestored,checkedAt:new Date().toISOString()};
      await saveEnvironment(environmentPath,webarenaEnvironment);
    }
  }else await invoke(cases,seeds,values.arm??null);
  if(smoke){
    report.verdict=raw.cases.length===1&&raw.cases[0].verification?.passed?'passed':'incomplete';
  }else if(values.arm){
    report.verdict=raw.cases.length===cases.length*seeds.length&&
      raw.cases.every(trial=>trial.failureClass!=='infrastructure')?'single_arm_recorded':'incomplete';
  }else{
    const analyzed=analyzeBrowserGym(raw,cases,seeds,suite);
    report.analysis=analyzed.analysis;
    report.infrastructure=analyzed.infrastructure;
    report.verdict=analyzed.verdict;
  }
}catch(error){
  report.verdict='incomplete';
  const rawDetail=String(error.stderr||error.message);
  const detail=apiKey?rawDetail.replaceAll(apiKey,'[REDACTED]'):rawDetail;
  report.error=detail.slice(-4000);
}
finally{
  if(containerStarted){
    try{await docker(['container','rm','--force',name]);report.cleanup.containerRemoved=true}
    catch{
      try{await docker(['container','inspect',name]);report.cleanup.containerRemoved=false;report.verdict='incomplete'}
      catch{report.cleanup.containerRemoved=true} // --rm already removed it.
    }
    if(headed)report.cleanup.viewerStopped=report.cleanup.containerRemoved;
  }
  if(receiptsCreated){
    try{
      const recovered=await recoverBrowserGymReceipts(output+'.receipts',report.cases??[]);
      report.cases??=[];
      for(const trial of recovered.trials)trial.actor=browserGymActor(trial.result,smoke);
      report.cases.push(...recovered.trials);
      report.receiptRecovery={directory:output+'.receipts',recoveredTrials:recovered.trials.length,
        errors:recovered.errors,orphanHelperReceipts:recovered.orphanHelperReceipts};
      if(recovered.trials.length||recovered.errors.length||recovered.orphanHelperReceipts.length)
        report.verdict='incomplete';
    }catch(error){report.receiptRecovery={error:String(error.message)};report.verdict='incomplete'}
  }
  if(unlock)await unlock();
  if(built&&values['cleanup-image']){
    try{await docker(['image','rm',image],{timeout:120_000});report.cleanup.imageRemoved=true}
    catch{report.cleanup.imageRemoved=false;report.verdict='incomplete'}
  }
  process.removeListener('SIGINT',onSigint);
  process.removeListener('SIGTERM',onSigterm);
}
if(interrupted)report.interrupted=interrupted;
report.finishedAt=new Date().toISOString();
await mkdir(dirname(output),{recursive:true,mode:0o700});
await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({verdict:report.verdict,output,summary:report.analysis?.summary??null}));
if(interrupted)process.exitCode=interrupted==='SIGINT'?130:143;
else if(['incomplete','regressed'].includes(report.verdict))process.exitCode=1;
