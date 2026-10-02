import {browserGymAssistanceCost} from './browsergym-study-lib.mjs';
import { applyScopeAudit } from './browsergym-scope-audit.mjs';

export const campaignCases = Object.freeze([
  'click-button','choose-list','click-checkboxes','enter-text','click-tab',
  'click-button-sequence','click-checkboxes-large','click-collapsible','click-dialog',
  'click-link','click-menu-2','click-option','click-scroll-list','click-tab-2',
  'navigate-tree','read-table','search-engine','sign-agreement',
  'use-autocomplete','click-menu','form-sequence',
]);
export const integrationCampaignCases = Object.freeze([
  'contact-copy','preferences','review-approval',
]);
export const webarenaVerifiedCampaignCases = Object.freeze([
  '399','404','595','650',
]);

export const trialKey = (id,seed) => `${id}/${seed}`;

export function chargeNeedsReconciliation(trial, events) {
  // A complete browser report may still contain a failed, unmetered request.
  // Outcome scoring and provider accounting are independent.
  return trial?.type === 'trial' && trial.costUsd === null &&
    !events.some(event => event.type === 'charge_reconciled' && event.runId === trial.runId);
}

function trialsFor(events,id,seed) {
  return events.filter(event=>event.type==='trial'&&event.id===id&&event.seed===seed);
}

function hasDeferred(events,id,seed) {
  return events.some(event=>event.type==='defer'&&event.id===id&&event.seed===seed);
}

function cohortFor(manifest,id,seed) {
  const key=trialKey(id,seed);
  if(manifest.taskSets?.holdout?.includes(key))return 'holdout';
  if(manifest.taskSets?.development?.includes(key))return 'development';
  return manifest.evidenceRole==='holdout'?'holdout':'development';
}

function scoreView(tasks,select,which='latest',fingerprint=null) {
  const selected=tasks.filter(select);
  let candidatePassed=0,baselinePassed=0,scored=0;
  for(const task of selected){
    const trial=which==='first'?task.firstTrial:task.latestTrial;
    if(!trial || trial.verdict==='incomplete' || (fingerprint && trial.candidateFingerprint!==fingerprint))continue;
    scored++;
    if(trial.candidatePassed)candidatePassed++;
    if(trial.baselinePassed)baselinePassed++;
  }
  return {candidatePassed,baselinePassed,scored,total:selected.length};
}

function changeImpacts(events) {
  const changes=events.filter(event=>event.type==='change');
  return changes.slice(1).map((change,index)=>{
    const nextSequence=changes[index+2]?.sequence??Infinity;
    const outcomes=(change.targets??[]).map(key=>{
      const [id,seedText]=key.split('/'),seed=Number(seedText);
      const before=events.filter(event=>event.type==='trial'&&event.id===id&&
        event.seed===seed&&event.sequence<change.sequence).at(-1);
      const after=events.filter(event=>event.type==='trial'&&event.id===id&&
        event.seed===seed&&event.sequence>change.sequence&&event.sequence<nextSequence).at(-1);
      return {key,beforePassed:before?.candidatePassed??null,
        afterPassed:after?.candidatePassed??null,afterFailure:after?.candidateFailure??null};
    });
    return {iteration:index+1,at:change.at,note:change.note,changedFiles:change.changedFiles??[],
      targets:change.targets??[],outcomes,verifiedPasses:outcomes.filter(item=>item.afterPassed).length,
      verifiedFailures:outcomes.filter(item=>item.afterPassed===false).length,
      pending:outcomes.filter(item=>item.afterPassed===null).length};
  });
}

