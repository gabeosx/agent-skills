import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {act} from '../scripts/jev-browser.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';
import {actionCheckRequest,acceptActionCheck,reconcileActionCheck} from '../scripts/action-check.mjs';

function fixture({repeat=false,recover=false,check='prerequisite_missing',cost=0.001,explicitContext=false}={}){
  let page='list',saved=false;const actions=[],checks=[],selections=[];
  const observation=()=>({snapshot:page==='list'?'- heading "Invoices"\n- link "Invoice 42 details" [ref=e1]\n- button "Enable alerts" [ref=e2]':
    `- heading "Invoice 42 details"\n- button "Enable alerts" [ref=e2]${saved?'\nAlerts enabled':''}`,
    refs:page==='list'?{e1:{role:'link',name:'Invoice 42 details'},e2:{role:'button',name:'Enable alerts'}}:{e2:{role:'button',name:'Enable alerts'}}});
  const browser={sessionId:randomUUID(),observe:async()=>observation(),execute:async a=>{
    actions.push({action:a,page});if(a.ref==='@e1')page='detail';else if(a.ref==='@e2')saved=true;
  }};
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
    let answers;
    if(r.questions.nextRoute)answers={nextRoute:{type:'choice',choice:recover?Object.keys(r.questions.nextRoute.criteria).find(k=>r.questions.nextRoute.criteria[k].includes('\"ref\":\"@e1\"')):'none'}};
    else if(r.questions.source)answers={source:{type:'choice',choice:explicitContext?(r.questions.phase?'detail':'page_condition'):'unconstrained'},phase:{type:'choice',choice:explicitContext?'at_effect':'none'}};
    else if(r.questions.pageKind)answers={pageKind:{type:'choice',choice:page==='list'?'collection':'detail'},
      context:{type:'choice',choice:page==='list'?'mismatch':'matches'},progress:{type:'choice',choice:saved?'effect_observed':'pending'}};
    else if(r.questions.conditionApplicability)answers={conditionApplicability:{type:'choice',choice:'applies'}};
    else if(r.questions.actionCheck){
      checks.push(r.state);assert.equal(Object.hasOwn(r.state,'goalFacts'),false);
      answers={actionCheck:{type:'choice',choice:r.state.proposedAction.ref==='@e1'?'navigation':page==='list'?check:'ready'},
        suggestedNext:{type:'choice',choice:page==='list'?Object.keys(r.questions.suggestedNext.criteria).find(k=>r.questions.suggestedNext.criteria[k].includes('"ref":"@e1"')):'none'}};
    }else if(r.questions.completion)answers={destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:saved?'complete':'uncertain'}};
    else{
      selections.push(r.state);const ref=page==='list'&&r.state.actionFeedback&&!repeat?'@e1':'@e2';
      answers={action:{type:'choice',choice:saved?'step_complete':Object.keys(r.questions.action.criteria).find(k=>r.questions.action.criteria[k].includes(`"ref":"${ref}"`))??'handoff'}};
    }
    return {answers,usage:{cost}};
  }}}};
  return {browser,decide:jevDecider(api),actions,checks,selections};
}
const run=f=>act({...f,intentOrSteps:'Enable alerts while viewing Invoice 42 details.',scope:'Test',authorize:()=>true});

