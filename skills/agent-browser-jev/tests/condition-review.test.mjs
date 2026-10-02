import test from 'node:test';
import assert from 'node:assert/strict';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';
import {needsConditionReview,conditionReviewRequest,acceptConditionReview} from '../scripts/condition-review.mjs';

const check={immediateAssessment:'ready',verdict:'wrong_target',targetQualification:'mismatch',
  proposedAction:{op:'click',role:'button',name:'Submit',ref:'@e2'}};
test('condition review cannot reopen primary action rejection or opaque icon uncertainty',()=>{
 for(const other of [{...check,immediateAssessment:'wrong_target'},{...check,controlMeaning:'unestablished'},{...check,targetQualification:'matches'}]){
  assert.equal(needsConditionReview(other),false);
  assert.throws(()=>acceptConditionReview({answers:{conditionApplicability:{type:'choice',choice:'established'}}},other));
 }
 const response=choice=>({answers:{conditionApplicability:{type:'choice',choice}}});
 for(const choice of ['applies','unknown'])assert.equal(acceptConditionReview(response(choice),check).verdict,'wrong_target');
 assert.throws(()=>acceptConditionReview(response('invented'),check));
});
test('condition review retains exact raw intent, target history and fallible provenance',()=>{
 const request={intent:'Pick the largest card and submit.',scope:'Test',observation:{snapshot:'Selected 6',refs:{}},
  executedTransitions:[{action:{op:'click',name:'6',ref:'@e1'},before:{snapshot:'Cards 1, 0, 6'},after:{snapshot:'Selected 6'},outcome:'tool_succeeded'}]};
 const payload=conditionReviewRequest(request,check,{sourceContext:{requirement:{kind:'qualified_target'}}});
 assert.equal(payload.state.callerIntent,request.intent);assert.equal(payload.state.executionEvidence[0].action.name,'6');
 assert.equal(Object.hasOwn(payload.state,'priorVerdict'),false);
 const resolved=acceptConditionReview({answers:{conditionApplicability:{type:'choice',choice:'established'}}},check);
 assert.equal(resolved.verdict,'wrong_target');assert.equal(resolved.conditionReview.priorVerdict,'wrong_target');
 assert.equal(resolved.conditionReview.overrideWithheld,'contemporaneous_target_mismatch');
 assert.equal(resolved.conditionReview.independentlyVerified,false);
});
function decider(choice='navigation'){
 const requests=[];const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
  requests.push(r);let answers;
  if(r.questions.source)answers={source:{type:'choice',choice:r.questions.phase?'detail':'page_condition'},phase:{type:'choice',choice:'at_effect'}};
  else if(r.questions.pageKind)answers={pageKind:{type:'choice',choice:'collection'},context:{type:'choice',choice:'mismatch'},progress:{type:'choice',choice:'pending'}};
  else if(r.questions.conditionApplicability)answers={conditionApplicability:{type:'choice',choice}};
  else if(r.questions.actionCheck)answers={actionCheck:{type:'choice',choice:'ready'},suggestedNext:{type:'choice',choice:'none'}};
  else answers={action:{type:'choice',choice:Object.hasOwn(r.questions.action.criteria,'c0')?'c0':'handoff'}};
  return {answers,usage:{cost:.001}};
 }}}};return {decide:jevDecider(api),requests};
}
const request={binding:'current',sessionId:'test',stepIndex:0,intent:'Open the record.',scope:'Test',suppliedValues:{},
 observation:{snapshot:'- button "Open record" [ref=e1]',refs:{e1:{role:'button',name:'Open record'}}},
 candidates:{c0:{op:'click',role:'button',name:'Open record',ref:'@e1'}},history:[]};
async function stage(decide){
 for(let i=0;i<10;i++){const result=await decide(request);if(result.interpretations?.[0]?.kind==='condition_conflict')return result;}
 throw Error('Conflict not staged');
}
test('a semantic conflict gets one separately charged decision before the proposed action',async()=>{
 const {decide,requests}=decider();await stage(decide);const result=await decide(request);
 assert.equal(result.choice,'c0');assert.equal(result.cost,.001);assert.equal(result.goalFacts.actionCheck.verdict,'navigation');
 assert.equal(requests.filter(r=>r.questions.conditionApplicability).length,1);
});
test('pending condition review expires on changed observations or permissions',async()=>{
 for(const next of [
  {...request,observation:{snapshot:'Changed page',refs:{}}},
  {...request,candidates:{handoff:{op:'handoff'}}},
 ]){
  const {decide,requests}=decider();await stage(decide);const result=await decide(next);
  assert.notEqual(result.choice,'c0');assert.equal(requests.filter(r=>r.questions.conditionApplicability).length,0);
 }
});
test('malformed condition review retains the provider charge without authorizing action',async()=>{
 const {decide}=decider('invented');await stage(decide);
 await assert.rejects(decide(request),error=>error.decisionCost===.001&&/Invalid condition/.test(error.message));
});
