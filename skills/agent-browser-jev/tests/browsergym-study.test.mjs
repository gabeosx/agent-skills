import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBrowserGym, browserGymCases, integrationCases, webarenaVerifiedCases,
  webarenaVerifiedHoldoutCases, webarenaVerifiedSupportedCases } from './browsergym-study-lib.mjs';
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
  assert.deepEqual(webarenaVerifiedSupportedCases,['399','404','595','650','603']);
  const raw={kind:'browsergym-webarena-verified-study',smoke:false,cases:[
    {...trial('baseline','399',0,0,true),variant:'webarena-verified'},
    {...trial('candidate','399',0,1,true),variant:'webarena-verified'}]};
  assert.equal(analyzeBrowserGym(raw,['399'],[0],'webarena-verified').verdict,
    'improved_on_these_cases');
});

test('benchmark adapter passes only text stated in the goal and fails closed on new wording',()=>{
  assert.deepEqual(suppliedValuesForGoal('enter-text','Enter "Kanesha" into the text field and press Submit.'),
    {value:'Kanesha'});
  assert.deepEqual(suppliedValuesForGoal('use-autocomplete',
    'Enter an item that starts with "Ti" and ends with "este".'),{query:'Ti'});
  assert.deepEqual(suppliedValuesForGoal('search-engine',
    'Use the textbox to enter "Ashlea" and press "Search", then find and click the 1st search result.'),
    {query:'Ashlea'});
  assert.deepEqual(suppliedValuesForGoal('sign-agreement',
    'Scroll to the bottom of the textarea, enter the name "Truman" then press "Cancel"'),
    {name:'Truman'});
  assert.deepEqual(suppliedValuesForGoal('399',
    'Change my bio to "I am a robot" in the discussion forum'),{biography:'I am a robot'});
  assert.deepEqual(suppliedValuesForGoal('404','Upvote the newest post in books forum'),{forum:'books'});
  assert.deepEqual(suppliedValuesForGoal('595',
    'Subscribe to the "space" forum from the page of the hottest post in that forum.'),{forum:'space'});
  assert.deepEqual(suppliedValuesForGoal('650',
    'Reply to the post on this page with my comment "I am a big fan of the bookorg"'),
    {comment:'I am a big fan of the bookorg'});
  assert.deepEqual(suppliedValuesForGoal('click-button','Click on the "cancel" button.'),{});
  assert.throws(()=>suppliedValuesForGoal('enter-text','Enter something.'),/Unexpected/);
  assert.throws(()=>suppliedValuesForGoal('399','Change my bio somehow'),/Unexpected/);
});
