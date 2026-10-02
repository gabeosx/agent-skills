import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { readDashboardEvidence } from './browsergym-dashboard-evidence.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(root, file, data) {
  const bytes = JSON.stringify(data);
  await writeFile(join(root, file), bytes);
  return {file, sha256: digest(bytes)};
}
function publicCase(id, overrides = {}) {
  return {id, seed: 0, arm: 'candidate', reward: 1, actor: {callerInterventions: 0},
    actionScope: {verdict: 'unassessed'}, result: {returnReason: 'reported_complete',
      actions: [{operation: 'click'}], jev: {calls: 2, costUsd: 0.01},
      observation: {secret: 'PRIVATE_PAGE'}, resumeToken: 'PRIVATE_TOKEN'}, ...overrides};
}

test('evidence keeps reward, review, assistance and expected negatives separate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jev-dashboard-evidence-'));
  try {
    const pub = await save(root, 'public.json', {cases: [publicCase('p', {
      result: {returnReason: 'reported_complete', jev: {calls: 5}, callerStudy: {
        mode: 'caller_with_jev', callerCalls: [{}, {}, {}, {}], callerActions: 0,
        helperCalls: [{}, {}], helperActions: 3, callerCostUsd: 0.1, jevCostUsd: 0.01, totalCostUsd: 0.11,
        initialObservation: 'PRIVATE_PAGE', resumeToken: 'PRIVATE_TOKEN'}}})]});
    const authored = await save(root, 'authored.json', {cases: [
      {id: 'positive', arm: 'candidate', goalReached: true, scopeCorrect: true,
        callerInterventions: 0, result: {returnReason: 'handoff', actions: [], jev: {calls: 1, costUsd: 0.002}}},
      {id: 'negative', arm: 'candidate', expectedNegative: true, passed: true, goalReached: false,
        scopeCorrect: true, callerInterventions: 0, result: {returnReason: 'input_required', actions: [], jev: {calls: 1, costUsd: 0.003}}},
    ]});
    const review = await save(root, 'review.json', {trials: [
      {report: pub.file, sha256: pub.sha256, id: 'p', arm: 'candidate', independentGoal: 'passed', scope: 'failed'},
    ]});
    await save(root, 'dashboard-evidence.json', {schema: 1, reports: [
      {...pub, cohort: 'public', kind: 'public'}, {...authored, cohort: 'authored', kind: 'authored'},
    ], reviews: [review]});
    const evidence = await readDashboardEvidence(root);
    assert.deepEqual(evidence.errors, []);
    const p = evidence.cohorts[0].arms[0], a = evidence.cohorts[1].arms[0];
    assert.equal(p.fullReward, 1);
    assert.equal(p.verifiedGoals, 1);
    assert.equal(p.scopeFailed, 1);
    assert.equal(p.fullyCorrect, 0);
    assert.equal(p.autonomousGoals, 0);
    assert.equal(p.callerCalls, 4);
    assert.equal(p.callerActions, 0);
    assert.equal(p.helperCalls, 2);
    assert.equal(p.costUsd, 0.11);
    assert.equal(a.trials, 1);
    assert.equal(a.verifiedGoals, 1);
    assert.equal(a.completeReports, 0);
    assert.equal(a.autonomousGoals, 1);
    assert.equal(a.rewardMeasured, 0);
    assert.equal(a.negatives, 1);
    assert.equal(a.negativePassed, 1);
    assert.equal(a.costUsd, 0.005);
    assert.doesNotMatch(JSON.stringify(evidence), /PRIVATE_PAGE|PRIVATE_TOKEN|initialObservation/);
    // A supplemental verdict for another report hash cannot certify this trial.
    const wrongReview = await save(root, 'review.json', {trials: [
      {report: pub.file, sha256: '0'.repeat(64), id: 'p', arm: 'candidate', scope: 'passed'},
    ]});
    await save(root, 'dashboard-evidence.json', {schema: 1, reports: [{...pub, cohort: 'public', kind: 'public'}], reviews: [wrongReview]});
    assert.equal((await readDashboardEvidence(root)).cohorts[0].arms[0].scopeUnassessed, 1);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('changed or escaped evidence is excluded and missing measurements stay unknown', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'jev-dashboard-integrity-'));
  const root = join(parent, 'run');
  try {
    await mkdir(root);
    const ref = await save(root, 'report.json', {cases: [publicCase('p', {actor: {}, result: {returnReason: 'handoff'}})]});
    await save(root, 'dashboard-evidence.json', {schema: 1, reports: [{...ref, kind: 'public', cohort: 'one'}]});
    let evidence = await readDashboardEvidence(root);
    assert.equal(evidence.cohorts[0].arms[0].costUsd, null);
    assert.equal(evidence.cohorts[0].arms[0].callerCalls, null);
    await save(root, 'report.json', {cases: [publicCase('different')]});
    evidence = await readDashboardEvidence(root);
    assert.equal(evidence.totalTrials, 0);
    assert.match(evidence.errors[0], /hash mismatch/);
    const external = await save(parent, 'outside.json', {cases: [publicCase('secret')]});
    await symlink(join(parent, external.file), join(root, 'alias.json'));
    for (const file of ['../outside.json', 'alias.json']) {
      await save(root, 'dashboard-evidence.json', {schema: 1, reports: [{...external, file, kind: 'public', cohort: 'one'}]});
      evidence = await readDashboardEvidence(root);
      assert.equal(evidence.totalTrials, 0);
      assert.match(evidence.errors[0], /leaves its run directory/);
    }
  } finally { await rm(parent, {recursive: true, force: true}); }
});