test('a withheld effect resolves its prerequisite before any mutation, with every call charged',async()=>{
  const f=fixture();const result=await run(f);
  assert.equal(result.returnReason,'reported_complete');
  assert.deepEqual(f.actions.map(a=>[a.action.ref,a.page]),[['@e1','list'],['@e2','detail']]);
  assert.equal(f.checks.length,3);
  assert.equal(f.selections[1].actionFeedback[0].verdict,'prerequisite_missing');
  assert.equal(f.checks.at(-1).executionEvidence[0].after.includes('Invoice 42 details'),true);
  assert.equal(result.decisions.reduce((n,d)=>n+d.cost,0),result.decisions.length*0.001);
});
test('repeating an unresolved proposal returns control after bounded continuation without executing it',async()=>{
  const f=fixture({repeat:true});const result=await run(f);
  assert.equal(result.returnReason,'handoff');assert.equal(f.actions.length,0);assert.equal(f.checks.length,1);
  assert.equal(result.handoff.withheldActions[0].assessment,'prerequisite_missing');
  assert.equal(result.handoff.withheldActions[0].executed,false);
  assert.equal(result.handoff.withheldActions[0].independentlyVerified,false);
});
test('unknown interpretations can lead to useful inspection without erasing candidates',async()=>{
  const f=fixture({check:'unknown'});const result=await run(f);
  assert.equal(result.returnReason,'reported_complete');assert.equal(f.actions[0].action.ref,'@e1');
});
test('live decision wiring resolves a conflicting ready-effect answer before browser dispatch',async()=>{
  const f=fixture({check:'ready',explicitContext:true});const result=await run(f);
  assert.equal(result.returnReason,'reported_complete');
  assert.deepEqual(f.actions.map(a=>[a.action.ref,a.page]),[['@e1','list'],['@e2','detail']]);
  assert.equal(f.selections[1].actionFeedback[0].conflict.kind,'effect_before_required_context');
});
test('an invalid action-check response keeps its charge and cannot dispatch the proposal',async()=>{
  const f=fixture({check:'invented'});const result=await run(f);
  assert.equal(result.returnReason,'helper_error');assert.equal(result.decisions.at(-1).cost,0.001);assert.equal(f.actions.length,0);
});
test('proposal and review are separate budgeted decisions',async()=>{
  const f=fixture();const result=await act({...f,intentOrSteps:'Enable alerts',scope:'Test',authorize:()=>true,budget:{maxDecisions:2}});
  assert.equal(result.returnReason,'decision_budget');assert.equal(f.actions.length,0);assert.equal(f.checks.length,0);
});
test('a pending action review expires when observations or authorized candidates change',async()=>{
  const requests=[];const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
    requests.push(r);return {answers:r.questions.source?{source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}}:
      {action:{type:'choice',choice:'c0'}},usage:{cost:0}};
  }}}};
  const decide=jevDecider(api),req={binding:'a',sessionId:'test',stepIndex:0,intent:'Open the item',scope:'Test',
    observation:{snapshot:'- link "Item" [ref=e1]',refs:{e1:{role:'link',name:'Item'}}},candidates:{c0:{op:'click',ref:'@e1',role:'link',name:'Item'},handoff:{op:'handoff'}},history:[]};
  await decide(req);await decide(req);
  const changed={...req,binding:'b',observation:{...req.observation,snapshot:'- link "Other item" [ref=e1]'}};
  const answer=await decide(changed);
  assert.equal(requests.at(-1).questions.actionCheck,undefined);assert.equal(answer.assessment,true);
});
test('action check cannot synthesize a new browser action or certify semantic evidence',()=>{
  const req={intent:'Save',observation:{snapshot:'- button "Save" [ref=e1]'},candidates:{c0:{op:'click',ref:'@e1'}}};
  assert.equal(actionCheckRequest(req,req.candidates.c0).state.proposedAction,req.candidates.c0);
  const response={answers:{actionCheck:{type:'choice',choice:'wrong_target'},suggestedNext:{type:'choice',choice:'c999'}}};
  assert.throws(()=>acceptActionCheck(response,req,req.candidates.c0));
  response.answers.suggestedNext.choice='c0';
  assert.equal(acceptActionCheck(response,req,req.candidates.c0).independentlyVerified,false);
});

