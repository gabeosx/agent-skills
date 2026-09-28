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

function scoreView(tasks,select,which='latest') {
  const selected=tasks.filter(select);
  let candidatePassed=0,baselinePassed=0,scored=0;
  for(const task of selected){
    const trial=which==='first'?task.firstTrial:task.latestTrial;
    if(!trial)continue;
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
  const views={
    frozenFirstAttempt:scoreView(tasks,()=>true,'first'),
    repairedDevelopment:scoreView(tasks,task=>task.cohort==='development'),
    untouchedHoldout:scoreView(tasks,task=>task.cohort==='holdout','first'),
  };
  const stage=active?'running':tasksComplete?
    (counts.exhausted||counts.deferred?'complete_with_gaps':'complete'):
    limit??(counts.pending?'first_attempt':'awaiting_improvement');
  return {kind:'browsergym-campaign-status',startedAt:manifest.startedAt,
    deadlineAt:new Date(Date.parse(manifest.startedAt)+manifest.maxDurationMs).toISOString(),
    elapsedMs,maxDurationMs:manifest.maxDurationMs,costUsd,reportedCostUsd,reservedCostUsd,
    maxCostUsd:manifest.maxCostUsd,
    costReserveUsd:manifest.costReserveUsd,limit,counts,totalTasks:tasks.length,
    totalTrials:trials.length,retries:trials.filter(event=>event.attempt>1).length,
    totalValidations:validations.length,
    iteration:Math.max(0,changes.length-1),stage,views,changeImpacts:impacts,
    latestChange:(()=>{const change=events.filter(event=>event.type==='change').at(-1);
      return change?{at:change.at,note:change.note,changedFiles:change.changedFiles,
        targets:change.targets,toFingerprint:change.toFingerprint}:null})(),
    active:active??null,tasks};
}

export function nextCampaignTrial(manifest,events,candidateFingerprint,now=Date.now(),targets=[]) {
  const summary=campaignSummary(manifest,events,now);
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
  if(!Array.isArray(report.cases)||report.cases.length!==2)return null;
  let total=0;
  for(const trial of report.cases){
    const charge=trial.result?.jev?.costUsd;
    if(Number.isFinite(charge)&&charge>=0)total+=charge;
    else if(trial.result?.jev?.calls!==0)return null;
  }
  return total;
}
