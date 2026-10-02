import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {act} from '../scripts/jev-browser.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';
function fixture(review, recover=false){
 let filled=false,saved=false,calls=0;const actions=[];
 const browser={sessionId:randomUUID(),observe:async()=>saved?{snapshot:'Saved',refs:{}}:
  {snapshot:`- textbox "Note" [ref=e1]: ${filled?'Ready':''}\n- button "Submit" [ref=e2]`,refs:{e1:{role:'textbox',name:'Note'},e2:{role:'button',name:'Submit'}}},
  execute:async action=>{actions.push(action);if(action.op==='fill')filled=true;else if(action.ref==='@e2')saved=true;}};
 const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
  calls++;let id,choice;
  if(r.questions.nextRoute)return {answers:{nextRoute:{type:'choice',choice:recover?Object.entries(r.questions.nextRoute.criteria).find(([,v])=>v.includes('\"name\":\"Submit\"')&&v.includes('\"op\":\"click\"'))[0]:'none'}},usage:{cost:0.001}};
  if(r.questions.actionCheck)return {answers:{actionCheck:{type:'choice',choice:'ready'},suggestedNext:{type:'choice',choice:'none'},literalAssignment:{type:'choice',choice:'matches'}},usage:{cost:0.001}};
  if(r.questions.source)return {answers:{source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'},evidence:{type:'choice',choice:'unknown'}},usage:{cost:0.001}};
  else if(r.questions.completion){id='completion';choice=saved?'complete':review;}
  else{id='action';const entries=Object.entries(r.questions.action.criteria);
   choice=!filled?entries.find(([,v])=>v.includes('"op":"fill"'))[0]:
    !r.questions.action.criteria.step_complete?entries.find(([,v])=>v.includes('"name":"Submit"')&&v.includes('"op":"click"'))[0]:'step_complete';}
  return {answers:{...(id==='completion'?{destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'}}:{}),[id]:{type:'choice',choice}},usage:{cost:0.001}};
 }}}};
 return {browser,actions,get calls(){return calls},decide:jevDecider(api)};
}
test('a prepared form review consumes decisions and charges before allowing a scoped commit',async()=>{
 const f=fixture('prepared_only');const r=await act({...f,intentOrSteps:'Complete the note form',scope:'Test',suppliedValues:{note:'Ready'},authorize:()=>true});
 assert.equal(r.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.op),['fill','click']);
 assert.equal(f.calls,9);assert.equal(r.decisions.length,9);assert.ok(Math.abs(r.decisions.reduce((s,d)=>s+d.cost,0)-0.009)<1e-12);
});
test('explicit preparation can complete without pressing an available commit control',async()=>{
 const f=fixture('complete');const r=await act({...f,intentOrSteps:'Prepare the note without submitting',scope:'Test',suppliedValues:{note:'Ready'},authorize:()=>true});
 assert.equal(r.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.op),['fill']);assert.equal(f.calls,5);
});
test('uncertain form completion returns control and a review cannot bypass the decision budget',async()=>{
 const f=fixture('uncertain');const r=await act({...f,intentOrSteps:'Complete the note form',scope:'Test',suppliedValues:{note:'Ready'},authorize:()=>true});
 assert.equal(r.returnReason,'handoff');assert.deepEqual(f.actions.map(a=>a.op),['fill']);
 const limited=fixture('prepared_only');const stopped=await act({...limited,intentOrSteps:'Complete the note form',scope:'Test',suppliedValues:{note:'Ready'},authorize:()=>true,budget:{maxDecisions:4}});
 assert.equal(stopped.returnReason,'decision_budget');assert.equal(limited.calls,4);assert.deepEqual(limited.actions.map(a=>a.op),['fill']);
});
test('invalid completion review retains the provider charge',async()=>{
 const f=fixture('invalid');const r=await act({...f,intentOrSteps:'Complete the note form',scope:'Test',suppliedValues:{note:'Ready'},authorize:()=>true});
 assert.equal(r.returnReason,'helper_error');assert.equal(r.decisions.at(-1).cost,0.001);assert.deepEqual(f.actions.map(a=>a.op),['fill']);
});

