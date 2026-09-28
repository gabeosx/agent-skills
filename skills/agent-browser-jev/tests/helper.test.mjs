import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { act, discoverActions, invalidateBrowserObservation } from '../scripts/jev-browser.mjs';
import { jevDecider } from '../scripts/agent-browser-jev.mjs';

function fixture({ decide, authorize = () => true, execute, observe, ...options } = {}) {
  const calls = [];
  let observations = 0;
  const browser = { sessionId: randomUUID(),
    observe: async () => {
      observations++;
      return observe ? observe() : { snapshot: calls.length ? 'Aperture is open' : 'Aperture is closed',
        refs: { e9: { role: 'button', name: 'Reveal' }, e20: { role: 'textbox', name: 'Memo' } } };
    },
    execute: async action => { calls.push(action); if (execute) await execute(action); },
  };
  const run = overrides => act({ browser, scope: 'Test-authorized controls only', authorize,
    intentOrSteps: 'Reveal the aperture',
    decide: decide ?? (async r => ({ binding: r.binding, choice: calls.length ? 'step_complete' : 'c0' })),
    ...options, ...overrides });
  return { browser, calls, run, observations: () => observations };
}

test('generic loop executes a grounded action, settles it, and labels completion as model judgment', async () => {
  const f = fixture();
  const result = await f.run({ budget: { maxActions: 1 } });
  assert.equal(result.returnReason, 'reported_complete');
  assert.equal(f.calls.length, 1);
  assert.equal(f.observations(), 3);
  assert.equal(result.latestObservation.snapshot, 'Aperture is open');
  assert.equal(result.progressAssessment[0].judgment, 'model_reported_complete');
});

test('caller steps advance only on model assessment, without an expected control sequence', async () => {
  const seen = [];
  const f = fixture({ decide: async r => {
    seen.push(r.intent);
    return { binding: r.binding, choice: r.history.length > r.stepIndex ? 'step_complete' : 'c0' };
  } });
  const result = await f.run({ intentOrSteps: ['First caller intent', 'Second caller intent'] });
  assert.equal(result.returnReason, 'reported_complete');
  assert.deepEqual(seen, ['First caller intent', 'First caller intent', 'Second caller intent', 'Second caller intent']);
  assert.equal(f.calls.length, 2);
});

test('duplicate labels keep distinct refs and full context for the model', () => {
  const actions = discoverActions({ refs: { e1: { role: 'button', name: 'Open' }, e2: { role: 'button', name: 'Open' } } });
  assert.deepEqual(actions.filter(a => a.ref).map(a => a.ref), ['@e1', '@e2']);
});

test('next decision retains the previous screen so reused refs do not erase target context', async () => {
  const f = fixture({ decide: async r => {
    if (r.history.length) {
      assert.equal(r.previousObservation, 'Aperture is closed');
      assert.equal(r.observation.snapshot, 'Aperture is open');
    }
    return { binding:r.binding, choice:r.history.length?'step_complete':'c0' };
  } });
  assert.equal((await f.run()).returnReason,'reported_complete');
});

for (const choice of ['@e999', 'c999', '__proto__']) {
  test(`unoffered choice ${choice} cannot execute`, async () => {
    const f = fixture({ decide: async r => ({ binding: r.binding, choice }) });
    assert.equal((await f.run()).returnReason, 'invalid_choice');
    assert.equal(f.calls.length, 0);
  });
}

test('provider cannot substitute the caller literal or target', async () => {
  const literal = 'literal $(never execute) `unchanged`';
  const f = fixture({ suppliedValues: { memo: literal }, decide: async r => ({
    binding: r.binding, choice: r.history.length ? 'step_complete' : 'c1',
    action: { op: 'fill', ref: '@e666', value: 'replacement' },
  }) });
  const result = await f.run();
  assert.equal(result.returnReason, 'reported_complete');
  assert.equal(f.calls[0].value, literal);
  assert.equal(f.calls[0].ref, '@e20');
});

