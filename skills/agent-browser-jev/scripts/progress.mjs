import {createHash} from 'node:crypto';

// These are observation/attempt facts, not a plan, proof of success, or a claim
// that every available route must be explored. Browser refs are never identity.
const clipped = (value, limit = 120) => String(value ?? '').slice(0, limit);
const fingerprint = observation => createHash('sha256')
  .update((typeof observation?.snapshot === 'string' ? observation.snapshot : '').replace(/\bref=e\d+(?=[,\]])/g, 'ref=*')).digest('hex');
const routeKind = action => action.op === 'click' && action.role === 'tab' ? 'tab'
  : action.op === 'hover' && action.hasSubmenu ? 'submenu'
  : action.op === 'click' && action.purpose === 'expand_tree_branch' ? 'branch' : null;

function observedRoutes(observation, actions) {
  const contexts = new Map(), selected = new Set(), stack = [];
  for (const line of (observation?.snapshot ?? '').split('\n')) {
    const match = line.match(/^(\s*)- ([\w-]+)(?: "([^"\n]*)")?/);
    if (!match) continue;
    const indent = match[1].length;
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    const ref = line.match(/\bref=(e\d+)\b/)?.[1];
    if (ref) {
      contexts.set(`@${ref}`, stack.slice(-4).map(x => [x.role, x.name].filter(Boolean).join(' ')).join(' > '));
      if (/\bselected(?:=true)?(?=[,\]])/.test(line)) selected.add(`@${ref}`);
    }
    stack.push({indent, role:match[2], name:match[3] ?? ''});
  }
  const routes = actions.filter(action => routeKind(action)).map(action => {
    const context = contexts.get(action.ref) ?? '', kind = routeKind(action);
    return {key:JSON.stringify([kind, action.name ?? '', context]), ref:action.ref,
      kind, name:clipped(action.name), context:clipped(context, 240), selected:selected.has(action.ref)};
  });
  const counts = new Map();
  for (const route of routes) counts.set(route.key, (counts.get(route.key) ?? 0) + 1);
  return routes.map(route => ({...route, ambiguous:!route.name || counts.get(route.key) > 1}));
}

export function createProgressTracker() {
  let step = null, routes = [], lastState = null, repeated = false, coverage = 'not_collected';
  const attempts = new Map(), states = new Set(), recentActions = [];
  const reset = nextStep => {
    if (step === nextStep) return;
    step = nextStep; routes = []; lastState = null; repeated = false;
    attempts.clear(); states.clear(); recentActions.length = 0;
  };
  function observe(observation, actions, stepIndex) {
    reset(stepIndex);
    if (typeof observation?.snapshot !== 'string') {
      routes = []; coverage = 'not_collected'; return snapshot();
    }
    const state = fingerprint(observation);
    if (state !== lastState) {
      repeated = states.has(state);
      if (states.size >= 64) states.delete(states.values().next().value);
      states.add(state); lastState = state;
    }
    coverage = actions ? 'authorized_frontier' : 'not_collected';
    routes = actions ? observedRoutes(observation, actions) : [];
    for (const route of routes.filter(route => route.selected && !route.ambiguous)) {
      if (attempts.size >= 128 && !attempts.has(route.key)) attempts.delete(attempts.keys().next().value);
      attempts.set(route.key, {...(attempts.get(route.key) ?? {count:0, unchanged:0}), observedSelected:true});
    }
    return snapshot();
  }
  function record(entry) {
    const route = routes.find(route => route.ref === entry.action.ref && route.kind === routeKind(entry.action));
    const visibleChange = entry.after ? fingerprint(entry.before) !== fingerprint(entry.after) : null;
    if (route && !route.ambiguous) {
      const previous = attempts.get(route.key) ?? {count:0, unchanged:0};
      if (attempts.size >= 128 && !attempts.has(route.key)) attempts.delete(attempts.keys().next().value);
      attempts.set(route.key, {...previous, count:previous.count + 1,
        unchanged:previous.unchanged + Number(visibleChange === false)});
    }
    recentActions.push({operation:entry.action.op, target:clipped(entry.action.name ?? entry.action.role),
      outcome:entry.outcome, observationChanged:visibleChange});
    if (recentActions.length > 8) recentActions.shift();
  }
  function snapshot() {
    return {basis:'observed_controls_and_attempts', scope:'current_step_in_this_invocation',
      observedStates:states.size, returnedToObservedState:repeated,
      navigationCoverage:coverage,
      navigation:routes.slice(0, 24).map(({key, ref, ambiguous, ...route}) => ({...route,
        attempted:ambiguous ? null : (attempts.get(key)?.count ?? 0),
        observedSelected:ambiguous ? null : (attempts.get(key)?.observedSelected ?? false),
        unchangedReadbacks:ambiguous ? null : (attempts.get(key)?.unchanged ?? 0)})),
      navigationTruncated:routes.length > 24, recentActions:[...recentActions]};
  }
  return {observe, record, snapshot};
}

const nextActions = {
  input_required:'provide_input', input_not_accepted:'inspect_control_and_value', action_outcome_unknown:'verify_before_retry',
  no_progress:'inspect_and_take_over', action_budget:'continue_or_adjust_budget',
  decision_budget:'continue_or_adjust_budget', deadline:'inspect_before_resuming',
  helper_error:'inspect_failure', observation_too_large:'inspect_with_caller_tools',
  invalid_observation:'inspect_with_caller_tools', superseded_observation:'observe_again',
  permission_denied:'review_authorized_scope', handoff:'inspect_and_continue',
};

export function buildHandoff({reason, steps, stepIndex, result, progress}) {
  if (reason === 'reported_complete') return null;
  const last = result.actions?.filter(entry => entry.stepIndex === stepIndex).at(-1);
  return {reason, completionEstablished:false, stepIndex,
    currentIntent:steps[stepIndex] ?? null, remainingIntents:steps.slice(stepIndex),
    completedIntents:(result.progressAssessment ?? []).map(item => ({intent:item.intent,
      evidence:'model_reported_complete'})),
    observationFresh:result.observationFresh === true && reason !== 'superseded_observation',
    observationLimited:result.latestObservation?.limited === true ||
      (result.latestObservation?.snapshot?.length ?? 0) > 16000,
    lastAction:last ? {operation:last.action.op, target:clipped(last.action.name ?? last.action.role),
      outcome:last.outcome, observationChanged:last.after ? fingerprint(last.before) !== fingerprint(last.after) : null} : null,
    exploration:progress,
    ...(result.pendingActionChecks?.length?{withheldActions:result.pendingActionChecks}:{}),
    suggestedCallerAction:nextActions[reason] ?? 'inspect_and_continue'};
}