test('a proposed handoff after executed work receives a charged completion check, without another gesture',async()=>{
 for(const verdict of ['complete','uncertain','prepared_only']){
  let applied=false,calls=0;const actions=[];
  const browser={sessionId:randomUUID(),observe:async()=>applied?{snapshot:'Saved the requested preference',refs:{}}:{snapshot:'- button "Apply" [ref=e1]',refs:{e1:{role:'button',name:'Apply'}}},execute:async a=>{actions.push(a);applied=true}};
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
   calls++;if(r.questions.nextRoute)return {answers:{nextRoute:{type:'choice',choice:'none'}},usage:{cost:0.001}};
   if(r.questions.actionCheck)return {answers:{actionCheck:{type:'choice',choice:'ready'},suggestedNext:{type:'choice',choice:'none'},literalAssignment:{type:'choice',choice:'matches'}},usage:{cost:0.001}};
   if(r.questions.completion){assert.equal(r.state.executionEvidence[0].before,'- button "Apply" [ref=e1]');assert.equal(r.state.executionEvidence[0].after,'Saved the requested preference');}
   const answers=r.questions.source?{source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'unknown'}}:
    r.questions.completion?{destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:verdict}}:{action:{type:'choice',choice:applied?'handoff':Object.keys(r.questions.action.criteria).find(k=>r.questions.action.criteria[k].includes('"name":"Apply"'))}};
   return {answers,usage:{cost:0.001}};
  }}}};
  const result=await act({browser,decide:jevDecider(api),intentOrSteps:'Apply the preference',scope:'Test',authorize:()=>true});
  assert.equal(result.returnReason,verdict==='complete'?'reported_complete':'handoff');assert.equal(actions.length,1);assert.equal(calls,verdict==='complete'?5:6);
  assert.equal(result.decisions.reduce((sum,d)=>sum+d.cost,0),verdict==='complete'?0.005:0.006);
 }
});

test('explicit page conditions receive completion review even without a visible form',async()=>{
 for(const verdict of ['complete','uncertain']){
  let applied=false;const actions=[];let reviewed=0;
  const browser={sessionId:randomUUID(),observe:async()=>applied?{snapshot:'Confirmation: preference saved',refs:{}}:{snapshot:'- button "Apply" [ref=e1]',refs:{e1:{role:'button',name:'Apply'}}},execute:async a=>{actions.push(a);applied=true}};
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
   let answers;
   if(r.questions.nextRoute)return {answers:{nextRoute:{type:'choice',choice:'none'}},usage:{cost:0.001}};
   if(r.questions.actionCheck)return {answers:{actionCheck:{type:'choice',choice:'ready'},suggestedNext:{type:'choice',choice:'none'},literalAssignment:{type:'choice',choice:'matches'}},usage:{cost:0.001}};
   if(r.questions.source)answers={source:{type:'choice',choice:r.questions.phase?'other':'page_condition'},phase:{type:'choice',choice:'final_state'}};
   else if(r.questions.pageKind)answers={pageKind:{type:'choice',choice:'other'},context:{type:'choice',choice:applied?'matches':'mismatch'},progress:{type:'choice',choice:applied?'effect_observed':'pending'}};
   else if(r.questions.completion){
    reviewed++;
    assert.equal(Object.hasOwn(r.state,'goalFacts'),false);
    assert.equal(Object.hasOwn(r.state,'proposedReturn'),false);
    assert.equal(r.state.observation,'Confirmation: preference saved');
    assert.equal(r.state.executionEvidence[0].after,'Confirmation: preference saved');
    answers={destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:verdict}};
   }
   else{
    assert.equal(r.state.intent,'Apply the preference and finish on its confirmation screen.');
    if(applied){assert.equal(r.state.executionEvidence[0].before,'- button "Apply" [ref=e1]');assert.equal(r.state.executionEvidence[0].after,'Confirmation: preference saved');}
    answers={action:{type:'choice',choice:applied?'step_complete':Object.keys(r.questions.action.criteria).find(k=>r.questions.action.criteria[k].includes('"name":"Apply"'))}};
   }
   return {answers,usage:{cost:0.001}};
  }}}};
  const result=await act({browser,decide:jevDecider(api),intentOrSteps:'Apply the preference and finish on its confirmation screen.',scope:'Test',authorize:()=>true});
  assert.equal(reviewed,1);assert.equal(actions.length,1);
  assert.equal(result.returnReason,verdict==='complete'?'reported_complete':'handoff');
 }
});

test('rejected completion can continue through one reviewed observed route instead of forcing caller takeover',async()=>{
 const f=fixture('uncertain',true);const result=await act({...f,intentOrSteps:'Complete the note form',scope:'Test',suppliedValues:{note:'Ready'},authorize:()=>true});
 assert.equal(result.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.op),['fill','click']);
 assert.equal(result.decisions.length,9);
});

