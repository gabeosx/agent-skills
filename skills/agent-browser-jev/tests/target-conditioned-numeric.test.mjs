import test from 'node:test';
import assert from 'node:assert/strict';
import {createNumericLedger} from '../scripts/numeric-ledger.mjs';
import {valueBindingRequest,acceptValueBinding,groundedValueAction,valueBindingFrame} from '../scripts/value-binding.mjs';
const intent='Increase Charge and Reserve by 20% on both requested records.';
function request(ledger,{record='L21',field='Charge',value='15.00',ref='e2'}={}){
 const observation={snapshot:`- textbox "Record reference" [ref=e1]: ${record}\n- textbox "${field}" [ref=${ref}]: ${value}`,refs:{e1:{role:'textbox',name:'Record reference',readonly:true,inputType:'text',exactValue:record},[ref]:{role:'textbox',name:field,inputType:'text',exactValue:value}}},destination={op:'request_input',ref:'@'+ref,role:'textbox',name:field};
 return {intent,stepIndex:0,scope:'Only requested records',context:'',observation,field:destination,candidates:{field:destination},numericLedger:ledger.snapshot(),suppliedValues:{}};
}
function target(r,{target,extra={}}={}){
 const payload=valueBindingRequest(r,r.field),[anchor,a]=Object.entries(payload.state.numericIdentityEvidence.anchors).find(([,a])=>a.kind==='readonly')??['unknown',null],prior=r.numericLedger.entries.find(e=>e.anchor.text===a?.text);
 assert.equal(payload.questions.numericField,undefined);
 const choices={valueSource:'derived:0:percent_add',numericIdentity:anchor,numericTarget:target??prior?.targetId??'new_target',...extra};
 return acceptValueBinding({answers:Object.fromEntries(Object.entries(choices).map(([id,choice])=>[id,{type:'choice',choice}]))},r,r.field,payload);
}
function final(r,b,choice='new_field'){
 if(b?.numericTarget){const p=valueBindingRequest(r,r.field,b);b=p&&acceptValueBinding({answers:{numericField:{type:'choice',choice}}},r,r.field,p,b);}
 return b&&groundedValueAction(r,r.candidates,{...b,ref:r.field.ref,frame:valueBindingFrame(r.observation)});
}
function commit(ledger,r,a){const id=ledger.dispatch(a,r);assert.ok(id);ledger.settle(id,'tool_succeeded',a.value);return id;}

test('distinct observed targets with identical field names and sources need no cross-target field judgment',()=>{
 const ledger=createNumericLedger();let r=request(ledger),b=target(r);assert.equal(b.numericTarget,undefined);commit(ledger,r,final(r,b));
 r=request(ledger,{record:'L22'});b=target(r);assert.equal(b.numericTarget,undefined);const action=final(r,b);assert.equal(action.value,'18.00');commit(ledger,r,action);
 assert.deepEqual(ledger.snapshot().entries.map(e=>[e.anchor.text,e.field.name,e.sourceValue]),[['L21','Charge','15.00'],['L22','Charge','15.00']]);
});

test('conditional field comparison offers only edits owned by the already validated target',()=>{
 const ledger=createNumericLedger();let r=request(ledger);const first=commit(ledger,r,final(r,target(r)));
 r=request(ledger,{record:'L22',field:'Reserve'});const other=commit(ledger,r,final(r,target(r)));
 r=request(ledger,{field:'Reserve',value:'30.00'});const pending=target(r),p=valueBindingRequest(r,r.field,pending);
 assert.ok(pending.numericTarget);assert.equal(groundedValueAction(r,r.candidates,{...pending,ref:r.field.ref,frame:valueBindingFrame(r.observation)}),null);
 assert.deepEqual(Object.keys(p.questions),['numericField']);assert.deepEqual(Object.keys(p.questions.numericField.criteria),['unknown','new_field',first]);assert.equal(p.state.previousFields.length,1);assert.equal(p.questions.numericField.criteria[other],undefined);
 assert.equal(ledger.snapshot().entries.length,2);assert.equal(final(r,pending,'unknown'),null);assert.equal(final(r,pending,first),null);assert.throws(()=>final(r,pending,other),/Invalid value binding/);
 assert.equal(final(r,pending).value,'36.00');
});

