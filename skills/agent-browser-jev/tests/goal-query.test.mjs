import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {queryWords,groundedQueryAction,goalQueryRequest,goalQuerySpanRequest,acceptGoalQuery,emptyObservedSearch} from '../scripts/goal-query.mjs';
import {act} from '../scripts/jev-browser.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';

const intent='Find Cedar Harbor and bookmark its directory entry.';
const field={op:'request_input',ref:'@e1',role:'searchbox',name:'Find entry'};
const start=intent.indexOf('Cedar'),end=start+'Cedar Harbor'.length;
test('query binding copies exact whole caller words only into an eligible observed field',()=>{
 const query=groundedQueryAction(intent,{c0:field},{ref:'@e1',start,end,value:'invented'});
 assert.equal(query.value,'Cedar Harbor');assert.equal(query.source,'caller_goal_query');
 assert.equal(groundedQueryAction(intent,{c0:field},{ref:'@e1',start:start+1,end}),null);
 assert.equal(groundedQueryAction(intent,{c0:field},{ref:'@e9',start,end}),null);
 assert.equal(groundedQueryAction(intent,{c0:{...field,role:'spinbutton'}},{ref:'@e1',start,end}),null);
 assert.equal(groundedQueryAction(intent,{c0:field,c1:query},{ref:'@e1',start,end}),null);
 const unicode='Find Café Élan';assert.deepEqual(queryWords(unicode).map(w=>unicode.slice(w.start,w.end)),['Find','Café','Élan']);
});
function fixture({queryUse='discovery',malformed=false,role='searchbox',exactValue}={}){
 let entered='',saved=false,found=false;const calls=[],requests=[];
 const browser={sessionId:randomUUID(),observe:async()=>saved?{snapshot:'Directory entry bookmarked',refs:{}}:
 found?{snapshot:'- heading "Cedar Harbor"\n- button "Bookmark" [ref=e2]',refs:{e2:{role:'button',name:'Bookmark'}}}:
 {snapshot:`- ${role} "Find entry" [ref=e1]: ${entered}`,refs:{e1:{role,name:'Find entry',...(exactValue!==undefined?{exactValue:entered||exactValue}:{})}}},execute:async action=>{
 calls.push(action);if(action.op==='fill')entered=action.value;if(action.op==='press')found=true;if(action.op==='click')saved=true;
 }};
 const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
 requests.push(r);let answers;
 if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
 else if(r.questions.valueSource)answers={valueSource:{type:'choice',choice:'unknown'}};
 else if(r.questions.queryUse){
  const words=r.state.words;answers={queryUse:{type:'choice',choice:queryUse},
   queryStart:{type:'choice',choice:malformed?'w999':`w${words.findIndex(w=>w.text==='Cedar')}`},
   queryEnd:{type:'choice',choice:`w${words.findIndex(w=>w.text==='Harbor')}`}};
 }else if(r.questions.querySpan){
  answers={querySpan:{type:'choice',choice:Object.entries(r.questions.querySpan.criteria).find(([,value])=>value===JSON.stringify('Cedar Harbor'))[0]}};
 }else if(r.questions.actionCheck)answers={actionCheck:{type:'choice',choice:r.state.proposedAction.op==='fill'?'preparation':found?'ready':'navigation'},suggestedNext:{type:'choice',choice:'none'},literalAssignment:{type:'choice',choice:'matches'}};
 else if(r.questions.completion)answers={destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:saved?'complete':'uncertain'}};
 else if(r.questions.nextRoute)answers={nextRoute:{type:'choice',choice:'none'}};
 else{
  const criteria=r.questions.action.criteria;let choice;
  if(saved)choice='step_complete';
  else if(found)choice=Object.keys(criteria).find(k=>criteria[k].includes('"name":"Bookmark"'));
  else if(entered)choice=Object.keys(criteria).find(k=>criteria[k].includes('"key":"Enter"'));
  else choice=Object.keys(criteria).find(k=>criteria[k].includes('"source":"caller_goal_query"'))??Object.keys(criteria).find(k=>criteria[k].startsWith('Ask for an exact missing value'));
  answers={action:{type:'choice',choice}};
 }
 return {answers,usage:{cost:0.001}};
 }}}};return {browser,calls,requests,decide:jevDecider(api)};
}
const run=(f,authorize=()=>true)=>act({...f,intentOrSteps:intent,scope:'Find and bookmark the requested entry',authorize});
test('an exact unquoted caller query enables autonomous discovery and is reviewed before filling',async()=>{
 const f=fixture(),r=await run(f);assert.equal(r.returnReason,'reported_complete');
 assert.deepEqual(f.calls.map(a=>a.op),['fill','press','click']);assert.equal(f.calls[0].value,'Cedar Harbor');
 assert.ok(f.calls[0].callerSpan);assert.equal(r.decisions.length,f.requests.length);
 assert.equal(f.requests.filter(r=>r.questions.actionCheck).length,3);
});
test('an unresolved final field still returns input_required after exact-source review',async()=>{
 const f=fixture({role:'textbox',queryUse:'final_value'}),r=await run(f);
 assert.equal(r.returnReason,'input_required');assert.equal(f.calls.length,0);
 assert.equal(f.requests.filter(r=>r.questions.valueSource).length,1);
 assert.equal(f.requests.filter(r=>r.questions.queryUse).length,0);
 assert.equal(f.requests.filter(r=>r.questions.querySpan).length,0);
});
test('span-derived fills still require operation authorization',async()=>{
 const f=fixture(),r=await run(f,action=>action.op!=='fill');
 assert.equal(r.returnReason,'input_required');assert.equal(f.calls.length,0);
 assert.ok(f.requests.filter(r=>r.questions.action).every(r=>!Object.values(r.questions.action.criteria).some(c=>c.includes('"op":"fill"'))));
});
test('malformed query choices remain charged failures without a browser gesture',async()=>{
 const f=fixture({malformed:true}),r=await run(f);
 assert.equal(r.returnReason,'helper_error');assert.equal(f.calls.length,0);
 assert.equal(r.decisions.at(-1).cost,0.001);
});

