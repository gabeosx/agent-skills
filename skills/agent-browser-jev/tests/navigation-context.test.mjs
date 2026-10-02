import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {observedLocation,createNavigationContext,navigationReviewRequest} from '../scripts/navigation-context.mjs';
import {act} from '../scripts/jev-browser.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';

test('navigation evidence omits URL paths and credentials and is not an executable history',()=>{
  const location=observedLocation('https://user:password@app.example/reset-password/sensitive-code?key=secret#token');
  assert.equal(location.origin,'https://app.example');assert.match(location.identity,/^[a-f0-9]{32}$/);
  assert.ok(!JSON.stringify(location).includes('sensitive-code'));
  assert.deepEqual(observedLocation('https://app.example/reset-password/sensitive-code?key=secret#token'),location);
  assert.notEqual(observedLocation('https://app.example/reset-password/sensitive-code?key=other#token').identity,location.identity);
  for(const value of ['javascript:alert(1)','file:///private/path','not a url',null])assert.equal(observedLocation(value),null);
  const tracker=createNavigationContext();
  const before={location:observedLocation('https://app.example/items?key=secret'),snapshot:'- heading "Items" [ref=e9]'};
  const after={location:observedLocation('https://docs.example/guide'),snapshot:'- heading "Guide" [ref=e9]'};
  tracker.observe(before);tracker.record({before,after,action:{op:'click',ref:'@e9',name:'Help'},outcome:'tool_succeeded'});
  const evidence=tracker.observe(after);
  assert.equal(evidence.history[0].fromHeading,'Items');assert.equal(evidence.history[0].toHeading,'Guide');
  assert.equal(evidence.historyIsNotExecutable,true);assert.ok(!JSON.stringify(evidence).includes('@e9'));
  assert.ok(evidence.history.every(item=>!Object.hasOwn(item,'ref')));
  assert.ok(!JSON.stringify(evidence).includes('secret'));
  const request={intent:'Open the guide on the documentation site',scope:'Requested goal',navigation:evidence,
    observation:after,history:[],candidates:{back:{op:'back'},handoff:{op:'handoff'}}};
  const proposal=navigationReviewRequest(request);
  assert.deepEqual(Object.keys(proposal.questions.navigationRoute.criteria),['continue','back']);
  assert.match(proposal.questions.navigationRoute.instructions,/External sites can be necessary/);
  assert.equal(navigationReviewRequest({...request,candidates:{handoff:{op:'handoff'}}}),null);
  assert.ok(!JSON.stringify(proposal.questions.navigationRoute.criteria).includes('open'));
});

test('same-origin query and fragment changes retain distinct opaque navigation evidence',()=>{
  const tracker=createNavigationContext();
  const before={location:observedLocation('https://app.example/items?page=1#list'),snapshot:'- heading "Page one"'};
  const after={location:observedLocation('https://app.example/items?page=2#list'),snapshot:'- heading "Page two"'};
  tracker.observe(before);tracker.record({before,after,action:{op:'click',name:'Next page'},outcome:'tool_succeeded'});
  const evidence=tracker.observe(after);
  assert.equal(evidence.history.length,1);assert.notEqual(before.location.identity,after.location.identity);
  assert.notEqual(observedLocation('https://app.example/items?page=2#details').identity,after.location.identity);
  const proposal=navigationReviewRequest({intent:'Open page two',navigation:evidence,observation:after,candidates:{back:{op:'back'}}});
  assert.ok(proposal.questions.navigationRoute.criteria.continue);assert.ok(!JSON.stringify(proposal).includes('page=2'));
});

