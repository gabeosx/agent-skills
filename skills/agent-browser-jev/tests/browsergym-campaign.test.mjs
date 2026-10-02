import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { campaignSummary, nextCampaignTrial, trialCharge, chargeNeedsReconciliation } from './browsergym-campaign-lib.mjs';

const startedAt=new Date(Date.now()-1000).toISOString();
const execute=promisify(execFile);
const manifest={startedAt,maxDurationMs:3_600_000,maxCostUsd:10,costReserveUsd:0.5,
  maxRetries:3,cases:['choose-list','click-button'],seeds:[11]};
const trial=(id,attempt,candidateFingerprint,passed,costUsd=0.01)=>({type:'trial',id,seed:11,
  attempt,candidateFingerprint,candidatePassed:passed,baselinePassed:false,costUsd,
  candidateFailure:passed?null:'gym_reward_zero',report:`reports/${id}-${attempt}.json`});

test('campaign sweeps new tasks, then requires a skill change before each of three retries',()=>{
  const events=[];
  assert.deepEqual(nextCampaignTrial(manifest,events,'v1').state,'run');
  events.push(trial('choose-list',1,'v1',false));
  assert.equal(nextCampaignTrial(manifest,events,'v1').id,'click-button');
  events.push(trial('click-button',1,'v1',true));
  assert.equal(nextCampaignTrial(manifest,events,'v1').state,'needs_target');
  for(let attempt=2;attempt<=4;attempt++){
    const fingerprint=`v${attempt}`;
    events.push({type:'change',toFingerprint:fingerprint,targets:['choose-list/11']});
    const next=nextCampaignTrial(manifest,events,fingerprint,Date.now(),['choose-list/11']);
    assert.equal(next.state,'run');assert.equal(next.id,'choose-list');
    assert.equal(next.attempt,attempt);
    events.push(trial('choose-list',attempt,fingerprint,false));
    assert.equal(nextCampaignTrial(manifest,events,fingerprint,Date.now(),['choose-list/11']).state,
      attempt===4?'complete':'needs_change');
  }
  const summary=campaignSummary(manifest,events);
  assert.equal(summary.counts.exhausted,1);
  assert.equal(summary.retries,3);
  assert.equal(summary.costUsd,0.05);
});

test('completed campaign elapsed time and limit freeze at its final audit event',()=>{
  const start=Date.parse(manifest.startedAt),finishedAt=new Date(start+500).toISOString();
  const events=[{...trial('choose-list',1,'v1',true),at:new Date(start+250).toISOString()},
    {...trial('click-button',1,'v1',true),at:finishedAt}];
  const summary=campaignSummary(manifest,events,start+manifest.maxDurationMs+10_000);
  assert.equal(summary.stage,'complete');
  assert.equal(summary.elapsedMs,500);
  assert.equal(summary.limit,null);
});

test('a new fingerprint does not authorize an unrelated targeted retry',()=>{
  const events=[trial('choose-list',1,'v1',false),trial('click-button',1,'v1',true),
    {type:'change',toFingerprint:'v2',targets:['click-button/11']}];
  assert.equal(nextCampaignTrial(manifest,events,'v2',Date.now(),['choose-list/11']).state,
    'needs_change');
});

test('spend, time and unmetered charges stop before another trial',()=>{
  assert.equal(nextCampaignTrial({...manifest,maxDurationMs:1},[],'v1').state,'time_limit');
  assert.equal(nextCampaignTrial({...manifest,maxCostUsd:0.51},[trial('choose-list',1,'v1',false)],'v2').state,'spend_limit');
  assert.equal(nextCampaignTrial(manifest,[trial('choose-list',1,'v1',false,null)],'v2').state,'unmetered_charge');
});

test('an incomplete pair stays blocked until key usage is conservatively reconciled',()=>{
  const incomplete={...trial('choose-list',2,'v2',false,null),runId:'run-1',
    verdict:'incomplete',candidateFailure:null};
  const events=[trial('choose-list',1,'v1',false),trial('click-button',1,'v1',true),incomplete];
  assert.equal(nextCampaignTrial(manifest,events,'v2',Date.now(),['choose-list/11']).state,
    'unmetered_charge');
  events.push({type:'charge_reconciled',runId:'run-1',reservedUsd:0.5});
  const summary=campaignSummary(manifest,events);
  assert.equal(summary.reportedCostUsd,0.02);
  assert.equal(summary.reservedCostUsd,0.5);
  assert.equal(summary.costUsd,0.52);
  assert.equal(summary.tasks[0].failure,'infrastructure_incomplete');
  const retry=nextCampaignTrial(manifest,events,'v2',Date.now(),['choose-list/11']);
  assert.equal(retry.state,'run');
  assert.equal(retry.attempt,3);
});

