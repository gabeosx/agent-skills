#!/usr/bin/env node
// Checkpointed, sequential BrowserGym campaign. Docker remains in the study runner.
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, open, readFile, readdir, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { browserGymCases, integrationCases, webarenaVerifiedSupportedCases } from './browsergym-study-lib.mjs';
import { campaignCases, integrationCampaignCases, webarenaVerifiedCampaignCases, campaignSummary, nextCampaignTrial, trialCharge, trialKey } from './browsergym-campaign-lib.mjs';
import { assertSeed } from './study-lib.mjs';
import { configuredApiKey } from '../scripts/config.mjs';

const skill=fileURLToPath(new URL('..',import.meta.url));
const {values}=parseArgs({options:{
  'run-dir':{type:'string'},'baseline-dir':{type:'string'},'candidate-dir':{type:'string'},
  suite:{type:'string'},cases:{type:'string'},seeds:{type:'string'},'max-hours':{type:'string'},
  'max-usd':{type:'string'},'max-retries':{type:'string'},
  'holdout-cases':{type:'string'},
  once:{type:'boolean'},'init-only':{type:'boolean'},status:{type:'boolean'},
  defer:{type:'string'},reason:{type:'string'},retry:{type:'string'},
  'reconcile-run':{type:'string'},'record-validation':{type:'string'},
  'change-note':{type:'string'},help:{type:'boolean'},
  'webarena-environment':{type:'string'},
}});
if(values.help){
  console.log('Initialize: node tests/browsergym-campaign.mjs --run-dir /absolute/private/path --baseline-dir /path/to/skill --max-hours 8 --max-usd 10 [--suite miniwob|integration|webarena-verified] [--cases id,id] [--holdout-cases id,id] [--seeds 11,12] [--webarena-environment /path/environment.json] [--max-retries 3] [--init-only]\nRun/resume: node tests/browsergym-campaign.mjs --run-dir /same/path [--once] [--retry case/seed,case/seed] [--change-note "What changed and why"]\nInspect: --status. Mark unsupported: --defer case/seed --reason "why". Reconcile incomplete: --reconcile-run runId --reason "inspection result". Audit a local component report: --record-validation /path/inside/run-dir.json --reason "what it checked". Reports and source snapshots stay in the run directory.');
  process.exit(0);
}
if(!values['run-dir'])throw new Error('Provide --run-dir');
const runDir=resolve(values['run-dir']);
const manifestPath=join(runDir,'manifest.json'),eventsDir=join(runDir,'events');
const allowedNames=/^[a-z0-9-]+$/;
const sha=value=>createHash('sha256').update(value).digest('hex');
const ignored=new Set(['node_modules','.runs','.git','evidence']);

async function sourceFiles(root){
  const files={};
  async function walk(dir){
    for(const entry of await readdir(dir,{withFileTypes:true})){
      if(ignored.has(entry.name))continue;
      const path=join(dir,entry.name);
      if(entry.isDirectory())await walk(path);
      else if(entry.isFile())files[relative(root,path).split(sep).join('/')]=sha(await readFile(path));
      else throw new Error(`Unsupported source entry: ${path}`);
    }
  }
  await walk(root);
  return Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));
}

function fingerprints(files){
  const all=sha(JSON.stringify(files));
  const runtime=Object.fromEntries(Object.entries(files).filter(([path])=>
    path.startsWith('scripts/')||['package.json','package-lock.json',
      'tests/browsergym/task-values.mjs','tests/browsergym/run-helper.mjs',
      'tests/browsergym/episode.py','tests/browsergym/integration_tasks.py'].includes(path)));
  return {source:all,runtime:sha(JSON.stringify(runtime)),files};
}

async function snapshot(source){
  const root=await realpath(source),fingerprint=fingerprints(await sourceFiles(root));
  const dest=join(runDir,'snapshots',fingerprint.source);
  try{await stat(dest)}catch{
    const temporary=`${dest}.tmp-${randomUUID()}`;
    await mkdir(temporary,{mode:0o700});
    for(const path of Object.keys(fingerprint.files)){
      const target=join(temporary,path);
      await mkdir(resolve(target,'..'),{recursive:true,mode:0o700});
      await copyFile(join(root,path),target);
    }
    try{await rename(temporary,dest)}catch(error){
      // A concurrent snapshot is not expected; preserve the unexpected copy.
      throw new Error(`Could not finalize source snapshot ${temporary}: ${error.message}`);
    }
  }
  return {...fingerprint,directory:dest};
}

