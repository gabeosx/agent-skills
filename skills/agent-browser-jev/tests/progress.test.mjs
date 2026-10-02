import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createProgressTracker} from '../scripts/progress.mjs';
import {act} from '../scripts/jev-browser.mjs';
import {summarize, sealResume, openResume} from '../scripts/run.mjs';

function tabs(selected=0, offset=0, names=['Overview','Details','History']) {
  const refs={}, actions=[], lines=['- tablist "Record views"'];
  names.forEach((name,i)=>{
    const ref=`e${offset+i+1}`; refs[ref]={role:'tab',name};
    lines.push(`  - tab "${name}" [${i===selected?'selected, ':''}ref=${ref}]`);
    actions.push({op:'click',role:'tab',name,ref:`@${ref}`});
  });
  return {observation:{snapshot:lines.join('\n'),refs},actions};
}

test('tracks attempted and observed-selected routes across fresh browser refs',()=>{
  const tracker=createProgressTracker(),first=tabs(),second=tabs(1,20);
  tracker.observe(first.observation,first.actions,0);
  tracker.record({action:first.actions[1],before:first.observation,after:second.observation,outcome:'tool_succeeded'});
  const progress=tracker.observe(second.observation,second.actions,0);
  assert.deepEqual(progress.navigation.map(n=>[n.name,n.attempted,n.observedSelected]),[
    ['Overview',0,true],['Details',1,true],['History',0,false]]);
  assert.equal(progress.recentActions[0].observationChanged,true);
  assert.ok(!JSON.stringify(progress).includes('@e'));
});

test('reference churn alone is not visible progress or a new observed state',()=>{
  const tracker=createProgressTracker(),first=tabs(),second=tabs(0,20);
  tracker.observe(first.observation,first.actions,0);
  tracker.record({action:first.actions[1],before:first.observation,after:second.observation,outcome:'tool_succeeded'});
  const progress=tracker.observe(second.observation,second.actions,0);
  assert.equal(progress.observedStates,1);
  assert.equal(progress.navigation[1].unchangedReadbacks,1);
  assert.equal(progress.recentActions[0].observationChanged,false);
});

test('ambiguous route labels retain unknown history rather than a false visit claim',()=>{
  const tracker=createProgressTracker(),first=tabs(0,0,['Other','Other']);
  tracker.observe(first.observation,first.actions,0);
  tracker.record({action:first.actions[0],before:first.observation,after:first.observation,outcome:'tool_succeeded'});
  assert.ok(tracker.observe(first.observation,first.actions,0).navigation.every(n=>n.attempted===null));
});

test('new caller steps reset tracking and exhausted routes are never inferred',()=>{
  const tracker=createProgressTracker(),a=tabs(),b=tabs(1);
  tracker.observe(a.observation,a.actions,0);
  tracker.record({action:a.actions[1],before:a.observation,after:b.observation,outcome:'tool_succeeded'});
  tracker.observe(b.observation,b.actions,0);
  assert.equal(tracker.observe(a.observation,a.actions,0).returnedToObservedState,true);
  const next=tracker.observe(a.observation,a.actions,1);
  assert.equal(next.observedStates,1);assert.equal(next.recentActions.length,0);
  assert.ok(next.navigation.every(n=>n.attempted===0));
  assert.equal(next.exhausted,undefined);
});

test('tracking includes observed submenu and branch gestures but not arbitrary links',()=>{
  const tracker=createProgressTracker();
  const observation={snapshot:'- menuitem "More" [ref=e1]\n- listitem "Archive" [ref=e2]\n- link "Erase account" [ref=e3]'};
  const actions=[{op:'hover',name:'More',ref:'@e1',hasSubmenu:true},
    {op:'click',name:'Archive',ref:'@e2',purpose:'expand_tree_branch'},
    {op:'click',name:'Erase account',role:'link',ref:'@e3'}];
  assert.deepEqual(tracker.observe(observation,actions,0).navigation.map(n=>n.kind),['submenu','branch']);
});

const run=(browser,decide,extra={})=>act({browser,decide,scope:'Requested work',authorize:()=>true,
  intentOrSteps:'Find the record and save its draft',...extra});

test('a handoff preserves an untried route without forcing another action or model call',async()=>{
  let selected=0,calls=0;
  const browser={sessionId:randomUUID(),observe:async()=>tabs(selected).observation,
    execute:async()=>{selected=1;calls++;}};
  const result=await run(browser,async request=>{
    if(request.history.length){
      assert.equal(request.progress.navigation.find(n=>n.name==='History').observedSelected,false);
      return {binding:request.binding,choice:'handoff',cost:0.001};
    }
    return {binding:request.binding,choice:Object.keys(request.candidates).find(id=>request.candidates[id].name==='Details'),cost:0.001};
  });
  const output=summarize(result,'opaque');
  assert.equal(calls,1);assert.equal(result.decisions.length,2);
  assert.equal(output.handoff.reason,'handoff');assert.equal(output.handoff.completionEstablished,false);
  assert.deepEqual(output.handoff.remainingIntents,['Find the record and save its draft']);
  assert.equal(output.handoff.exploration.navigation.find(n=>n.name==='History').attempted,0);
  assert.equal(output.handoff.observationFresh,true);assert.equal(output.resumable,true);
});

