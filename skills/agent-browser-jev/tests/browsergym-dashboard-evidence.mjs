// A safe projection of frozen experiment reports, separate from readiness checks.
// Only allowlisted metrics reach the dashboard; raw goals, pages and tokens stay private.
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const hash = value => createHash('sha256').update(value).digest('hex');
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const verdict = value => ['passed', 'failed'].includes(value) ? value : 'unassessed';
const text = value => typeof value === 'string' ? value.slice(0, 1200) : '';
const sum = (rows, key) => rows.every(row => row[key] !== null) ? rows.reduce((n, row) => n + row[key], 0) : null;

async function boundedFile(root, file) {
  if (typeof file !== 'string' || isAbsolute(file)) throw new Error('Expected a relative evidence path');
  const path = await realpath(resolve(root, file));
  const inside = relative(root, path);
  if (!inside || inside === '..' || inside.startsWith('../') || isAbsolute(inside))
    throw new Error('Evidence path leaves its run directory');
  return path;
}

async function frozenJson(root, ref) {
  if (!/^[a-f0-9]{64}$/.test(ref?.sha256 ?? '')) throw new Error('Missing evidence hash');
  const bytes = await readFile(await boundedFile(root, ref.file));
  if (hash(bytes) !== ref.sha256) throw new Error(`Evidence hash mismatch: ${ref.file}`);
  return JSON.parse(bytes);
}

function sourceFingerprint(report, arm) {
  const source = report.arms?.[arm]?.sourceSha256 ?? report.sourceSha256?.[arm] ?? report.sourceSha256;
  if (!source || typeof source !== 'object') return null;
  return hash(JSON.stringify(Object.entries(source).sort(([a], [b]) => a.localeCompare(b))));
}

function trialProjection(raw, report, spec, reviews) {
  const result = raw.result ?? {}, study = result.callerStudy;
  const arm = study?.mode ?? raw.arm ?? spec.arm ?? 'candidate';
  const publicTrial = spec.kind === 'public';
  const expectedNegative = spec.kind === 'components' ? raw.expected === null : raw.expectedNegative === true;
  // Public reward is not an independent semantic scope review.
  const review = reviews.find(item => item.report === spec.file && item.sha256 === spec.sha256 &&
    String(item.id) === String(raw.id) && item.arm === (raw.arm ?? arm));
  const goal = review?.independentGoal ? verdict(review.independentGoal) : publicTrial ? 'unassessed' :
    typeof raw.goalReached === 'boolean' ? (raw.goalReached ? 'passed' : 'failed') :
    !expectedNegative && typeof raw.verification?.passed === 'boolean' ? (raw.verification.passed ? 'passed' : 'failed') : 'unassessed';
  const scope = verdict(review?.scope ?? raw.actionScope?.verdict ??
    (typeof raw.scopeCorrect === 'boolean' ? (raw.scopeCorrect ? 'passed' : 'failed') :
      raw.verification?.conditions?.noForbiddenMutation === true ? 'passed' : null));
  const externalCaller=study?.callerIdentity?.costMeasured===false;
  const callerCalls = externalCaller ? null : study ? (Array.isArray(study.callerCalls) ? study.callerCalls.length : null) :
    raw.actor?.callerInterventions === 0 || raw.callerInterventions === 0 || spec.kind === 'components' ? 0 : null;
  const callerActions = study ? count(study.callerActions) : callerCalls === 0 ? 0 : null;
  const helperActions = study ? count(study.helperActions) : Array.isArray(result.actions) ? result.actions.length : null;
  const callerCostUsd = study ? number(study.callerCostUsd) : callerCalls === 0 ? 0 : null;
  const helperCostUsd = study ? number(study.jevCostUsd) : number(result.jev?.costUsd);
  const costUsd = study ? number(study.totalCostUsd) : helperCostUsd;
  return {
    id: text(String(raw.id)), seed: count(raw.seed), arm, armLabel: text(spec.armNames?.[arm] ?? arm),
    report: spec.file, reportSha256: spec.sha256, sourceFingerprint: sourceFingerprint(report, raw.arm ?? arm),
    expectedNegative, reward: publicTrial && typeof raw.reward === 'number' ? raw.reward : null,
    goal, scope, returnReason: text(result.returnReason) || 'unknown',
    falseCompletion: review?.falseCompletion === true,
    rawNegativePassed: expectedNegative && (raw.passed === true || raw.verification?.passed === true),
    negativeReview: expectedNegative ? verdict(review?.negativeCheck) : 'unassessed',
    negativePassed: expectedNegative && (['passed', 'failed'].includes(review?.negativeCheck) ?
      review.negativeCheck === 'passed' : raw.passed === true || raw.verification?.passed === true),
    helperCalls: study ? (Array.isArray(study.helperCalls) ? study.helperCalls.length : null) : 1,
    helperRequests: count(result.jev?.calls), helperActions, callerCalls, callerActions,
    callerCostUsd, helperCostUsd, costUsd, elapsedMs: number(raw.elapsedMs ?? result.timing?.elapsedMs),
    failure: text(study?.failure ?? raw.failureClass),
    callerAssisted: study?.mode === 'caller_with_jev' ? true : study?.mode === 'caller_only' ? false :
      raw.actor?.callerInterventions === 0 || raw.callerInterventions === 0 || spec.kind === 'components' ? false : null,
  };
}

