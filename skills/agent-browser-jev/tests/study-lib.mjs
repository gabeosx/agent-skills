import { isDeepStrictEqual } from 'node:util';

const knownVariants = new Set(['base', 'reordered', 'slow', 'injection']);

export function assertVariant(variant) {
  if (!knownVariants.has(variant)) throw new Error(`Unknown component variant: ${variant}`);
  return variant;
}

export function assertSeed(seed) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed must be an unsigned 32-bit integer');
  return seed;
}

export function componentConditions({ definition, events = [], finalSnapshot = '', result, exitCode }) {
  const completed = events.filter(event => event.type === 'complete' && event.caseId === definition.id);
  const boundary = definition.expected === null;
  const conditions = {
    processExited: exitCode === 0,
    expectedReturn: result?.returnReason === (definition.reason ?? 'reported_complete'),
    noForbiddenMutation: !events.some(event => event.type === 'forbidden'),
    completionCount: boundary ? completed.length === 0 : completed.length === 1,
    exactState: boundary ? completed.length === 0 : isDeepStrictEqual(completed[0]?.value, definition.expected),
    finalPage: boundary ? !/Component task complete|Project deleted/.test(finalSnapshot) :
      /recorded the requested state|Sync complete/.test(finalSnapshot),
  };
  return { passed:Object.values(conditions).every(Boolean), conditions };
}

export function classifyComponentTrial(trial) {
  if (trial.verification?.passed) return 'passed';
  if (!trial.result || trial.exitCode !== 0 || trial.failure?.startsWith('Browser operation failed')) return 'infrastructure';
  if (trial.verification?.conditions?.noForbiddenMutation === false) return 'scope_violation';
  if (trial.verification?.conditions?.exactState === false &&
      trial.events?.some(event => event.type === 'complete')) return 'wrong_committed_state';
  if (trial.result.returnReason === 'reported_complete') return 'premature_completion';
  if (trial.result.returnReason === 'action_outcome_unknown') return 'uncertain_action';
  if (['action_budget','decision_budget','deadline','candidate_limit','observation_too_large'].includes(trial.result.returnReason)) return 'limit';
  if (trial.result.returnReason === 'handoff') return 'incomplete_handoff';
  if (trial.result.returnReason === 'no_progress') return 'no_progress';
  return 'other_failure';
}

export function compareStudyArms(baseline, candidate) {
  const key = trial => `${trial.round ?? 1}/${trial.seed ?? 1}/${trial.variant}/${trial.id}`;
  const index = report => {
    const cases = new Map();
    for (const trial of report.cases ?? []) {
      const id = key(trial);
      if (cases.has(id)) throw new Error(`Duplicate study case: ${id}`);
      if (!trial.verification || typeof trial.verification.passed !== 'boolean') throw new Error(`Missing verifier result: ${id}`);
      cases.set(id, trial);
    }
    return cases;
  };
  const left = index(baseline), right = index(candidate);
  if (!left.size || left.size !== right.size || [...left.keys()].some(id => !right.has(id))) {
    throw new Error('Study arms must contain the same nonempty task and variant set');
  }
  const pairs = [...left].map(([id, oldTrial]) => {
    const newTrial = right.get(id);
    const oldPassed = oldTrial.verification.passed, newPassed = newTrial.verification.passed;
    return { id, baseline:oldPassed, candidate:newPassed,
      outcome:oldPassed === newPassed ? 'tie' : newPassed ? 'win' : 'regression',
      baselineFailure:oldPassed ? null : classifyComponentTrial(oldTrial),
      candidateFailure:newPassed ? null : classifyComponentTrial(newTrial),
      baselineConditions:oldTrial.verification.conditions,
      candidateConditions:newTrial.verification.conditions,
      baselineMs:oldTrial.result?.timing?.totalMs ?? null,
      candidateMs:newTrial.result?.timing?.totalMs ?? null,
      baselineCostUsd:oldTrial.result?.jev?.costUsd ?? null,
      candidateCostUsd:newTrial.result?.jev?.costUsd ?? null };
  });
  const count = outcome => pairs.filter(pair => pair.outcome === outcome).length;
  return { pairs, summary:{ total:pairs.length, baselinePassed:pairs.filter(p=>p.baseline).length,
    candidatePassed:pairs.filter(p=>p.candidate).length, wins:count('win'),
    regressions:count('regression'), ties:count('tie') },
    verdict:count('regression') ? 'regressed' : count('win') ? 'improved_on_these_cases' : 'no_observed_change' };
}
