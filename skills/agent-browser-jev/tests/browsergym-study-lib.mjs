import { compareStudyArms } from './study-lib.mjs';

export function browserGymAssistanceCost(result){
  const assistance=result?.assistance;
  if(assistance===undefined)return 0;
  if(!assistance||typeof assistance!=='object')return null;
  if(Number.isFinite(assistance.costUsd)&&assistance.costUsd>=0)return assistance.costUsd;
  return assistance.calls===0&&assistance.costUsd==null?0:null;
}

// Experimental recovery must remain visible even when Jev executes every click.
export function browserGymActor(result,smoke=false){
  if(smoke)return {helper:'scripted-control',callerInterventions:0};
  const declared=result?.assistance;
  if(declared===undefined)return {helper:'Jev',callerInterventions:0};
  const assistance=declared??{};
  const valid=Number.isSafeInteger(assistance.interventions)&&assistance.interventions>=0;
  return {helper:result?.callerStudy?.mode==='caller_only'?'none':'Jev',callerInterventions:valid?assistance.interventions:null,
    assistance:{kind:assistance.kind??'unknown',model:assistance.model??null,
      calls:assistance.calls??null,costUsd:assistance.costUsd??null,
      promptTokens:assistance.promptTokens??null,completionTokens:assistance.completionTokens??null,
      elapsedMs:assistance.elapsedMs??null}};
}

export const browserGymCases = Object.freeze(['click-button','choose-list','click-checkboxes',
  'enter-text','use-autocomplete','click-tab','click-menu','form-sequence',
  'click-button-sequence','click-checkboxes-large','click-collapsible','click-dialog',
  'click-link','click-menu-2','click-option','click-scroll-list','click-tab-2',
  'navigate-tree','read-table','search-engine','sign-agreement',
  'ascending-numbers','find-greatest','number-checkboxes','social-media-some',
  'email-inbox-delete','use-spinner',
  'bisect-angle','book-flight','choose-date','circle-center','copy-paste','daily-calendar','find-word','login-user','order-food','phone-book','scroll-text','use-slider']);
export const integrationCases = Object.freeze(['contact-copy','preferences','review-approval']);
export const webarenaVerifiedCases = Object.freeze(['399','404','595','650']);
// Task 603 was the first campaign's sealed holdout. It has since been scored and
// is retained here only for compatibility with that historical cohort; it is now
// development evidence and must not be reused as an untouched holdout.
export const webarenaVerifiedHoldoutCases = Object.freeze(['603']);
export const webarenaVerifiedContinuationCases = Object.freeze(['596','600','605']);
// Selected by Reddit site / template identifiers before reading task intents.
// Experiment provenance, rather than this allowlist, determines holdout status.
export const webarenaVerifiedAdditionalCases = Object.freeze(['400','407','597','598','604','606','614','624','641','651','402','408','599','607','615','625','642','652','403','409','608','643','401','410','609','644','406','610','645','580','630','635','714','719','725','731','581','631','636','715','720','727','732','582','632','637','716','721','728','733','583','633','638','717','722','729','734','584','634','639','718','724','730','735','405','601','611','616','620','626','646','602','612','617','621','627','640','647','613','618','622','628','648','619','623','629','649']);
export const webarenaVerifiedSupportedCases = Object.freeze([
  ...webarenaVerifiedCases,...webarenaVerifiedHoldoutCases,...webarenaVerifiedContinuationCases,
  ...webarenaVerifiedAdditionalCases,
]);

function benchmarkFailure(trial) {
  if (trial.verification.passed) return null;
  if (trial.failureClass === 'infrastructure') return 'infrastructure';
  if (trial.result?.returnReason === 'input_required') return 'input_required';
  if (trial.result?.returnReason === 'action_outcome_unknown') return 'uncertain_action';
  return trial.failureClass ?? 'gym_reward_zero';
}

export function verifiedCleanStart(trial){
  const proof=trial.cleanStart;
  return proof?.protocol==='fresh-container-v1'&&proof.passed===true&&
    typeof proof.containerId==='string'&&Boolean(proof.containerId)&&
    typeof proof.previousContainerId==='string'&&proof.previousContainerId!==proof.containerId&&
    typeof proof.readbackSha256==='string'&&Boolean(proof.readbackSha256)&&
    proof.readbackSha256===proof.referenceSha256;
}

export function evaluatorHealthy(trial){
  const details=trial.evaluatorDetails;
  return details?.status!=='error'&&!details?.error&&
    !details?.evaluators?.some(item=>item.status==='error'||item.error_msg);
}

export function analyzeBrowserGym(raw, cases, seeds, suite='miniwob') {
  if(!['miniwob','integration','webarena-verified'].includes(suite) ||
    raw.kind!==`browsergym-${suite}-study` || raw.smoke)
    throw new Error('Expected a scored BrowserGym study');
  const expected=cases.length*seeds.length;
  const baseline=raw.cases.filter(trial=>trial.arm==='baseline');
  const candidate=raw.cases.filter(trial=>trial.arm==='candidate');
  if(baseline.length!==expected || candidate.length!==expected || raw.cases.length!==expected*2)
    throw new Error('BrowserGym study is missing one or more paired episodes');
  for(const trial of raw.cases){
    if(!evaluatorHealthy(trial))throw new Error(`Evaluator error invalidates comparison: ${trial.arm}/${trial.id}/${trial.seed}`);
    if(suite==='webarena-verified'&&!verifiedCleanStart(trial))
      throw new Error('WebArena study has no verified isolated clean start');
    if(!cases.includes(trial.id) || !seeds.includes(trial.seed) || trial.variant!==suite ||
      trial.verification?.passed !== (trial.reward===1 && trial.done===true))
      throw new Error(`Invalid BrowserGym reward record: ${trial.arm}/${trial.id}/${trial.seed}`);
  }
  if(suite==='webarena-verified'&&new Set(raw.cases.map(trial=>trial.cleanStart.containerId)).size!==raw.cases.length)
    throw new Error('WebArena arms reused a backend');
  const analysis=compareStudyArms({cases:baseline},{cases:candidate});
  const byTrial=new Map(raw.cases.map(trial=>[
    `${trial.round ?? 1}/${trial.seed}/${trial.variant}/${trial.id}/${trial.arm}`,trial]));
  for(const pair of analysis.pairs){
    pair.baselineFailure=benchmarkFailure(byTrial.get(`${pair.id}/baseline`));
    pair.candidateFailure=benchmarkFailure(byTrial.get(`${pair.id}/candidate`));
  }
  const infrastructure=raw.cases.filter(trial=>trial.failureClass==='infrastructure');
  return {analysis,verdict:infrastructure.length?'incomplete':analysis.verdict,
    infrastructure:infrastructure.map(trial=>`${trial.arm}/${trial.id}/${trial.seed}`)};
}
