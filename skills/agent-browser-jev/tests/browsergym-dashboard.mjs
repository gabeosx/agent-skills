#!/usr/bin/env node
// Persistent read-only localhost dashboard. Audit files remain the source of truth.
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { campaignSummary } from './browsergym-campaign-lib.mjs';
import { readDashboardEvidence } from './browsergym-dashboard-evidence.mjs';

const {values}=parseArgs({options:{'run-dir':{type:'string'},'campaign-root':{type:'string'},
  port:{type:'string'},help:{type:'boolean'}}});
if(values.help){
  console.log('node tests/browsergym-dashboard.mjs (--run-dir /campaign/path | --campaign-root /runs) [--port 0]');
  process.exit(0);
}
if(Boolean(values['run-dir'])===Boolean(values['campaign-root']))
  throw new Error('Provide exactly one of --run-dir or --campaign-root');
const singleRun=values['run-dir']?resolve(values['run-dir']):null;
const campaignRoot=values['campaign-root']?resolve(values['campaign-root']):null;
const port=values.port===undefined?0:Number(values.port);
if(!Number.isSafeInteger(port)||port<0||port>65535)throw new Error('Port must be 0..65535');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const formatUsd=value=>Number.isFinite(value)?`$${Number(value).toFixed(4)}`:'not authorized';
const formatDuration=ms=>Number.isFinite(ms)?
  `${Math.floor(ms/3_600_000)}h ${Math.floor(ms%3_600_000/60_000)}m`:'not authorized';
const exists=path=>stat(path).then(()=>true,()=>false);

async function readEvents(runDir){
  const eventsDir=join(runDir,'events');
  if(!await exists(eventsDir))return [];
  const names=(await readdir(eventsDir)).filter(name=>/^\d{6}\.json$/.test(name)).sort();
  const events=[];
  for(const name of names)events.push(JSON.parse(await readFile(join(eventsDir,name),'utf8')));
  return events;
}

async function readCampaign(runDir){
  const name=basename(runDir),manifestPath=join(runDir,'manifest.json');
  if(await exists(manifestPath)){
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    // Other private artifacts (source freezes and state archives) also use
    // manifest.json. Only task manifests can be summarized as campaigns.
    if(manifest?.kind==='browsergym-campaign'||
      (!manifest?.kind&&Array.isArray(manifest?.cases)&&Array.isArray(manifest?.seeds))){
      const events=await readEvents(runDir);
      return {name,runDir,kind:'campaign',manifest,events,status:campaignSummary(manifest,events)};
    }
  }
  const readinessPath=join(runDir,'readiness.json');
  if(await exists(readinessPath)){
    const readiness=JSON.parse(await readFile(readinessPath,'utf8'));
    return {name,runDir,kind:'readiness',manifest:readiness,events:[],status:{
      kind:'browsergym-campaign-readiness',startedAt:readiness.createdAt,updatedAt:readiness.updatedAt,
      stage:readiness.stage??'adapter_validation',iteration:readiness.iteration??0,
      benchmark:readiness.benchmark,checks:readiness.checks??[],blockers:readiness.blockers??[],
      improvements:readiness.improvements??[],suite:readiness.suite,resultSummary:readiness.resultSummary,
      evidence:await readDashboardEvidence(runDir),
    }};
  }
  return null;
}