test('auxiliary literal assignment stays advisory while the immediate-action judgment can withhold a fill',()=>{
  const action={op:'fill',ref:'@e1',name:'Review',value:'Comment text'},req={candidates:{c0:action},suppliedValues:{note:'Comment text'}};
  const answers={actionCheck:{type:'choice',choice:'preparation'},suggestedNext:{type:'choice',choice:'none'},literalAssignment:{type:'choice',choice:'different'}};
  assert.equal(acceptActionCheck({answers},req,action).verdict,'preparation');
  answers.actionCheck.choice='unsupported_value';assert.equal(acceptActionCheck({answers},req,action).verdict,'unsupported_value');
  answers.actionCheck.choice='preparation';answers.literalAssignment.choice='matches';assert.equal(acceptActionCheck({answers},req,action).verdict,'preparation');
  delete answers.literalAssignment;assert.throws(()=>acceptActionCheck({answers},req,action));
});

test('action review receives conditional code arithmetic, not earlier semantic verdicts',()=>{
  const req={intent:'Choose item four',observation:{snapshot:'Second page'},candidates:{c0:{op:'click',ref:'@e4'}}};
  const facts={numeric:[],collections:[{targetPosition:4,offsetKnown:true,items:[{ref:'@e4',position:4}],targetLocation:'visible'},
    {targetPosition:null,offsetKnown:false}],sourceContext:{currentContext:'matches'},completionReview:'complete'};
  const state=actionCheckRequest(req,req.candidates.c0,facts).state;
  assert.equal(state.computedComparisons.collections.length,1);
  assert.equal(state.computedComparisons.collections[0].items[0].position,4);
  assert.equal(state.sourceContext,undefined);assert.equal(state.completionReview,undefined);
  assert.equal(actionCheckRequest(req,req.candidates.c0,{collections:[{targetPosition:4,offsetKnown:false}]}).state.computedComparisons,undefined);
});

test('identical literals supplied under multiple caller keys cannot acquire an exclusive role veto',()=>{
  const action={op:'fill',ref:'@e1',valueId:'question',value:'Is this available?'};
  const req={intent:'Submit the question, then comment with the same text.',suppliedValues:{question:action.value,comment:action.value},
    observation:{snapshot:'Question form'},candidates:{c0:action}};
  const answers={actionCheck:{type:'choice',choice:'preparation'},suggestedNext:{type:'choice',choice:'none'},
    literalAssignment:{type:'choice',choice:'matches'}};
  const result=acceptActionCheck({answers},req,action);
  assert.equal(result.verdict,'preparation');assert.equal(result.valueBinding.assignment,'matches');
  assert.deepEqual(actionCheckRequest(req,action).state.literalUse.suppliedKeys,['question','comment']);
  assert.equal(acceptActionCheck({answers:{...answers,actionCheck:{type:'choice',choice:'wrong_target'}}},req,action).verdict,'wrong_target');
  answers.literalAssignment.choice='different';
  assert.equal(acceptActionCheck({answers},req,action).verdict,'preparation');
  answers.literalAssignment.choice='unknown';assert.equal(acceptActionCheck({answers},req,action).verdict,'preparation');
});

test('a proposed effect cannot erase a fresh contrary at-effect requirement, while navigation and final screens remain distinct',()=>{
  const source={hasRequirement:true,facts:{currentEvidenceFresh:true,sourcePageMismatch:true,timing:'at_effect',
    currentContext:'mismatch',currentPageKind:'collection',requirement:{sourceSpan:{text:'from the item details'},uncertain:false}}};
  const check={verdict:'ready',modelAssessed:true,independentlyVerified:false};
  assert.equal(reconcileActionCheck(check,source).verdict,'prerequisite_missing');
  for(const verdict of ['navigation','preparation','unknown'])assert.equal(reconcileActionCheck({...check,verdict},source).verdict,verdict);
  assert.equal(reconcileActionCheck(check,{...source,facts:{...source.facts,currentContext:'unknown',sourcePageMismatch:false}}).verdict,'prerequisite_missing');
  for(const facts of [{currentEvidenceFresh:false},{timing:'final_state'},{requirement:{uncertain:true}},{currentContext:'matches',sourcePageMismatch:false},{effectAssessed:true},{timing:'before_effect',priorVisitObserved:true}])
    assert.equal(reconcileActionCheck(check,{...source,facts:{...source.facts,...facts}}).verdict,'ready');
});


