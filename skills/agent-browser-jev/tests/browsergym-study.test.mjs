import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBrowserGym, browserGymCases, integrationCases, webarenaVerifiedCases,
  webarenaVerifiedHoldoutCases, webarenaVerifiedContinuationCases,
  webarenaVerifiedSupportedCases } from './browsergym-study-lib.mjs';
import { suppliedValuesForGoal } from './browsergym/task-values.mjs';

function trial(arm,id,seed,reward,done,claimed='reported_complete'){
  return {arm,id,seed,variant:'miniwob',round:1,reward,done,
    result:{returnReason:claimed},failureClass:reward===1&&done?'passed':'gym_reward_zero',
    verification:{passed:reward===1&&done,
      conditions:{gymReward:reward===1,gymDone:done}}};
}

test('external BrowserGym reward, not Jev completion text, determines a paired win',()=>{
  const raw={kind:'browsergym-miniwob-study',smoke:false,cases:[
    trial('baseline','click-button',11,0,false),
    trial('candidate','click-button',11,1,true,'handoff')]};
  const result=analyzeBrowserGym(raw,['click-button'],[11]);
  assert.equal(result.verdict,'improved_on_these_cases');
  assert.deepEqual(result.analysis.summary,{total:1,baselinePassed:0,candidatePassed:1,
    wins:1,regressions:0,ties:0});
});

test('a claimed completion with zero reward is a regression, and missing pairs fail closed',()=>{
  const raw={kind:'browsergym-miniwob-study',smoke:false,cases:[
    trial('baseline','choose-list',1,1,true),trial('candidate','choose-list',1,0,true)]};
  assert.equal(analyzeBrowserGym(raw,['choose-list'],[1]).verdict,'regressed');
  raw.cases.pop();
  assert.throws(()=>analyzeBrowserGym(raw,['choose-list'],[1]),/missing/);
});

test('an official evaluator error cannot be counted as an actor loss or a win',()=>{
  for(const reward of [0,0.5,1]){
    const raw={kind:'browsergym-miniwob-study',smoke:false,cases:[
      trial('baseline','click-button',1,0,true),trial('candidate','click-button',1,reward,true)]};
    raw.cases[1].evaluatorDetails={status:'error',evaluators:[{status:'error',error_msg:'Matcher construction failed'}]};
    assert.throws(()=>analyzeBrowserGym(raw,['click-button'],[1]),/Evaluator error/);
  }
});

test('BrowserGym failures are classified from reward and helper state, not component exit codes',()=>{
  const baseline=trial('baseline','choose-list',1,0,false,'action_outcome_unknown');
  const candidate=trial('candidate','choose-list',1,0,false,'input_required');
  const result=analyzeBrowserGym({kind:'browsergym-miniwob-study',smoke:false,
    cases:[baseline,candidate]},['choose-list'],[1]);
  assert.equal(result.analysis.pairs[0].baselineFailure,'uncertain_action');
  assert.equal(result.analysis.pairs[0].candidateFailure,'input_required');
  assert.deepEqual(result.infrastructure,[]);
});

test('the MiniWoB lane selects new benchmark tasks, including autocomplete and menus',()=>{
  assert.ok(browserGymCases.includes('use-autocomplete'));
  assert.ok(browserGymCases.includes('click-menu'));
  assert.ok(!browserGymCases.includes('missing-target'));
});

test('the original BrowserGym-core integration lane is labeled separately from MiniWoB',()=>{
  assert.deepEqual(integrationCases,['contact-copy','preferences','review-approval']);
  const raw={kind:'browsergym-integration-study',smoke:false,cases:[
    {...trial('baseline','preferences',11,0,false),variant:'integration'},
    {...trial('candidate','preferences',11,1,true),variant:'integration'}]};
  assert.equal(analyzeBrowserGym(raw,['preferences'],[11],'integration').verdict,
    'improved_on_these_cases');
  assert.throws(()=>analyzeBrowserGym(raw,['preferences'],[11]),/Expected/);
});

