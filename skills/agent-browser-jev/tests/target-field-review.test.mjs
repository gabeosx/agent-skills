import test from 'node:test';
import assert from 'node:assert/strict';
import {createNumericLedger} from '../scripts/numeric-ledger.mjs';
import {valueBindingRequest,acceptValueBinding,groundedValueAction,valueBindingFrame} from '../scripts/value-binding.mjs';
function fixture(ledger,{code='K17',name='Charge',value='15.00',ref='e1'}={}){
 const field={op:'request_input',ref:'@'+ref,role:'textbox',name};
 return {sessionId:'review',stepIndex:0,intent:'Increase Charge and Allowance for the requested records by 20%.',scope:'Only requested records and amounts',context:'Editing records',history:[],suppliedValues:{},numericLedger:ledger.snapshot(),field,candidates:{field},observation:{snapshot:`- statictext "Registry code: ${code}"\n- textbox ${JSON.stringify(name)} [ref=${ref}]: ${value}`,refs:{[ref]:{role:'textbox',name,inputType:'text',exactValue:value}}}};
}
function first(request,override={}){
 const payload=valueBindingRequest(request,request.field),[anchorId,anchor]=Object.entries(payload.state.numericIdentityEvidence.anchors).find(([,a])=>a.kind==='readonly'),prior=request.numericLedger.entries.find(e=>e.anchor.text===anchor.text);
 const choices={valueSource:'derived:0:percent_add',numericIdentity:anchorId,numericTarget:prior?.targetId??'new_target',...override};
 assert.equal(payload.questions.numericField,undefined);
 const answers=Object.fromEntries(Object.entries(choices).map(([k,choice])=>[k,{type:'choice',choice}]));
 return acceptValueBinding({answers},request,request.field,payload);
}
function bound(request,selection=first(request)){return selection&&{...selection,ref:request.field.ref,frame:valueBindingFrame(request.observation)};}
function write(ledger,request){const binding=bound(request);assert(!binding.numericTarget);const action=groundedValueAction(request,request.candidates,binding);const id=ledger.dispatch(action,request);assert(id);ledger.settle(id,'tool_succeeded',action.value);return id;}
function next(request,selection,choice='new_field'){
 const payload=valueBindingRequest(request,request.field,selection);
 return payload&&acceptValueBinding({answers:{numericField:{type:'choice',choice}}},request,request.field,payload,selection);
}

test('review: equal starting values on two records have separate fields without cross-record field choices',()=>{
 const ledger=createNumericLedger();write(ledger,fixture(ledger));const b=fixture(ledger,{code:'K18'}),selection=first(b);assert(selection.numeric);assert.equal(selection.numericTarget,undefined);assert.equal(selection.value,'18.00');assert.notEqual(selection.numeric.ledger.targetId,ledger.snapshot().entries[0].targetId);
});

test('review: conditional question only exposes fields of proven target; another target edit is invalid',()=>{
 const ledger=createNumericLedger(),a=write(ledger,fixture(ledger)),b=write(ledger,fixture(ledger,{code:'K18'}));const request=fixture(ledger,{name:'Allowance',value:'30.00'}),selection=first(request),payload=valueBindingRequest(request,request.field,selection);
 assert.deepEqual(Object.keys(payload.questions),['numericField']);assert(Object.hasOwn(payload.questions.numericField.criteria,a));assert(!Object.hasOwn(payload.questions.numericField.criteria,b));
 assert.throws(()=>next(request,selection,b),/Invalid value binding/);assert.equal(next(request,selection,a),null);assert.equal(next(request,selection,'unknown'),null);const accepted=next(request,selection);assert.equal(accepted.value,'36.00');assert.equal(ledger.snapshot().entries.length,2,'field proposal does not consume ledger');
});

test('review: identity, scope, goal, control and ledger changes expire pending field judgments',()=>{
 const ledger=createNumericLedger();write(ledger,fixture(ledger));const request=fixture(ledger,{name:'Allowance',value:'30.00'}),selection=first(request);
 for(const kind of ['scope','context','intent','step','identity','field','source','ledger','witness']){const changed=structuredClone(request);if(['scope','context','intent'].includes(kind))changed[kind]+=' changed';if(kind==='step')changed.stepIndex++;if(kind==='identity')changed.observation.snapshot=changed.observation.snapshot.replace('K17','K18');if(kind==='field')changed.field.name='Fee';if(kind==='source')changed.observation.refs.e1.exactValue='31.00';if(kind==='ledger')changed.numericLedger.revision++;if(kind==='witness')changed.crossViewWitness={unexpected:true};assert.equal(valueBindingRequest(changed,changed.field,selection),null,kind);}
});

test('review: new-target claim cannot launder a same-record alias and unexpected old field answer fails closed',()=>{
 const ledger=createNumericLedger();write(ledger,fixture(ledger));const request=fixture(ledger,{name:'Allowance',value:'30.00',ref:'e91'});assert.equal(first(request,{numericTarget:'new_target'}),null);assert.throws(()=>first(request,{numericField:'new_field'}),/Unexpected unconditional/);assert.equal(first(fixture(ledger,{name:' charge ',value:'18.00',ref:'e91'})),null);
});

test('review: uncertain earlier write cannot be repeated after target-conditioned binding or resume',()=>{
 const ledger=createNumericLedger(),request=fixture(ledger),binding=bound(request),action=groundedValueAction(request,request.candidates,binding),id=ledger.dispatch(action,request);ledger.settle(id,'unknown');const resumed=createNumericLedger(JSON.parse(JSON.stringify(ledger.snapshot())));assert.equal(first(fixture(resumed,{value:'15.00',ref:'e8'})),null);assert.equal(first(fixture(resumed,{value:'18.00',ref:'e9'})),null);
});