test('wrong observation/session response cannot execute', async () => {
  const f = fixture({ decide: async () => ({ binding: 'another-session:old-observation', choice: 'c0' }) });
  assert.equal((await f.run()).returnReason, 'superseded_observation');
  assert.equal(f.calls.length, 0);
});

test('an externally invalidated observation cannot execute a late response', async () => {
  const f = fixture({ decide: async r => {
    invalidateBrowserObservation(r.sessionId);
    return { binding: r.binding, choice: 'c0' };
  } });
  assert.equal((await f.run()).returnReason, 'superseded_observation');
  assert.equal(f.calls.length, 0);
});

test('scope filters actions and is checked again immediately before dispatch', async () => {
  let allowed = true;
  const f = fixture({ authorize: () => allowed, decide: async r => {
    allowed = false;
    return { binding: r.binding, choice: 'c0' };
  } });
  assert.equal((await f.run()).returnReason, 'permission_denied');
  assert.equal(f.calls.length, 0);
});

test('missing authority and async/truthy policy responses deny gestures', async () => {
  for (const authorize of [() => false, async () => true, () => 'yes']) {
    const f = fixture({ authorize, decide: async r => {
      assert.deepEqual(Object.keys(r.candidates), ['wait', 'step_complete', 'handoff']);
      return { binding: r.binding, choice: 'handoff' };
    } });
    assert.equal((await f.run()).returnReason, 'handoff');
    assert.equal(f.calls.length, 0);
  }
});

test('action and decision budgets stop loops without exceeding their bounds', async () => {
  const f = fixture({ decide: async r => ({ binding: r.binding, choice: 'c0' }) });
  assert.equal((await f.run({ budget: { maxActions: 2 } })).returnReason, 'action_budget');
  assert.equal(f.calls.length, 2);
  const other = fixture({ decide: async r => ({ binding: r.binding, choice: 'c0' }) });
  assert.equal((await other.run({ budget: { maxDecisions: 1 } })).returnReason, 'decision_budget');
  assert.equal(other.calls.length, 1);
});