test('identity collisions, repeated fields, uncertain dispatch and contradictory unasked answers still stop',()=>{
 const ledger=createNumericLedger();let r=request(ledger),a=final(r,target(r)),id=ledger.dispatch(a,r);ledger.settle(id,'unknown');
 r=request(ledger,{value:'18.00',ref:'e7'});assert.equal(target(r),null);assert.equal(target(r,{target:'new_target'}),null);
 r=request(ledger,{record:'L22'});assert.throws(()=>target(r,{extra:{numericField:id}}),/Unexpected unconditional/);
 const ambiguous=request(ledger);ambiguous.observation.refs.e1.readonly=false;assert.equal(target({...ambiguous,field:ambiguous.field},{target:'new_target'}),null);
});

test('conditional target proof expires across source, identity, goal, context, scope and ledger changes',()=>{
 const ledger=createNumericLedger();let r=request(ledger);commit(ledger,r,final(r,target(r)));
 r=request(ledger,{field:'Reserve'});const pending=target(r);assert.ok(pending.numericTarget);
 for(const key of ['source','identity','intent','scope','context','ledger']){
  const changed=structuredClone(r);
  if(key==='source')changed.observation.refs.e2.exactValue='18.00';
  else if(key==='identity')changed.observation.refs.e1.exactValue='L99';
  else if(key==='ledger')changed.numericLedger.revision++;
  else changed[key]+=' Changed.';
  assert.equal(valueBindingRequest(changed,changed.field,pending),null,key);
 }
});

import {jevDecider} from '../scripts/agent-browser-jev.mjs';
test('decider completes target then field stages through ordinary charged decisions without consuming a proposal',async()=>{
 const ledger=createNumericLedger(),payloads=[];
 const api={alpha:{decisions:{create:async({decisionsRequest:p})=>{
  payloads.push(p);let answers;
  if(p.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
  else if(p.questions.action)answers={action:{type:'choice',choice:'field'}};
  else if(p.questions.valueSource){
   const [id,anchor]=Object.entries(p.state.numericIdentityEvidence.anchors).find(([,a])=>a.kind==='readonly'),prior=p.state.numericIdentityEvidence.previousEdits.find(e=>e.anchor.text===anchor.text);
   assert.equal(p.questions.numericField,undefined);answers=Object.fromEntries(Object.entries({valueSource:'derived:0:percent_add',numericIdentity:id,numericTarget:prior?.targetId??'new_target'}).map(([k,choice])=>[k,{type:'choice',choice}]));
  }else if(p.questions.numericField){assert.equal(p.state.boundTarget.anchor.text,'L21');assert.equal(p.state.previousFields.length,1);answers={numericField:{type:'choice',choice:'new_field'}};}
  else assert.fail('Unexpected question '+Object.keys(p.questions));
  return {answers,usage:{cost:.001}};
 }}}};
 const decide=jevDecider(api);
 async function resolve(r){const req={...r,binding:'target-field-pipeline',sessionId:'target-field-pipeline',history:[],candidateWindow:{page:1,pages:1},candidates:{...r.candidates,handoff:{op:'handoff'}}};for(let i=0;i<12;i++){const d=await decide(req);if(d.valueBinding)return groundedValueAction(req,req.candidates,d.valueBinding);}assert.fail('No completed numeric binding');}
 let r=request(ledger),action=await resolve(r);assert.equal(ledger.snapshot().entries.length,0);commit(ledger,r,action);
 r=request(ledger,{field:'Reserve',value:'30.00'});action=await resolve(r);assert.equal(action.value,'36.00');assert.equal(ledger.snapshot().entries.length,1);commit(ledger,r,action);
 assert.equal(payloads.filter(p=>p.questions.valueSource).length,2);assert.equal(payloads.filter(p=>p.questions.numericField).length,1);assert.equal(ledger.snapshot().entries.length,2);
});