test('unestablished image meaning cannot inherit a ready or navigation judgment from the goal',()=>{
  const action={op:'click',role:'image',ref:'@e3',name:'',observedIcon:{class:'k3',sourceFile:'symbol.svg'}};
  const request={intent:'Remove the chosen item',observation:{snapshot:'- image [ref=e3] clickable'},candidates:{c0:action}};
  assert.ok(actionCheckRequest(request,action).questions.controlMeaning);
  const answers={actionCheck:{type:'choice',choice:'ready'},suggestedNext:{type:'choice',choice:'none'},controlMeaning:{type:'choice',choice:'unestablished'}};
  for(const verdict of ['ready','navigation','preparation']){
    answers.actionCheck.choice=verdict;
    const check=acceptActionCheck({answers},request,action);
    assert.equal(check.verdict,'unknown');assert.equal(check.independentlyVerified,false);
  }
  answers.actionCheck.choice='ready';answers.controlMeaning.choice='established';
  assert.equal(acceptActionCheck({answers},request,action).verdict,'ready');
  delete answers.controlMeaning;assert.throws(()=>acceptActionCheck({answers},request,action));
});


test('derived query provenance is not reinterpreted as an assignment among final-content literals',()=>{
  const action={op:'fill',ref:'@e1',role:'searchbox',value:'Juniper Cove',source:'caller_goal_query',callerSpan:{start:5,end:17}};
  const request={intent:'Find Juniper Cove',suppliedValues:{question:'Is this available?',comment:'Is this available?'},observation:{snapshot:'Search directory'},candidates:{c0:action}};
  assert.equal(actionCheckRequest(request,action).questions.literalAssignment,undefined);
  const answers={actionCheck:{type:'choice',choice:'preparation'},suggestedNext:{type:'choice',choice:'none'}};
  assert.equal(acceptActionCheck({answers},request,action).verdict,'preparation');
  answers.actionCheck.choice='wrong_target';assert.equal(acceptActionCheck({answers},request,action).verdict,'wrong_target');
});

test('a repeated withheld proposal can take a distinct reviewed discovery route within the same budget',async()=>{
 const f=fixture({repeat:true,recover:true});const result=await run(f);
 assert.equal(result.returnReason,'reported_complete');
 assert.deepEqual(f.actions.map(a=>[a.action.ref,a.page]),[['@e1','list'],['@e2','detail']]);
 assert.equal(f.checks.length,3);
});
test('qualified target review applies to the proposed object and does not turn missing evidence into a navigation veto',()=>{
 const req={intent:'Star the top Astronomy entry ever.',observation:{snapshot:'Mixed collection',refs:{}},candidates:{c0:{op:'click',ref:'@e1',role:'button',name:'Star'}}};
 const facts={sourceContext:{requirement:{kind:'qualified_target',phase:'at_effect',sourceSpan:{text:req.intent}}}};
 const response=(verdict,target)=>({answers:{actionCheck:{type:'choice',choice:verdict},targetQualification:{type:'choice',choice:target},suggestedNext:{type:'choice',choice:'none'}}});
 assert.ok(actionCheckRequest(req,req.candidates.c0,facts).questions.targetQualification);
 for(const verdict of ['navigation','preparation'])assert.equal(acceptActionCheck(response(verdict,'unestablished'),req,req.candidates.c0,facts).verdict,verdict);
 assert.equal(acceptActionCheck(response('ready','unestablished'),req,req.candidates.c0,facts).verdict,'prerequisite_missing');
 const ready=acceptActionCheck(response('ready','matches'),req,req.candidates.c0,facts);
 assert.equal(reconcileActionCheck(ready,{hasRequirement:true,facts:{...facts.sourceContext,currentEvidenceFresh:true,currentContext:'mismatch',timing:'at_effect'}}).verdict,'ready');
 assert.throws(()=>acceptActionCheck(response('ready','invented'),req,req.candidates.c0,facts),/Invalid target qualification/);
});