test('deadline cannot execute a late model response', async () => {
  let resolveDecision;
  const f = fixture({ decide: () => new Promise(resolve => { resolveDecision = resolve; }) });
  assert.equal((await f.run({ budget: { timeoutMs: 20 } })).returnReason, 'deadline');
  resolveDecision({ binding: 'late', choice: 'c0' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.calls.length, 0);
});

test('failed action is explicitly uncertain and never replayed', async () => {
  const f = fixture({ execute: async () => { throw Error('sensitive internal detail'); } });
  const result = await f.run();
  assert.equal(result.returnReason, 'action_outcome_unknown');
  assert.equal(result.actions[0].outcome, 'unknown');
  assert.equal(f.calls.length, 1);
  assert.equal(result.observationFresh,true);
  assert.equal(result.latestObservation.snapshot,'Aperture is open');
  assert.ok(!JSON.stringify(result).includes('sensitive internal detail'));
});

test('click quiescence observes an async replacement before another decision',async()=>{
  let state='closed',reads=0;
  const f=fixture({observe:()=>{
    if(state==='clicked'&&++reads>=2)state='complete';
    return state==='complete'?{snapshot:'Task complete',refs:{}}:{snapshot:state==='clicked'?'Selected button': 'Initial',refs:{e9:{role:'button',name:'Reveal'}}};
  },execute:async()=>{state='clicked'},decide:async r=>({binding:r.binding,choice:r.observation.snapshot==='Task complete'?'step_complete':'c0'})});
  const result=await f.run();
  assert.equal(result.returnReason,'reported_complete');
  assert.equal(f.calls.length,1);
  assert.equal(f.observations(),3);
  assert.equal(result.latestObservation.snapshot,'Task complete');
});

test('provider failure returns without fallback or actions', async () => {
  const f = fixture({ decide: async () => { throw Error('secret provider error'); } });
  assert.equal((await f.run()).returnReason, 'helper_error');
  assert.equal(f.calls.length, 0);
});

test('parallel helper calls cannot drive the same session', async () => {
  let release;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const f = fixture({ decide: r => new Promise(resolve => {
    release = () => resolve({ binding: r.binding, choice: 'handoff' });
    started();
  }) });
  const first = f.run();
  await ready;
  assert.equal((await f.run()).returnReason, 'session_busy');
  release();
  assert.equal((await first).returnReason, 'handoff');
});

test('oversized observation returns for narrower context without model or browser action', async () => {
  const f = fixture({ observe: () => ({ snapshot: 'x'.repeat(1000), refs: {} }),
    decide: () => { assert.fail('Must not call model'); } });
  assert.equal((await f.run({ budget: { maxObservationChars: 100 } })).returnReason, 'observation_too_large');
  assert.equal(f.calls.length, 0);
});

test('Jev adapter offers progress choices, disables retries/fallbacks and binds the response locally', async () => {
  const signal = new AbortController().signal;
  const api = { alpha: { decisions: { create: async ({ decisionsRequest: r }, opts) => {
    assert.equal(r.provider.allowFallbacks, false);
    assert.equal(opts.retries.strategy, 'none');
    assert.equal(opts.fetchOptions.signal.aborted, false);
    assert.equal(r.state.observation, 'untrusted page evidence');
    assert.deepEqual(r.state.suppliedValues, { message:'Exact caller text' });
    assert.ok(r.questions.action.criteria.step_complete);
    return { answers: { action: { type: 'choice', choice: 'step_complete' } }, usage: { cost: 0.001 } };
  } } } };
  const result = await jevDecider(api)({ binding: 'bound', intent: 'test', scope: 'test',
    observation: { snapshot: 'untrusted page evidence' }, history: [], suppliedValues: { message:'Exact caller text' },
    candidates: { step_complete: { op: 'step_complete' }, handoff: { op: 'handoff' } } }, signal);
  assert.equal(result.binding, 'bound');
  assert.equal(result.choice, 'step_complete');
});

test('Jev adapter distinguishes ordinal results and observed tree branches', async () => {
  const api = { alpha: { decisions: { create: async ({ decisionsRequest: r }) => {
    const criteria = r.questions.action.criteria;
    assert.match(criteria.c0, /nth result item, not a same-numbered pagination link/);
    assert.match(criteria.c1, /explore observed clickable branches/);
    return { answers: { action: { type: 'choice', choice: 'handoff' } }, usage: { cost: 0 } };
  } } } };
  const result = await jevDecider(api)({ binding: 'bound', intent: 'test', scope: 'test',
    observation: { snapshot: 'observed page' }, history: [], candidates: {
      c0: { op: 'click', role: 'link', name: '3', ref: '@e1' },
      c1: { op: 'scroll', direction: 'down' }, handoff: { op: 'handoff' },
    } });
  assert.equal(result.choice, 'handoff');
});

test('Jev adapter does not equate an autocomplete selection with an unsubmitted form',async()=>{
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
    assert.match(r.questions.action.criteria.step_complete,/visible Submit button has not been used/);
    assert.match(r.questions.action.criteria.c0,/Submit the chosen full autocomplete item/);
    assert.match(r.questions.action.criteria.c1,/requested ordinal checkbox/);
    return {answers:{action:{type:'choice',choice:'handoff'}},usage:{cost:0}};
  }}}};
  await jevDecider(api)({binding:'bound',intent:'Enter an item that starts with "Cro" and ends with "tia".',scope:'test',
    observation:{snapshot:'- textbox "Tags:" [ref=e1]: Croatia\n- button "Submit" [ref=e2]'},
    history:[{outcome:'tool_succeeded',action:{op:'click',role:'listitem',name:'Croatia'}}],
    candidates:{c0:{op:'click',role:'button',name:'Submit',ref:'@e2'},
      c1:{op:'check',role:'checkbox',name:'2nd checkbox',ref:'@e3',purpose:'ordinal_checkbox'},
      step_complete:{op:'step_complete'},handoff:{op:'handoff'}}});
});