function fixture({legitimateExternal=false,allowBack=true,dense=false}={}){
  let page='home',visits=0;const requests=[],actions=[];
  const links=Array.from({length:250},(_,i)=>[`e${i+3}`,{role:'link',name:`Unrelated documentation link ${i}`}]);
  const observation=()=>({location:observedLocation(page==='home'?'https://app.example/home':page==='docs'?'https://docs.example/guide':'https://app.example/reports'),
    snapshot:page==='home'?'- heading "Workspace"\n- link "Help" [ref=e1]\n- link "Reports" [ref=e2]':
      page==='docs'?'- heading "Documentation"\n- paragraph "How to configure reports"'+(dense?'\n'+links.map(([ref,c])=>`- link "${c.name}" [ref=${ref}]`).join('\n'):''):'- heading "Requested report"',
    refs:page==='home'?{e1:{role:'link',name:'Help'},e2:{role:'link',name:'Reports'}}:page==='docs'&&dense?Object.fromEntries(links):{}});
  const browser={sessionId:randomUUID(),observe:async()=>observation(),execute:async action=>{
    actions.push(action);if(action.op==='back'){page='home';visits++;}else page=action.ref==='@e1'?'docs':'reports';}};
  const api={alpha:{decisions:{create:async({decisionsRequest:p})=>{
    requests.push(p);let answers;
    if(p.questions.navigationRoute)answers={navigationRoute:{type:'choice',choice:page==='docs'&&!legitimateExternal?'c2':'continue'}};
    else if(p.questions.source)answers={source:{type:'choice',choice:'unconstrained'}};
    else if(p.questions.actionCheck)answers={actionCheck:{type:'choice',choice:'navigation'},suggestedNext:{type:'choice',choice:'none'}};
    else if(p.questions.completion)answers={destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:'complete'}};
    else {
      const criteria=p.questions.action.criteria;
      const desired=page==='home'?(visits?'Reports':'Help'):null;
      const choice=desired?Object.keys(criteria).find(id=>criteria[id].includes(`"name":"${desired}"`)):'step_complete';
      answers={action:{type:'choice',choice}};
    }
    // The current back id is deliberately resolved from the payload, never
    // hardcoded to a prior frontier's ref or candidate position.
    if(answers.navigationRoute?.choice==='c2')answers.navigationRoute.choice=Object.keys(p.questions.navigationRoute.criteria).find(k=>k!=='continue');
    return {answers,usage:{cost:0.001}};
  }}}};
  return {browser,requests,actions,decide:jevDecider(api),authorize:action=>allowBack||action.op!=='back'};
}

test('a navigation review recovers a wrong turn through current authorized Back and fresh controls',async()=>{
  const f=fixture();const result=await act({...f,intentOrSteps:'Show the requested report',scope:'Requested task'});
  assert.equal(result.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.op),['click','back','click']);
  assert.equal(f.actions.at(-1).ref,'@e2');assert.equal(f.requests.filter(p=>p.questions.navigationRoute).length,3);
  assert.ok(f.requests.find(p=>p.questions.actionCheck&&p.state.proposedAction.ref==='@e2').state.navigation.history.length);
});

test('dense detours retain authorized Back on every control page',async()=>{
  const f=fixture({dense:true});const result=await act({...f,intentOrSteps:'Show the requested report',scope:'Requested task'});
  assert.equal(result.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.op),['click','back','click']);
  const review=f.requests.find(p=>p.questions.navigationRoute&&p.state.navigation.current.origin==='https://docs.example');
  assert.ok(review.questions.navigationRoute.criteria.navigation_back);
  assert.ok(!f.actions.some(a=>a.op==='candidate_page'));
});

test('legitimate cross-origin work can finish without forced backtracking',async()=>{
  const f=fixture({legitimateExternal:true});const result=await act({...f,intentOrSteps:'Open the external documentation guide',scope:'Requested task'});
  assert.equal(result.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.op),['click']);
  assert.equal(f.requests.filter(p=>p.questions.navigationRoute).length,1);
});

test('a caller rule that withholds Back is preserved by navigation recovery',async()=>{
  const f=fixture({allowBack:false});const result=await act({...f,intentOrSteps:'Open the external documentation guide',scope:'Requested task'});
  assert.equal(result.returnReason,'reported_complete');assert.ok(!f.actions.some(a=>a.op==='back'));
  assert.equal(f.requests.filter(p=>p.questions.navigationRoute).length,0);
});

test('automatic navigation reassessment has a per-task recovery bound',async()=>{
  let reviews=0;
  const decide=jevDecider({alpha:{decisions:{create:async({decisionsRequest:p})=>{
    if(p.questions.navigationRoute){reviews++;return {answers:{navigationRoute:{type:'choice',choice:'back'}},usage:{cost:0.001}};}
    return {answers:{source:{type:'choice',choice:'unconstrained'}},usage:{cost:0.001}};
  }}}});
  for(let revision=1;revision<=4;revision++){
    const from=observedLocation('https://app.example/home'),to=observedLocation(`https://docs.example/guide-${revision}`);
    const result=await decide({binding:`b${revision}`,sessionId:'bounded',stepIndex:0,intent:'Configure the account',scope:'Requested task',
      suppliedValues:{},history:[],candidates:{back:{op:'back'},handoff:{op:'handoff'}},observation:{snapshot:'- heading "Guide"',refs:{},location:to},
      navigation:{revision,start:from,current:to,history:[{from,to,operation:'click',target:'Help'}]}});
    if(revision<=3)assert.equal(result.choice,'back');else assert.equal(result.assessment,true);
  }
  assert.equal(reviews,3);
});
