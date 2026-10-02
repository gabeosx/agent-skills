import { randomUUID } from 'node:crypto';
import { discoverActions, requestedTableValue } from './controls.mjs';
import {createProgressTracker, buildHandoff} from './progress.mjs';
import {groundedQueryAction} from './goal-query.mjs';
import {groundedValueAction,valueBindingFrame} from './value-binding.mjs';
import {createNavigationContext} from './navigation-context.mjs';
import {captureChoices} from './capture-index.mjs';
import {createNumericLedger} from './numeric-ledger.mjs';
import {createCrossViewIdentity} from './cross-view-identity.mjs';
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
 * decide selects offered choices or caller-text query spans. Code constructs
 * and authorizes any span-derived fill before offering it as a new choice.
 * reported_complete is a model judgment, never verified business success.
 */
export async function act({ browser, decide, intentOrSteps, suppliedValues = {},
  scope, authorize = () => false, budget = {}, continuation, context = '', initialUrl, onEvent }) {
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
  if(continuation?.numericEdits!==undefined&&(!Array.isArray(continuation.numericEdits)||continuation.numericEdits.some(i=>!Number.isSafeInteger(i)||i<0||i>=steps.length)))throw new TypeError('Invalid numeric continuation state');
  const numericLedger=createNumericLedger(continuation?.numericLedger);
  const crossViewIdentity=createCrossViewIdentity(continuation?.crossViewIdentity);
  if(numericLedger.snapshot().entries.some(e=>e.stepIndex>=steps.length))throw new TypeError('Invalid numeric ledger step');
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
  const result = { executionState:structuredClone(continuation?.executionState??null),sessionId: browser.sessionId, returnReason: null, actions: [],
    progressAssessment: structuredClone(continuation?.progressAssessment ?? []), decisions: [], latestObservation: null,
    observationFresh: false, inputRequired: null, navigationMs:0, pendingActionChecks:[],
    timing: { observationMs:0, decisionMs:0, actionMs:0, settleMs:0 } };
  const priorHistory = structuredClone(continuation?.history ?? []);
  let priorTableValue = null, conflictingTableValue = false;
  let step = continuation?.stepIndex ?? 0;
  let candidatePage = 0;
  let pending;
  let goalQuery=null;
  let exactValues=[];
  const progress = createProgressTracker();
  const navigation = createNavigationContext();
  let frontierObservation = null;
  const started = performance.now();
  // Evaluation callers can retain a trajectory. Normal invocations provide no
  // sink, so page text and caller values never acquire a new persistence path.
  const emit = event => {
    if (typeof onEvent !== 'function') return;
    try { onEvent(structuredClone(event)); } catch { /* diagnostics cannot change a browser task */ }
  };
  // Old tokens have only a step-wide lock. Never reinterpret a legacy write as
  // a fresh per-object opportunity when its original ownership is unavailable.
  const numericEdits = new Set(continuation?.numericEdits ?? []);
  if(continuation&&!continuation.numericLedger)for(const entry of continuation.history)
    if(entry.action?.source==='numeric_value_binding')numericEdits.add(Number.isSafeInteger(entry.stepIndex)?entry.stepIndex:continuation.stepIndex);
  const history = () => [...priorHistory, ...result.actions.map(a => ({ stepIndex:a.stepIndex, action:a.action, outcome:a.outcome }))].slice(-30);
  const finish = reason => {
    // A post-action readback can differ from the last candidate frontier. Keep
    // the readback, but never describe stale routes as currently available.
    if (reason !== 'reported_complete' &&
        (result.latestObservation !== frontierObservation || result.observationFresh !== true))
      progress.observe(result.latestObservation, null, step);
    const handoff = buildHandoff({reason, steps, stepIndex:step, result, progress:progress.snapshot()});
    emit({ type:'finish', reason, stepIndex:step, observationFresh:result.observationFresh,
      actionCount:result.actions.length, decisionCount:result.decisions.length, handoff });
    return { ...result,
      handoff,
      observationFresh:reason === 'superseded_observation' ? false : result.observationFresh,
      returnReason:reason, elapsedMs:performance.now()-started,
      continuation: reason === 'reported_complete' ? null : {
      schema:1, sessionId:browser.sessionId, intentOrSteps:steps, scope, stepIndex:step,
      suppliedValues:values, numericEdits:[...numericEdits], numericLedger:numericLedger.snapshot(), history:history(), progressAssessment:result.progressAssessment,
      ...(crossViewIdentity.snapshot()?{crossViewIdentity:crossViewIdentity.snapshot()}:{}),
      ...(result.executionState?{executionState:result.executionState}:{}),
      } };
  };
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
      const observedTableValue=requestedTableValue(observation,steps[step]);
      if (observedTableValue && !conflictingTableValue) {
        if (priorTableValue && priorTableValue.value!==observedTableValue.value) {
          priorTableValue=null;conflictingTableValue=true;
        } else priorTableValue={...observedTableValue,source:'observed_table_prior'};
      }
      const binding = `${browser.sessionId}:${revision}:${randomUUID()}`;
      const candidates = {}, authorizedActions = [];
      const discovered=discoverActions(observation, values, steps[step],conflictingTableValue?null:priorTableValue);
      if(goalQuery?.stepIndex===step&&goalQuery.snapshot===observation.snapshot){
        const query=groundedQueryAction(steps[step],Object.fromEntries(discovered.map((a,i)=>[i,a])),goalQuery.span);
        if(query)discovered.splice(discovered.findIndex(action=>action.op==='request_input'&&action.ref===query.ref)+1,0,query);
      }else goalQuery=null;
      exactValues=exactValues.filter(item=>item.stepIndex===step&&item.binding.frame===valueBindingFrame(observation));
      for(const item of exactValues){
        const value=groundedValueAction({intent:steps[step],observation},Object.fromEntries(discovered.map((a,i)=>[i,a])),item.binding);
        if(value&&(value.source!=='numeric_value_binding'||!numericEdits.has(step)&&numericLedger.allowed(value,{stepIndex:step,observation,numericLedger:numericLedger.snapshot(),crossViewWitness:crossViewIdentity.forRequest({stepIndex:step,intent:steps[step],context})})))discovered.splice(discovered.findIndex(a=>a.op==='request_input'&&a.ref===value.ref)+1,0,value);
      }
      for (const action of discovered) {
        // Repeated scrolling with identical readbacks cannot reveal a control
        // absent from this accessibility tree. Keep other routes available.
        const recent=[];
        for(const entry of result.actions.slice().reverse()){
          if(entry.before.snapshot!==observation.snapshot||entry.after?.snapshot!==observation.snapshot)break;
          recent.push(entry);
        }
        if(action.op==='scroll'&&recent.filter(entry=>entry.action.op==='scroll'&&
          entry.action.ref===action.ref&&entry.action.direction===action.direction).length>=2)continue;
        freeze(action);
        // Async/truthy policy results must never silently authorize an action.
        if (authorize(action, observation) === true) authorizedActions.push(action);
      }
      // Page the grounded, authorized action space without ranking by task
      // wording or discarding controls from unfamiliar applications.
      // Bound serialized choices as well as their count: large accessible names
      // and destination hints otherwise overflow the model before a full page.
      const actionPages=[[]];let pageCharacters=0;
      for(const [index,action] of authorizedActions.entries()){
        const size=JSON.stringify(action).length+String(index).length+8;
        if(actionPages.at(-1).length&&(actionPages.at(-1).length>=200||pageCharacters+size>12000)){
          actionPages.push([]);pageCharacters=0;
        }
        actionPages.at(-1).push(action);pageCharacters+=size;
      }
      const pages=actionPages.length;
      candidatePage = Math.min(candidatePage, pages - 1);
      const offset = actionPages.slice(0,candidatePage).reduce((sum,page)=>sum+page.length,0);
      actionPages[candidatePage].forEach((action, index) => {
        candidates[`c${offset + index}`] = action;
      });
      const pagePreview = page => {
        const choices = actionPages[page];
        const labels = [...new Set(choices.map(action => action.name || action.purpose || action.op))];
        // Keep both ends, since sidebars often follow long content lists. These
        // are names of already authorized controls, not recommended actions.
        return {controlNames:(labels.length > 40 ? [...labels.slice(0,20),...labels.slice(-20)] : labels).map(name=>name.length>160?name.slice(0,159)+'…':name),
          namesOmitted:Math.max(0,labels.length - 40)};
      };
      if (candidatePage > 0) candidates.previous_controls = {op:'candidate_page',page:candidatePage - 1,...pagePreview(candidatePage - 1)};
      if (candidatePage + 1 < pages) candidates.next_controls = {op:'candidate_page',page:candidatePage + 1,...pagePreview(candidatePage + 1)};
      // Browser-history recovery must remain reachable on dense pages, where
      // the normal Back primitive can otherwise sit behind hundreds of links.
      // It was authorized above and is checked again before dispatch.
      const back=authorizedActions.find(action=>action.op==='back');
      if(back&&!Object.values(candidates).some(action=>action.op==='back'))candidates.navigation_back=back;
      const candidateWindow = {page:candidatePage + 1,pages,offset,
        shown:actionPages[candidatePage].length,total:authorizedActions.length};
      const progressFacts = progress.observe(observation, authorizedActions, step);
      frontierObservation = observation;
      const unchangedWaitStreak = result.actions.slice().reverse().findIndex(a=>a.action.op !== 'wait' || a.before.snapshot !== a.after?.snapshot);
      const waitsOnStablePage = unchangedWaitStreak < 0 ? result.actions.length : unchangedWaitStreak;
      const view=observation.observationWindow;
      if(typeof browser.inspect==='function'&&typeof view?.captureId==='string'){
        Object.assign(candidates,captureChoices(view));
        for(const direction of ['previous','next']){
          const window=view[direction];
          if(window&&Number.isSafeInteger(window.page)&&window.page>=0&&window.page<view.pages)
            candidates[`inspect_${direction}`]={op:'inspect_context',captureId:view.captureId,page:window.page,
              description:window.description,alreadyInspected:view.inspectedPages?.includes(window.page)===true};
        }
      }
      if (waitsOnStablePage < 5) candidates.wait = { op: 'wait', ms: 300 };
      candidates.step_complete = { op: 'step_complete' };
      candidates.handoff = { op: 'handoff' };
      freeze(candidates);
      const navigationEvidence=navigation.observe(observation);
      emit({ type:'frontier', stepIndex:step, observation,
        candidates, candidateWindow, progress:progressFacts, navigation:navigationEvidence, actionCount:result.actions.length });
      const request = freeze({ binding, sessionId: browser.sessionId, intent: steps[step],
        stepIndex: step, scope, context, observation, candidates, candidateWindow, progress:progressFacts, suppliedValues: values,
        navigation:navigationEvidence,
        previousObservation: result.actions.at(-1)?.before.snapshot,
        history: history().filter(entry => entry.stepIndex === step),
        numericEditBound:numericEdits.has(step),
        numericLedger:numericLedger.snapshot(),
        crossViewWitness:crossViewIdentity.forRequest({stepIndex:step,intent:steps[step],context}),
        // Current-invocation readbacks support semantic review without growing
        // persisted continuation history or exposing stale refs as candidates.
        executedTransitions: result.actions.filter(entry=>entry.stepIndex===step).slice(-4)
          .map(({action,outcome,before,after})=>({action,outcome,before,after})) });
      const decisionStarted = performance.now();
      let decision;
      try {
        decision = await timed('decisionMs', () => decide(request, abort.signal));
      } catch (error) {
        // A rejected/expired request may still have reached the provider. Keep
        // the attempt and its unknown charge instead of reporting only earlier
        // successful calls. Never expose provider messages, response bodies or
        // credentials, and never retry a gesture as recovery for this failure.
        const failure={kind:'decision_failed',
          ...(Number.isInteger(error?.statusCode)&&error.statusCode>=100&&error.statusCode<=599
            ?{httpStatus:error.statusCode}:{}),
          ...(error?.name==='TimeoutError'||error?.name==='AbortError'||abort.signal.aborted
            ?{timedOut:true}:{})};
        const cost=Number.isFinite(error?.decisionCost)&&error.decisionCost>=0?error.decisionCost:null;
        const elapsedMs=performance.now()-decisionStarted;
        result.failure=failure;
        result.decisions.push({stepIndex:step,choice:null,op:'decision_failed',cost,elapsedMs});
        emit({type:'decision_error',stepIndex:step,failure,cost,elapsedMs});
        return finish(abort.signal.aborted?'deadline':'helper_error');
      }
      const elapsedMs = performance.now() - decisionStarted;
      if (abort.signal.aborted) return finish('deadline');
      if (decision?.binding !== binding || session.revision !== revision) return finish('superseded_observation');
      if(decision.executionContract)result.executionContract=decision.executionContract;
      if(decision.executionState)result.executionState=decision.executionState;
      if (decision.assessment === true) {
        for(const binding of (decision.valueBindings??[decision.valueBinding]).filter(Boolean).slice(0,6)){
          if(groundedValueAction(request,candidates,binding)){
            exactValues=exactValues.filter(item=>item.binding.ref!==binding.ref);
            exactValues.push({stepIndex:step,binding:{...binding}});
          }
        }
        if(decision.querySpan){
          const query=groundedQueryAction(steps[step],candidates,decision.querySpan);
          if(query)goalQuery={stepIndex:step,snapshot:observation.snapshot,span:{...decision.querySpan}};
        }
        for(const interpretation of decision.interpretations??[])
          if(interpretation.kind==='action_check'&&!['ready','navigation','preparation'].includes(interpretation.verdict)){
            result.pendingActionChecks.push({operation:interpretation.proposedAction?.op,
              target:String(interpretation.proposedAction?.name??interpretation.proposedAction?.role??'').slice(0,160),
              assessment:interpretation.verdict,executed:false,modelAssessed:true,independentlyVerified:false,
              ...(interpretation.conflict?.requirement?.sourceSpan?.text?{callerRequirement:interpretation.conflict.requirement.sourceSpan.text.slice(0,300)}:{})});
            result.pendingActionChecks=result.pendingActionChecks.slice(-3);
          }
        result.decisions.push({stepIndex:step,choice:null,op:'goal_assessment',cost:decision.cost,elapsedMs});
        emit({type:'goal_assessment',stepIndex:step,interpretations:decision.interpretations,cost:decision.cost,elapsedMs});
        pending={revision,observation};
        continue;
      }
      if (typeof decision.choice !== 'string' || !Object.hasOwn(candidates, decision.choice)) return finish('invalid_choice');
      const action = candidates[decision.choice];
      result.decisions.push({ stepIndex: step, choice: decision.choice, op: action.op,
        confidence: decision.confidence, cost: decision.cost, modelCalled:decision.modelCalled!==false, elapsedMs });
      emit({ type:'decision', stepIndex:step, choice:decision.choice, action,
        ...(decision.goalFacts?{goalFacts:decision.goalFacts}:{}),
        confidence:decision.confidence, cost:decision.cost, elapsedMs });
      if (action.op === 'request_input') {
        result.inputRequired = { name:action.name, role:action.role,
          key:action.name || 'value', instruction:'Supply the exact non-secret field value, then resume. The target will be observed again.' };
        return finish('input_required');
      }
      if (action.op === 'handoff') return finish('handoff');
      if (action.op === 'candidate_page') {
        candidatePage = action.page;
        pending = {revision, observation};
        continue;
      }
      if(action.op==='inspect_context'){
        const inspected=freeze(structuredClone(await timed('observationMs',()=>browser.inspect(action,abort.signal))));
        if(session.revision!==revision)return finish('superseded_observation');
        if(inspected.observationWindow?.captureId!==action.captureId||inspected.observationWindow?.page!==action.page)
          return finish('invalid_observation');
        emit({type:'inspection',stepIndex:step,observation:inspected});
        result.latestObservation=inspected;result.observationFresh=true;
        candidatePage=0;pending={revision,observation:inspected};
        continue;
      }
      if (action.op === 'step_complete') {
        result.progressAssessment.push({ stepIndex: step, intent: steps[step], judgment: 'model_reported_complete' });
        step++;
        candidatePage = 0;
        priorTableValue=null;
        conflictingTableValue=false;
        if (step === steps.length) return finish('reported_complete');
        pending = { revision, observation };
        continue;
      }
      if (result.actions.length >= limits.maxActions) return finish('action_budget');
      if (action.op !== 'wait' && authorize(action, observation) !== true) return finish('permission_denied');
      if (session.revision !== revision || abort.signal.aborted) return finish('superseded_observation');
      if(action.source==='numeric_value_binding'&&numericEdits.has(step))return finish('stale_observation');
      const numericEdit=action.source==='numeric_value_binding'?numericLedger.dispatch(action,request):null;
      if(action.source==='numeric_value_binding'&&!numericEdit)return finish('stale_observation');
      const entry = { stepIndex: step, action, before: observation, outcome: 'unknown' };
      result.pendingActionChecks=[];
      candidatePage = 0;
      result.actions.push(entry);
      result.observationFresh = false;
      try {
        await timed('actionMs', () => browser.execute(action, abort.signal));
        entry.outcome = 'tool_succeeded';
      } catch (error) {
        if(error?.code==='JEV_NOT_DISPATCHED'){
          entry.outcome='not_dispatched';
          if(numericEdit)numericLedger.settle(numericEdit,'not_dispatched');
          try { entry.after=await observe(); } catch { result.observationFresh=false; }
          emit({type:'action',stepIndex:step,action,before:observation,after:entry.after??null,outcome:entry.outcome});
          return finish('stale_observation');
        }
        // A timed-out gesture may have happened. Read back once for the caller,
        // but never replay the gesture or allow another gesture in this run.
        if(numericEdit)numericLedger.settle(numericEdit,'unknown');
        try { entry.after = await observe(); } catch { result.observationFresh = false; }
        crossViewIdentity.record(entry,{stepIndex:step,intent:steps[step],context,verdict:decision.goalFacts?.actionCheck?.verdict});
        emit({ type:'action', stepIndex:step, action, before:observation,
          after:entry.after ?? null, outcome:entry.outcome });
        progress.record(entry);
        return finish('action_outcome_unknown');
      }
      const afterRevision = ++session.revision;
      entry.after = await observe();
      // Some menu libraries delay opening a submenu after hover. Give this
      // specifically grounded parent hover one bounded settle before deciding.
      if (action.op === 'hover' && action.purpose === 'reveal_submenu') {
        result.observationFresh = false;
        await timed('settleMs', () => new Promise(resolve => setTimeout(resolve, 450)));
        entry.after = await observe();
      }
      // Text entry can trigger a debounced suggestion list or validation on any
      // site. Settle it independently of task wording before deciding again.
      if (action.op === 'fill' && ['textbox','searchbox','combobox'].includes(action.role)) {
        result.observationFresh = false;
        await timed('settleMs', () => new Promise(resolve => setTimeout(resolve, 450)));
        entry.after = await observe();
      }
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
      // Exact-copy bindings promise an unchanged literal. A control can reject
      // typing or transform its bytes despite a successful browser command.
      // Return the fresh state before a later commit can save a different value.
      const acceptedValue=entry.after.refs?.[action.ref?.slice(1)]?.exactValue;
      if(numericEdit)numericLedger.settle(numericEdit,entry.outcome,acceptedValue);
      if(['exact_value_binding','numeric_value_binding','date_value_binding'].includes(action.source)&&typeof acceptedValue==='string'&&acceptedValue!==action.value){
        entry.outcome='input_not_accepted';
        emit({type:'action',stepIndex:step,action,before:observation,after:entry.after,outcome:entry.outcome});
        progress.record(entry);
        return finish('input_not_accepted');
      }
      emit({ type:'action', stepIndex:step, action, before:observation,
        after:entry.after, outcome:entry.outcome });
      progress.record(entry);
      navigation.record(entry);
      crossViewIdentity.record(entry,{stepIndex:step,intent:steps[step],context,verdict:decision.goalFacts?.actionCheck?.verdict});
      if (session.revision !== afterRevision) return finish('superseded_observation');
      if (action.op === 'set_date' && entry.after.snapshot === entry.before.snapshot) return finish('no_progress');
      const recent = result.actions.slice(-3);
      if (recent.length === 3 && ['click','hover','upload','fill','select','check','uncheck','press'].includes(action.op) && recent.every(a =>
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