export function campaignSummary(manifest,events,now=Date.now()) {
  const reconciled=new Set(events.filter(event=>event.type==='charge_reconciled').map(event=>event.runId));
  const tasks=manifest.cases.flatMap(id=>manifest.seeds.map(seed=>{
    const trials=trialsFor(events,id,seed),first=trials[0],last=trials.at(-1);
    const deferred=hasDeferred(events,id,seed);
    const cohort=cohortFor(manifest,id,seed);
    const state=deferred?'deferred':!last?'pending':last.candidatePassed?'passed':cohort==='holdout'?'exhausted':
      trials.length>manifest.maxRetries?'exhausted':'needs_improvement';
    return {id,seed,key:trialKey(id,seed),cohort,state,
      attempts:trials.length,firstTrial:first??null,latestTrial:last??null,
      baselinePassed:last?.baselinePassed??null,candidatePassed:last?.candidatePassed??null,
      failure:last?.verdict==='incomplete'?'infrastructure_incomplete':last?.candidateFailure??null,
      latestReport:last?.report??null};
  }));
  const trials=events.filter(event=>event.type==='trial');
  const invalidTrials=manifest.suite==='webarena-verified'?
    trials.filter(event=>event.isolationVerified!==true&&event.verdict!=='incomplete'):[];
  const incompleteTrials=trials.filter(event=>event.verdict==='incomplete');
  const incompleteComparisons={count:incompleteTrials.length,
    reason:incompleteTrials.length?'One or more arms or cleanup checks are incomplete; these reports are unscored, not evidence of state contamination.':null,
    reports:incompleteTrials.map(event=>({report:event.report,sha256:event.reportSha256??null,startedArms:event.delegation?.length??null}))};
  const invalidComparisons={count:invalidTrials.length,
    reason:invalidTrials.length?'Missing verified backend restoration between arms; raw rewards are diagnostic only.':null,
    reports:invalidTrials.map(event=>({report:event.report,sha256:event.reportSha256??null}))};
  const validations=events.filter(event=>event.type==='validation');
  const reportedCostUsd=[...trials,...validations]
    .reduce((total,event)=>total+(event.costUsd??0),0);
  const reservedCostUsd=events.filter(event=>event.type==='charge_reconciled')
    .reduce((total,event)=>total+event.reservedUsd,0);
  const costUsd=reportedCostUsd+reservedCostUsd;
  const unmetered=trials.some(event=>event.costUsd===null&&!reconciled.has(event.runId));
  const active=events.findLast(event=>event.type==='trial_started'&&
    !events.some(other=>['trial','run_error'].includes(other.type)&&other.runId===event.runId));
  const counts=Object.fromEntries(['pending','passed','needs_improvement','exhausted','deferred']
    .map(state=>[state,tasks.filter(task=>task.state===state).length]));
  const tasksComplete=!counts.pending&&!counts.needs_improvement;
  const lastEventAt=Date.parse(events.at(-1)?.at??'');
  const effectiveNow=tasksComplete&&!active&&Number.isFinite(lastEventAt)?lastEventAt:now;
  const elapsedMs=Math.max(0,effectiveNow-Date.parse(manifest.startedAt));
  const limit=elapsedMs>=manifest.maxDurationMs?'time_limit':
    unmetered?'unmetered_charge':
    costUsd>=manifest.maxCostUsd-manifest.costReserveUsd-1e-9?'spend_limit':null;
  const impacts=changeImpacts(events),changes=events.filter(event=>event.type==='change');
  const initialFingerprint=trials[0]?.candidateFingerprint??changes[0]?.toFingerprint??null;
  const currentFingerprint=changes.at(-1)?.toFingerprint??trials.at(-1)?.candidateFingerprint??null;
  const delegation=Object.fromEntries(['baseline','candidate'].map(arm=>{
    const rows=trials.filter(event=>event.candidateFingerprint===currentFingerprint&&
      (manifest.suite!=='webarena-verified'||event.isolationVerified===true))
      .flatMap(event=>{
        const recorded=(event.delegation??[]).filter(item=>item.arm===arm);
        return applyScopeAudit(recorded.length?recorded:[{arm,officialReward:null,returnReason:null,
          callerInterventions:null,actionScope:'unassessed'}],event.reportSha256,events);
      });
    return [arm,{attempted:rows.length,officialFullReward:rows.filter(item=>item.officialReward===1).length,
      rewardAndReportedComplete:rows.filter(item=>item.officialReward===1&&item.returnReason==='reported_complete').length,
      returnedAfterFullReward:rows.filter(item=>item.officialReward===1&&item.returnReason&&item.returnReason!=='reported_complete').length,
      completionWithoutFullReward:rows.filter(item=>Number.isFinite(item.officialReward)&&item.officialReward<1&&item.returnReason==='reported_complete').length,
      nonCompleteReturns:rows.filter(item=>item.returnReason&&item.returnReason!=='reported_complete').length,
      unknownReturns:rows.filter(item=>!item.returnReason).length,
      returnReasons:Object.fromEntries([...new Set(rows.map(item=>item.returnReason??'unknown'))]
        .map(reason=>[reason,rows.filter(item=>(item.returnReason??'unknown')===reason).length])),
      callerAssisted:rows.filter(item=>item.callerInterventions>0).length,
      callerUnknown:rows.filter(item=>item.callerInterventions==null).length,
      verifiedAssistedGoals:rows.filter(item=>item.goalVerified===true&&item.callerInterventions>0).length,
      fullyCorrectAssistedGoals:rows.filter(item=>item.goalVerified===true&&item.actionScope==='passed'&&item.callerInterventions>0).length,
      verifiedAutonomousGoals:rows.filter(item=>item.goalVerified===true&&item.callerInterventions===0).length,
      verifiedReportedCompletion:rows.filter(item=>item.goalVerified===true&&item.callerInterventions===0&&item.returnReason==='reported_complete').length,
      returnedAfterGoal:rows.filter(item=>item.goalVerified===true&&item.returnReason&&item.returnReason!=='reported_complete').length,
      returnedBeforeGoal:rows.filter(item=>item.goalVerified===false&&item.returnReason&&item.returnReason!=='reported_complete').length,
      goalUnassessed:rows.filter(item=>item.goalVerified==null).length,
      fullyCorrect:rows.filter(item=>item.goalVerified===true&&item.actionScope==='passed'&&item.callerInterventions===0).length,
      falseCompletion:rows.filter(item=>item.goalVerified===false&&item.returnReason==='reported_complete').length,
      scopeFailed:rows.filter(item=>item.actionScope==='failed').length,
      scopeUnassessed:rows.filter(item=>item.actionScope!=='passed'&&item.actionScope!=='failed').length}];
  }));
  const development=task=>task.cohort==='development';
  const developmentFingerprints=[...new Set(tasks.filter(development)
    .map(task=>task.latestTrial?.candidateFingerprint).filter(Boolean))];
  const views={
    // Holdouts run after feedback and must not enter the frozen baseline row.
    frozenFirstAttempt:scoreView(tasks,development,'first',initialFingerprint),
    // Historical progress only: these outcomes may come from different versions.
    repairedDevelopment:scoreView(tasks,development),
    currentDevelopment:scoreView(tasks,development,'latest',currentFingerprint),
    untouchedHoldout:scoreView(tasks,task=>task.cohort==='holdout','first'),
  };
  if(invalidTrials.length)for(const view of Object.values(views)){
    view.invalid=true;view.diagnosticRaw={candidatePassed:view.candidatePassed,baselinePassed:view.baselinePassed,scored:view.scored};
    view.candidatePassed=null;view.baselinePassed=null;view.scored=0;
  }
  const currentDevelopment={fingerprint:currentFingerprint,
    complete:views.currentDevelopment.scored===views.currentDevelopment.total,
    untested:tasks.filter(task=>development(task)&&(!currentFingerprint||
      task.latestTrial?.candidateFingerprint!==currentFingerprint||task.latestTrial?.verdict==='incomplete')).map(task=>task.key)};
  const stage=invalidTrials.length?'invalid_comparison':active?'running':tasksComplete?
    (counts.exhausted||counts.deferred?'complete_with_gaps':'complete'):
    limit??(counts.pending?'first_attempt':'awaiting_improvement');
  return {kind:'browsergym-campaign-status',startedAt:manifest.startedAt,
    deadlineAt:new Date(Date.parse(manifest.startedAt)+manifest.maxDurationMs).toISOString(),
    elapsedMs,maxDurationMs:manifest.maxDurationMs,costUsd,reportedCostUsd,reservedCostUsd,
    maxCostUsd:manifest.maxCostUsd,
    costReserveUsd:manifest.costReserveUsd,limit,counts,totalTasks:tasks.length,
    totalTrials:trials.length,retries:trials.filter(event=>event.attempt>1).length,
    totalValidations:validations.length,
    iteration:Math.max(0,changes.length-1),stage,views,invalidComparisons,incompleteComparisons,delegation,changeImpacts:impacts,
    initialFingerprint,currentDevelopment,developmentFingerprints,
    latestChange:(()=>{const change=events.filter(event=>event.type==='change').at(-1);
      return change?{at:change.at,note:change.note,changedFiles:change.changedFiles,
        targets:change.targets,toFingerprint:change.toFingerprint}:null})(),
    active:active??null,tasks};
}

