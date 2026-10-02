import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {act} from '../scripts/jev-browser.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';

function fixture({route='next',changes=true}={}){
  let page=1,saved=false;const actions=[],requests=[];
  const browser={sessionId:randomUUID(),observe:async()=>saved?{snapshot:'Saved the selected record',refs:{}}:
    page===1?{snapshot:'- heading "Records, page 1 of 2"\n- paragraph "Maple"\n- link "Next page" [ref=e1]',refs:{e1:{role:'link',name:'Next page'}}}:
    {snapshot:'- heading "Records, page 2 of 2"\n- button "Save Cedar" [ref=e2]',refs:{e2:{role:'button',name:'Save Cedar'}}},
    execute:async action=>{actions.push(action);if(action.ref==='@e1'&&changes)page=2;if(action.ref==='@e2')saved=true;}};
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
    requests.push(r);let answers;
    if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
    else if(r.questions.completion)answers={destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:saved?'complete':'uncertain'}};
    else if(r.questions.nextRoute){
      assert.equal(Object.hasOwn(r.state,'goalFacts'),false);
      const candidate=Object.keys(r.questions.nextRoute.criteria).find(k=>r.questions.nextRoute.criteria[k].includes('Next page'));
      answers={nextRoute:{type:'choice',choice:route==='next'?candidate??'none':route}};
    }else if(r.questions.actionCheck)answers={actionCheck:{type:'choice',choice:page===1?'navigation':'ready'},suggestedNext:{type:'choice',choice:'none'}};
    else answers={action:{type:'choice',choice:saved?'step_complete':page===1?'handoff':
      Object.keys(r.questions.action.criteria).find(k=>r.questions.action.criteria[k].includes('Save Cedar'))}};
    return {answers,usage:{cost:0.001}};
  }}}};
  return {browser,actions,requests,decide:jevDecider(api)};
}
const run=(f,authorize=()=>true)=>act({...f,intentOrSteps:'Save the Cedar record',scope:'Requested goal',authorize});

test('a focused continuation check recovers an observed route and its action is reviewed before dispatch',async()=>{
  const f=fixture(),result=await run(f);
  assert.equal(result.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.ref),['@e1','@e2']);
  assert.equal(f.requests.filter(r=>r.questions.nextRoute).length,1);
  assert.equal(f.requests.filter(r=>r.questions.actionCheck).length,2);
  assert.equal(result.decisions.length,f.requests.length);
});
test('no useful route leaves the handoff intact, without forced exploration',async()=>{
  const f=fixture({route:'none'}),result=await run(f);
  assert.equal(result.returnReason,'handoff');assert.equal(f.actions.length,0);assert.equal(f.requests.length,4);
});
test('a repeated observed state does not trigger repeated continuation attempts',async()=>{
  const f=fixture({changes:false}),result=await run(f);
  assert.equal(result.returnReason,'handoff');assert.equal(f.actions.length,1);
  assert.equal(f.requests.filter(r=>r.questions.nextRoute).length,1);
});
test('continuation review cannot offer an unauthorized route',async()=>{
  const f=fixture(),result=await run(f,()=>false);
  assert.equal(result.returnReason,'handoff');assert.equal(f.actions.length,0);
  assert.ok(f.requests.filter(r=>r.questions.nextRoute).every(r=>!Object.values(r.questions.nextRoute.criteria).some(value=>value.includes('Next page'))));
});
test('invalid continuation choice remains a charged failure with no gesture',async()=>{
  const f=fixture({route:'c999'}),result=await run(f);
  assert.equal(result.returnReason,'helper_error');assert.equal(f.actions.length,0);assert.equal(result.decisions.at(-1).cost,0.001);
});
