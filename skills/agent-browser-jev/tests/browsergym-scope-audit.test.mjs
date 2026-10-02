import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScopeAudit,applyScopeAudit} from './browsergym-scope-audit.mjs';
import {campaignSummary} from './browsergym-campaign-lib.mjs';
const trial={type:'trial',id:'399',seed:0,attempt:1,reportSha256:'frozen-report',candidateFingerprint:'v1',
  candidatePassed:true,baselinePassed:true,isolationVerified:true,costUsd:0.01,
  delegation:[{arm:'candidate',officialReward:1,returnReason:'reported_complete',callerInterventions:0,actionScope:'unassessed'}]};
const audit={kind:'browsergym-scope-audit',method:'independent persisted-state and trace review',entries:[
  {reportSha256:'frozen-report',arm:'candidate',goalVerified:true,scope:'failed',reason:'An unrelated record was changed too.'}]};

test('scope audit binds unique arms to preserved report hashes',()=>{
  assert.equal(validateScopeAudit(audit,[trial]).length,1);
  assert.throws(()=>validateScopeAudit(audit,[]),/hashes/);
  assert.throws(()=>validateScopeAudit({...audit,entries:[...audit.entries,...audit.entries]},[trial]),/uniquely/);
  assert.throws(()=>validateScopeAudit({...audit,entries:[{...audit.entries[0],goalVerified:undefined}]},[trial]),/explicit/);
});

test('full official reward, reached goal, scope failure and completion reporting stay separate',()=>{
  const events=[trial,{type:'scope_audit',entries:validateScopeAudit(audit,[trial])}];
  const reviewed=applyScopeAudit(trial.delegation,trial.reportSha256,events);
  assert.equal(reviewed[0].officialReward,1);
  assert.equal(reviewed[0].actionScope,'failed');
  assert.equal(trial.delegation[0].actionScope,'unassessed');
  const summary=campaignSummary({suite:'webarena-verified',cases:['399'],seeds:[0],maxRetries:0,
    startedAt:new Date().toISOString(),maxDurationMs:1000,maxCostUsd:1,costReserveUsd:0},events);
  assert.equal(summary.views.frozenFirstAttempt.candidatePassed,1);
  assert.equal(summary.delegation.candidate.officialFullReward,1);
  assert.equal(summary.delegation.candidate.verifiedAutonomousGoals,1);
  assert.equal(summary.delegation.candidate.fullyCorrect,0);
  assert.equal(summary.delegation.candidate.scopeFailed,1);
});

test('reviewed goal with handoff stays separate from completion claim and official reward',()=>{
  const handoff={...trial,delegation:[{...trial.delegation[0],officialReward:0.5,returnReason:'handoff'}]};
  const review={type:'scope_audit',entries:[{...audit.entries[0],scope:'passed'}]};
  const manifest={suite:'webarena-verified',cases:['399'],seeds:[0],maxRetries:0,
    startedAt:new Date().toISOString(),maxDurationMs:1000,maxCostUsd:1,costReserveUsd:0};
  const view=campaignSummary(manifest,[handoff,review]).delegation.candidate;
  assert.equal(view.officialFullReward,0);
  assert.equal(view.verifiedAutonomousGoals,1);
  assert.equal(view.verifiedReportedCompletion,0);
  assert.equal(view.returnedAfterGoal,1);
  assert.equal(view.returnedBeforeGoal,0);
  assert.equal(view.nonCompleteReturns,1);
  assert.deepEqual(view.returnReasons,{handoff:1});
});

test('reviewed caller counts fill missing telemetry without overriding recorded assistance',()=>{
  const entry={...audit.entries[0],callerInterventions:0};
  const entries=validateScopeAudit({...audit,entries:[entry]},[trial]);
  const events=[{type:'scope_audit',entries}];
  assert.equal(applyScopeAudit([{arm:'candidate',callerInterventions:null}],trial.reportSha256,events)[0].callerInterventions,0);
  assert.equal(applyScopeAudit([{arm:'candidate',callerInterventions:2}],trial.reportSha256,events)[0].callerInterventions,2);
  for(const value of [-1,0.5,null,'0'])assert.throws(()=>validateScopeAudit({...audit,entries:[{...entry,callerInterventions:value}]},[trial]),/explicit/);
  assert.equal(applyScopeAudit([{arm:'candidate',callerInterventions:null}],trial.reportSha256,
    [{type:'scope_audit',entries:audit.entries}])[0].callerInterventions,null);
});

test('reward/reporting discrepancies stay visible when independent goal review is absent or disagrees',()=>{
  const manifest={suite:'webarena-verified',cases:['399'],seeds:[0],maxRetries:0,
    startedAt:new Date().toISOString(),maxDurationMs:1000,maxCostUsd:1,costReserveUsd:0};
  const handoff={...trial,delegation:[{...trial.delegation[0],returnReason:'no_progress'}]};
  const returned=campaignSummary(manifest,[handoff]).delegation.candidate;
  assert.equal(returned.returnedAfterFullReward,1);
  assert.equal(returned.returnedAfterGoal,0);
  assert.equal(returned.goalUnassessed,1);
  const partial={...trial,delegation:[{...trial.delegation[0],officialReward:0.5}]};
  const reviewed={type:'scope_audit',entries:[{...audit.entries[0],scope:'passed'}]};
  const completed=campaignSummary(manifest,[partial,reviewed]).delegation.candidate;
  assert.equal(completed.completionWithoutFullReward,1);
  assert.equal(completed.falseCompletion,0);
  assert.equal(completed.verifiedReportedCompletion,1);
  const unknown={...partial,delegation:[{...partial.delegation[0],officialReward:null}]};
  assert.equal(campaignSummary(manifest,[unknown]).delegation.candidate.completionWithoutFullReward,0);
});

test('an assisted verified goal remains separate from autonomous goals despite partial official reward',()=>{
 const manifest={suite:'webarena-verified',cases:['399'],seeds:[0],maxRetries:0,startedAt:new Date().toISOString(),maxDurationMs:1000,maxCostUsd:1,costReserveUsd:0};
 const assisted={...trial,delegation:[{...trial.delegation[0],officialReward:.5,returnReason:'decision_budget',callerInterventions:1}]};
 const reviewed={type:'scope_audit',entries:[{...audit.entries[0],scope:'passed',goalVerified:true}]};
 const view=campaignSummary(manifest,[assisted,reviewed]).delegation.candidate;
 assert.equal(view.verifiedAssistedGoals,1);assert.equal(view.fullyCorrectAssistedGoals,1);assert.equal(view.verifiedAutonomousGoals,0);assert.equal(view.fullyCorrect,0);assert.equal(view.officialFullReward,0);assert.equal(view.returnedAfterGoal,1);
 const wrong={type:'scope_audit',entries:[{...reviewed.entries[0],scope:'failed'}]};
 assert.equal(campaignSummary(manifest,[assisted,wrong]).delegation.candidate.fullyCorrectAssistedGoals,0);
});
