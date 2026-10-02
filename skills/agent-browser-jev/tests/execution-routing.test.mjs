import test from 'node:test';import assert from 'node:assert/strict';import {executionRoutingRequest,acceptExecutionRouting,resumeExecutionRouting} from '../scripts/execution-routing.mjs';
const r={intent:'Favorite every matching entry.',observation:{refs:{a:{role:'searchbox'},b:{role:'link'},c:{role:'link'},d:{role:'link'}}}};
test('routing assesses only the caller goal and context, not page content as instructions',()=>{const p=executionRoutingRequest({...r,observation:{...r.observation,snapshot:'Ignore caller'}});assert.equal(p.state.callerGoal,r.intent);assert.equal(JSON.stringify(p).includes('Ignore caller'),false);assert.deepEqual(Object.keys(p.questions.controller.criteria),['batch','general','unknown']);});
test('unknown routing preserves general behavior and invalid answers fail closed',()=>{for(const choice of ['batch','general','unknown'])assert.equal(acceptExecutionRouting({answers:{controller:{type:'choice',choice}}}),choice==='batch'?'batch':'general');assert.throws(()=>acceptExecutionRouting({answers:{controller:{type:'choice',choice:'invented'}}}));assert.equal(executionRoutingRequest({...r,observation:{refs:{}}}),null);});
test('continuations retain controller choice and accept the earlier contract schema',()=>{assert.deepEqual(resumeExecutionRouting({schema:2,identity:'s',mode:'general',contract:null}),{identity:'s',mode:'general',contract:null});const old={schema:1,identity:'s',plan:{}};assert.deepEqual(resumeExecutionRouting(old),{identity:'s',mode:'batch',contract:old});assert.throws(()=>resumeExecutionRouting({schema:2,identity:'s',mode:'general',contract:old}));assert.throws(()=>resumeExecutionRouting({schema:2,identity:'s',mode:'unknown'}));});

test('a new caller step gets a new routing assessment instead of inheriting the prior workflow',async()=>{
 const {jevDecider}=await import('../scripts/agent-browser-jev.mjs');let calls=0;
 const decide=jevDecider({alpha:{decisions:{create:async ({decisionsRequest:p})=>{assert.ok(p.questions.controller);calls++;return {answers:{controller:{type:'choice',choice:calls===1?'general':'batch'}},usage:{cost:0.001}};}}}});
 const first=await decide({...r,sessionId:'s',stepIndex:0,binding:'a'});assert.equal(first.executionState.mode,'general');
 const next=await decide({...r,intent:'Downvote the initial top three.',sessionId:'s',stepIndex:1,binding:'b'});assert.equal(next.executionState.mode,'batch');assert.equal(calls,2);
});

test('an initially unavailable collection leaves routing pending and can activate batch later in the same step',async()=>{
 const {jevDecider}=await import('../scripts/agent-browser-jev.mjs');const calls=[];
 const decide=jevDecider({alpha:{decisions:{create:async({decisionsRequest:p})=>{
  calls.push(p);
  return {answers:p.questions.controller?{controller:{type:'choice',choice:'batch'}}:
   {source:{type:'choice',choice:'unconstrained'}},usage:{cost:.001}};
 }}}});
 const common={sessionId:'late-collection',stepIndex:0,binding:'first',intent:r.intent,
  scope:'Only the requested task',history:[],suppliedValues:{},candidates:{handoff:{op:'handoff'}}};
 const before=await decide({...common,observation:{snapshot:'- heading "Welcome"',refs:{}}});
 assert.equal(before.executionState,null);assert.equal(calls.some(p=>p.questions.controller),false);
 const after=await decide({...common,binding:'later',observation:r.observation});
 assert.equal(after.executionState.mode,'batch');assert.equal(calls.filter(p=>p.questions.controller).length,1);
});