test('Jev adapter withholds mutation completion until a matching control succeeds',async()=>{
  let calls=0;
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
    calls++;
    const criteria=r.questions.action.criteria;
    if(calls===1){
      assert.equal(criteria.step_complete,undefined);
      assert.ok(criteria.handoff);
    }else{
      assert.match(criteria.step_complete,/Execute and observe the requested change/);
    }
    return {answers:{action:{type:'choice',choice:'handoff'}},usage:{cost:0}};
  }}}};
  const common={binding:'bound',intent:'Subscribe to the space forum',scope:'test',
    observation:{snapshot:'observed page'},candidates:{
      c0:{op:'click',role:'button',name:'Subscribe No subscribers',ref:'@e1'},
      step_complete:{op:'step_complete'},handoff:{op:'handoff'}}};
  await jevDecider(api)({...common,
    history:[{outcome:'tool_succeeded',action:{op:'click',role:'link',name:'space'}}]});
  await jevDecider(api)({...common,
    history:[{outcome:'tool_succeeded',action:{op:'click',role:'button',name:'Subscribe No subscribers'}}]});
  assert.equal(calls,2);
});

test('Jev adapter requires the requested forum and New sort before offering Upvote',async()=>{
  const seen=[];
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
    seen.push(r.questions.action.criteria);
    return {answers:{action:{type:'choice',choice:'handoff'}},usage:{cost:0}};
  }}}};
  const common={binding:'bound',intent:'Upvote the newest post in books forum',scope:'test',history:[],
    candidates:{forum:{op:'click',role:'link',name:'books',ref:'@e1'},
      sort:{op:'click',role:'button',name:'Sort by: Hot',ref:'@e2'},
      newest:{op:'click',role:'link',name:'New',ref:'@e3'},
      vote:{op:'click',role:'button',name:'Upvote',ref:'@e4'},
      step_complete:{op:'step_complete'},handoff:{op:'handoff'}}};
  await jevDecider(api)({...common,observation:{snapshot:'- heading "Search"\n- link "books" [ref=e1]\n- button "Upvote" [ref=e4]'}});
  assert.match(seen[0].forum,/requested "books" forum/);
  assert.equal(seen[0].vote,undefined);
  await jevDecider(api)({...common,observation:{snapshot:'- heading "/f/books" [level=1]\n- button "Sort by: Hot" [ref=e2]\n- button "Upvote" [ref=e4]'}});
  assert.match(seen[1].sort,/choose New/);
  assert.equal(seen[1].vote,undefined);
  await jevDecider(api)({...common,observation:{snapshot:'- heading "/f/books" [level=1]\n- button "Sort by: New" [ref=e2]\n- heading "First post" [level=1]\n- button "Upvote" [ref=e4]'}});
  assert.match(seen[2].vote,/first listed post/);
  assert.equal(seen[2].step_complete,undefined);
});

