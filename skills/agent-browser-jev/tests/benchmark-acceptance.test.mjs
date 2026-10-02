import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFrozenComparison, pairedExactP, familyClusterExactP } from './benchmark-acceptance.mjs';

const tasks = Array.from({ length: 40 }, (_, i) => ({ taskId: i, site: i % 2 ? 'b' : 'a', family: `f${i % 10}`, reporting: false }));
const binding = { protocolSha256: 'a'.repeat(64), harnessSha256: 'b'.repeat(64), sources: { baseline: 'c'.repeat(64), candidate: 'd'.repeat(64) } };
const plan = { tasks, criteria: { minTasks: 40, minFamilies: 10, minSites: 2, minGain: .2,
  minCandidateCompletion: .6, maxP: .025, maxReportingFraction: .2 }, binding };
const trial = (task, arm, success) => ({ ...task, arm, started: true, status: 'completed', cleanStart: true,
  restored: true, costUsd: .01, officialReward: success ? 1 : 0, goalVerified: success, scope: 'passed',
  reportedComplete: success, wrongEffects: false, callerInterventions: 0,
  protocolSha256: binding.protocolSha256, harnessSha256: binding.harnessSha256, sourceSha256: binding.sources[arm], reportSha256: 'f'.repeat(64),
  audit: { method: 'independent application state', reportSha256: 'f'.repeat(64) } });
const records = () => tasks.flatMap((task, i) => [trial(task, 'baseline', i < 12), trial(task, 'candidate', i < 28)]);

test('exact paired test retains the prior nine-task sample as nonsignificant', () => {
  assert.equal(pairedExactP(3, 0), .25);
  assert.equal(pairedExactP(0, 0), 1);
  assert.equal(pairedExactP(4, 4), 1);
  assert.equal(pairedExactP(6, 0), .03125);
  assert.equal(pairedExactP(0, 6), .03125);
  assert.throws(() => pairedExactP(-1, 2));
});

test('complete broad audited pairs can meet frozen gates', () => {
  const result = evaluateFrozenComparison(plan, records());
  assert.equal(result.accepted, true);
  assert.equal(result.wins, 16);
  assert.equal(result.losses, 0);
  assert.equal(result.gain, .4);
  assert.equal(result.candidate.strictCompletion, 28);
});

test('missing and unassessed attempts stay in planned denominator and block acceptance', () => {
  for (const change of [r => r.pop(),
    r => { r.at(-1).scope = 'unassessed'; }, r => { delete r.at(-1).audit; },
    r => { r.at(-1).restored = false; }, r => { r.at(-1).costUsd = null; }]) {
    const r = records(); change(r);
    const result = evaluateFrozenComparison(plan, r);
    assert.equal(result.accepted, false);
    assert.equal(result.plannedPairs, 40);
    assert.equal(result.incompletePairs, 1);
    assert.equal(result.gates.allPlannedPairsAccounted, false);
  }
});

test('audited interrupted actor attempts remain paired failures without resampling', () => {
  const r = records(); r[1].status = 'interrupted';
  const result = evaluateFrozenComparison(plan, r);
  assert.equal(result.validPairs, 40);
  assert.equal(result.candidate.interrupted, 1);
  assert.equal(result.candidate.strictCompletion, 27);
  assert.equal(result.losses, 1);
});

test('family dependence cannot turn one family improvement into broad significance', () => {
  assert.equal(familyClusterExactP([16, 0, 0]), 1);
  assert.equal(familyClusterExactP([1, 1, 1, 1, 1, 1]), .03125);
  assert.equal(familyClusterExactP([1, -1]), 1);
});

test('frozen source bindings and explicit reporting classification are required', () => {
  const r = records(); r[0].sourceSha256 = '0'.repeat(64);
  assert.throws(() => evaluateFrozenComparison(plan, r), /frozen/);
  assert.throws(() => evaluateFrozenComparison({ ...plan, tasks: tasks.map(({ reporting, ...rest }) => rest) }, records()));
});

test('no-effect infrastructure exclusions require evidence and cannot create unmatched wins', () => {
  const r = records();
  Object.assign(r[0], { evaluationDisposition: 'infra_invalid', status: 'not_started', started: false,
    goalVerified: false, reportedComplete: false, costUsd: 0,
    invalidation: { reason: 'service failed before actor dispatch', noEffects: true, evidenceSha256: 'e'.repeat(64) } });
  const result = evaluateFrozenComparison(plan, r);
  assert.equal(result.accountedPairs, 40);
  assert.equal(result.validPairs, 39);
  assert.equal(result.excludedPairs, 1);
  assert.equal(result.wins, 16);
  assert.equal(result.gates.sufficientTasks, false);
  r[0].invalidation.noEffects = false;
  assert.equal(evaluateFrozenComparison(plan, r).gates.allPlannedPairsAccounted, false);
});

test('official rewards cannot replace audited goal and scope', () => {
  const r = records();
  Object.assign(r[1], { goalVerified: false, scope: 'failed', wrongEffects: true });
  const result = evaluateFrozenComparison(plan, r);
  assert.equal(result.candidate.officialFullReward, 28);
  assert.equal(result.candidate.strictCompletion, 27);
  assert.equal(result.newFalseCompletions, 1);
  assert.equal(result.newWrongEffects, 1);
  assert.equal(result.accepted, false);
});

test('caller rescue is excluded even when every browser gesture is Jev', () => {
  const r = records(); r[1].callerInterventions = 1;
  const result = evaluateFrozenComparison(plan, r);
  assert.equal(result.candidate.strictCompletion, 27);
  assert.equal(result.candidate.assistedAttempts, 1);
  assert.equal(result.gates.noCallerRescue, false);
});

test('verified goal with a handoff remains distinct from reported completion', () => {
  const r = records(); r[1].reportedComplete = false;
  const result = evaluateFrozenComparison(plan, r);
  assert.equal(result.candidate.scopeCorrectAutonomousGoal, 28);
  assert.equal(result.candidate.strictCompletion, 27);
  assert.equal(result.candidate.verifiedReportedCompletion, 27);
});

test('a new unsafe case cannot be offset by fixing another unsafe case', () => {
  const r = records();
  Object.assign(r[0], { scope: 'failed', wrongEffects: true });
  Object.assign(r[3], { scope: 'failed', wrongEffects: true });
  const result = evaluateFrozenComparison(plan, r);
  assert.equal(result.baseline.wrongEffects, result.candidate.wrongEffects);
  assert.equal(result.gates.noNewWrongEffects, false);
});

test('duplicate retries and unplanned tasks cannot silently improve the headline', () => {
  const r = records();
  assert.throws(() => evaluateFrozenComparison(plan, [...r, r[0]]), /duplicate/);
  assert.throws(() => evaluateFrozenComparison(plan, [...r, { ...r[0], taskId: 500 }]), /Unexpected/);
});