test('recorded local validation charges count toward the same campaign budget',()=>{
  const events=[{type:'validation',costUsd:0.25,verdict:'passed',passed:1,total:1}];
  const summary=campaignSummary(manifest,events);
  assert.equal(summary.reportedCostUsd,0.25);
  assert.equal(summary.totalValidations,1);
  assert.equal(nextCampaignTrial({...manifest,maxCostUsd:0.7},events,'v1').state,'spend_limit');
});

test('a scored report with an unknown provider charge can be reconciled without changing its reward',()=>{
  const failed={...trial('choose-list',1,'v1',false,null),runId:'provider-error',verdict:'regressed'};
  assert.equal(chargeNeedsReconciliation(failed,[failed]),true);
  assert.equal(nextCampaignTrial(manifest,[failed],'v1').state,'unmetered_charge');
  const events=[failed,{type:'charge_reconciled',runId:failed.runId,reservedUsd:0.5}];
  assert.equal(chargeNeedsReconciliation(failed,events),false);
  assert.equal(chargeNeedsReconciliation({...failed,costUsd:0},[]),false);
  assert.equal(campaignSummary(manifest,events).views.frozenFirstAttempt.candidatePassed,0);
  assert.equal(campaignSummary(manifest,events).reservedCostUsd,0.5);
});

test('campaign summary separates frozen first attempts, repaired development, and holdout',()=>{
  const split={...manifest,taskSets:{development:['choose-list/11'],holdout:['click-button/11']}};
  const events=[trial('choose-list',1,'v1',false),trial('click-button',1,'v1',true),
    {type:'change',sequence:3,at:new Date().toISOString(),toFingerprint:'v2',
      targets:['choose-list/11'],note:'Ground the observed list option',changedFiles:['scripts/controls.mjs']},
    {...trial('choose-list',2,'v2',true),sequence:4}];
  events[0].sequence=1;events[1].sequence=2;
  const summary=campaignSummary(split,events);
  assert.deepEqual(summary.views.frozenFirstAttempt,{candidatePassed:0,baselinePassed:0,scored:1,total:1});
  assert.deepEqual(summary.views.repairedDevelopment,{candidatePassed:1,baselinePassed:0,scored:1,total:1});
  assert.deepEqual(summary.views.untouchedHoldout,{candidatePassed:1,baselinePassed:0,scored:1,total:1});
  assert.equal(summary.iteration,0); // This fixture has no initial snapshot event.
  assert.equal(summary.changeImpacts.length,0);
});

test('accumulated passes never count as coverage of a newer untested candidate',()=>{
  const events=[trial('choose-list',1,'v1',true),trial('click-button',1,'v1',false),
    {type:'change',toFingerprint:'v2',targets:['click-button/11']},
    trial('click-button',2,'v2',true)];
  const summary=campaignSummary(manifest,events);
  assert.equal(summary.views.repairedDevelopment.candidatePassed,2);
  assert.deepEqual(summary.views.currentDevelopment,{candidatePassed:1,baselinePassed:0,scored:1,total:2});
  assert.deepEqual(summary.currentDevelopment,{fingerprint:'v2',complete:false,untested:['choose-list/11']});
  assert.deepEqual(summary.developmentFingerprints,['v1','v2']);
  events.push({type:'change',toFingerprint:'v3',targets:[]});
  const untested=campaignSummary(manifest,events);
  assert.equal(untested.views.currentDevelopment.scored,0);
  assert.equal(untested.currentDevelopment.untested.length,2);
});

test('first attempts after a code change are not part of the frozen candidate score',()=>{
  const events=[trial('choose-list',1,'v1',true),{type:'change',toFingerprint:'v2'},
    trial('click-button',1,'v2',true)];
  assert.deepEqual(campaignSummary(manifest,events).views.frozenFirstAttempt,
    {candidatePassed:1,baselinePassed:0,scored:1,total:2});
});

