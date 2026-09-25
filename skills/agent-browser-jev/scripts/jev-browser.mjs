import { randomUUID } from 'node:crypto';

// In-process serialization complements (and does not replace) the caller's lease.
const sessions = new Map();
const clickRoles = new Set(['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'option']);
const inputRoles = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton']);
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

/** Mechanical discovery only: names and surrounding snapshot remain model input. */
export function discoverActions(observation, suppliedValues = {}) {
  const actions = [];
  for (const [ref, control] of Object.entries(observation.refs ?? {})) {
    if (!/^e\d+$/.test(ref) || control.disabled === true) continue;
    const base = { ref: `@${ref}`, role: control.role, name: control.name ?? '' };
    if (clickRoles.has(control.role)) actions.push({ ...base, op: 'click' });
    if (inputRoles.has(control.role)) {
      for (const [valueId, value] of Object.entries(suppliedValues)) {
        if (typeof value !== 'string') throw new TypeError('Supplied values must be strings');
        actions.push({ ...base, op: 'fill', valueId, value });
      }
    }
  }
  return actions;
}

function assertBudget(budget) {
  const result = { maxActions: 8, maxDecisions: 16, timeoutMs: 60_000, maxObservationChars: 45_000, ...budget };
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
  scope, authorize = () => false, budget = {} }) {
  const steps = structuredClone(Array.isArray(intentOrSteps) ? intentOrSteps : [intentOrSteps]);
  if (!steps.length || steps.some(s => typeof s !== 'string' || !s.trim()) ||
      typeof scope !== 'string' || !scope.trim() || !browser?.sessionId || typeof decide !== 'function') {
    throw new TypeError('An existing session, intent, scope and decision function are required');
  }
  const values = freeze(structuredClone(suppliedValues));
  if (Object.values(values).some(v => typeof v !== 'string')) throw new TypeError('Supplied values must be strings');
  const limits = assertBudget(budget);
  const session = sessions.get(browser.sessionId) ?? { busy: false, revision: 0 };
  sessions.set(browser.sessionId, session);
  if (session.busy) return { returnReason: 'session_busy', actions: [], progressAssessment: [] };
  session.busy = true;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), limits.timeoutMs);
  const result = { sessionId: browser.sessionId, returnReason: null, actions: [],
    progressAssessment: [], decisions: [], latestObservation: null };
  let step = 0;
  let pending;
  const finish = reason => ({ ...result, returnReason: reason });
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
    for (let n = 0; n < limits.maxDecisions; n++) {
      const revision = pending?.revision ?? ++session.revision;
      const observation = pending?.observation ?? freeze(structuredClone(await bounded(() => browser.observe(abort.signal))));
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
      candidates.wait = { op: 'wait', ms: 300 };
      candidates.step_complete = { op: 'step_complete' };
      candidates.handoff = { op: 'handoff' };
      freeze(candidates);
      const request = freeze({ binding, sessionId: browser.sessionId, intent: steps[step],
        stepIndex: step, scope, observation, candidates, suppliedValues: values,
        previousObservation: result.actions.at(-1)?.before.snapshot,
        history: result.actions.map(a => ({ stepIndex: a.stepIndex, action: a.action, outcome: a.outcome })) });
      const decision = await bounded(() => decide(request, abort.signal));
      if (abort.signal.aborted) return finish('deadline');
      if (decision?.binding !== binding || session.revision !== revision) return finish('superseded_observation');
      if (typeof decision.choice !== 'string' || !Object.hasOwn(candidates, decision.choice)) return finish('invalid_choice');
      const action = candidates[decision.choice];
      result.decisions.push({ stepIndex: step, choice: decision.choice, op: action.op,
        confidence: decision.confidence, cost: decision.cost });
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
      try {
        await bounded(() => browser.execute(action, abort.signal));
        entry.outcome = 'tool_succeeded';
      } catch {
        // A timed-out gesture may have happened. Never replay it automatically.
        return finish('action_outcome_unknown');
      }
      const afterRevision = ++session.revision;
      entry.after = freeze(structuredClone(await bounded(() => browser.observe(abort.signal))));
      result.latestObservation = entry.after;
      if (session.revision !== afterRevision) return finish('superseded_observation');
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
