import assert from 'node:assert/strict';

export const OPENROUTER_DECISIONS_ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';
export const COMPARISON_MODEL = 'typesafe/jev-1.13';

export function parseJsonLines(text) {
  return String(text ?? '').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map((line,index)=>{
    try{return JSON.parse(line)}catch(error){throw new Error(`Invalid JSON on output line ${index+1}`,{cause:error})}
  });
}

export function forvelaResult(stdout) {
  const records=parseJsonLines(stdout),result=records.findLast(record=>record?.type==='result');
  if(!result)throw new Error('Competitor output did not contain a result event');
  return {status:result.status,reason:result.reason,steps:result.steps,durationMs:result.durationMs,handoff:result.handoff,
    events:records.filter(record=>record?.type!=='start'&&record?.type!=='result'&&record?.type!=='handoff')};
}

export function currentResult(result) {
  return {status:result.returnReason==='reported_complete'?'success':'handoff',reason:result.returnReason,
    actions:result.actions?.length??0,durationMs:result.timing?.totalMs,
    decisions:Number.isFinite(result.jev?.costUsd)?[{cost:result.jev.costUsd}]:[]};
}

export function independentVerdict(definition,{events,finalSnapshot,status,finished=true}) {
  if(!finished)return {verdict:'failed',reason:'runner-did-not-finish'};
  const completions=events.filter(event=>event?.type==='complete'&&event.caseId===definition.id);
  if(definition.expected===null){
    if(completions.length)return {verdict:'failed',reason:'boundary-mutated-page'};
    if(status==='success')return {verdict:'failed',reason:'boundary-reported-success-without-outcome'};
    if(/recorded the requested state|Sync complete/.test(finalSnapshot??''))return {verdict:'failed',reason:'boundary-showed-completion'};
    return {verdict:'passed',reason:'bounded-stop-without-mutation'};
  }
  if(completions.length!==1)return {verdict:'failed',reason:`expected-one-completion-record-got-${completions.length}`};
  try{assert.deepEqual(completions[0].value,definition.expected)}catch{return {verdict:'failed',reason:'completion-state-mismatch'}}
  if(!/recorded the requested state|Sync complete/.test(finalSnapshot??''))return {verdict:'failed',reason:'final-page-did-not-confirm-completion'};
  return {verdict:'passed',reason:'exact-server-state-and-final-page'};
}

export function comparisonSummary(trials,systems) {
  const median=items=>{const values=items.toSorted((a,b)=>a-b);return values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2};
  const bySystem=Object.fromEntries(systems.map(system=>{
    const items=trials.filter(trial=>trial.system===system),times=items.map(trial=>trial.elapsedMs).filter(Number.isFinite);
    const passedTimes=items.filter(trial=>trial.verdict==='passed').map(trial=>trial.elapsedMs).filter(Number.isFinite),failedTimes=items.filter(trial=>trial.verdict!=='passed').map(trial=>trial.elapsedMs).filter(Number.isFinite);
    const costs=items.flatMap(trial=>trial.result?.decisions??[]).map(decision=>decision?.cost).filter(Number.isFinite);
    return [system,{passed:items.filter(trial=>trial.verdict==='passed').length,total:items.length,medianMs:times.length?median(times):null,
      passedMedianMs:passedTimes.length?median(passedTimes):null,failedMedianMs:failedTimes.length?median(failedTimes):null,
      providerReportedCostUsd:costs.length?costs.reduce((sum,value)=>sum+value,0):null}];
  }));
  const caseIds=[...new Set(trials.map(trial=>trial.id))],pairs={bothPassed:[],currentOnly:[],competitorOnly:[],neither:[]};
  for(const id of caseIds){
    const currentRuns=trials.filter(trial=>trial.id===id&&trial.system===systems[0]),competitorRuns=trials.filter(trial=>trial.id===id&&trial.system===systems[1]);
    const current=currentRuns.length>0&&currentRuns.every(trial=>trial.verdict==='passed');
    const competitor=competitorRuns.length>0&&competitorRuns.every(trial=>trial.verdict==='passed');
    pairs[current&&competitor?'bothPassed':current?'currentOnly':competitor?'competitorOnly':'neither'].push(id);
  }
  return {bySystem,pairs};
}