export function nextCampaignTrial(manifest,events,candidateFingerprint,now=Date.now(),targets=[]) {
  const summary=campaignSummary(manifest,events,now);
  if(summary.stage==='invalid_comparison')return {state:'invalid_comparison',summary};
  if(summary.stage==='complete'||summary.stage==='complete_with_gaps')return {state:'complete',summary};
  if(summary.limit)return {state:summary.limit,summary};
  for(const task of summary.tasks){
    if(task.cohort==='development'&&task.state==='pending')
      return {state:'run',id:task.id,seed:task.seed,attempt:1,summary};
  }
  const developmentNeedsImprovement=summary.tasks.some(task=>
    task.cohort==='development'&&task.state==='needs_improvement');
  if(developmentNeedsImprovement&&!targets.length)return {state:'needs_target',summary};
  const currentChange=events.findLast(event=>event.type==='change'&&
    event.toFingerprint===candidateFingerprint);
  for(const task of summary.tasks){
    if(!targets.includes(task.key))continue;
    if(task.state!=='needs_improvement')continue;
    const last=trialsFor(events,task.id,task.seed).at(-1);
    const infrastructureRetry=last.verdict==='incomplete'&&events.some(event=>
      event.type==='charge_reconciled'&&event.runId===last.runId);
    if(infrastructureRetry||(last.candidateFingerprint!==candidateFingerprint&&
      currentChange?.targets?.includes(task.key)))
      return {state:'run',id:task.id,seed:task.seed,attempt:task.attempts+1,summary};
  }
  if(developmentNeedsImprovement)return {state:'needs_change',summary};
  for(const task of summary.tasks){
    if(task.cohort==='holdout'&&task.state==='pending')
      return {state:'run',id:task.id,seed:task.seed,attempt:1,summary};
  }
  return {state:'complete',summary};
}

export function trialCharge(report) {
  if(report.modelDispatch?.started===false&&
      (report.cases===undefined||(Array.isArray(report.cases)&&report.cases.length===0)))return 0;
  if(!Array.isArray(report.cases)||report.cases.length!==2)return null;
  let total=0;
  for(const trial of report.cases){
    const charge=trial.result?.jev?.costUsd;
    if(Number.isFinite(charge)&&charge>=0)total+=charge;
    else if(trial.result?.jev?.calls!==0)return null;
    const assistanceCost=browserGymAssistanceCost(trial.result);
    if(assistanceCost===null)return null;
    total+=assistanceCost;
  }
  return total;
}
