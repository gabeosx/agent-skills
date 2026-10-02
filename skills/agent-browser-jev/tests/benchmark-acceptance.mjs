// Evaluation-side statistics only. Never import this module into the browser actor.
const ARMS = ['baseline', 'candidate'];
const key = ({ site, taskId }) => `${site}:${taskId}`;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function pairedExactP(wins, losses) {
  if (![wins, losses].every(n => Number.isInteger(n) && n >= 0)) {
    throw new TypeError('Paired counts must be nonnegative integers');
  }
  const n = wins + losses;
  if (!n) return 1;
  // Exact two-sided binomial test on discordant pairs (McNemar).
  let probability = 2 ** -n;
  let tail = probability;
  for (let i = 1; i <= Math.min(wins, losses); i++) {
    probability *= (n - i + 1) / i;
    tail += probability;
  }
  return Math.min(1, 2 * tail);
}

export function familyClusterExactP(deltas) {
  if (!deltas.every(n => Number.isInteger(n))) throw new TypeError('Family deltas must be integers');
  // Exchange baseline/candidate labels together within each family. Dynamic
  // convolution computes the exact sign-flip distribution without resampling.
  let distribution = new Map([[0, 1]]);
  for (const delta of deltas.filter(Boolean)) {
    const next = new Map();
    for (const [sum, probability] of distribution) {
      for (const value of [sum + delta, sum - delta]) {
        next.set(value, (next.get(value) ?? 0) + probability / 2);
      }
    }
    distribution = next;
  }
  const observed = Math.abs(deltas.reduce((sum, n) => sum + n, 0));
  return [...distribution].reduce((p, [sum, mass]) => p + (Math.abs(sum) >= observed ? mass : 0), 0);
}

function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.tasks) || !plan.tasks.length || !plan.criteria) {
    throw new TypeError('A frozen task plan and criteria are required');
  }
  const keys = new Set();
  for (const task of plan.tasks) {
    if (task.taskId == null || !task.site || !task.family || typeof task.reporting !== 'boolean' || keys.has(key(task))) {
      throw new TypeError('Tasks require unique site/task IDs and explicit families');
    }
    keys.add(key(task));
  }
  const b = plan.binding;
  if (!b || !hash(b.protocolSha256) || !hash(b.harnessSha256)
    || !ARMS.every(arm => hash(b.sources?.[arm]))) throw new TypeError('Frozen evidence bindings are required');
  const c = plan.criteria;
  for (const name of ['minTasks', 'minFamilies', 'minSites']) {
    if (!Number.isInteger(c[name]) || c[name] < 1) throw new TypeError(`Invalid ${name}`);
  }
  for (const name of ['minGain', 'minCandidateCompletion', 'maxP', 'maxReportingFraction']) {
    if (!Number.isFinite(c[name]) || c[name] < 0 || c[name] > 1) throw new TypeError(`Invalid ${name}`);
  }
}

function assessed(record) {
  return Boolean(record?.started && ['completed', 'interrupted'].includes(record.status)
    && record.cleanStart === true && record.restored === true
    && Number.isFinite(record.costUsd) && record.costUsd >= 0
    && record.audit?.method && hash(record.audit?.reportSha256)
    && record.audit.reportSha256 === record.reportSha256
    && typeof record.goalVerified === 'boolean'
    && ['passed', 'failed'].includes(record.scope)
    && typeof record.reportedComplete === 'boolean'
    && Number.isInteger(record.callerInterventions) && record.callerInterventions >= 0
    && typeof record.wrongEffects === 'boolean');
}

function infraInvalid(record) {
  return Boolean(record?.evaluationDisposition === 'infra_invalid'
    && record.invalidation?.reason && record.invalidation.noEffects === true
    && hash(record.invalidation.evidenceSha256) && record.audit?.method
    && hash(record.reportSha256) && record.audit.reportSha256 === record.reportSha256
    && record.restored === true && record.scope === 'passed' && record.wrongEffects === false
    && record.goalVerified === false && record.reportedComplete === false
    && record.callerInterventions === 0 && Number.isFinite(record.costUsd) && record.costUsd >= 0
    && ['not_started', 'interrupted', 'completed'].includes(record.status)
    && typeof record.started === 'boolean');
}

function actorAssessed(record) {
  return record?.evaluationDisposition !== 'infra_invalid' && assessed(record);
}

function scopedGoal(record) {
  return actorAssessed(record) && record.goalVerified && record.scope === 'passed'
    && !record.wrongEffects && record.callerInterventions === 0;
}

function strictSuccess(record) {
  return scopedGoal(record) && record.status === 'completed' && record.reportedComplete === true;
}

function adverse(record) {
  return {
    wrong: record?.wrongEffects === true || record?.scope === 'failed',
    falseCompletion: record?.reportedComplete === true && record?.goalVerified === false,
  };
}

