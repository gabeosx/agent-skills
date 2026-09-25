import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {act, discoverActions} from '../scripts/jev-browser.mjs';
import {summarize, resumedTask} from '../scripts/run.mjs';

const scope='Authorized synthetic task';
function browser(sequence) {
  let index=0; const calls=[];
  return {sessionId:randomUUID(), calls, observe:async()=>structuredClone(sequence[Math.min(index,sequence.length-1)]),
    execute:async action=>{calls.push(action);index++;}};
}
const choose = fn => async r => ({binding:r.binding,choice:Object.entries(r.candidates).find(([,a])=>fn(a,r))?.[0]??'handoff'});
const run = (b,decide,extra={}) => act({browser:b,decide,intentOrSteps:'Complete the draft',scope,authorize:()=>true,...extra});

test('native selects offer observed unique unselected labels on their parent; disabled controls are excluded',()=>{
  const observation={snapshot:'- combobox "Region" [ref=e1]: Select\n  - MenuListPopup\n    - option "Select" [selected, ref=e2]\n    - option "North" [ref=e3]\n    - option "Disabled" [disabled=true, ref=e4]\n- button "Send" [disabled=true, ref=e5]',
    refs:{e1:{role:'combobox',name:'Region'},e2:{role:'option',name:'Select'},e3:{role:'option',name:'North'},e4:{role:'option',name:'Disabled'},e5:{role:'button',name:'Send'}}};
  const actions=discoverActions(observation);
  assert.deepEqual(actions.filter(a=>a.ref),[{op:'select',ref:'@e1',role:'combobox',name:'Region',option:'North'}]);
});

test('duplicate option labels are not converted into ambiguous native selections',()=>{
  const actions=discoverActions({snapshot:'- combobox [ref=e1]\n  - MenuListPopup\n    - option [ref=e2]\n    - option [ref=e3]',
    refs:{e1:{role:'combobox'},e2:{role:'option',name:'Same'},e3:{role:'option',name:'Same'}}});
  assert.equal(actions.filter(a=>a.op==='select').length,0);
});

test('checkbox choices set the opposite observed state instead of blindly toggling',()=>{
  const actions=discoverActions({snapshot:'- checkbox "On" [checked=true, ref=e1]\n- checkbox "Off" [checked=false, ref=e2]',
    refs:{e1:{role:'checkbox',name:'On'},e2:{role:'checkbox',name:'Off'}}});
  assert.deepEqual(actions.filter(a=>a.ref).map(a=>a.op),['uncheck','check']);
});

test('missing input pauses without typing, then resumes with new refs and retained progress',async()=>{
  const first={snapshot:'- button "Edit" [ref=e1]',refs:{e1:{role:'button',name:'Edit'}}};
  const field={snapshot:'- textbox "Note" [ref=e2]',refs:{e2:{role:'textbox',name:'Note'}}};
  const b=browser([first,field]);
  const paused=await run(b,choose(a=>['click','request_input'].includes(a.op)));
  assert.equal(paused.returnReason,'input_required'); assert.equal(paused.inputRequired.name,'Note');
  assert.equal(b.calls.length,1);
  const next={...b, observe:async()=>({snapshot:'- textbox "Note" [ref=e99]',refs:{e99:{role:'textbox',name:'Note'}}})};
  const done=await run(next,choose((a,r)=>{
    assert.equal(r.history[0].action.name,'Edit');
    return a.op === (r.history.length === 1 ? 'fill' : 'step_complete');
  }),{continuation:JSON.parse(JSON.stringify(paused.continuation)),suppliedValues:{Note:'Exact note'}});
  assert.equal(done.returnReason,'reported_complete');
  assert.equal(b.calls.at(-1).ref,'@e99'); assert.equal(b.calls.at(-1).value,'Exact note');
  assert.equal(done.continuation,null);
});

