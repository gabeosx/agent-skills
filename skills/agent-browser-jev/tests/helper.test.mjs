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
