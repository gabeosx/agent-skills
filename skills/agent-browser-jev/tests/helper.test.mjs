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
    return { binding: r.binding, choice: r.history.length ? 'step_complete' : 'c0' };
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
  const result=await f.run();
  assert.equal(result.returnReason, 'helper_error');
  assert.equal(f.calls.length, 0);
  assert.equal(result.decisions.length,1);
  assert.equal(result.decisions[0].cost,null);
  assert.deepEqual(result.failure,{kind:'decision_failed'});
  assert.ok(!JSON.stringify(result).includes('secret provider error'));
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
    if(r.questions.source)return {answers:{source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'},evidence:{type:'choice',choice:'unknown'}},usage:{cost:0.001}};
    assert.equal(r.state.observation, 'untrusted page evidence');
    assert.deepEqual(r.state.suppliedValues, { message:'Exact caller text' });
    if(r.questions.completion)return {answers:{destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:'complete'}},usage:{cost:0.001}};
    assert.ok(r.questions.action.criteria.step_complete);
    return { answers: { action: { type: 'choice', choice: 'step_complete' } }, usage: { cost: 0.001 } };
  } } } };
  const decide=jevDecider(api),request={ binding: 'bound', intent: 'test', scope: 'test',
    observation: { snapshot: 'untrusted page evidence' }, history: [], suppliedValues: { message:'Exact caller text' },
    candidates: { step_complete: { op: 'step_complete' }, handoff: { op: 'handoff' } } };
  const assessment=await decide(request,signal);
  assert.equal(assessment.assessment,true);assert.equal(assessment.cost,0.001);
  const proposal=await decide(request,signal);
  assert.equal(proposal.assessment,true);assert.equal(proposal.cost,0.001);
  const result=await decide(request,signal);
  assert.equal(result.binding, 'bound');
  assert.equal(result.choice, 'step_complete');
});