test('resume preserves completed intents and does not repeat an earlier step',async()=>{
  const b=browser([{snapshot:'ready',refs:{}}]);
  const paused=await act({browser:b,scope,authorize:()=>true,intentOrSteps:['First','Second'],
    decide:async r=>({binding:r.binding,choice:r.stepIndex===0?'step_complete':'handoff'})});
  assert.equal(paused.continuation.stepIndex,1);
  const done=await act({browser:b,scope,authorize:()=>true,intentOrSteps:['First','Second'],continuation:paused.continuation,
    decide:async r=>{assert.equal(r.intent,'Second');return {binding:r.binding,choice:'step_complete'};}});
  assert.equal(done.progressAssessment.length,2);
});

test('continuation cannot silently switch task, scope or session',async()=>{
  const b=browser([{snapshot:'ready',refs:{}}]);
  const paused=await run(b,choose(a=>a.op==='handoff'));
  for(const extra of [{intentOrSteps:'Different'},{scope:'Different'},{browser:{...b,sessionId:'Different'}}]){
    await assert.rejects(act({browser:b,scope,authorize:()=>true,intentOrSteps:'Complete the draft',decide:choose(a=>a.op==='step_complete'),continuation:paused.continuation,...extra}),/Continuation/);
  }
});

test('resumed task preserves browser, policy and exact literals; ignores stored starting URL',()=>{
  const previous={invocation:{browser:{binary:'/fork',sessionId:'same'},policyPath:'/caller-policy.mjs',url:'https://example.com',context:'Earlier'},
    continuation:{intentOrSteps:['Finish'],scope,suppliedValues:{subject:'Exact original'}}};
  const task=resumedTask(previous,{message:'New literal'},'Caller dismissed a popup');
  assert.equal(task.url,undefined); assert.equal(task.policyPath,'/caller-policy.mjs');
  assert.equal(task.browser.binary,'/fork'); assert.equal(task.suppliedValues.subject,'Exact original');
  assert.match(task.context,/dismissed/);
});

test('summary returns final evidence and marks truncation, without echoing continuation values',()=>{
  const summary=summarize({returnReason:'input_required',actions:[],decisions:[{cost:0.1}],
    latestObservation:{snapshot:'x'.repeat(17000)},observationFresh:true,continuation:{suppliedValues:{hidden:'NOT_FOR_SUMMARY'}}},'/private/evidence');
  assert.equal(summary.observation.snapshot.length,16000);assert.equal(summary.observation.truncated,true);
  assert.equal(summary.resumable,true);assert.equal(summary.jev.costUsd,0.1);
  assert.ok(!JSON.stringify(summary).includes('NOT_FOR_SUMMARY'));
});

test('an uncertain gesture leaves returned observation explicitly stale',async()=>{
  const b=browser([{snapshot:'- button "Save" [ref=e1]',refs:{e1:{role:'button',name:'Save'}}}]);
  b.execute=async()=>{throw Error('unknown effect');};
  const result=await run(b,choose(a=>a.op==='click'));
  assert.equal(result.returnReason,'action_outcome_unknown');assert.equal(summarize(result,'file').observation.fresh,false);
});

test('a post-action observation failure never presents the pre-action page as fresh',async()=>{
  const b=browser([{snapshot:'page',refs:{e1:{role:'button',name:'Save'}}}]);
  b.observe=async()=>{if(b.calls.length)throw Error('lost connection');return {snapshot:'before',refs:{e1:{role:'button',name:'Save'}}};};
  const result=await run(b,choose(a=>a.op==='click'));
  assert.equal(result.observationFresh,false);assert.equal(result.actions.length,1);
});

test('three identical actions with no observed effect stop before a fourth',async()=>{
  const b=browser([{snapshot:'stable',refs:{e1:{role:'button',name:'Open'}}}]);
  const result=await run(b,choose(a=>a.op==='click'));
  assert.equal(result.returnReason,'no_progress');assert.equal(b.calls.length,3);
});

test('candidate overflow hands back without asking the provider or dropping controls',async()=>{
  const refs=Object.fromEntries(Array.from({length:260},(_,i)=>['e'+i,{role:'button',name:'Item '+i}]));
  const b=browser([{snapshot:'large catalog',refs}]);
  const result=await run(b,()=>assert.fail('provider must not be called'));
  assert.equal(result.returnReason,'candidate_limit');assert.equal(b.calls.length,0);
});