test('WebArena-Verified is a separate browser-control suite with external reward',()=>{
  assert.deepEqual(webarenaVerifiedCases,['399','404','595','650']);
  assert.deepEqual(webarenaVerifiedHoldoutCases,['603']);
  assert.deepEqual(webarenaVerifiedContinuationCases,['596','600','605']);
  assert.deepEqual(webarenaVerifiedSupportedCases,['399','404','595','650','603','596','600','605',
    '400','407','597','598','604','606','614','624','641','651','402','408','599','607','615','625','642','652','403','409','608','643','401','410','609','644','406','610','645','580','630','635','714','719','725','731','581','631','636','715','720','727','732','582','632','637','716','721','728','733','583','633','638','717','722','729','734','584','634','639','718','724','730','735','405','601','611','616','620','626','646','602','612','617','621','627','640','647','613','618','622','628','648','619','623','629','649']);
  const raw={kind:'browsergym-webarena-verified-study',smoke:false,cases:[
    {...trial('baseline','399',0,0,true),variant:'webarena-verified'},
    {...trial('candidate','399',0,1,true),variant:'webarena-verified'}]};
  assert.throws(()=>analyzeBrowserGym(raw,['399'],[0],'webarena-verified'),/clean start/);
  for(const item of raw.cases)item.cleanStart={protocol:'fresh-container-v1',passed:true,
    containerId:item.arm,previousContainerId:'old',referenceSha256:'clean',readbackSha256:'clean'};
  assert.equal(analyzeBrowserGym(raw,['399'],[0],'webarena-verified').verdict,
    'improved_on_these_cases');
  raw.cases[1].cleanStart.containerId='baseline';
  assert.throws(()=>analyzeBrowserGym(raw,['399'],[0],'webarena-verified'),/reused/);
});

test('benchmark values depend only on quoted caller text, never IDs or task templates',()=>{
  const goal='Find a forum about consoles, and post my question, "Console choices?" there';
  for(const id of ['605','unknown-task','enter-text','399'])
    assert.deepEqual(suppliedValuesForGoal(id,goal),{literal1:'Console choices?'});
  assert.deepEqual(suppliedValuesForGoal('any','Use “Blue” and "Green", then "Blue" again.'),
    {literal1:'Blue',literal2:'Green'});
  assert.deepEqual(suppliedValuesForGoal('any','Enter an item that starts with "Ti" and ends with "este".'),
    {literal1:'Ti',literal2:'este'});
  assert.deepEqual(suppliedValuesForGoal('399','Change my bio somehow'),{});
  assert.deepEqual(suppliedValuesForGoal('any','Look up a hidden answer.'),{});
  assert.throws(()=>suppliedValuesForGoal('any',null),/Goal must be text/);
});


test('new-family allowlist is metadata-only and keeps the existing core tasks',()=>{
  for(const id of ['bisect-angle','book-flight','choose-date','circle-center','copy-paste','daily-calendar','find-word','login-user','order-food','phone-book','scroll-text','use-slider'])
    assert.ok(browserGymCases.includes(id));
  assert.equal(new Set(browserGymCases).size,browserGymCases.length);
});

test('external planning remains caller assistance even when Jev executes all browser actions',async()=>{
 const {browserGymActor}=await import('./browsergym-study-lib.mjs');
 assert.deepEqual(browserGymActor({}),{helper:'Jev',callerInterventions:0});
 const assistance={kind:'independent_planner',model:'diagnostic-model',calls:2,interventions:2,costUsd:.03,promptTokens:100,completionTokens:20,elapsedMs:50};
 const actor=browserGymActor({assistance});assert.equal(actor.callerInterventions,2);assert.equal(actor.assistance.model,'diagnostic-model');assert.equal(actor.assistance.costUsd,.03);
 assert.equal(browserGymActor({assistance:{kind:'unknown'}}).callerInterventions,null);
 assert.deepEqual(browserGymActor({},true),{helper:'scripted-control',callerInterventions:0});
});

test('the arm-transition gate treats malformed or unmetered assistance as unknown',async()=>{
 const {browserGymAssistanceCost,browserGymActor}=await import('./browsergym-study-lib.mjs');
 assert.equal(browserGymAssistanceCost({}),0);
 assert.equal(browserGymAssistanceCost({assistance:{calls:0,costUsd:null}}),0);
 assert.equal(browserGymAssistanceCost({assistance:{calls:1,costUsd:.02}}),.02);
 for(const assistance of [null,{},'bad',{calls:1,costUsd:null},{calls:0,costUsd:-1}])assert.equal(browserGymAssistanceCost({assistance}),null);
 assert.equal(browserGymActor({assistance:null}).callerInterventions,null);
});