test('model history cannot present old references and pre-action values as current state', async () => {
  let sent;
  const api={alpha:{decisions:{create:async ({decisionsRequest})=>{
    if(decisionsRequest.questions.action)sent=decisionsRequest;
    if(decisionsRequest.questions.completion)return {answers:{destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:'uncertain'}},usage:{cost:0}};
    if(decisionsRequest.questions.source)return {answers:{source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'},evidence:{type:'choice',choice:'unknown'}},usage:{cost:0}};
    if(!decisionsRequest.questions.action)return {answers:Object.fromEntries(Object.keys(decisionsRequest.questions).map(id=>[id,{type:'choice',choice:'none'}])),usage:{cost:0}};
    return {answers:{action:{type:'choice',choice:'handoff'}},usage:{cost:0}};
  }}}};
  const history=[{stepIndex:0,outcome:'tool_succeeded',action:{op:'press',role:'generic',
    name:'slider',ref:'@e99',key:'ArrowRight',currentValue:6,purpose:'adjust_slider'}}];
  const decide=jevDecider(api),request={binding:'state-test',intent:'Set the level to 7',scope:'Test',
    observation:{snapshot:'Current level is 7'},previousObservation:'Old level was 6',history,
    candidates:{left:{op:'press',ref:'@e1',name:'slider',key:'ArrowLeft',currentValue:7},
      right:{op:'press',ref:'@e1',name:'slider',key:'ArrowRight',currentValue:7},handoff:{op:'handoff'}}};
  while((await decide(request)).assessment){}
  assert.deepEqual(sent.state.currentControlValues,[{ref:'@e1',name:'slider',value:7}]);
  assert.equal(sent.state.previousObservation,undefined);
  assert.equal(sent.state.history[0].action.currentValue,undefined);
  assert.equal(sent.state.history[0].action.ref,undefined);
  assert.equal(sent.state.history[0].action.key,'ArrowRight');
  assert.equal(history[0].action.currentValue,6,'local diagnostic history remains intact');
});

// These probes test wrapper invariants, not whether a mocked model understands
// the goal. Live transfer requires separate, untouched external tasks.
async function decisionRequest(intent, observation, history = []) {
  let sent;
  const candidates=Object.fromEntries(discoverActions(observation,{},intent).map((action,index)=>[`c${index}`,action]));
  Object.assign(candidates,{step_complete:{op:'step_complete'},handoff:{op:'handoff'}});
  const api={alpha:{decisions:{create:async ({decisionsRequest:request})=>{
    if(request.questions.action)sent=request;
    if(request.questions.nextRoute)return {answers:{nextRoute:{type:'choice',choice:'none'}},usage:{cost:0}};
    if(request.questions.completion)return {answers:{destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:'uncertain'}},usage:{cost:0}};
    if(request.questions.source)return {answers:{source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'},evidence:{type:'choice',choice:'unknown'}},usage:{cost:0}};
    return {answers:{action:{type:'choice',choice:'handoff'}},usage:{cost:0}};
  }}}};
  const decide=jevDecider(api),request={binding:'probe',intent,scope:'Authorized goal',observation,candidates,history};
  while((await decide(request)).assessment){}
  return {criteria:sent.questions.action.criteria,state:sent.state,candidates};
}

test('equivalent subscription goals retain all grounded navigation and recovery routes',async()=>{
  const observation={snapshot:'- heading "Home"\n- link "Browse communities" [ref=e1]\n- link "Forums" [ref=e2]',
    refs:{e1:{role:'link',name:'Browse communities'},e2:{role:'link',name:'Forums'}}};
  const goals=['Subscribe to the "space" forum from the page of the hottest post in that forum.',
    'Open the hottest post in the space forum and subscribe to that forum.',
    'Please join space after opening its most active discussion.'];
  const requests=await Promise.all(goals.map(goal=>decisionRequest(goal,observation)));
  for(const request of requests){
    assert.deepEqual(Object.keys(request.criteria),Object.keys(request.candidates));
    assert.ok(Object.values(request.candidates).some(a=>a.op==='back'));
    assert.deepEqual(request.criteria,requests[0].criteria);
  }
});

test('an arbitrary post is not described as the target and navigation is retained',async()=>{
  const observation={snapshot:'- heading "Old unrelated post" [level=1]\n- heading "Comments" [level=2]\n- link "/f/space" [ref=e1]\n- button "Subscribe" [ref=e2]',
    refs:{e1:{role:'link',name:'/f/space'},e2:{role:'button',name:'Subscribe'}}};
  const {criteria,candidates}=await decisionRequest('Subscribe to the "space" forum from the page of the hottest post in that forum.',observation);
  const subscribe=Object.entries(candidates).find(([,a])=>a.name==='Subscribe');
  assert.equal(criteria[subscribe[0]],JSON.stringify(subscribe[1]));
  assert.deepEqual(Object.keys(criteria),Object.keys(candidates));
});

test('already satisfied state can complete without a forced inverse action',async()=>{
  const observation={snapshot:'- heading "Comments" [level=2]\n- link "/f/space" [ref=e1]\n- button "Unsubscribe" [ref=e2]',
    refs:{e1:{role:'link',name:'/f/space'},e2:{role:'button',name:'Unsubscribe'}}};
  const {criteria,candidates}=await decisionRequest('Subscribe to the "space" forum from the page of the hottest post in that forum.',observation);
  const inverse=Object.entries(candidates).find(([,a])=>a.name==='Unsubscribe');
  assert.equal(criteria[inverse[0]],JSON.stringify(inverse[1]));
  assert.ok(criteria.step_complete);
  const calls=[];
  const result=await act({browser:{sessionId:randomUUID(),observe:async()=>observation,
    execute:async action=>calls.push(action)},scope:'Test',authorize:()=>true,
    intentOrSteps:'Ensure I am subscribed; the caller already verified the required post.',
    decide:jevDecider({alpha:{decisions:{create:async({decisionsRequest:r})=>({answers:r.questions.source?{source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'},evidence:{type:'choice',choice:'unknown'}}:r.questions.completion?{destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:'complete'}}:{action:{type:'choice',choice:'step_complete'}}})}}})});
  assert.equal(result.returnReason,'reported_complete');
  assert.deepEqual(calls,[]);
});

test('sort labels do not suppress time filters or assert ranking evidence',async()=>{
  const observation={snapshot:'- heading "/f/space" [level=1]\n- button "Sort by: Top" [ref=e1]\n- button "Time: Today" [ref=e2]\n- link "All time" [ref=e3]\n- link "5 comments" [ref=e4]',
    refs:{e1:{role:'button',name:'Sort by: Top'},e2:{role:'button',name:'Time: Today'},e3:{role:'link',name:'All time'},e4:{role:'link',name:'5 comments'}}};
  const {criteria,candidates}=await decisionRequest('Subscribe to the "space" forum from the page of the all time top post in that forum.',observation);
  for(const [id,action] of Object.entries(candidates).filter(([,a])=>a.op==='click'))
    assert.equal(criteria[id],JSON.stringify(action));
});

test('posting paraphrases and different form layouts preserve required inputs and alternative routes',async()=>{
  const observation={snapshot:'- textbox "Title" [ref=e1]\n- textbox "Body" [ref=e2]\n- link "Create post" [ref=e3]',
    refs:{e1:{role:'textbox',name:'Title'},e2:{role:'textbox',name:'Body'},e3:{role:'link',name:'Create post'}}};
  const goals=['Post my question with the title "Console choices?", in a forum where I\'m likely to get an answer',
    'Find a forum about consoles, and post my question, "Console choices?" there',
    'Please ask "Console choices?" in a relevant community.'];
  const requests=await Promise.all(goals.map(goal=>decisionRequest(goal,observation)));
  for(const request of requests){
    assert.deepEqual(Object.keys(request.criteria),Object.keys(request.candidates));
    assert.deepEqual(request.criteria,requests[0].criteria);
  }
});

test('unrelated action history cannot manufacture completion evidence in the wrapper',async()=>{
  const observation={snapshot:'- button "Subscribe" [ref=e1]',refs:{e1:{role:'button',name:'Subscribe'}}};
  const before=await decisionRequest('Subscribe to space',observation);
  const after=await decisionRequest('Subscribe to space',observation,[
    {outcome:'tool_succeeded',action:{op:'select',name:'Theme',option:'Dark'}}]);
  assert.deepEqual(after.criteria,before.criteria);
});

test('the decision context excludes actions from already completed steps',async()=>{
  let call=0;
  const f=fixture({decide:async request=>{
    call++;
    if(call===1)return {binding:request.binding,choice:'c0'};
    if(request.stepIndex===1)assert.deepEqual(request.history,[]);
    return {binding:request.binding,choice:'step_complete'};
  }});
  assert.equal((await f.run({intentOrSteps:['Reveal the panel','Inspect the result']})).returnReason,'reported_complete');
  assert.equal(call,3);
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
