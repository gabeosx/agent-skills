import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { campaignSummary, nextCampaignTrial, trialCharge } from './browsergym-campaign-lib.mjs';

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

test('campaign summary separates frozen first attempts, repaired development, and holdout',()=>{
  const split={...manifest,taskSets:{development:['choose-list/11'],holdout:['click-button/11']}};
  const events=[trial('choose-list',1,'v1',false),trial('click-button',1,'v1',true),
    {type:'change',sequence:3,at:new Date().toISOString(),toFingerprint:'v2',
      targets:['choose-list/11'],note:'Ground the observed list option',changedFiles:['scripts/controls.mjs']},
    {...trial('choose-list',2,'v2',true),sequence:4}];
  events[0].sequence=1;events[1].sequence=2;
  const summary=campaignSummary(split,events);
  assert.deepEqual(summary.views.frozenFirstAttempt,{candidatePassed:1,baselinePassed:0,scored:2,total:2});
  assert.deepEqual(summary.views.repairedDevelopment,{candidatePassed:1,baselinePassed:0,scored:1,total:1});
  assert.deepEqual(summary.views.untouchedHoldout,{candidatePassed:1,baselinePassed:0,scored:1,total:1});
  assert.equal(summary.iteration,0); // This fixture has no initial snapshot event.
  assert.equal(summary.changeImpacts.length,0);
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
  }finally{
    if(started)await execute(process.execPath,[servicePath,'stop','--campaign-root',root,
      '--port',String(port)]).catch(()=>{});
    await rm(root,{recursive:true,force:true});
  }
});