test('an unchanged immediate snapshot is polled before the next decision, without repeating the gesture',async()=>{
  let clicked=false,reads=0,decisions=0;
  const b={sessionId:randomUUID(),observe:async()=>({snapshot:clicked&&++reads>1?'new screen':'old screen',refs:{e1:{role:'button',name:'Next'}}}),execute:async()=>{clicked=true;}};
  const result=await run(b,async r=>{decisions++;if(decisions===1)return {binding:r.binding,choice:'c0'};assert.equal(r.observation.snapshot,'new screen');return {binding:r.binding,choice:'step_complete'};});
  assert.equal(result.actions.length,1);assert.equal(result.returnReason,'reported_complete');assert.ok(result.timing.settleMs>0);
});

test('starting navigation is serialized with all other actions on the same session',async()=>{
  let release,ready;const started=new Promise(r=>ready=r);
  const b=browser([{snapshot:'ready',refs:{}}]);
  const first=run(b,r=>new Promise(resolve=>{release=()=>resolve({binding:r.binding,choice:'handoff'});ready();}));
  await started;
  const second=await run(b,choose(a=>a.op==='handoff'),{initialUrl:'https://example.com'});
  assert.equal(second.returnReason,'session_busy');assert.equal(b.calls.length,0);
  release();await first;
});

test('invalid tasks and denied starting URLs cannot navigate',async()=>{
  const b=browser([{snapshot:'ready',refs:{}}]);
  await assert.rejects(run(b,choose(a=>a.op==='handoff'),{initialUrl:'https://example.com',intentOrSteps:''}));
  const denied=await run(b,choose(a=>a.op==='handoff'),{initialUrl:'https://example.com',authorize:()=>false});
  assert.equal(denied.returnReason,'permission_denied');assert.equal(b.calls.length,0);
});

test('superseded observations are never advertised as fresh',async()=>{
  const {invalidateBrowserObservation}=await import('../scripts/jev-browser.mjs');
  const b=browser([{snapshot:'ready',refs:{}}]);
  const result=await run(b,async r=>{invalidateBrowserObservation(b.sessionId);return {binding:r.binding,choice:'step_complete'};});
  assert.equal(result.returnReason,'superseded_observation');assert.equal(summarize(result,'evidence').observation.fresh,false);
});


test('custom listbox options remain clickable and do not suppress autocomplete typing',()=>{
  const observation={snapshot:'- combobox "Contact" [expanded=true, ref=e1]\n  - listbox "Matches" [ref=e2]\n    - option "Adobe Inc" [ref=e3]',
    refs:{e1:{role:'combobox',name:'Contact'},e2:{role:'listbox',name:'Matches'},e3:{role:'option',name:'Adobe Inc'}}};
  const actions=discoverActions(observation,{contact:'adobe'});
  assert.equal(actions.some(a=>a.op==='select'),false);
  assert.equal(actions.some(a=>a.op==='press'&&a.key==='Tab'),false);
  assert.ok(actions.some(a=>a.op==='click'&&a.ref==='@e3'));
  assert.ok(actions.some(a=>a.op==='fill'&&a.ref==='@e1'&&a.value==='adobe'));
  for(const key of ['ArrowDown','ArrowUp','Enter']) assert.ok(actions.some(a=>a.op==='press'&&a.ref==='@e1'&&a.key===key));
});

test('readonly custom combobox can open and navigate but cannot be filled',()=>{
  const actions=discoverActions({snapshot:'- combobox "Account" [readonly=true, ref=e1]',refs:{e1:{role:'combobox',name:'Account'}}},{query:'Software'});
  assert.ok(actions.some(a=>a.op==='click'&&a.ref==='@e1'));
  assert.ok(actions.some(a=>a.op==='press'&&a.key==='ArrowDown'));
  assert.equal(actions.some(a=>['fill','request_input'].includes(a.op)),false);
});