test('holdout waits for development convergence and receives only one attempt',()=>{
  const split={...manifest,taskSets:{development:['choose-list/11'],holdout:['click-button/11']}};
  const events=[trial('choose-list',1,'v1',false)];
  assert.equal(nextCampaignTrial(split,events,'v1').state,'needs_target');
  events.push({type:'change',toFingerprint:'v2',targets:['choose-list/11']});
  assert.equal(nextCampaignTrial(split,events,'v2',Date.now(),['choose-list/11']).id,'choose-list');
  events.push(trial('choose-list',2,'v2',true));
  const holdout=nextCampaignTrial(split,events,'v2');
  assert.equal(holdout.id,'click-button');
  assert.equal(holdout.attempt,1);
  events.push(trial('click-button',1,'v2',false));
  const finished=nextCampaignTrial(split,events,'v2',Date.now(),['click-button/11']);
  assert.equal(finished.state,'complete');
  assert.equal(finished.summary.tasks.find(task=>task.cohort==='holdout').state,'exhausted');
});

test('campaign charge requires measured model usage from both arms',()=>{
  assert.equal(trialCharge({cases:[{result:{jev:{calls:1,costUsd:0.1}}},
    {result:{jev:{calls:0,costUsd:null}}}]}),0.1);
  assert.equal(trialCharge({cases:[{result:{jev:{calls:1,costUsd:null}}},
    {result:{jev:{calls:1,costUsd:0.1}}}]}),null);
});

test('only explicit no-dispatch evidence allows an empty failed trial to cost zero',()=>{
  assert.equal(trialCharge({modelDispatch:{started:false}}),0);
  assert.equal(trialCharge({modelDispatch:{started:false},cases:[]}),0);
  assert.equal(trialCharge({modelDispatch:{started:true},cases:[]}),null);
  assert.equal(trialCharge({cases:[]}),null);
  assert.equal(trialCharge({modelDispatch:{started:false},cases:[{result:{jev:{calls:1,costUsd:null}}}]}),null);
});

test('campaign initialization freezes explicit development and holdout task sets',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jev-campaign-holdout-'));
  const runner=fileURLToPath(new URL('./browsergym-campaign.mjs',import.meta.url));
  const skill=fileURLToPath(new URL('..',import.meta.url));
  const runDir=join(root,'run');
  try{
    await execute(process.execPath,[runner,'--run-dir',runDir,'--baseline-dir',skill,
      '--suite','miniwob','--cases','choose-list,click-button','--holdout-cases','click-button',
      '--seeds','11','--max-hours','0.1','--max-usd','1','--init-only']);
    const frozen=JSON.parse(await readFile(join(runDir,'manifest.json'),'utf8'));
    assert.deepEqual(frozen.taskSets,{development:['choose-list/11'],holdout:['click-button/11']});
  }finally{await rm(root,{recursive:true,force:true})}
});

test('dashboard serves read-only current status on localhost',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'jev-campaign-dashboard-'));
  const serverPath=fileURLToPath(new URL('./browsergym-dashboard.mjs',import.meta.url));
  let child;
  try{
    await mkdir(join(dir,'events'));
    await writeFile(join(dir,'manifest.json'),JSON.stringify({...manifest,benchmark:'BrowserGym MiniWoB 0.14.3'}));
    child=spawn(process.execPath,[serverPath,'--run-dir',dir],{stdio:['ignore','pipe','pipe']});
    const url=await new Promise((resolveUrl,reject)=>{
      child.once('error',reject);
      child.stdout.once('data',data=>{
        try{resolveUrl(JSON.parse(String(data)).url)}catch(error){reject(error)}
      });
    });
    assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\/$/);
    const page=await fetch(url);
    assert.equal(page.status,200);
    assert.match(await page.text(),/BrowserGym MiniWoB 0\.14\.3/);
    const status=await (await fetch(`${url}status.json`)).json();
    assert.equal(status.totalTasks,2);
    assert.equal(status.counts.pending,2);
    assert.equal((await fetch(`${url}reports/private.json`)).status,404);
  }finally{
    if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(resolveExit=>child.once('exit',resolveExit))}
    await rm(dir,{recursive:true,force:true});
  }
});

