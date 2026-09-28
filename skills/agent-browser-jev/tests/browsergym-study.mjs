#!/usr/bin/env node
// The only host dependency of this external benchmark lane is Docker.
import { execFile } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { configuredApiKey } from '../scripts/config.mjs';
import { assertSeed } from './study-lib.mjs';
import { analyzeBrowserGym, browserGymCases, integrationCases, webarenaVerifiedCases,
  webarenaVerifiedSupportedCases } from './browsergym-study-lib.mjs';

const execute=promisify(execFile),skill=fileURLToPath(new URL('..',import.meta.url));
const bridge=join(skill,'tests/browsergym'),image='agent-browser-jev-browsergym:0.14.3-wav1';
const {values}=parseArgs({options:{output:{type:'string'},'baseline-dir':{type:'string'},
  'candidate-dir':{type:'string'},cases:{type:'string'},
  suite:{type:'string',default:'miniwob'},
  seeds:{type:'string'},smoke:{type:'boolean'},'positive-control':{type:'boolean'},headed:{type:'boolean'},
  'webarena-environment':{type:'string'},
  'viewer-port':{type:'string'},'watch-delay-ms':{type:'string'},rebuild:{type:'boolean'},
  'cleanup-image':{type:'boolean'},help:{type:'boolean'}}});
if(values.help){
  console.log('node tests/browsergym-study.mjs --baseline-dir /absolute/path/to/baseline/skill --output /absolute/path/to/new-report.json [--candidate-dir /path] [--suite miniwob|integration|webarena-verified] [--cases id,id] [--seeds 1,2,3] [--webarena-environment /path/environment.json] [--headed] [--viewer-port 6080] [--watch-delay-ms 5000] [--rebuild] [--cleanup-image]\nNo-key same-page/evaluator check: --smoke [--positive-control] --output /absolute/path/to/new-smoke.json');
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
  image,casesSelected:cases,seedsSelected:seeds,smoke,headed,arms:{},cleanup:{}};
report.positiveControl=positiveControl;
if(webarenaEnvironment)report.environment={site:webarenaEnvironment.site,image:webarenaEnvironment.image,
  container:webarenaEnvironment.container,network:webarenaEnvironment.network};
let built=false,containerStarted=false;
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
  for(const file of ['Dockerfile','episode.py','integration_tasks.py','run-helper.mjs','task-values.mjs'])
    report.bridgeSha256[file]=createHash('sha256').update(await readFile(join(bridge,file))).digest('hex');
  if(!smoke){
    for(const [arm,path] of [['baseline',baseline],['candidate',candidate]]){
      const sourceSha256={};
      for(const file of ['SKILL.md','scripts/run.mjs','scripts/jev-browser.mjs','scripts/controls.mjs','package-lock.json'])
        sourceSha256[file]=createHash('sha256').update(await readFile(join(path,file))).digest('hex');
      report.arms[arm]={directory:path,version:JSON.parse(await readFile(join(path,'package.json'),'utf8')).version,
        sourceSha256};
    }
  }
  const args=['run','--rm','--name',name,'--network',webarenaEnvironment?.network??'bridge',
    '--memory','4g','--cpus','2',
    '--pids-limit','512','--shm-size','512m',
    '--mount',`type=bind,source=${bridge},target=/bridge,readonly`];
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
  args.push(image,'python','/bridge/episode.py','--suite',suite,'--cases',cases.join(','),'--seeds',seeds.join(','));
  if(webarenaEnvironment)args.push('--webarena-site',webarenaEnvironment.site,
    '--webarena-reset-url',webarenaEnvironment.resetUrl);
  if(smoke)args.push('--smoke');
  else args.push('--baseline-dir','/input/baseline','--candidate-dir','/input/candidate');
  if(headed)args.push('--headed','--watch-delay-ms',String(watchDelayMs));
  if(positiveControl)args.push('--positive-control');
  if(headed)console.error(`Headed viewer: ${report.viewer.url}\nViewer password: ${viewerPassword}\nThe viewer closes when this run finishes.`);
  containerStarted=true;
  const result=await docker(args,{timeout:Math.max(300_000,cases.length*seeds.length*400_000),
    maxBuffer:100e6,signal:cancellation.signal,env:{...process.env,
      ...(apiKey?{OPENROUTER_API_KEY:apiKey}:{}),
      ...(viewerPassword?{JEV_GYM_VIEWER_PASSWORD:viewerPassword}:{})}});
  const raw=JSON.parse(result.stdout);
  if(result.stderr.trim())report.containerStderr=result.stderr.slice(-12_000);
  report.cases=raw.cases;
  report.browsergymVersion=raw.browsergymVersion;
  report.miniwobCommit=raw.miniwobCommit;
  report.webarenaVerifiedVersion=raw.webarenaVerifiedVersion;
  if(smoke){
    report.verdict=raw.cases.length===1&&raw.cases[0].verification?.passed?'passed':'incomplete';
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