test('negative corrections require the exact report and actor and retain the raw result', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jev-dashboard-negative-'));
  try {
    const ref = await save(root, 'negative.json', {cases: [
      {id: 'absent', arm: 'baseline', expectedNegative: true, passed: false, scopeCorrect: false,
        result: {returnReason: 'input_required'}},
      {id: 'positive', arm: 'baseline', passed: false, result: {returnReason: 'handoff'}},
    ]});
    const makeIndex = async trials => {
      const review = await save(root, 'review.json', {trials});
      await save(root, 'dashboard-evidence.json', {schema: 1,
        reports: [{...ref, kind: 'authored', cohort: 'boundaries'}], reviews: [review]});
      return (await readDashboardEvidence(root)).cohorts[0];
    };
    const correction = {report: ref.file, sha256: ref.sha256, id: 'absent', arm: 'baseline',
      scope: 'passed', negativeCheck: 'passed'};
    let cohort = await makeIndex([correction, {...correction, id: 'positive'}]);
    assert.equal(cohort.arms[0].negativePassed, 1);
    assert.equal(cohort.arms[0].negatives, 1);
    assert.equal(cohort.trials[0].rawNegativePassed, false);
    assert.equal(cohort.trials[0].negativeReview, 'passed');
    assert.equal(cohort.trials[1].negativePassed, false);
    for (const mismatch of [{sha256: '0'.repeat(64)}, {arm: 'candidate'}]) {
      cohort = await makeIndex([{...correction, ...mismatch}]);
      assert.equal(cohort.arms[0].negativePassed, 0);
      assert.equal(cohort.trials[0].negativeReview, 'unassessed');
    }
    cohort = await makeIndex([{...correction, negativeCheck: 'failed'}]);
    assert.equal(cohort.arms[0].negativePassed, 0);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('live overview and detail APIs expose experiment metrics without serving raw reports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jev-dashboard-live-evidence-'));
  let child;
  try {
    const older = join(root, 'older'), newer = join(root, 'newer');
    await mkdir(older); await mkdir(newer);
    await save(older, 'readiness.json', {benchmark: 'Older', createdAt: '2026-01-01', checks: []});
    await save(newer, 'readiness.json', {benchmark: 'Newer', createdAt: '2026-01-02', stage: 'completed', checks: []});
    // Source/state archives also use manifest.json; directory discovery must
    // not pass those documents to the campaign task summarizer.
    const archive = join(newer, 'state-archive'); await mkdir(archive);
    await save(archive, 'manifest.json', {createdAt: '2026-01-04', files: {state: 'digest'}});
    await save(newer, 'manifest.json', {kind: 'source-freeze', files: {runtime: 'digest'}});
    const ref = await save(newer, 'report.json', {cases: [publicCase('p')]});
    await save(newer, 'dashboard-evidence.json', {schema: 1, reports: [{...ref, cohort: 'x', kind: 'public', title: '<script>injection</script>'}]});
    child = spawn(process.execPath, [fileURLToPath(new URL('./browsergym-dashboard.mjs', import.meta.url)), '--campaign-root', root], {stdio: ['ignore', 'pipe', 'pipe']});
    const url = await new Promise((resolveUrl, reject) => {
      child.once('error', reject);
      child.stdout.once('data', data => { try { resolveUrl(JSON.parse(String(data)).url); } catch (error) { reject(error); } });
      child.once('exit', code => reject(new Error(`Dashboard exited ${code}`)));
    });
    assert.deepEqual(await (await fetch(`${url}health.json`)).json(),
      {kind:'browsergym-dashboard-health',ready:true});
    const overview = await (await fetch(`${url}status.json`)).json();
    assert.equal(overview.current, 'newer');
    assert.equal(overview.campaigns.length, 2);
    assert.equal(overview.campaigns[0].evidence.cohorts[0].arms[0].fullReward, 1);
    const detail = await (await fetch(`${url}campaign/newer/status.json`)).json();
    assert.equal(detail.evidence.cohorts[0].trials[0].scope, 'unassessed');
    assert.doesNotMatch(JSON.stringify(detail), /PRIVATE_PAGE|PRIVATE_TOKEN/);
    const html = await (await fetch(url)).text();
    assert.match(html, /href="\/campaign\/newer\/#x"/);
    assert.doesNotMatch(html, /<script>injection/);
    // Keep the overview live, but do not collapse an opened trial disclosure
    // every ten seconds on a completed experiment's detail page.
    assert.match(html, /http-equiv="refresh"/);
    const detailHtml = await (await fetch(`${url}campaign/newer/`)).text();
    assert.doesNotMatch(detailHtml, /http-equiv="refresh"/);
    assert.match(detailHtml, /<details>/);
    assert.equal((await fetch(`${url}campaign/newer/report.json`)).status, 404);
    // Later bundle evidence should outrank a child or other run created later,
    // while preserving its original creation time and ignoring invalid updates.
    await save(older, 'readiness.json', {benchmark: 'Older', createdAt: '2026-01-01',
      updatedAt: '2026-01-03', checks: []});
    let refreshed = await (await fetch(`${url}status.json`)).json();
    assert.equal(refreshed.current, 'older');
    assert.equal(refreshed.campaigns[0].startedAt, '2026-01-01');
    await save(older, 'readiness.json', {benchmark: 'Older', createdAt: '2026-01-01',
      updatedAt: 'invalid', checks: []});
    refreshed = await (await fetch(`${url}status.json`)).json();
    assert.equal(refreshed.current, 'newer');
  } finally {
    if (child && child.exitCode === null) { child.kill('SIGTERM'); await new Promise(done => child.once('exit', done)); }
    await rm(root, {recursive: true, force: true});
  }
});

test('current-agent effort is not displayed as zero API caller work or zero cost',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jev-dashboard-current-agent-'));
 try{
  const ref=await save(root,'report.json',{cases:[publicCase('current',{result:{returnReason:'handoff',jev:{calls:2,costUsd:.002},callerStudy:{mode:'caller_with_jev',callerIdentity:{name:'Current agent',costMeasured:false},callerCalls:[],callerActions:3,helperCalls:[{}],helperActions:2,callerCostUsd:null,jevCostUsd:.002,totalCostUsd:.002}}})]});
  await save(root,'dashboard-evidence.json',{schema:1,reports:[{...ref,cohort:'current',kind:'public'}]});
  const summary=(await readDashboardEvidence(root)).cohorts[0].arms[0];assert.equal(summary.callerCalls,null);assert.equal(summary.callerCostUsd,null);assert.equal(summary.callerActions,3);assert.equal(summary.helperCostUsd,.002);
 }finally{await rm(root,{recursive:true,force:true});}
});
