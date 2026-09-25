import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {act, discoverActions} from '../scripts/jev-browser.mjs';
import {summarize, sealResume, openResume} from '../scripts/run.mjs';

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

test('observed native date segments offer one exact ISO-date action',()=>{
  const observation={snapshot:'- Date "Departure date"\n  - generic\n    - spinbutton "Month Month" [ref=e1]: 0\n    - spinbutton "Day Day" [ref=e2]: 0\n    - spinbutton "Year Year" [ref=e3]: 0\n  - button "Show date picker" [ref=e4]\n- textbox "Name" [ref=e5]',
    refs:{e1:{role:'spinbutton',name:'Month Month'},e2:{role:'spinbutton',name:'Day Day'},e3:{role:'spinbutton',name:'Year Year'},e4:{role:'button',name:'Show date picker'},e5:{role:'textbox',name:'Name'}}};
  const actions=discoverActions(observation,{date:'2026-11-08',name:'Jordan Lee'});
  assert.deepEqual(actions.filter(a=>a.op==='set_date'),[{op:'set_date',role:'date',name:'Departure date',refs:{month:'@e1',day:'@e2',year:'@e3'},valueId:'date',value:'2026-11-08'}]);
  assert.equal(actions.some(a=>['fill','request_input','press'].includes(a.op)&&['@e1','@e2','@e3'].includes(a.ref)),false);
  assert.ok(actions.some(a=>a.op==='fill'&&a.ref==='@e5'&&a.value==='Jordan Lee'));
  assert.equal(discoverActions(observation,{date:'2026-02-30'}).some(a=>a.op==='set_date'),false);
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

test('resume token preserves task state without exposing exact literals',()=>{
  const state={invocation:{browser:{binary:'/fork',sessionId:'same'},intentOrSteps:'Finish',context:'Earlier'},
    continuation:{schema:1,sessionId:'same',intentOrSteps:['Finish'],scope,suppliedValues:{subject:'Exact original'},stepIndex:0,history:[],progressAssessment:[]}};
  const token=sealResume(state,'test-key',1000);
  assert.ok(!token.includes('Exact original'));
  const opened=openResume(token,'test-key',1001);
  assert.equal(opened.invocation.browser.binary,'/fork');
  assert.equal(opened.continuation.suppliedValues.subject,'Exact original');
});

test('summary returns final observation and marks truncation without writing evidence',()=>{
  const summary=summarize({returnReason:'input_required',actions:[],decisions:[{cost:0.1}],
    latestObservation:{snapshot:'x'.repeat(17000)},observationFresh:true,continuation:{suppliedValues:{hidden:'NOT_FOR_SUMMARY'}}},'opaque-token');
  assert.equal(summary.observation.snapshot.length,16000);assert.equal(summary.observation.truncated,true);
  assert.equal(summary.resumable,true);assert.equal(summary.jev.costUsd,0.1);
  assert.equal(summary.resumeToken,'opaque-token');
  assert.ok(!JSON.stringify(summary).includes('NOT_FOR_SUMMARY'));
});

test('an uncertain gesture is read back once without being replayed',async()=>{
  const b=browser([{snapshot:'- button "Save" [ref=e1]',refs:{e1:{role:'button',name:'Save'}}}]);
  b.execute=async()=>{throw Error('unknown effect');};
  const result=await run(b,choose(a=>a.op==='click'));
  assert.equal(result.returnReason,'action_outcome_unknown');assert.equal(summarize(result,'token').observation.fresh,true);
  assert.equal(b.calls.length,0);
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

test('an unchanged native date action stops without repeated entry',async()=>{
  const observation={snapshot:'- Date "Departure date"\n  - spinbutton "Month Month" [ref=e1]\n  - spinbutton "Day Day" [ref=e2]\n  - spinbutton "Year Year" [ref=e3]',refs:{e1:{role:'spinbutton',name:'Month Month'},e2:{role:'spinbutton',name:'Day Day'},e3:{role:'spinbutton',name:'Year Year'}}};
  const b=browser([observation]);
  const result=await run(b,choose(a=>a.op==='set_date'),{suppliedValues:{date:'2026-11-08'}});
  assert.equal(result.returnReason,'no_progress');assert.equal(b.calls.length,1);
});

test('five unchanged waits remove wait and leave other controls available',async()=>{
  const b=browser([{snapshot:'- button "Retry" [ref=e1]',refs:{e1:{role:'button',name:'Retry'}}}]);
  const result=await run(b,async r=>{
    if (r.candidates.wait) return {binding:r.binding,choice:'wait'};
    assert.ok(Object.values(r.candidates).some(a=>a.op==='click'&&a.name==='Retry'));
    return {binding:r.binding,choice:'handoff'};
  },{budget:{maxActions:30}});
  assert.equal(result.returnReason,'handoff');assert.equal(b.calls.length,5);
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
  assert.equal(result.returnReason,'superseded_observation');assert.equal(summarize(result,'token').observation.fresh,false);
});


test('custom listbox options remain clickable and do not suppress autocomplete typing',()=>{
  const observation={snapshot:'- combobox "Contact" [expanded=true, ref=e1]\n  - listbox "Matches" [ref=e2]\n    - option "Adobe Inc" [ref=e3]',
    refs:{e1:{role:'combobox',name:'Contact'},e2:{role:'listbox',name:'Matches'},e3:{role:'option',name:'Adobe Inc'}}};
  const actions=discoverActions(observation,{contact:'adobe'});
  assert.equal(actions.some(a=>a.op==='select'),false);
  assert.equal(actions.some(a=>a.op==='press'&&a.key==='Tab'),false);
  assert.ok(actions.some(a=>a.op==='click'&&a.ref==='@e3'));
  assert.ok(actions.some(a=>a.op==='fill'&&a.ref==='@e1'&&a.value==='adobe'));
  assert.equal(actions.some(a=>a.op==='press'&&a.ref==='@e1'),false);
});

test('menu checkbox and radio items are offered as grounded clicks',()=>{
  const actions=discoverActions({snapshot:'- menuitemcheckbox "Show grid" [checked=false, ref=e1]\n- menuitemradio "Compact" [checked=true, ref=e2]',refs:{e1:{role:'menuitemcheckbox',name:'Show grid'},e2:{role:'menuitemradio',name:'Compact'}}});
  assert.deepEqual(actions.filter(a=>a.op==='click').map(a=>a.ref),['@e1','@e2']);
});

test('file controls offer only caller-supplied absolute paths and never open a chooser',()=>{
  const observation={snapshot:'- button "Contract file" [ref=e1]: No file chosen\n- button "Submit" [ref=e2]',refs:{e1:{role:'button',name:'Contract file'},e2:{role:'button',name:'Submit'}}};
  const actions=discoverActions(observation,{contract:'/private/tmp/contract.pdf',note:'not-a-path'});
  assert.deepEqual(actions.filter(a=>a.ref==='@e1'),[{ref:'@e1',role:'button',name:'Contract file',op:'upload',valueId:'contract',path:'/private/tmp/contract.pdf'}]);
  assert.ok(actions.some(a=>a.ref==='@e2'&&a.op==='click'));
});

test('hover is offered only when the observed page says the interaction requires it',()=>{
  const refs={e1:{role:'button',name:'Account'}};
  assert.ok(discoverActions({snapshot:'- button "Account" [ref=e1]\n- paragraph "Hover to reveal links"',refs}).some(a=>a.op==='hover'&&a.ref==='@e1'));
  assert.equal(discoverActions({snapshot:'- button "Account" [ref=e1]',refs}).some(a=>a.op==='hover'),false);
});

test('readonly custom combobox can open but cannot be filled or keyboard-selected',()=>{
  const actions=discoverActions({snapshot:'- combobox "Account" [readonly=true, ref=e1]',refs:{e1:{role:'combobox',name:'Account'}}},{query:'Software'});
  assert.ok(actions.some(a=>a.op==='click'&&a.ref==='@e1'));
  assert.equal(actions.some(a=>['fill','request_input','press'].includes(a.op)&&a.ref==='@e1'),false);
});

test('ordinary text inputs retain Enter without autocomplete arrow navigation',()=>{
  const actions=discoverActions({snapshot:'- textbox "Search guides" [ref=e1]',refs:{e1:{role:'textbox',name:'Search guides'}}},{query:'recovery'});
  assert.ok(actions.some(a=>a.op==='press'&&a.ref==='@e1'&&a.key==='Enter'));
  assert.equal(actions.some(a=>a.op==='press'&&['ArrowDown','ArrowUp'].includes(a.key)),false);
});

test('an open custom listbox suppresses Enter on autocomplete text inputs',()=>{
  const observation={snapshot:'- textbox "Account" [ref=e1]\n- listbox "Matches" [ref=e2]\n  - option "Software assets" [ref=e3]',
    refs:{e1:{role:'textbox',name:'Account'},e2:{role:'listbox',name:'Matches'},e3:{role:'option',name:'Software assets'}}};
  assert.equal(discoverActions(observation,{query:'software'}).some(a=>a.op==='press'&&a.ref==='@e1'),false);
});