async function readOverview(){
  if(singleRun){
    const campaign=await readCampaign(singleRun);
    if(!campaign)throw new Error('No manifest.json or readiness.json in run directory');
    return {root:singleRun,campaigns:[campaign],current:campaign};
  }
  const campaigns=[];
  for(const entry of await readdir(campaignRoot,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const directory=join(campaignRoot,entry.name);
    const campaign=await readCampaign(directory);
    if(campaign)campaigns.push(campaign);
    // Evaluation bundles keep their manifest/events under a named child while
    // retaining plans and audit summaries alongside it. Discover one extra
    // level without walking report or source-snapshot trees.
    if(campaign?.kind==='campaign')continue;
    for(const child of await readdir(directory,{withFileTypes:true})){
      if(!child.isDirectory()||['snapshots','reports','events','candidate','node_modules'].includes(child.name))continue;
      const nested=await readCampaign(join(directory,child.name));
      if(nested)campaigns.push({...nested,name:`${entry.name}/${child.name}`});
    }
  }
  const activityTime=campaign=>{
    const updated=Date.parse(campaign.status.updatedAt);
    return Number.isFinite(updated)?updated:Date.parse(campaign.status.startedAt)||0;
  };
  campaigns.sort((a,b)=>activityTime(b)-activityTime(a));
  // Stored nonterminal status does not prove a process is still running. Keep
  // the newest evidence visible even when an older campaign ended with gaps.
  // An evaluation bundle can update its evidence after a nested run started;
  // keep that update visible without rewriting the bundle's creation time.
  // `current` remains the API field for compatibility, not a liveness assertion.
  const current=campaigns[0]??null;
  return {root:campaignRoot,campaigns,current};
}

function shell(title,subtitle,body,{refreshSeconds=10}={}){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${refreshSeconds?`<meta http-equiv="refresh" content="${refreshSeconds}">`:''}<title>${escapeHtml(title)}</title><style>
  :root{color-scheme:dark;font:15px Inter,ui-sans-serif,system-ui,sans-serif;background:#09111d;color:#edf3fb}body{max-width:1240px;margin:0 auto;padding:30px 22px 50px}h1{font-size:30px;margin:0 0 6px}h2{font-size:19px;margin:0 0 12px}.muted{color:#9fb0c6}.eyebrow{color:#72d5bb;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:750}a{color:#91ccff;text-decoration:none}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:22px 0}.card{background:#121f31;border:1px solid #283b54;border-radius:13px;padding:15px}.value{font-size:25px;font-weight:760;margin-top:5px}.bar{height:9px;background:#23334a;border-radius:9px;overflow:hidden}.bar span{display:block;height:100%;background:linear-gradient(90deg,#5fc5a7,#75aef5)}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #26384e}th{color:#9fb0c6}section{margin-top:30px;overflow:auto}.pill{display:inline-block;border-radius:20px;padding:3px 8px;background:#25364d}.pill.passed,.pill.complete{background:#185746}.pill.needs_improvement,.pill.exhausted,.pill.infrastructure_incomplete{background:#6a302c}.pill.deferred,.pill.awaiting_budget,.pill.complete_with_gaps{background:#665322}.pill.running{background:#244f77}li{margin:7px 0}time{color:#8ea4c0;font-size:12px;margin-right:8px}code{color:#a7d5ff}.score{font-variant-numeric:tabular-nums}.notice{border-left:3px solid #e2b955;background:#211d15;padding:12px 14px;border-radius:6px}.good{border-left-color:#64cbaa}.empty{color:#7f91a8;font-style:italic}</style></head><body>
  <div class="eyebrow">Agent Browser Jev · read-only evidence</div><h1>${escapeHtml(title)}</h1><p class="muted">${escapeHtml(subtitle)} · ${refreshSeconds?`refreshes every ${refreshSeconds} seconds`:'completed evidence · refresh manually'}</p>${body}</body></html>`;
}

function score(value){
  if(value?.invalid)return 'INVALID · excluded';
  if(!value||value.total===0)return 'not reserved';
  return `${value.candidatePassed}/${value.scored} candidate · ${value.baselinePassed}/${value.scored} baseline${value.scored<value.total?` · ${value.total-value.scored} untested`:''}`;
}

const metric=value=>value===null||value===undefined?'unknown':String(value);
const measuredUsd=value=>Number.isFinite(value)?formatUsd(value):'unknown';
function renderEvidence(evidence,{compact=false,campaignName=''}={}){
  if(!evidence)return '';
  const {accounting,cohorts,errors}=evidence;
  const budget=accounting?`<div class="cards"><div class="card">Campaign measured<div class="value">${measuredUsd(accounting.campaignMeasuredUsd)}</div><small>${accounting.providerReconciled?'Provider reconciled':'Reconciliation unknown'}</small></div><div class="card">Cumulative accounted<div class="value">${measuredUsd(accounting.cumulativeConservativeUsd)}</div><small>Cap ${measuredUsd(accounting.maxCostUsd)} · includes prior reserves</small></div><div class="card">Budget remaining<div class="value">${measuredUsd(accounting.remainingApprovedUsd)}</div><small>Time authorization ends ${escapeHtml(accounting.deadline)}</small></div><div class="card">Recorded trial rows<div class="value">${evidence.totalTrials}</div><small>Positives and expected negatives remain separate</small></div></div>`:'';
  const warning=errors.length?`<div class="notice"><strong>Evidence unavailable or changed</strong><ul>${errors.map(error=>`<li>${escapeHtml(error)}</li>`).join('')}</ul>Missing reports are excluded; this is incomplete coverage.</div>`:'';
  const context=`<p class="muted">${escapeHtml(evidence.note)} No combined success percentage: cohorts and frozen sources differ. “Unassessed” is unknown, not a failed goal or certified correct scope. Work and cost columns include expected-negative trials; goal/reward counts exclude them. Caller browser counts are attempts and can include commands rejected before dispatch.</p>`;
  if(compact)return `${warning}${budget}${context}<section><h2>Latest experiment comparisons</h2><table><thead><tr><th>Evidence cohort</th><th>Separate arm outcomes</th><th>Disposition</th><th>Caller effort / measured cost</th></tr></thead><tbody>${cohorts.map(cohort=>`<tr><td><a href="/campaign/${encodeURIComponent(campaignName)}/#${escapeHtml(cohort.id)}">${escapeHtml(cohort.title)}</a><br><small>${escapeHtml(cohort.qualification)}</small></td><td>${cohort.arms.map(arm=>`${escapeHtml(arm.label)}: ${cohort.kind==='public'?`${arm.fullReward}/${arm.rewardMeasured} full reward`:`${arm.verifiedGoals}/${arm.trials} verified goals`} · ${arm.scopeFailed} scope failures / ${arm.scopeUnassessed} unassessed · ${arm.falseCompletion} contradicted completions`).join('<br>')}</td><td>${escapeHtml(cohort.disposition)}</td><td>${cohort.arms.map(arm=>`${metric(arm.callerCalls)} caller calls / ${metric(arm.callerActions)} browser attempts · ${measuredUsd(arm.costUsd)}`).join('<br>')}</td></tr>`).join('')}</tbody></table></section>`;
  const comparisons=cohorts.map(cohort=>{
    const rows=cohort.arms.map(arm=>`<tr><td>${escapeHtml(arm.label)}<br><small>${arm.sourceFingerprints.map(value=>escapeHtml(value?.slice(0,12)??'unknown source')).join('<br>')}</small></td><td>${arm.trials}</td><td>${cohort.kind==='public'?`${arm.fullReward}/${arm.rewardMeasured}`:'not applicable'}</td><td>${arm.verifiedGoals} verified · ${arm.goalUnassessed} unassessed</td><td>${arm.completeReports} complete · ${arm.returnedControl} returned · ${arm.falseCompletion} contradicted</td><td>${arm.scopePassed} pass · ${arm.scopeFailed} fail · ${arm.scopeUnassessed} unassessed</td><td>${metric(arm.callerCalls)} calls / ${metric(arm.callerActions)} browser attempts</td><td>${metric(arm.helperCalls)} invocations / ${metric(arm.helperActions)} gestures / ${metric(arm.helperRequests)} requests</td><td>${arm.negatives?`${arm.negativePassed}/${arm.negatives}`:'—'}</td><td>${measuredUsd(arm.costUsd)}</td></tr>`).join('');
    const details=compact?'':`<details><summary>Trial details and frozen sources (${cohort.trials.length})</summary><table><thead><tr><th>Case / seed</th><th>Arm</th><th>Reward</th><th>Goal / scope</th><th>Return / failure</th><th>Caller calls / browser attempts</th><th>Helper invocations / gestures</th><th>Cost</th><th>Source / report</th></tr></thead><tbody>${cohort.trials.map(row=>`<tr><td>${escapeHtml(row.id)}${row.seed===null?'':` / ${escapeHtml(row.seed)}`}${row.expectedNegative?' · expected negative':''}</td><td>${escapeHtml(row.armLabel)}</td><td>${row.reward===null?'—':row.reward}</td><td>${escapeHtml(row.goal)} / <span class="pill ${escapeHtml(row.scope)}">${escapeHtml(row.scope)}</span>${row.expectedNegative&&row.negativeReview!=='unassessed'?`<br><small>Negative review ${escapeHtml(row.negativeReview)} · raw ${row.rawNegativePassed?'passed':'failed'}</small>`:''}</td><td>${escapeHtml(row.returnReason)}${row.falseCompletion?' · contradicted completion':''}<br><small>${escapeHtml(row.failure)}</small></td><td>${metric(row.callerCalls)} / ${metric(row.callerActions)}</td><td>${metric(row.helperCalls)} / ${metric(row.helperActions)}</td><td>${measuredUsd(row.costUsd)}</td><td><code>${escapeHtml(row.sourceFingerprint?.slice(0,12)??'unknown')}</code><br>${escapeHtml(row.report)}<br><small>report ${row.reportSha256.slice(0,12)}</small></td></tr>`).join('')}</tbody></table></details>`;
    return `<section id="${escapeHtml(cohort.id)}"><h2>${escapeHtml(cohort.title)}</h2><p class="muted">${escapeHtml(cohort.qualification)} · ${escapeHtml(cohort.disposition)}</p><table><thead><tr><th>Frozen arm</th><th>Positive trials</th><th>Full official reward</th><th>Independent goal</th><th>Completion reporting</th><th>Action scope</th><th>Caller work</th><th>Helper work</th><th>Expected negatives</th><th>Measured cost</th></tr></thead><tbody>${rows||'<tr><td colspan="10" class="empty">No verified report rows available.</td></tr>'}</tbody></table><p>${escapeHtml(cohort.note)}</p>${details}</section>`;
  }).join('');
  return `${warning}${budget}${context}${comparisons}`;
}

function renderReadiness(campaign){
  const {manifest,status}=campaign;
  const checks=(status.checks??[]).map(check=>`<tr><td>${escapeHtml(check.name)}</td><td><span class="pill ${escapeHtml(check.status)}">${escapeHtml(check.status)}</span></td><td>${escapeHtml(check.detail??'')}</td></tr>`).join('');
  const improvements=(status.improvements??[]).map(item=>`<li>${escapeHtml(item)}</li>`).join('');
  const blockers=(status.blockers??[]).map(item=>`<li>${escapeHtml(item)}</li>`).join('');
  return shell(manifest.title??'WebArena-Verified campaign',`${manifest.benchmark} · iteration ${status.iteration}`,
    `<p><strong>Current stage:</strong> <span class="pill ${escapeHtml(status.stage)}">${escapeHtml(status.stage.replaceAll('_',' '))}</span></p>
    ${renderEvidence(status.evidence)}
    ${blockers?`<div class="notice"><strong>${status.resultSummary?'Known limits':'Blocked before scored calls'}</strong><ul>${blockers}</ul></div>`:''}
    <section><h2>Adapter and environment readiness</h2><table><thead><tr><th>Check</th><th>Status</th><th>Evidence</th></tr></thead><tbody>${checks||'<tr><td colspan="3" class="empty">Checks have not started.</td></tr>'}</tbody></table></section>
    ${status.resultSummary?`<section><h2>Scored results and limits</h2><p>${escapeHtml(status.resultSummary)}</p></section>`:''}
    <section><h2>Changes and findings</h2><ul>${improvements||'<li class="empty">None recorded.</li>'}</ul></section>
    <p class="muted">${status.resultSummary?'Results refer only to their named frozen sources and task cohorts. Official reward, saved goals, scope, completion reporting and caller assistance remain separate.':'This preparation record is not a benchmark score. First-attempt, retry-trained, and held-out evidence will remain separate once a bounded campaign is authorized.'}</p>`,
    {refreshSeconds:status.evidence&&['completed','complete','complete_with_gaps'].includes(status.stage)?null:10});
}

function renderCampaign(campaign){
  const {manifest,events,status,runDir}=campaign;
  const resolved=status.counts.passed+status.counts.exhausted+status.counts.deferred;
  const pct=status.totalTasks?Math.min(100,Math.round(resolved/status.totalTasks*100)):0;
  const recent=events.filter(event=>['trial','change','defer','run_error','charge_reconciled','validation'].includes(event.type)).slice(-12).reverse();
  const rows=status.tasks.map(task=>`<tr><td>${escapeHtml(task.id)}</td><td>${task.seed}</td><td>${escapeHtml(task.cohort)}</td><td><span class="pill ${escapeHtml(task.state)}">${escapeHtml(task.state.replaceAll('_',' '))}</span></td><td>${task.attempts}</td><td>${task.firstTrial?.candidatePassed===undefined?'—':task.firstTrial.candidatePassed?'pass':'fail'}</td><td>${task.candidatePassed===null?'—':task.candidatePassed?'pass':'fail'}</td><td>${escapeHtml(task.failure??'')}</td></tr>`).join('');
  const activity=recent.map(event=>`<li><time>${escapeHtml(event.at)}</time> <strong>${escapeHtml(event.type)}</strong> ${escapeHtml(event.type==='trial'?`${event.id}/${event.seed} attempt ${event.attempt}: ${event.candidatePassed?'pass':event.candidateFailure??event.verdict}`:event.type==='change'?event.note:event.type==='defer'?`${event.id}/${event.seed}: ${event.reason}`:event.type==='charge_reconciled'?`${event.id}/${event.seed}: reserved ${formatUsd(event.reservedUsd)}`:event.type==='validation'?`${event.note}: ${event.passed}/${event.total} passed`:event.error)}</li>`).join('');
  const impacts=status.changeImpacts.map(item=>`<tr><td>${item.iteration}</td><td>${escapeHtml(item.note)}</td><td>${item.changedFiles.length}</td><td>${item.targets.length}</td><td>${item.verifiedPasses} pass · ${item.verifiedFailures} fail · ${item.pending} pending</td></tr>`).join('');
  const delegation=Object.entries(status.delegation).map(([arm,item])=>`<tr><td>${arm}</td><td>${item.attempted}</td><td>${item.officialFullReward}</td><td>${item.rewardAndReportedComplete}</td><td>${item.unknownReturns?"lower bound ":""}${item.nonCompleteReturns} / ${item.attempted} · ${item.returnedAfterFullReward} after full reward · ${item.returnedAfterGoal} after reviewed goal · ${item.unknownReturns} unknown</td><td>${item.callerAssisted} assisted · ${item.verifiedAssistedGoals} reviewed goals after assistance (${item.fullyCorrectAssistedGoals} with correct scope) · ${item.callerUnknown} unknown</td><td>${item.scopeFailed} failed · ${item.scopeUnassessed} unassessed</td><td>${item.verifiedAutonomousGoals} goals · ${item.verifiedReportedCompletion} with completion report · ${item.fullyCorrect} with correct scope · ${item.goalUnassessed} unassessed</td><td>${item.completionWithoutFullReward} without full reward · ${item.falseCompletion} independently contradicted</td></tr>`).join('');
  const current=status.active?`${status.active.id}/${status.active.seed}, attempt ${status.active.attempt}`:
    status.stage.replaceAll('_',' ');
  return shell(`${manifest.benchmark}`,`Iteration ${status.iteration} · ${escapeHtml(current)}`,
    `${status.invalidComparisons.count?`<div class="notice"><strong>Invalid comparison</strong> · ${status.invalidComparisons.count} paired reports. ${escapeHtml(status.invalidComparisons.reason)} Task outcomes and change impacts below are retained raw diagnostics, not performance evidence. Charges and attempts remain accounted.</div>`:''}
    ${status.incompleteComparisons?.count?`<div class="notice"><strong>Incomplete comparison</strong> · ${status.incompleteComparisons.count} reports. ${escapeHtml(status.incompleteComparisons.reason)} Charges, started arms and attempts remain accounted.</div>`:''}
    <div class="bar" aria-label="${pct}% resolved"><span style="width:${pct}%"></span></div>
    <div class="cards"><div class="card">Stage<div class="value">${escapeHtml(status.stage.replaceAll('_',' '))}</div></div><div class="card">Resolved<div class="value">${resolved}/${status.totalTasks}</div></div><div class="card">Frozen development first attempt<div class="value score">${score(status.views.frozenFirstAttempt)}</div></div><div class="card">Accumulated development<div class="value score">${score(status.views.repairedDevelopment)}</div></div><div class="card">Current candidate development<div class="value score">${score(status.views.currentDevelopment)}</div><small>${status.currentDevelopment.complete?'Coverage complete':`${status.currentDevelopment.untested.length} tasks untested on current candidate`}</small></div><div class="card">Untouched holdout<div class="value score">${score(status.views.untouchedHoldout)}</div></div><div class="card">Trials / retries<div class="value">${status.totalTrials} / ${status.retries}</div><small>${status.totalValidations} validations</small></div><div class="card">Budget accounted<div class="value">${formatUsd(status.costUsd)}</div><small>${formatUsd(status.reportedCostUsd)} measured + ${formatUsd(status.reservedCostUsd)} reserved; cap ${formatUsd(status.maxCostUsd)}</small></div><div class="card">Elapsed<div class="value">${formatDuration(status.elapsedMs)}</div><small>Limit ${formatDuration(status.maxDurationMs)}</small></div></div>
    <p class="muted">Accumulated development records the latest result for each task across versions; it is not the current candidate score. Current candidate: <code>${escapeHtml(status.currentDevelopment.fingerprint??'not tested')}</code>. Holdouts are scored after development and are excluded from the frozen first-attempt row.</p>
    <p class="muted">Started ${escapeHtml(status.startedAt)} · Deadline ${escapeHtml(status.deadlineAt)} · Latest skill change: ${escapeHtml(status.latestChange?.note??'initial candidate')}</p>
    <section><h2>Current snapshot delegation attempts</h2><table><thead><tr><th>Arm</th><th>Started</th><th>Full official reward</th><th>Reward + complete report</th><th>Returned control</th><th>Caller work</th><th>Action scope</th><th>Independent review</th><th>Completion discrepancies</th></tr></thead><tbody>${delegation}</tbody></table><p class="muted">Invalid comparisons are excluded. Counts cover recorded attempts on the current fingerprint; older reports may lack these measurements. Official reward and unassessed scope do not establish correct effects. Caller verification after return is separate from intervention.</p></section>
    <section><h2>Improvement impact by iteration</h2><table><thead><tr><th>Iteration</th><th>Change</th><th>Files</th><th>Targeted trials</th><th>Observed impact</th></tr></thead><tbody>${impacts||'<tr><td colspan="5" class="empty">No post-baseline skill change has been tested in this campaign.</td></tr>'}</tbody></table></section>
    <section><h2>Tasks</h2><table><thead><tr><th>Case</th><th>Seed</th><th>Cohort</th><th>Status</th><th>Attempts</th><th>First</th><th>Latest</th><th>Failure</th></tr></thead><tbody>${rows}</tbody></table></section>
    <section><h2>Recent audit events</h2><ol>${activity||'<li class="empty">No events recorded.</li>'}</ol></section><p class="muted">Chained audit events and private reports remain in <code>${escapeHtml(runDir)}</code>. No key or raw page trace is served.</p>`);
}

function renderOverview(overview){
  if(overview.campaigns.length===1)return overview.campaigns[0].kind==='readiness'?
    renderReadiness(overview.campaigns[0]):renderCampaign(overview.campaigns[0]);
  const rows=overview.campaigns.map(item=>{
    const href=`/campaign/${encodeURIComponent(item.name)}/`;
    const status=item.status;
    const progress=item.kind==='campaign'?(status.invalidComparisons.count?
      `${status.invalidComparisons.count} invalid pairs · raw results excluded`:`${status.counts.passed}/${status.totalTasks} latest passes`):
      status.evidence?`${status.evidence.totalTrials} trial rows · ${status.evidence.cohorts.length} distinct cohorts`:
      status.resultSummary?`${status.resultSummary} [summary only; structured trial metrics unavailable]`:
      `${status.checks.filter(check=>check.status==='passed').length}/${status.checks.length} readiness checks; structured trial metrics unavailable`;
    return `<tr><td><a href="${href}">${escapeHtml(item.name)}</a></td><td>${escapeHtml(item.manifest.benchmark)}</td><td>${escapeHtml(status.stage.replaceAll('_',' '))}</td><td>${status.iteration}</td><td>${escapeHtml(progress)}</td><td>${escapeHtml(status.startedAt)}</td></tr>`;
  }).join('');
  const current=overview.current;
  return shell('Benchmark campaign center','Persistent overview of development, holdout, and readiness runs',
    `${current?`<div class="notice"><strong>Latest evidence:</strong> <a href="/campaign/${encodeURIComponent(current.name)}/">${escapeHtml(current.name)}</a> · ${escapeHtml(current.status.stage.replaceAll('_',' '))} · iteration ${current.status.iteration}</div>`:''}
    ${current?.status.evidence?renderEvidence(current.status.evidence,{compact:true,campaignName:current.name}):''}
    <section><h2>Campaign history</h2><table><thead><tr><th>Run</th><th>Benchmark</th><th>Stage</th><th>Iteration</th><th>Results / coverage</th><th>Started</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">No campaigns found.</td></tr>'}</tbody></table></section>`);
}

function publicOverview(overview){
  return {kind:'browsergym-dashboard-overview',current:overview.current?.name??null,
    campaigns:overview.campaigns.map(item=>({name:item.name,kind:item.kind,
      benchmark:item.manifest.benchmark,stage:item.status.stage,iteration:item.status.iteration,
      startedAt:item.status.startedAt,
      ...(item.kind==='campaign'?{counts:item.status.counts,views:item.status.views,invalidComparisons:item.status.invalidComparisons,incompleteComparisons:item.status.incompleteComparisons,delegation:item.status.delegation,
        costUsd:item.status.costUsd,maxCostUsd:item.status.maxCostUsd}:
        {resultSummary:item.status.resultSummary,evidence:item.status.evidence?{
          totalTrials:item.status.evidence.totalTrials,accounting:item.status.evidence.accounting,
          errors:item.status.evidence.errors,cohorts:item.status.evidence.cohorts.map(({trials,...summary})=>summary),
        }:null})}))};
}

// Share concurrent reads without caching results across later requests. Large
// archives must not be reloaded once per overlapping browser/service probe.
let overviewInFlight=null;
const currentOverview=()=>overviewInFlight??=(readOverview().finally(()=>{overviewInFlight=null;}));

const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
  try{
    if(req.url==='/health.json'){
      res.setHeader('Content-Type','application/json; charset=utf-8');
      res.end(JSON.stringify({kind:'browsergym-dashboard-health',ready:true}));return;
    }
    const overview=await currentOverview();
    if(req.url==='/status.json'){
      res.setHeader('Content-Type','application/json; charset=utf-8');
      res.end(JSON.stringify(singleRun?overview.current.status:publicOverview(overview)));return;
    }
    const match=req.url?.match(/^\/campaign\/([^/]+)\/(status\.json)?$/);
    if(match&&!singleRun){
      const name=decodeURIComponent(match[1]);
      const campaign=overview.campaigns.find(item=>item.name===name);
      if(!campaign){res.statusCode=404;res.end('Not found');return}
      if(match[2]){res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(campaign.status));return}
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end(campaign.kind==='readiness'?renderReadiness(campaign):renderCampaign(campaign));return;
    }
    if(req.url==='/'){
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(renderOverview(overview));
    }else{res.statusCode=404;res.end('Not found')}
  }catch(error){res.statusCode=500;res.end(`Dashboard unavailable: ${error.message}`)}
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({
  url:`http://127.0.0.1:${server.address().port}/`,
  ...(singleRun?{runDir:singleRun}:{campaignRoot}),persistent:true})));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close());