test('dashboard service persists and promotes a real campaign over stale readiness',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jev-dashboard-service-'));
  const runDir=join(root,'webarena-ready');
  const campaignDir=join(root,'webarena-campaign');
  const servicePath=fileURLToPath(new URL('./browsergym-dashboard-service.mjs',import.meta.url));
  const port=await new Promise((resolvePort,reject)=>{
    const server=createServer();server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{
      const selected=server.address().port;
      server.close(error=>error?reject(error):resolvePort(selected));
    });
  });
  let started=false;
  try{
    await mkdir(runDir);
    await writeFile(join(runDir,'readiness.json'),JSON.stringify({
      kind:'browsergym-campaign-readiness',benchmark:'WebArena-Verified fixture',
      createdAt:new Date(Date.now()-2000).toISOString(),stage:'awaiting_budget',iteration:0,
      checks:[{name:'positive control',status:'passed'}],blockers:['budget required'],
    }));
    await mkdir(join(campaignDir,'events'),{recursive:true});
    await writeFile(join(campaignDir,'manifest.json'),JSON.stringify({...manifest,
      benchmark:'WebArena-Verified active fixture',startedAt:new Date().toISOString()}));
    await writeFile(join(campaignDir,'events','000001.json'),JSON.stringify({
      ...trial('choose-list',1,'v1',true),sequence:1,at:new Date().toISOString()}));
    await writeFile(join(campaignDir,'events','000002.json'),JSON.stringify({
      ...trial('click-button',1,'v1',true),sequence:2,at:new Date().toISOString()}));
    const result=JSON.parse((await execute(process.execPath,[servicePath,'start',
      '--campaign-root',root,'--port',String(port)])).stdout);
    started=true;
    assert.equal(result.persistent,true);
    assert.equal(result.url,`http://127.0.0.1:${port}/`);
    const status=JSON.parse((await execute(process.execPath,[servicePath,'status',
      '--campaign-root',root,'--port',String(port)])).stdout);
    assert.equal(status.running,true);
    const overview=await (await fetch(`${result.url}status.json`)).json();
    assert.equal(overview.current,'webarena-campaign');
    assert.equal(overview.campaigns.length,2);
    assert.ok(overview.campaigns.some(item=>item.name==='webarena-ready'&&
      item.stage==='awaiting_budget'));
    const nextReady=join(root,'next-ready');
    await mkdir(nextReady);
    await writeFile(join(nextReady,'readiness.json'),JSON.stringify({
      kind:'browsergym-campaign-readiness',benchmark:'Next WebArena-Verified fixture',
      createdAt:new Date(Date.now()+2000).toISOString(),stage:'awaiting_budget',iteration:0,
      checks:[{name:'holdout reserved',status:'passed'}],blockers:['new budget required'],
    }));
    const updated=await (await fetch(`${result.url}status.json`)).json();
    assert.equal(updated.current,'next-ready');
    const nested=join(root,'evaluation-bundle','campaign');
    await mkdir(join(nested,'events'),{recursive:true});
    await writeFile(join(nested,'manifest.json'),JSON.stringify({...manifest,
      benchmark:'Nested campaign',startedAt:new Date(Date.now()+3000).toISOString()}));
    const discovered=await (await fetch(`${result.url}status.json`)).json();
    assert.equal(discovered.current,'evaluation-bundle/campaign');
    const nestedUrl=`${result.url}campaign/evaluation-bundle%2Fcampaign/`;
    assert.equal((await (await fetch(`${nestedUrl}status.json`)).json()).counts.pending,2);
    await writeFile(join(nested,'events','000001.json'),JSON.stringify({
      ...trial('choose-list',1,'v1',true),sequence:1,at:new Date().toISOString()}));
    assert.equal((await (await fetch(`${nestedUrl}status.json`)).json()).counts.passed,1);
    assert.match(await (await fetch(nestedUrl)).text(),/Current candidate development/);
    const latest=join(root,'completed-review');await mkdir(latest);
    await writeFile(join(latest,'readiness.json'),JSON.stringify({createdAt:new Date(Date.now()+4000).toISOString(),
      benchmark:'Completed review with preserved gaps',stage:'complete_with_gaps',checks:[],blockers:['Transfer incomplete'],resultSummary:'Verified 1/2 authored goals; <script> is literal evidence.'}));
    assert.equal((await (await fetch(`${result.url}status.json`)).json()).current,'completed-review');
    assert.match(await (await fetch(result.url)).text(),/Latest evidence:/);
    const reviewHtml=await (await fetch(`${result.url}campaign/completed-review/`)).text();
    assert.match(reviewHtml,/Scored results and limits/);assert.match(reviewHtml,/Verified 1\/2 authored goals; &lt;script&gt;/);
    assert.doesNotMatch(reviewHtml,/This preparation record is not a benchmark score/);
  }finally{
    if(started)await execute(process.execPath,[servicePath,'stop','--campaign-root',root,
      '--port',String(port)]).catch(()=>{});
    await rm(root,{recursive:true,force:true});
  }
});