test('forbidden controls are absent from progress, while handoff remains available',async()=>{
  const view=tabs();let calls=0;
  const result=await run({sessionId:randomUUID(),observe:async()=>view.observation,execute:async()=>calls++},
    async request=>{assert.deepEqual(request.progress.navigation,[]);return {binding:request.binding,choice:'handoff'};},
    {authorize:()=>false});
  assert.equal(calls,0);assert.deepEqual(result.handoff.exploration.navigation,[]);
});

test('uncertain actions return their readback and require verification without stale routes',async()=>{
  let after=false,calls=0;const first=tabs(),second=tabs(1,30);
  const result=await run({sessionId:randomUUID(),observe:async()=>after?second.observation:first.observation,
    execute:async()=>{after=true;calls++;throw new Error('uncertain transport');}},
    async request=>({binding:request.binding,choice:Object.keys(request.candidates).find(id=>request.candidates[id].name==='Details')}));
  assert.equal(calls,1);assert.equal(result.handoff.reason,'action_outcome_unknown');
  assert.equal(result.handoff.lastAction.outcome,'unknown');
  assert.equal(result.handoff.suggestedCallerAction,'verify_before_retry');
  assert.equal(result.handoff.exploration.navigationCoverage,'not_collected');
  assert.deepEqual(result.handoff.exploration.navigation,[]);
  assert.equal(result.handoff.observationFresh,true);
});

test('caller intervention resumes with fresh refs and clears invocation-local route assumptions',async()=>{
  const first=tabs();const sessionId=randomUUID();
  const paused=await run({sessionId,observe:async()=>first.observation,execute:async()=>assert.fail('handoff must not act')},
    async request=>({binding:request.binding,choice:'handoff'}));
  const token=sealResume({invocation:{intentOrSteps:'Find the record and save its draft'},continuation:paused.continuation},'test-key');
  const continued=openResume(token,'test-key').continuation;
  let saved=false,ref;
  const result=await run({sessionId,observe:async()=>saved?{snapshot:'- heading "Draft saved"',refs:{}}:
    {snapshot:'- button "Save draft" [ref=e91]',refs:{e91:{role:'button',name:'Save draft'}}},
    execute:async action=>{ref=action.ref;saved=true;}},
    async request=>{
      assert.equal(request.context,'Caller opened the correct record. Save the draft.');
      assert.deepEqual(request.progress.navigation,[]);
      return {binding:request.binding,choice:saved?'step_complete':'c0'};
    },{continuation:continued,context:'Caller opened the correct record. Save the draft.'});
  assert.equal(ref,'@e91');assert.equal(result.returnReason,'reported_complete');assert.equal(result.handoff,null);
});

test('budget handoffs retain the current intent and identify caller continuation',async()=>{
  const view=tabs();
  const result=await run({sessionId:randomUUID(),observe:async()=>view.observation,execute:async()=>{}},
    async request=>({binding:request.binding,assessment:true,cost:0.001}),{budget:{maxDecisions:1}});
  assert.equal(result.handoff.reason,'decision_budget');
  assert.equal(result.handoff.suggestedCallerAction,'continue_or_adjust_budget');
  assert.equal(result.handoff.currentIntent,'Find the record and save its draft');
});

test('a failed readback retains the last dispatched action without presenting old routes as current',async()=>{
  const view=tabs();let executed=false;
  const result=await run({sessionId:randomUUID(),observe:async()=>{
    if(executed)throw new Error('readback unavailable');return view.observation;
  },execute:async()=>{executed=true;}},async request=>({binding:request.binding,choice:'c0'}));
  assert.equal(result.handoff.reason,'helper_error');
  assert.equal(result.handoff.lastAction.operation,'click');
  assert.equal(result.handoff.lastAction.outcome,'tool_succeeded');
  assert.equal(result.handoff.lastAction.observationChanged,null);
  assert.equal(result.handoff.observationFresh,false);
  assert.equal(result.handoff.exploration.navigationCoverage,'not_collected');
});

test('a failure before any observation does not invent an observed state',async()=>{
  const result=await run({sessionId:randomUUID(),observe:async()=>{throw new Error('offline');},execute:async()=>{}},
    async()=>assert.fail('No decision without observation'));
  assert.equal(result.handoff.exploration.observedStates,0);
  assert.equal(result.handoff.observationFresh,false);
  assert.equal(result.handoff.lastAction,null);
});

test('a bounded adapter observation remains marked truncated even below the output length limit',()=>{
  const output=summarize({returnReason:'handoff',latestObservation:{snapshot:'- button "More" [ref=e1]',limited:true},observationFresh:true},null);
  assert.equal(output.observation.truncated,true);
  assert.equal(output.observation.fresh,true);
});