export function summarizeEvidenceTrials(trials) {
  const positive = trials.filter(row => !row.expectedNegative);
  const negative = trials.filter(row => row.expectedNegative);
  return {
    trials: positive.length, fullReward: positive.filter(row => row.reward === 1).length,
    rewardMeasured: positive.filter(row => row.reward !== null).length,
    verifiedGoals: positive.filter(row => row.goal === 'passed').length,
    goalUnassessed: positive.filter(row => row.goal === 'unassessed').length,
    completeReports: positive.filter(row => row.returnReason === 'reported_complete').length,
    returnedControl: positive.filter(row => row.returnReason !== 'reported_complete').length,
    scopePassed: positive.filter(row => row.scope === 'passed').length,
    scopeFailed: positive.filter(row => row.scope === 'failed').length,
    scopeUnassessed: positive.filter(row => row.scope === 'unassessed').length,
    rewardAndComplete: positive.filter(row => row.reward === 1 && row.returnReason === 'reported_complete').length,
    fullyCorrect: positive.filter(row => row.goal === 'passed' && row.scope === 'passed').length,
    autonomousGoals: positive.filter(row => row.goal === 'passed' && row.callerAssisted === false && row.arm !== 'caller_only').length,
    falseCompletion: positive.filter(row => row.falseCompletion).length,
    negatives: negative.length, negativePassed: negative.filter(row => row.negativePassed).length,
    callerCalls: sum(trials, 'callerCalls'), callerActions: sum(trials, 'callerActions'),
    helperCalls: sum(trials, 'helperCalls'), helperRequests: sum(trials, 'helperRequests'), helperActions: sum(trials, 'helperActions'),
    callerCostUsd: sum(trials, 'callerCostUsd'), helperCostUsd: sum(trials, 'helperCostUsd'), costUsd: sum(trials, 'costUsd'),
  };
}

export async function readDashboardEvidence(runDir) {
  const root = await realpath(runDir);
  let index;
  try { index = JSON.parse(await readFile(resolve(root, 'dashboard-evidence.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (index.schema !== 1 || !Array.isArray(index.reports)) throw new Error('Unsupported dashboard evidence schema');
  const errors = [], reviews = [], cohorts = new Map();
  for (const ref of index.reviews ?? []) {
    try { const audit = await frozenJson(root, ref); reviews.push(...(audit.trials ?? [])); }
    catch (error) { errors.push(error.message); }
  }
  for (const spec of index.reports) {
    const key = text(spec.cohort);
    if (!cohorts.has(key)) cohorts.set(key, {id: key, title: text(spec.title ?? key),
      kind: spec.kind, qualification: text(spec.qualification), disposition: text(spec.disposition),
      note: text(spec.note), trials: [], errors: []});
    const cohort = cohorts.get(key);
    try {
      if (!['public', 'authored', 'components'].includes(spec.kind)) throw new Error('Unknown report kind');
      const report = await frozenJson(root, spec);
      if (!Array.isArray(report.cases)) throw new Error(`Missing trial rows: ${spec.file}`);
      cohort.trials.push(...report.cases.map(row => trialProjection(row, report, spec, reviews)));
    } catch (error) { cohort.errors.push(error.message); errors.push(error.message); }
  }
  let accounting = null;
  if (index.accounting) {
    try {
      const raw = await frozenJson(root, index.accounting);
      accounting = Object.fromEntries(['campaignMeasuredUsd', 'cumulativeConservativeUsd', 'remainingApprovedUsd']
        .map(key => [key, number(raw[key])]));
      accounting.maxCostUsd = number(index.maxCostUsd);
      accounting.providerReconciled = raw.providerReconciled === true;
      accounting.unknownCharges = raw.unknown !== false;
      accounting.deadline = text(raw.deadline);
    } catch (error) { errors.push(error.message); }
  }
  const items = [...cohorts.values()].map(cohort => ({...cohort,
    arms: [...new Set(cohort.trials.map(row => row.arm))].map(arm => ({arm,
      label: cohort.trials.find(row => row.arm === arm).armLabel,
      sourceFingerprints: [...new Set(cohort.trials.filter(row => row.arm === arm).map(row => row.sourceFingerprint))],
      ...summarizeEvidenceTrials(cohort.trials.filter(row => row.arm === arm))})),
  }));
  return {schema: 1, cohorts: items, accounting, errors,
    totalTrials: items.reduce((n, item) => n + item.trials.length, 0),
    note: text(index.note)};
}
