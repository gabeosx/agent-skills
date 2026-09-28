import { compareStudyArms } from './study-lib.mjs';

export const browserGymCases = Object.freeze(['click-button','choose-list','click-checkboxes',
  'enter-text','use-autocomplete','click-tab','click-menu','form-sequence',
  'click-button-sequence','click-checkboxes-large','click-collapsible','click-dialog',
  'click-link','click-menu-2','click-option','click-scroll-list','click-tab-2',
  'navigate-tree','read-table','search-engine','sign-agreement']);
export const integrationCases = Object.freeze(['contact-copy','preferences','review-approval']);
export const webarenaVerifiedCases = Object.freeze(['399','404','595','650']);
// Task 603 was selected deterministically from Reddit mutation tasks whose intent
// template differs from every inspected development task. Keep it unopened until
// the development candidate is frozen.
export const webarenaVerifiedHoldoutCases = Object.freeze(['603']);
export const webarenaVerifiedSupportedCases = Object.freeze([
  ...webarenaVerifiedCases,...webarenaVerifiedHoldoutCases,
]);

function benchmarkFailure(trial) {
  if (trial.verification.passed) return null;
  if (trial.failureClass === 'infrastructure') return 'infrastructure';
  if (trial.result?.returnReason === 'input_required') return 'input_required';
  if (trial.result?.returnReason === 'action_outcome_unknown') return 'uncertain_action';
  return trial.failureClass ?? 'gym_reward_zero';
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
    if(!cases.includes(trial.id) || !seeds.includes(trial.seed) || trial.variant!==suite ||
      trial.verification?.passed !== (trial.reward===1 && trial.done===true))
      throw new Error(`Invalid BrowserGym reward record: ${trial.arm}/${trial.id}/${trial.seed}`);
  }
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
