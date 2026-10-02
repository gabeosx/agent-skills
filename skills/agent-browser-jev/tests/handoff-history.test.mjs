import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../scripts/run.mjs';
import {earlierReadbacks,fieldEditReadbacks} from '../scripts/handoff-history.mjs';

const action = (snapshot, extra = {}) => ({stepIndex: 0, action: {op: 'click', name: 'Save'}, outcome: 'tool_succeeded', after: {snapshot}, ...extra});

test('earlier readbacks preserve an old effect without changing execution or completion claims', () => {
  const raw = {returnReason: 'handoff', handoff: {stepIndex: 0, completionEstablished: false}, actions: [action('First page saved'), action('Second page'), action('Third page')], decisions: []};
  const before = structuredClone(raw), result = summarize(raw, 'private-token');
  assert.deepEqual(raw, before);
  assert.equal(result.returnReason, 'handoff');
  assert.equal(result.handoff.completionEstablished, false);
  assert.equal(result.resumeToken, 'private-token');
  assert.equal(result.handoff.earlierEvidence.transitions[0].after.snapshot, 'First page saved');
  assert.equal(result.handoff.recentEvidence.transitions.length, 2);
  assert.match(result.handoff.earlierEvidence.interpretation, /Later actions may supersede/);
});

test('unknown effects, missing readbacks and limited observations remain explicit', () => {
  const result = earlierReadbacks({handoff: {stepIndex: 0}, actions: [action('', {outcome: 'unknown', after: null}), action('Partial', {after: {snapshot: 'Partial', limited: true}}), action('', {after: {}}), action('later'), action('last')]});
  assert.equal(result.transitions[0].outcome, 'unknown');
  assert.equal(result.transitions[0].after, null);
  assert.equal(result.transitions[1].after.limited, true);
  assert.equal(result.transitions[2].after, null);
  assert.ok(!JSON.stringify(result).includes('goalReached'));
});

test('bounded history preserves early order and reports every omitted action', () => {
  const actions = Array.from({length: 30}, (_, i) => action(`${i}: ${'x'.repeat(1000)}`));
  const result = earlierReadbacks({handoff: {stepIndex: 0}, actions});
  assert.equal(result.earlierActionCount, 28);
  assert.equal(result.transitions.length, 8);
  assert.equal(result.omittedActions, 20);
  assert.equal(result.transitions[0].actionIndex, 0);
  assert.ok(JSON.stringify(result.transitions).length < 12100);
});

test('completed, short, other-step and undispatched histories are not promoted into evidence', () => {
  assert.equal(earlierReadbacks({actions: [action('old')]}), null);
  assert.equal(earlierReadbacks({handoff: {stepIndex: 1}, actions: [action('old'), action('old'), action('old')]}), null);
  assert.equal(earlierReadbacks({handoff: {stepIndex: 0}, actions: [action('never', {outcome: 'not_dispatched'}), action('one'), action('two')]}), null);
});

test('field evidence retains a middle edit beyond the navigation readback budget',()=>{
  const actions=Array.from({length:18},(_,i)=>action(`${i}: ${'x'.repeat(2000)}`));
  actions[12]={stepIndex:0,outcome:'tool_succeeded',action:{op:'fill',ref:'@e4',role:'textbox',name:'Count',value:'23'},
    before:{snapshot:'- textbox "Count" [ref=e4]: 17',refs:{e4:{role:'textbox',name:'Count',exactValue:'17'}}},
    after:{snapshot:'- textbox "Count" [ref=e9]: 23',refs:{e9:{role:'textbox',name:'Count',exactValue:'23'}}}};
  const result=earlierReadbacks({handoff:{stepIndex:0},actions});
  assert.ok(result.omittedActions>0);
  assert.deepEqual(result.fieldEdits.edits[0].before,{value:'17',basis:'observed_exact_value'});
  assert.deepEqual(result.fieldEdits.edits[0].after,{value:'23',basis:'observed_exact_value'});
  assert.equal(result.fieldEdits.edits[0].actionIndex,12);
  assert.equal(JSON.stringify(result.fieldEdits).includes('@e'),false);
});

test('field evidence does not reconstruct missing, ambiguous, or sensitive values',()=>{
  const a={stepIndex:0,outcome:'unknown',action:{op:'fill',ref:'@e4',role:'textbox',name:'Field'},
    before:{refs:{e4:{role:'textbox',name:'Field',inputType:'password',exactValue:'secret'}}},
    after:{refs:{e8:{role:'textbox',name:'Field',exactValue:'a'},e9:{role:'textbox',name:'Field',exactValue:'b'}}}};
  const result=fieldEditReadbacks({handoff:{stepIndex:0},actions:[a]});
  assert.equal(result.edits[0].before,null);assert.equal(result.edits[0].after,null);
  assert.equal(result.edits[0].outcome,'unknown');
});

test('a reused reference cannot attribute another field value to an earlier edit',()=>{
  const original={role:'textbox',name:'Amount',exactValue:'10'};
  for(const moved of [false,true]){
    const entry={stepIndex:0,outcome:'tool_succeeded',action:{op:'fill',ref:'@e1',role:'textbox',name:'Amount'},
      before:{refs:{e1:original}},after:{refs:{e1:{role:'textbox',name:'Unrelated',exactValue:'900'},
        ...(moved?{e2:{...original,exactValue:'12'}}:{})}}};
    const edit=fieldEditReadbacks({handoff:{stepIndex:0},actions:[entry]}).edits[0];
    assert.deepEqual(edit.before,{value:'10',basis:'observed_exact_value'});
    assert.deepEqual(edit.after,moved?{value:'12',basis:'observed_exact_value'}:null);
  }
});