async function readEvents(){
  const names=(await readdir(eventsDir)).filter(name=>/^\d{6}\.json$/.test(name)).sort();
  const events=[];
  for(const name of names){
    const event=JSON.parse(await readFile(join(eventsDir,name),'utf8'));
    const {eventHash,...unsigned}=event;
    if(event.sequence!==events.length+1||name!==`${String(event.sequence).padStart(6,'0')}.json`||
      event.previousHash!==(events.at(-1)?.eventHash??null)||eventHash!==sha(JSON.stringify(unsigned)))
      throw new Error(`Campaign audit chain is invalid at ${name}`);
    events.push(event);
  }
  return events;
}

async function appendEvent(events,payload){
  const event={sequence:events.length+1,at:new Date().toISOString(),...payload,
    previousHash:events.at(-1)?.eventHash??null};
  event.eventHash=sha(JSON.stringify(event));
  const final=join(eventsDir,`${String(event.sequence).padStart(6,'0')}.json`);
  const temporary=`${final}.tmp-${randomUUID()}`;
  await writeFile(temporary,JSON.stringify(event,null,2)+'\n',{flag:'wx',mode:0o600});
  await rename(temporary,final);
  events.push(event);
  return event;
}

async function lock(){
  const path=join(runDir,'runner.lock');
  try{
    const handle=await open(path,'wx',0o600);
    await handle.writeFile(JSON.stringify({pid:process.pid,at:new Date().toISOString()}));
    await handle.close();
  }catch(error){
    if(error.code!=='EEXIST')throw error;
    const old=JSON.parse(await readFile(path,'utf8'));
    try{process.kill(old.pid,0);throw new Error(`Campaign runner already active as PID ${old.pid}`)}
    catch(check){if(check.code!=='ESRCH')throw check}
    await rename(path,`${path}.stale-${Date.now()}`);
    return lock();
  }
  return ()=>unlink(path);
}

function parseList(value,kind){
  const items=value.split(',').map(item=>item.trim());
  if(!items.length||items.some(item=>!item)||new Set(items).size!==items.length)
    throw new Error(`Choose unique ${kind}`);
  return items;
}

