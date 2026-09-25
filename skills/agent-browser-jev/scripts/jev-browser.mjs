import { randomUUID } from 'node:crypto';
import { discoverActions } from './controls.mjs';
export { discoverActions } from './controls.mjs';

// In-process serialization complements (and does not replace) the caller's lease.
const sessions = new Map();
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

/** Call when the owner changes the session outside this helper. */
export function invalidateBrowserObservation(sessionId) {
  const state = sessions.get(sessionId);
  if (state) state.revision++;
}

function assertBudget(budget) {
  const result = { maxActions: 30, maxDecisions: 60, timeoutMs: 120_000, maxObservationChars: 45_000, ...budget };
  for (const value of Object.values(result)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError('Budgets must be positive integers');
  }
  return result;
}

/**
 * One bounded task in an existing browser. authorize must establish actual action
 * authority, not merely check its verb. Missing authorization denies all gestures.
 * decide returns {binding, choice}; it cannot supply an executable action or value.
 * reported_complete is a model judgment, never verified business success.
 */
export async function act({ browser, decide, intentOrSteps, suppliedValues = {},
  scope, authorize = () => false, budget = {}, continuation, context = '', initialUrl }) {
  const steps = structuredClone(Array.isArray(intentOrSteps) ? intentOrSteps : [intentOrSteps]);
  if (!steps.length || steps.some(s => typeof s !== 'string' || !s.trim()) ||
      typeof scope !== 'string' || !scope.trim() || !browser?.sessionId || typeof decide !== 'function') {
    throw new TypeError('An existing session, intent, scope and decision function are required');
  }
  if (continuation && (continuation.schema !== 1 || continuation.sessionId !== browser.sessionId ||
      JSON.stringify(continuation.intentOrSteps) !== JSON.stringify(steps) || continuation.scope !== scope ||
      !Number.isSafeInteger(continuation.stepIndex) || continuation.stepIndex < 0 || continuation.stepIndex >= steps.length ||
      !Array.isArray(continuation.history) || !Array.isArray(continuation.progressAssessment))) {
    throw new TypeError('Continuation must match this task, scope and browser session');
  }
  if (initialUrl && (continuation || !/^https?:$/.test(new URL(initialUrl).protocol))) {
    throw new TypeError('Initial navigation requires a new task and an HTTP/HTTPS URL');
  }
  const values = freeze(structuredClone({ ...continuation?.suppliedValues, ...suppliedValues }));
  if (Object.values(values).some(v => typeof v !== 'string')) throw new TypeError('Supplied values must be strings');
  const limits = assertBudget(budget);
  const session = sessions.get(browser.sessionId) ?? { busy: false, revision: 0 };
  sessions.set(browser.sessionId, session);
  if (session.busy) return { returnReason: 'session_busy', actions: [], progressAssessment: [] };
  session.busy = true;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), limits.timeoutMs);
  const result = { sessionId: browser.sessionId, returnReason: null, actions: [],
    progressAssessment: structuredClone(continuation?.progressAssessment ?? []), decisions: [], latestObservation: null,
    observationFresh: false, inputRequired: null, navigationMs:0,
    timing: { observationMs:0, decisionMs:0, actionMs:0, settleMs:0 } };
  const priorHistory = structuredClone(continuation?.history ?? []);
  let step = continuation?.stepIndex ?? 0;
  let pending;
  const started = performance.now();
  const history = () => [...priorHistory, ...result.actions.map(a => ({ stepIndex:a.stepIndex, action:a.action, outcome:a.outcome }))].slice(-30);
  const finish = reason => ({ ...result,
    observationFresh:reason === 'superseded_observation' ? false : result.observationFresh,
    returnReason:reason, elapsedMs:performance.now()-started,
    continuation: reason === 'reported_complete' ? null : {
      schema:1, sessionId:browser.sessionId, intentOrSteps:steps, scope, stepIndex:step,
      suppliedValues:values, history:history(), progressAssessment:result.progressAssessment,
    } });
  async function timed(kind, operation) {
    const start = performance.now();
    try { return await bounded(operation); }
    finally { result.timing[kind] += performance.now()-start; }
  }
  async function observe() {
    const observation = freeze(structuredClone(await timed('observationMs', () => browser.observe(abort.signal))));
    result.latestObservation = observation;
    result.observationFresh = true;
    return observation;
  }
  async function bounded(operation) {
    if (abort.signal.aborted) throw new Error('deadline');
    let rejectAbort;
    const expired = new Promise((_, reject) => {
      rejectAbort = () => reject(new Error('deadline'));
      abort.signal.addEventListener('abort', rejectAbort, { once: true });
    });
    try { return await Promise.race([Promise.resolve().then(operation), expired]); }
    finally { abort.signal.removeEventListener('abort', rejectAbort); }
  }
  try {
    if (initialUrl) {
      const action = freeze({op:'open',url:initialUrl});
      if (authorize(action,{snapshot:'',refs:{}}) !== true) return finish('permission_denied');
      const start = performance.now();
      try { await bounded(() => browser.execute(action,abort.signal)); }
      catch { return finish('action_outcome_unknown'); }
      finally { result.navigationMs = performance.now()-start; }
    }
    for (let n = 0; n < limits.maxDecisions; n++) {
      const revision = pending?.revision ?? ++session.revision;
      const observation = pending?.observation ?? await observe();
      pending = undefined;
      result.latestObservation = observation;
      if (session.revision !== revision) return finish('superseded_observation');
      if (typeof observation.snapshot !== 'string') return finish('invalid_observation');
      if (JSON.stringify(observation).length > limits.maxObservationChars) return finish('observation_too_large');
      const binding = `${browser.sessionId}:${revision}:${randomUUID()}`;
      const candidates = {};
      for (const action of discoverActions(observation, values)) {
        freeze(action);
        // Async/truthy policy results must never silently authorize an action.
        if (authorize(action, observation) === true) candidates[`c${Object.keys(candidates).length}`] = action;
      }
      if (Object.keys(candidates).length > 252) return finish('candidate_limit');
      const unchangedWaitStreak = result.actions.slice().reverse().findIndex(a=>a.action.op !== 'wait' || a.before.snapshot !== a.after?.snapshot);
      const waitsOnStablePage = unchangedWaitStreak < 0 ? result.actions.length : unchangedWaitStreak;
      if (waitsOnStablePage < 5) candidates.wait = { op: 'wait', ms: 300 };
      candidates.step_complete = { op: 'step_complete' };
      candidates.handoff = { op: 'handoff' };
      freeze(candidates);
      const request = freeze({ binding, sessionId: browser.sessionId, intent: steps[step],
        stepIndex: step, scope, context, observation, candidates, suppliedValues: values,
        previousObservation: result.actions.at(-1)?.before.snapshot,
        history: history() });
      const decisionStarted = performance.now();
      const decision = await timed('decisionMs', () => decide(request, abort.signal));
      const elapsedMs = performance.now() - decisionStarted;
      if (abort.signal.aborted) return finish('deadline');
      if (decision?.binding !== binding || session.revision !== revision) return finish('superseded_observation');
      if (typeof decision.choice !== 'string' || !Object.hasOwn(candidates, decision.choice)) return finish('invalid_choice');
      const action = candidates[decision.choice];
      result.decisions.push({ stepIndex: step, choice: decision.choice, op: action.op,
        confidence: decision.confidence, cost: decision.cost, elapsedMs });
      if (action.op === 'request_input') {
        result.inputRequired = { name:action.name, role:action.role,
          key:action.name || 'value', instruction:'Supply the exact non-secret field value, then resume. The target will be observed again.' };
        return finish('input_required');
      }
      if (action.op === 'handoff') return finish('handoff');
      if (action.op === 'step_complete') {
        result.progressAssessment.push({ stepIndex: step, intent: steps[step], judgment: 'model_reported_complete' });
        if (++step === steps.length) return finish('reported_complete');
        pending = { revision, observation };
        continue;
      }
      if (result.actions.length >= limits.maxActions) return finish('action_budget');
      if (action.op !== 'wait' && authorize(action, observation) !== true) return finish('permission_denied');
      if (session.revision !== revision || abort.signal.aborted) return finish('superseded_observation');
      const entry = { stepIndex: step, action, before: observation, outcome: 'unknown' };
      result.actions.push(entry);
      result.observationFresh = false;
      try {
        await timed('actionMs', () => browser.execute(action, abort.signal));
        entry.outcome = 'tool_succeeded';
      } catch {
        // A timed-out gesture may have happened. Read back once for the caller,
        // but never replay the gesture or allow another gesture in this run.
        try { entry.after = await observe(); } catch { result.observationFresh = false; }
        return finish('action_outcome_unknown');
      }
      const afterRevision = ++session.revision;
      entry.after = await observe();
      // Native click success can precede an asynchronous render. Only poll when
      // the immediate observation is unchanged; do not ask the model to decide
      // again against a screen whose transition may still be in flight.
      for (let poll = 0; poll < 3 && action.op !== 'wait' && entry.after.snapshot === entry.before.snapshot; poll++) {
        result.observationFresh = false;
        await timed('settleMs', () => new Promise(resolve => setTimeout(resolve, 80)));
        entry.after = await observe();
      }
      // An async click handler can first expose focus/selection state and only
      // then navigate or replace the view. If the clicked ref still exists,
      // take one short quiescence read so Jev does not repeat a stale gesture.
      const actedRef = action.ref?.slice(1);
      if (['click','hover'].includes(action.op) && actedRef && entry.after.refs?.[actedRef]) {
        result.observationFresh = false;
        await timed('settleMs', () => new Promise(resolve => setTimeout(resolve, 80)));
        entry.after = await observe();
      }
      result.latestObservation = entry.after;
      if (session.revision !== afterRevision) return finish('superseded_observation');
      if (action.op === 'set_date' && entry.after.snapshot === entry.before.snapshot) return finish('no_progress');
      const recent = result.actions.slice(-3);
      if (recent.length === 3 && ['click','hover','upload','fill','select','check','uncheck'].includes(action.op) && recent.every(a =>
          a.action.op === action.op && a.action.name === action.name && a.action.value === action.value &&
          a.action.option === action.option && a.action.key === action.key && a.action.direction === action.direction &&
          a.before.snapshot === a.after?.snapshot)) return finish('no_progress');
      pending = { revision: afterRevision, observation: entry.after };
    }
    return finish('decision_budget');
  } catch {
    return finish(abort.signal.aborted ? 'deadline' : 'helper_error');
  } finally {
    clearTimeout(timer);
    abort.abort();
    session.busy = false;
  }
}