test('Jev adapter clears an existing subscription before subscribing from the hottest post',async()=>{
  const seen=[];
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
    seen.push(r.questions.action.criteria);
    return {answers:{action:{type:'choice',choice:'handoff'}},usage:{cost:0}};
  }}}};
  const intent='Subscribe to the "space" forum from the page of the hottest post in that forum.';
  await jevDecider(api)({binding:'bound',intent,scope:'test',history:[],observation:{snapshot:
    '- heading "/f/space" [level=1]\n- button "Sort by: Hot" [ref=e1]\n- heading "Hottest post" [level=1]\n  - link "Hottest post" [ref=e2]\n- link "77 comments" [ref=e6]\n- button "Unsubscribe 1 subscriber" [ref=e3]'},
    candidates:{top:{op:'click',role:'link',name:'Hottest post',ref:'@e2'},
      comments:{op:'click',role:'link',name:'77 comments',ref:'@e6'},
      unsubscribe:{op:'click',role:'button',name:'Unsubscribe 1 subscriber',ref:'@e3'},
      subscribe:{op:'click',role:'button',name:'Subscribe No subscribers',ref:'@e4'},
      step_complete:{op:'step_complete'},handoff:{op:'handoff'}}});
  assert.match(seen[0].unsubscribe,/Clear the existing subscription/);
  assert.equal(seen[0].top,undefined);
  assert.match(seen[0].comments,/first post in the forum's visible Hot listing/);
  assert.equal(seen[0].subscribe,undefined);
  const postRequest={binding:'bound',intent,scope:'test',observation:{snapshot:
    '- link "/f/space" [ref=e5]\n- heading "Comments" [level=2]\n- button "Subscribe No subscribers" [ref=e4]'},
    candidates:{subscribe:{op:'click',role:'button',name:'Subscribe No subscribers',ref:'@e4'},
      step_complete:{op:'step_complete'},handoff:{op:'handoff'}}};
  await jevDecider(api)({...postRequest,history:[{outcome:'tool_succeeded',
    action:{op:'click',role:'button',name:'Unsubscribe 1 subscriber'}}]});
  assert.match(seen[1].subscribe,/subscribe here/i);
  assert.equal(seen[1].step_complete,undefined);
  await jevDecider(api)({...postRequest,history:[{outcome:'tool_succeeded',
    action:{op:'click',role:'button',name:'Subscribe No subscribers'}}]});
  assert.ok(seen[2].step_complete);
});

test('Jev adapter ignores subscriber-count children and stays on an opened hottest post',async()=>{
  let criteria;
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
    criteria=r.questions.action.criteria;
    return {answers:{action:{type:'choice',choice:'wait'}},usage:{cost:0}};
  }}}};
  await jevDecider(api)({binding:'bound',
    intent:'Subscribe to the "space" forum from the page of the hottest post in that forum.',scope:'test',
    observation:{snapshot:'- image'},history:[
      {outcome:'tool_succeeded',action:{op:'click',role:'link',name:'space — space'}},
      {outcome:'tool_succeeded',action:{op:'click',role:'link',name:'Hottest post'}},
    ],candidates:{
      count:{op:'click',role:'generic',name:'No subscribers',ref:'@e1'},
      back:{op:'back'},wait:{op:'wait',ms:300},handoff:{op:'handoff'},
    }});
  assert.equal(criteria.count,undefined);
  assert.equal(criteria.back,undefined);
  assert.ok(criteria.wait);
});

test('Jev adapter prefers revealing an intermediate menu over selecting it', async () => {
  const api = { alpha: { decisions: { create: async ({ decisionsRequest: r }) => {
    assert.match(r.questions.action.criteria.c0,/Clicking it may select the wrong item/);
    assert.match(r.questions.action.criteria.c1,/Hover this intermediate menu item/);
    return { answers: { action: { type: 'choice', choice: 'handoff' } }, usage: { cost: 0 } };
  } } } };
  const result=await jevDecider(api)({binding:'bound',intent:'Select Sherrie>De>Maddalena',scope:'test',
    observation:{snapshot:'observed menu'},history:[],candidates:{
      c0:{op:'click',role:'menuitem',name:'Sherrie',ref:'@e1'},
      c1:{op:'hover',role:'menuitem',name:'Sherrie',ref:'@e1',purpose:'reveal_submenu'},
      handoff:{op:'handoff'},
    }});
  assert.equal(result.choice,'handoff');
});


test('handoff preserves partial work without reporting completion and retains measured decision time', async () => {
  const f = fixture({decide: async r => ({binding:r.binding, choice:r.history.length?'handoff':'c0', cost:0.001})});
  const result = await f.run();
  assert.equal(result.returnReason, 'handoff');
  assert.equal(result.actions.length, 1);
  assert.deepEqual(result.progressAssessment, []);
  assert.equal(result.latestObservation.snapshot, 'Aperture is open');
  assert.deepEqual(result.decisions.map(d=>d.cost), [0.001,0.001]);
  assert.ok(result.decisions.every(d=>Number.isFinite(d.elapsedMs)&&d.elapsedMs>=0));
  assert.ok(result.elapsedMs>=result.decisions.reduce((sum,d)=>sum+d.elapsedMs,0));
});