test('query end classification is conditional on the selected start and exposes exact complete literals',()=>{
 const request={intent:'Find Cedar Harbor in the Coastal directory and bookmark it.',observation:{snapshot:'- searchbox "Find entry" [ref=e1]'},suppliedValues:{}};
 const first=goalQueryRequest(request,field);
 assert.equal(first.questions.queryEnd,undefined);
 const anchor=acceptGoalQuery({answers:{queryUse:{type:'choice',choice:'discovery'},queryStart:{type:'choice',choice:'w1'}}},request,field,first);
 const next=goalQuerySpanRequest(request,field,anchor.anchor);
 assert.equal(next.questions.querySpan.criteria.w2,'"Cedar Harbor"');
 const span=acceptGoalQuery({answers:{querySpan:{type:'choice',choice:'w2'}}},request,field,next);
 assert.equal(groundedQueryAction(request.intent,{c0:field},span).value,'Cedar Harbor');
 assert.equal(goalQuerySpanRequest(request,field,anchor.anchor+1),null);
 assert.throws(()=>acceptGoalQuery({answers:{querySpan:{type:'choice',choice:'w0'}}},request,field,next),/Invalid goal-query assessment/);
});

test('query word boundaries exclude sentence-final periods while retaining internal domain dots',()=>{
 assert.deepEqual(queryWords('Find example.com and gardens.').map(w=>w.text),['Find','example.com','and','gardens']);
 assert.deepEqual(queryWords('Look up St. Ives.').map(w=>w.text),['Look','up','St','Ives']);
});

test('proactive discovery does not spend the second query attempt deriving text already in the search field',async()=>{
 const f=fixture(),r=await run(f);assert.equal(r.returnReason,'reported_complete');
 assert.equal(f.requests.filter(r=>r.questions.queryUse).length,1);
 assert.equal(f.requests.filter(r=>r.questions.querySpan).length,1);
 assert.equal(emptyObservedSearch({observation:{snapshot:'- searchbox "Find" [ref=e1]: Existing query'}},field),false);
 assert.equal(emptyObservedSearch({observation:{snapshot:'- searchbox "Find" [ref=e1]'}},field),true);
 assert.equal(emptyObservedSearch({observation:{snapshot:'- searchbox "Find" [ref=e2]'}},field),false);
 assert.equal(emptyObservedSearch({observation:{snapshot:'- searchbox "Find" [ref=e1]: ]'}},field),false);
});
