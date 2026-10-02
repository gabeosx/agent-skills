import test from 'node:test';
import assert from 'node:assert/strict';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';
import {act} from '../scripts/jev-browser.mjs';
import {valueBindingFrame} from '../scripts/value-binding.mjs';
const observation={snapshot:'- textbox "Source" [ref=e1]: Exact source\n- textbox "First" [ref=e2]\n- textbox "Second" [ref=e3]',refs:{e1:{role:'textbox',name:'Source',exactValue:'Exact source'},e2:{role:'textbox',name:'First',exactValue:''},e3:{role:'textbox',name:'Second',exactValue:''}}};
const request={binding:'unit',sessionId:'batch',stepIndex:0,intent:'Copy the source into both destinations.',observation,suppliedValues:{},scope:'Only requested edits',history:[],candidates:{c0:{op:'request_input',role:'textbox',name:'First',ref:'@e2'},c1:{op:'request_input',role:'textbox',name:'Second',ref:'@e3'},step_complete:{op:'step_complete'},handoff:{op:'handoff'}}};
function api(malformed=false){const payloads=[];return {payloads,client:{alpha:{decisions:{create:async({decisionsRequest:p})=>{payloads.push(p);return {usage:{cost:.01},answers:Object.fromEntries(Object.entries(p.questions).map(([id,q])=>[id,{type:'choice',choice:id==='source'?'unconstrained':malformed&&id==='value_c1'?'unoffered':'e1:whole'}]))};}}}}};}
test('independent source bindings share one request, explicit destinations and exact existing text',async()=>{
 const mock=api(),decide=jevDecider(mock.client);await decide(request);const result=await decide(request);
 assert.deepEqual(Object.keys(mock.payloads[1].questions),['value_c0','value_c1']);
 assert.match(mock.payloads[1].questions.value_c0.instructions,/fields.c0/);
 assert.match(mock.payloads[1].questions.value_c1.instructions,/fields.c1/);
 assert.equal(mock.payloads[1].state.sources.e1.text,'Exact source');
 assert.deepEqual(result.valueBindings.map(b=>b.ref),['@e2','@e3']);assert.equal(result.assessment,true);assert.equal(result.cost,.01);
});
test('malformed speculative binding rejects the whole charged batch before accepting partial values',async()=>{
 const mock=api(true),decide=jevDecider(mock.client);await decide(request);
 await assert.rejects(decide(request),e=>e.decisionCost===.01&&/Invalid value binding/.test(e.message));
});
test('multiple returned bindings become authorized fill choices, and all expire on changed source evidence',async()=>{
 let current=structuredClone(observation),turn=0;const executed=[];
 const browser={sessionId:'batch-engine',observe:async()=>current,execute:async action=>{executed.push(action);current={...current,snapshot:current.snapshot+'\n- StaticText "changed"',refs:{...current.refs,e1:{...current.refs.e1,exactValue:'Changed source'},e2:{...current.refs.e2,exactValue:action.value}}};}};
 const result=await act({browser,intentOrSteps:request.intent,scope:request.scope,suppliedValues:{},authorize:a=>a.ref!=='@e3',budget:{maxActions:3,maxDecisions:4,timeoutMs:1000},decide:async r=>{
  if(turn++===0)return {binding:r.binding,assessment:true,cost:0,valueBindings:['@e2','@e3'].map(ref=>({ref,sourceId:'e1',whole:true,start:0,end:12,frame:valueBindingFrame(r.observation)}))};
  if(turn===2){const fills=Object.entries(r.candidates).filter(([,a])=>a.source==='exact_value_binding');assert.equal(fills.length,1);assert.equal(fills[0][1].ref,'@e2');return {binding:r.binding,choice:fills[0][0],cost:0};}
  assert.ok(!Object.values(r.candidates).some(a=>a.source==='exact_value_binding'));return {binding:r.binding,choice:'handoff',cost:0};
 }});assert.equal(result.returnReason,'handoff');assert.equal(executed.length,1);
});

test('a single empty destination keeps the original focused field and sources state',async()=>{
 const mock=api(),decide=jevDecider(mock.client),r={...request,candidates:{c0:request.candidates.c0,handoff:request.candidates.handoff}};await decide(r);const result=await decide(r);
 assert.deepEqual(Object.keys(mock.payloads[1].questions),['valueSource']);assert.equal(mock.payloads[1].state.field.ref,'@e2');assert.ok(Array.isArray(mock.payloads[1].state.sources));assert.equal(result.valueBindings.length,1);
});

test('speculative field checks do not prevent resolving a later explicitly selected field',async()=>{
 const intent='Set Destination to ARC.',payloads=[];
 const initial={...request,intent,observation:{snapshot:Array.from({length:6},(_,i)=>`- textbox "Unrelated ${i}" [ref=e${i+10}]`).join('\n'),
  refs:Object.fromEntries(Array.from({length:6},(_,i)=>[`e${i+10}`,{role:'textbox',name:`Unrelated ${i}`,exactValue:''}]))},
  candidates:Object.fromEntries(Array.from({length:6},(_,i)=>[`c${i}`,{op:'request_input',ref:`@e${i+10}`,role:'textbox',name:`Unrelated ${i}`}]))};
 const client={alpha:{decisions:{create:async({decisionsRequest:p})=>{
  payloads.push(p);
  return {usage:{cost:.001},answers:Object.fromEntries(Object.entries(p.questions).map(([id,q])=>[id,{type:'choice',
   choice:id==='source'?'unconstrained':id==='phase'?'none':id.startsWith('value_')?'unknown':
    id==='valueSource'?`caller:span:${intent.indexOf('ARC')}:${intent.indexOf('ARC')+3}`:
    id==='action'?'c0':Object.hasOwn(q.criteria,'none')?'none':Object.hasOwn(q.criteria,'unknown')?'unknown':Object.keys(q.criteria)[0]}]))};
 }}}};
 const decide=jevDecider(client);await decide(initial);const speculative=await decide(initial);
 assert.equal(Object.keys(payloads.at(-1).questions).length,6);assert.deepEqual(speculative.valueBindings,[]);
 const later={...initial,observation:{snapshot:'- textbox "Destination" [ref=e20]',refs:{e20:{role:'textbox',name:'Destination',exactValue:''}}},
  candidates:{c0:{op:'request_input',ref:'@e20',role:'textbox',name:'Destination'},handoff:{op:'handoff'}}};
 let resolved;
 for(let i=0;i<6&&!resolved;i++){
  const result=await decide(later);resolved=result.valueBinding;
  assert.notEqual(result.choice,'c0','must try the known goal source before asking the caller for missing input');
 }
 assert.ok(resolved);assert.equal(resolved.ref,'@e20');assert.equal(resolved.frame,valueBindingFrame(later.observation));
 assert.equal(intent.slice(resolved.start,resolved.end),'ARC');
 assert.equal(payloads.filter(p=>p.questions.valueSource).length,1);
});