async function initialize(){
  if(!values['baseline-dir']||!values['max-hours']||!values['max-usd'])
    throw new Error('New campaigns require --baseline-dir, --max-hours, and --max-usd');
  const suite=values.suite??'miniwob';
  if(!['miniwob','integration','webarena-verified'].includes(suite))throw new Error('Unknown BrowserGym suite');
  const defaults=suite==='miniwob'?campaignCases:suite==='integration'?
    integrationCampaignCases:webarenaVerifiedCampaignCases;
  const supported=suite==='miniwob'?browserGymCases:suite==='integration'?
    integrationCases:webarenaVerifiedSupportedCases;
  const cases=parseList(values.cases??defaults.join(','),'cases');
  const seeds=parseList(values.seeds??(suite==='webarena-verified'?'0':'11,12'),'seeds')
    .map(value=>assertSeed(Number(value)));
  if(cases.some(id=>!allowedNames.test(id)||!supported.includes(id)))
    throw new Error('Unknown BrowserGym case');
  const holdoutCases=values['holdout-cases']?parseList(values['holdout-cases'],'holdout cases'):[];
  if(holdoutCases.some(id=>!cases.includes(id))||holdoutCases.length===cases.length)
    throw new Error('Holdout cases must be a proper subset of configured cases');
  let webarenaEnvironment=null;
  if(suite==='webarena-verified'){
    if(!values['webarena-environment'])throw new Error('WebArena-Verified requires --webarena-environment');
    const path=await realpath(resolve(values['webarena-environment']));
    webarenaEnvironment=JSON.parse(await readFile(path,'utf8'));
    if(webarenaEnvironment.kind!=='webarena-verified-environment'||
      webarenaEnvironment.resourcesRemoved)throw new Error('WebArena-Verified environment is not active');
    webarenaEnvironment={path,site:webarenaEnvironment.site,image:webarenaEnvironment.image,
      container:webarenaEnvironment.container,network:webarenaEnvironment.network};
  }
  const maxHours=Number(values['max-hours']),maxCostUsd=Number(values['max-usd']);
  const maxRetries=values['max-retries']===undefined?3:Number(values['max-retries']);
  if(!Number.isFinite(maxHours)||maxHours<=0||maxHours>24||
    !Number.isFinite(maxCostUsd)||maxCostUsd<=0||maxCostUsd>100||
    !Number.isSafeInteger(maxRetries)||maxRetries<0||maxRetries>3)
    throw new Error('Use positive bounded duration/spend and 0..3 retries');
  await mkdir(runDir,{recursive:true,mode:0o700});
  await mkdir(eventsDir,{mode:0o700});
  await mkdir(join(runDir,'reports'),{mode:0o700});
  await mkdir(join(runDir,'snapshots'),{mode:0o700});
  const baseline=await snapshot(resolve(values['baseline-dir']));
  const manifest={schema:1,kind:'browsergym-campaign',startedAt:new Date().toISOString(),
    maxDurationMs:Math.round(maxHours*3_600_000),maxCostUsd,costReserveUsd:Math.min(0.5,maxCostUsd*0.05),
    maxRetries,suite,cases,seeds,baselineSnapshot:relative(runDir,baseline.directory),
    taskSets:{development:cases.filter(id=>!holdoutCases.includes(id)).flatMap(id=>
      seeds.map(seed=>trialKey(id,seed))),holdout:holdoutCases.flatMap(id=>
      seeds.map(seed=>trialKey(id,seed)))},
    baselineFingerprint:baseline.runtime,candidateSource:resolve(values['candidate-dir']??skill),
    benchmark:suite==='miniwob'?'BrowserGym MiniWoB 0.14.3':
      suite==='integration'?'BrowserGym core original integration tasks 0.14.3':
      'BrowserGym WebArena-Verified 0.14.3 / WebArena-Verified 1.2.3 browser-control subset',
    webarenaEnvironment,execution:'sequential Docker pairs'};
  const temporary=`${manifestPath}.tmp-${randomUUID()}`;
  await writeFile(temporary,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
  await rename(temporary,manifestPath);
  return manifest;
}

async function runPair(manifest,events,next,candidate){
  const runId=randomUUID(),name=`${String(events.length+1).padStart(4,'0')}-${next.id}-${next.seed}-a${next.attempt}`;
  const report=join(runDir,'reports',`${name}.json`);
  await appendEvent(events,{type:'trial_started',runId,id:next.id,seed:next.seed,
    attempt:next.attempt,candidateFingerprint:candidate.runtime,
    report:relative(runDir,report)});
  const args=[join(skill,'tests/browsergym-study.mjs'),'--suite',manifest.suite??'miniwob',
    '--baseline-dir',join(runDir,manifest.baselineSnapshot),
    '--candidate-dir',candidate.directory,'--cases',next.id,'--seeds',String(next.seed),'--output',report];
  if(manifest.suite==='webarena-verified')
    args.push('--webarena-environment',manifest.webarenaEnvironment.path);
  const remaining=Date.parse(manifest.startedAt)+manifest.maxDurationMs-Date.now();
  let stdout='',stderr='',timedOut=false;
  const child=spawn(process.execPath,args,{cwd:skill,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',data=>{stdout=(stdout+data).slice(-4000)});
  child.stderr.on('data',data=>{stderr=(stderr+data).slice(-4000)});
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGINT')},Math.max(1,remaining));
  const forward=()=>child.kill('SIGINT');
  process.once('SIGINT',forward);process.once('SIGTERM',forward);
  const exitCode=await new Promise((resolveExit,reject)=>{
    child.once('error',reject);child.once('exit',code=>resolveExit(code));
  }).finally(()=>{clearTimeout(timer);process.off('SIGINT',forward);process.off('SIGTERM',forward)});
  let raw;
  try{raw=JSON.parse(await readFile(report,'utf8'))}catch(error){
    await appendEvent(events,{type:'run_error',runId,id:next.id,seed:next.seed,
      attempt:next.attempt,exitCode,timedOut,error:String(error.message).slice(0,500),
      stdout:stdout.slice(-1000),stderr:stderr.slice(-1000)});
    return {state:'run_error',id:next.id,seed:next.seed,report};
  }
  const pair=raw.analysis?.pairs?.[0];
  const charge=trialCharge(raw);
  const event=await appendEvent(events,{type:'trial',runId,id:next.id,seed:next.seed,
    attempt:next.attempt,report:relative(runDir,report),reportSha256:sha(await readFile(report)),
    candidateFingerprint:candidate.runtime,candidateSourceFingerprint:candidate.source,
    baselineFingerprint:manifest.baselineFingerprint,baselinePassed:pair?.baseline??false,
    candidatePassed:pair?.candidate??false,baselineFailure:pair?.baselineFailure??null,
    candidateFailure:pair?.candidateFailure??null,verdict:raw.verdict,
    costUsd:charge,cleanup:raw.cleanup,exitCode,timedOut});
  console.log(JSON.stringify({type:'trial',id:event.id,seed:event.seed,attempt:event.attempt,
    baselinePassed:event.baselinePassed,candidatePassed:event.candidatePassed,
    failure:event.candidateFailure,costUsd:event.costUsd,report}));
  return raw.verdict==='incomplete'||!raw.cleanup?.containerRemoved||charge===null||timedOut
    ?{state:'run_error',id:next.id,seed:next.seed,report}:{state:'recorded'};
}

const exists=async path=>stat(path).then(()=>true,()=>false);
let manifest=await exists(manifestPath)?JSON.parse(await readFile(manifestPath,'utf8')):null;
if(!manifest){
  if(values.status||values.defer||values['reconcile-run']||values['record-validation'])
    throw new Error('Campaign does not exist');
  manifest=await initialize();
}else if(['baseline-dir','suite','cases','holdout-cases','seeds','max-hours','max-usd','max-retries','candidate-dir','webarena-environment']
  .some(option=>values[option]!==undefined))throw new Error('Resume with --run-dir only; configuration is frozen in manifest.json');
if(manifest.kind!=='browsergym-campaign'||manifest.schema!==1)throw new Error('Invalid campaign manifest');
let events=await readEvents();
if(values['init-only']){console.log(JSON.stringify({state:'initialized',runDir,
  summary:{...campaignSummary(manifest,events),tasks:undefined}}));process.exit(0)}
if(values.status){console.log(JSON.stringify(campaignSummary(manifest,events),null,2));process.exit(0)}
const retryTargets=values.retry?parseList(values.retry,'retry targets'):[];
if(retryTargets.some(key=>!manifest.cases.some(id=>manifest.seeds.some(seed=>key===trialKey(id,seed)))))
  throw new Error('Retry target must be a configured case/seed');
const unlock=await lock();
try{
  events=await readEvents();
  if(values['record-validation']){
    if(values.retry||values.defer||values['reconcile-run']||!values.reason?.trim())
      throw new Error('Use --record-validation report.json --reason "what it checked" alone');
    const path=await realpath(resolve(values['record-validation']));
    const root=await realpath(runDir);
    if(!path.startsWith(`${root}${sep}`))throw new Error('Validation report must be inside the run directory');
    const bytes=await readFile(path),report=JSON.parse(bytes);
    const costUsd=report.summary?.jevCostUsd;
    if(report.kind!=='component-matrix'||!Number.isFinite(costUsd)||costUsd<0||
      !Number.isSafeInteger(report.summary?.passed)||!Number.isSafeInteger(report.summary?.total))
      throw new Error('Expected a measured component-matrix report');
    const reportSha256=sha(bytes);
    if(events.some(event=>event.type==='validation'&&event.reportSha256===reportSha256))
      throw new Error('Validation report already recorded');
    await appendEvent(events,{type:'validation',report:relative(runDir,path),reportSha256,
      note:values.reason.trim(),verdict:report.verdict,passed:report.summary.passed,
      total:report.summary.total,costUsd,cleanup:report.cleanup});
    console.log(JSON.stringify({state:'validation_recorded',report:relative(runDir,path),
      summary:{...campaignSummary(manifest,events),tasks:undefined}}));
  }else if(values['reconcile-run']){
    if(values.retry||values.defer||!values.reason?.trim())
      throw new Error('Use --reconcile-run runId --reason "inspection result" alone');
    const runId=values['reconcile-run'];
    const failed=events.find(event=>event.type==='trial'&&event.runId===runId);
    if(!failed||failed.verdict!=='incomplete'||failed.costUsd!==null||
      events.some(event=>event.type==='charge_reconciled'&&event.runId===runId))
      throw new Error('Run must be an unreconciled incomplete trial');
    if(!failed.cleanup?.containerRemoved)throw new Error('Inspect container cleanup before reconciliation');
    const response=await fetch('https://openrouter.ai/api/v1/key',{
      headers:{Authorization:`Bearer ${configuredApiKey()}`},signal:AbortSignal.timeout(15_000)});
    if(!response.ok)throw new Error(`OpenRouter key-usage check failed: HTTP ${response.status}`);
    const accountUsageUsd=(await response.json()).data?.usage;
    if(!Number.isFinite(accountUsageUsd)||accountUsageUsd<0)
      throw new Error('OpenRouter did not return a numeric cumulative key usage');
    // Reserving the entire cumulative usage conservatively bounds this run's
    // unknown charge, even if the same key was used elsewhere.
    const reservedUsd=accountUsageUsd;
    await appendEvent(events,{type:'charge_reconciled',runId,id:failed.id,seed:failed.seed,
      attempt:failed.attempt,reason:values.reason.trim(),provider:'OpenRouter',
      source:'GET /api/v1/key cumulative usage',accountUsageUsd,reservedUsd});
    console.log(JSON.stringify({state:'charge_reconciled',runId,reservedUsd,
      summary:{...campaignSummary(manifest,events),tasks:undefined}}));
  }else if(values.defer){
    const [id,seedText,extra]=values.defer.split('/'),seed=Number(seedText);
    if(extra||!manifest.cases.includes(id)||!manifest.seeds.includes(seed)||!values.reason?.trim())
      throw new Error('Use --defer case/seed --reason "why" for a configured task');
    await appendEvent(events,{type:'defer',id,seed,reason:values.reason.trim()});
    console.log(JSON.stringify({state:'deferred',key:trialKey(id,seed)}));
  }else{
    const candidateSource=manifest.candidateSource;
    let lastFingerprint=events.filter(event=>event.type==='change').at(-1)?.toFingerprint;
    while(true){
      const candidate=await snapshot(candidateSource);
      if(candidate.runtime!==lastFingerprint){
        if(lastFingerprint&&!values['change-note']?.trim()){
          console.log(JSON.stringify({state:'needs_change_note',from:lastFingerprint,to:candidate.runtime}));
          break;
        }
        const previous=events.filter(event=>event.type==='change').at(-1)?.files??{};
        const changedFiles=[...new Set([...Object.keys(previous),...Object.keys(candidate.files)])]
          .filter(path=>previous[path]!==candidate.files[path]).sort();
        await appendEvent(events,{type:'change',fromFingerprint:lastFingerprint??null,
          toFingerprint:candidate.runtime,sourceFingerprint:candidate.source,
          snapshot:relative(runDir,candidate.directory),files:candidate.files,changedFiles,
          targets:retryTargets,
          note:values['change-note']?.trim()??'Initial candidate snapshot'});
        lastFingerprint=candidate.runtime;
      }
      const next=nextCampaignTrial(manifest,events,candidate.runtime,Date.now(),retryTargets);
      if(next.state!=='run'){
        console.log(JSON.stringify({state:next.state,summary:{...next.summary,tasks:undefined}}));
        break;
      }
      const result=await runPair(manifest,events,next,candidate);
      if(result.state==='run_error'){
        console.log(JSON.stringify(result));
        process.exitCode=1;
        break;
      }
      if(values.once)break;
    }
  }
}finally{await unlock()}