test('legacy WebArena comparisons are visibly invalid without erasing charges or raw rewards',()=>{
  const wav={...manifest,suite:'webarena-verified'};
  const events=[trial('choose-list',1,'v1',true),trial('click-button',1,'v1',true)];
  const result=campaignSummary(wav,events);
  assert.equal(result.stage,'invalid_comparison');
  assert.equal(result.invalidComparisons.count,2);
  assert.equal(result.costUsd,0.02);
  assert.equal(result.views.frozenFirstAttempt.scored,0);
  assert.equal(result.views.frozenFirstAttempt.candidatePassed,null);
  assert.equal(result.views.frozenFirstAttempt.diagnosticRaw.candidatePassed,2);
  assert.equal(nextCampaignTrial(wav,events,'v1').state,'invalid_comparison');
  for(const event of events)event.isolationVerified=true;
  assert.equal(campaignSummary(wav,events).stage,'complete');
});

test('missing historical delegation records remain unknown over all started arms',()=>{
  const summary=campaignSummary(manifest,[trial('choose-list',1,'v1',true)]);
  assert.equal(summary.delegation.candidate.attempted,1);
  assert.equal(summary.delegation.candidate.unknownReturns,1);
  assert.equal(summary.delegation.candidate.callerUnknown,1);
  assert.equal(summary.delegation.candidate.scopeUnassessed,1);
  assert.equal(summary.delegation.candidate.fullyCorrect,0);
});

test('an incomplete WebArena arm remains unscored without invalidating a separately isolated completed pair',()=>{
  const wav={...manifest,suite:'webarena-verified'};
  const events=[{...trial('choose-list',1,'v1',true),isolationVerified:true},
    {...trial('click-button',1,'v1',false,null),verdict:'incomplete',isolationVerified:false,
      runId:'interrupted',delegation:[{arm:'candidate',officialReward:0.5,returnReason:'helper_error'}]}];
  const result=campaignSummary(wav,events);
  assert.equal(result.invalidComparisons.count,0);
  assert.equal(result.incompleteComparisons.count,1);
  assert.equal(result.incompleteComparisons.reports[0].startedArms,1);
  assert.equal(result.views.frozenFirstAttempt.scored,1);
  assert.equal(result.views.frozenFirstAttempt.candidatePassed,1);
  assert.equal(result.views.frozenFirstAttempt.total,2);
  assert.equal(result.limit,'unmetered_charge');
  assert.equal(result.currentDevelopment.complete,false);
  assert.ok(result.currentDevelopment.untested.includes('click-button/11'));
});

test('campaign charges include separately measured planner work and stop on unknown assistance cost',()=>{
 const plain={result:{jev:{calls:2,costUsd:.1}}};
 const assisted=costUsd=>({result:{jev:{calls:4,costUsd:.2},assistance:{calls:1,costUsd}}});
 assert.ok(Math.abs(trialCharge({cases:[plain,assisted(.03)]})-.33)<1e-12);
 assert.equal(trialCharge({cases:[plain,assisted(null)]}),null);
 assert.equal(trialCharge({cases:[plain,assisted(-1)]}),null);
 assert.ok(Math.abs(trialCharge({cases:[plain,{result:{jev:{calls:2,costUsd:.2},assistance:{calls:0,costUsd:null}}}]})-.3)<1e-12);
});