function armMetrics(records, planned) {
  const present = records.filter(Boolean);
  const count = predicate => present.filter(predicate).length;
  const costs = present.filter(r => Number.isFinite(r.costUsd) && r.costUsd >= 0);
  return {
    planned, started: count(r => r.started === true), unstarted: planned - count(r => r.started === true),
    assessed: count(actorAssessed), infraInvalid: count(infraInvalid),
    verifiedAutonomous: count(r => actorAssessed(r) && r.goalVerified && r.callerInterventions === 0),
    scopeCorrectAutonomousGoal: count(scopedGoal), strictCompletion: count(strictSuccess),
    verifiedReportedCompletion: count(r => strictSuccess(r) && r.reportedComplete),
    officialFullReward: count(r => r.officialReward === 1),
    officialRewardUnavailable: count(r => r.started && !Number.isFinite(r.officialReward)),
    reportedComplete: count(r => r.reportedComplete === true),
    falseCompletion: count(r => adverse(r).falseCompletion),
    unverifiedCompletionClaims: count(r => r.reportedComplete === true && typeof r.goalVerified !== 'boolean'),
    wrongEffects: count(r => adverse(r).wrong),
    assistedAttempts: count(r => r.callerInterventions > 0),
    interrupted: count(r => r.started && r.status === 'interrupted'),
    scopeUnassessed: count(r => r.started && !['passed', 'failed'].includes(r.scope)),
    nonCompleteReturns: count(r => r.started && r.reportedComplete === false),
    missingReturnStatus: count(r => r.started && typeof r.reportedComplete !== 'boolean'),
    measuredCostUsd: costs.reduce((sum, r) => sum + r.costUsd, 0),
    unknownCharges: count(r => r.started && !(Number.isFinite(r.costUsd) && r.costUsd >= 0)),
  };
}

export function evaluateFrozenComparison(plan, records) {
  validatePlan(plan);
  const tasks = new Map(plan.tasks.map(task => [key(task), task]));
  const index = new Map();
  for (const record of records) {
    const k = `${key(record)}:${record.arm}`;
    if (!tasks.has(key(record)) || !ARMS.includes(record.arm) || index.has(k)) {
      throw new TypeError('Unexpected or duplicate trial: preserve retries in a separate comparison');
    }
    const b = plan.binding;
    if (record.protocolSha256 !== b.protocolSha256 || record.harnessSha256 !== b.harnessSha256
      || record.sourceSha256 !== b.sources[record.arm]) {
      throw new TypeError('Trial does not match frozen protocol, source and harness');
    }
    index.set(k, record);
  }
  const pairs = plan.tasks.map(task => ({ task,
    baseline: index.get(`${key(task)}:baseline`), candidate: index.get(`${key(task)}:candidate`),
  }));
  const valid = pairs.filter(p => actorAssessed(p.baseline) && actorAssessed(p.candidate));
  const accounted = pairs.filter(p => ARMS.every(arm => actorAssessed(p[arm]) || infraInvalid(p[arm])));
  const wins = valid.filter(p => !strictSuccess(p.baseline) && strictSuccess(p.candidate)).length;
  const losses = valid.filter(p => strictSuccess(p.baseline) && !strictSuccess(p.candidate)).length;
  const summary = {};
  for (const arm of ARMS) summary[arm] = armMetrics(pairs.map(p => p[arm]), pairs.length);
  const group = field => [...new Set(plan.tasks.map(t => t[field]))].map(value => {
    const subset = pairs.filter(p => p.task[field] === value);
    return { [field]: value, planned: subset.length,
      validPairs: subset.filter(p => valid.includes(p)).length,
      baseline: subset.filter(p => valid.includes(p) && strictSuccess(p.baseline)).length,
      candidate: subset.filter(p => valid.includes(p) && strictSuccess(p.candidate)).length };
  });
  const sites = group('site');
  const families = group('family');
  const newWrongEffects = pairs.filter(p => adverse(p.candidate).wrong && !adverse(p.baseline).wrong).length;
  const newFalseCompletions = pairs.filter(p => adverse(p.candidate).falseCompletion && !adverse(p.baseline).falseCompletion).length;
  const gain = (wins - losses) / pairs.length;
  const validPairGain = valid.length ? (wins - losses) / valid.length : null;
  const pValue = pairedExactP(wins, losses);
  const clusterP = familyClusterExactP(families.map(f => f.candidate - f.baseline));
  const c = plan.criteria;
  const gates = {
    allPlannedPairsAccounted: accounted.length === pairs.length,
    noCallerRescue: ARMS.every(arm => summary[arm].assistedAttempts === 0),
    sufficientTasks: valid.length >= c.minTasks,
    sufficientFamilies: families.filter(f => f.validPairs > 0).length >= c.minFamilies,
    sufficientSites: sites.filter(s => s.validPairs > 0).length >= c.minSites,
    reportingBalance: plan.tasks.filter(t => t.reporting === true).length / pairs.length <= c.maxReportingFraction,
    materialGain: gain + 1e-12 >= c.minGain,
    absoluteCompletion: valid.filter(p => strictSuccess(p.candidate)).length / pairs.length + 1e-12 >= c.minCandidateCompletion,
    pairedSignificance: pValue < c.maxP,
    familyClusterSignificance: clusterP < c.maxP,
    positiveGainEverySite: sites.every(s => s.candidate > s.baseline),
    noNewWrongEffects: newWrongEffects === 0 && summary.candidate.wrongEffects <= summary.baseline.wrongEffects,
    noNewFalseCompletions: newFalseCompletions === 0 && summary.candidate.falseCompletion <= summary.baseline.falseCompletion,
  };
  return { accepted: Object.values(gates).every(Boolean), gates, plannedPairs: pairs.length,
    validPairs: valid.length, accountedPairs: accounted.length,
    excludedPairs: accounted.length - valid.length, incompletePairs: pairs.length - accounted.length,
    wins, losses, ties: valid.length - wins - losses, pairedExactP: pValue,
    familyClusterExactP: clusterP, gain, validPairGain,
    newWrongEffects, newFalseCompletions, ...summary, sites, families };
}