test('status-only completion is reviewed for the requested identity, even without form history',async()=>{
 for(const identity of ['ALPHA','BETA']){
  let reviews=0,calls=0;
  const browser={sessionId:randomUUID(),observe:async()=>({snapshot:`Record ${identity}: archived`,refs:{}}),execute:async()=>assert.fail('No gesture needed')};
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
   calls++;let answers;
   if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
   else if(r.questions.completion){reviews++;assert.equal(r.state.intent,'Ensure record ALPHA is archived.');assert.equal(r.state.observation,`Record ${identity}: archived`);answers={destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:identity==='ALPHA'?'complete':'uncertain'}};}
   else if(r.questions.nextRoute)answers={nextRoute:{type:'choice',choice:'none'}};
   else answers={action:{type:'choice',choice:'step_complete'}};
   return {answers,usage:{cost:0.001}};
  }}}};
  const result=await act({browser,decide:jevDecider(api),intentOrSteps:'Ensure record ALPHA is archived.',scope:'Test',authorize:()=>true});
  assert.equal(reviews,1);assert.equal(result.returnReason,identity==='ALPHA'?'reported_complete':'handoff');
  assert.equal(result.decisions.length,calls);assert.ok(Math.abs(result.decisions.reduce((s,d)=>s+d.cost,0)-calls*0.001)<1e-12);
 }
});

test('an unresolved input request checks achieved outcomes but preserves genuinely missing input',async()=>{
 for(const complete of [true,false]){
  let reviews=0;const browser={sessionId:randomUUID(),observe:async()=>({
   snapshot:`- heading "${complete?'Requested report is displayed':'Unfinished report'}"\n- textbox "Search" [ref=e1]`,
   refs:{e1:{role:'textbox',name:'Search',exactValue:''}}}),execute:async()=>assert.fail('No browser action authorized')};
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
   let answers;
   if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
   else if(r.questions.valueSource)answers={valueSource:{type:'choice',choice:'unknown'}};
   else if(r.questions.completion){reviews++;answers={destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:complete?'complete':'uncertain'}};}
   else answers={action:{type:'choice',choice:Object.keys(r.questions.action.criteria).find(k=>r.questions.action.criteria[k].startsWith('Ask for an exact missing value'))}};
   return {answers,usage:{cost:.001}};
  }}}};
  const result=await act({browser,decide:jevDecider(api),intentOrSteps:'Show the requested report.',scope:'Only requested work',authorize:()=>true});
  assert.equal(reviews,1);assert.equal(result.returnReason,complete?'reported_complete':'input_required');
  assert.equal(result.inputRequired?.name??null,complete?null:'Search');assert.equal(result.actions.length,0);
  assert.ok(result.decisions.every(d=>d.cost===.001));
  const before=reviews;
  const limited=await act({browser,decide:jevDecider(api),intentOrSteps:'Show the requested report.',scope:'Only requested work',
   authorize:()=>true,budget:{maxDecisions:3}});
  assert.equal(limited.returnReason,'decision_budget');assert.equal(reviews,before);
 }
});

test('a complete verdict cannot override a contradictory destination classification',async()=>{
 const cases=[['item','collection',false],['item','item',true],['collection','collection',true],['dialog','item',false],['dialog','dialog',true],['none','other',true],['unknown','item',false],['item','unknown',false]];
 for(const[requirement,state,complete]of cases){
  let reviews=0;const browser={sessionId:randomUUID(),observe:async()=>({snapshot:'Observed working area',refs:{}}),execute:async()=>assert.fail('A review cannot dispatch a gesture')};
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
   let answers;if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
   else if(r.questions.completion){reviews++;answers={completion:{type:'choice',choice:'complete'},destinationRequirement:{type:'choice',choice:requirement},destinationState:{type:'choice',choice:state}};}
   else if(r.questions.nextRoute)answers={nextRoute:{type:'choice',choice:'none'}};
   else answers={action:{type:'choice',choice:'step_complete'}};
   return{answers,usage:{cost:.001}};
  }}}};
  const result=await act({browser,decide:jevDecider(api),intentOrSteps:'Open the requested destination',scope:'Test',authorize:()=>true});
  assert.equal(reviews,1);assert.equal(result.returnReason,complete?'reported_complete':'handoff');assert.equal(result.actions.length,0);
 }
});
