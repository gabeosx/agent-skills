import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createNumericLedger,numericIdentityAnchors} from '../scripts/numeric-ledger.mjs';
import {valueBindingRequest,acceptValueBinding,groundedValueAction,valueBindingFrame} from '../scripts/value-binding.mjs';
import {act} from '../scripts/jev-browser.mjs';

const intent='Increase the requested records’ Charge by 20%.';
const scope='Only the requested records and field';
function fixture(ledger,{code='K17',value='15.00',ref='e1'}={}){
 const field={op:'request_input',ref:'@'+ref,role:'textbox',name:'Charge'};
 const observation={snapshot:`- statictext "Registry key: ${code}"\n- textbox "Charge" [ref=${ref}]: ${value}`,
  refs:{[ref]:{role:'textbox',name:'Charge',inputType:'text',exactValue:value}}};
 return {intent,scope,stepIndex:0,observation,candidates:{field},field,numericLedger:ledger.snapshot(),history:[],suppliedValues:{}};
}
function bind(request){
 const payload=valueBindingRequest(request,request.field);
 const anchor=Object.entries(payload.state.numericIdentityEvidence.anchors).find(([,a])=>a.kind==='readonly')[0];
 const previous=request.numericLedger.entries.find(e=>e.anchor.text===payload.state.numericIdentityEvidence.anchors[anchor].text);
 const answers=Object.fromEntries(Object.entries({valueSource:'derived:0:percent_add',numericIdentity:anchor,
  numericTarget:previous?.targetId??'new_target',...(payload.questions.numericField?{numericField:'new_field'}:{})}).map(([k,choice])=>[k,{type:'choice',choice}]));
 let binding=acceptValueBinding({answers},request,request.field,payload);
 if(binding?.numericTarget){
  const conditional=valueBindingRequest(request,request.field,binding);
  binding=conditional&&acceptValueBinding({answers:{numericField:{type:'choice',choice:'new_field'}}},request,request.field,conditional,binding);
 }
 return binding&&{...binding,ref:request.field.ref,frame:valueBindingFrame(request.observation)};
}
const action=request=>{const b=bind(request);return b&&groundedValueAction(request,request.candidates,b);};

test('review: source changes and fabricated arithmetic fail before ledger dispatch',()=>{
 const ledger=createNumericLedger(),request=fixture(ledger),proposal=action(request);
 assert.equal(ledger.allowed(proposal,request),true);
 assert.equal(ledger.dispatch({...proposal,value:'999'},request),null);
 assert.equal(ledger.dispatch(proposal,fixture(ledger,{value:'16.00'})),null);
 assert.equal(ledger.snapshot().entries.length,0);
});

test('review: mismatched or absent readback remains uncertain through serialization',()=>{
 for(const readback of [undefined,'15.00','18']){
  const ledger=createNumericLedger(),request=fixture(ledger),id=ledger.dispatch(action(request),request);
  ledger.settle(id,'tool_succeeded',readback);
  const resumed=createNumericLedger(JSON.parse(JSON.stringify(ledger.snapshot())));
  assert.equal(resumed.snapshot().entries[0].status,'uncertain');
  assert.equal(action(fixture(resumed,{value:'18.00',ref:'e91'})),null);
  assert.equal(action(fixture(resumed,{value:'15.00',ref:'e92'})),null,'Even an unchanged value is not permission to replay an uncertain write');
 }
});

test('review: another rendering of the same logical field cannot apply its relative change again',()=>{
 const ledger=createNumericLedger(),initial=fixture(ledger),id=ledger.dispatch(action(initial),initial);
 ledger.settle(id,'tool_succeeded','18.00');
 for(const [name,type] of [['Charge','number'],[' charge ','text'],['CHARGE','number']]){
  const revisit=fixture(ledger,{value:'18.00',ref:'e72'});
  revisit.field.name=name;revisit.observation.refs.e72.name=name;revisit.observation.refs.e72.inputType=type;
  revisit.observation.snapshot=`- statictext "Registry key: K17"\n- textbox ${JSON.stringify(name)} [ref=e72]: 18.00`;
  assert.equal(action(revisit),null,`${name}/${type} describes the already edited field`);
 }
});

test('review: ledger snapshots do not share mutable state and old proposal revisions cannot replay',()=>{
 const ledger=createNumericLedger(),request=fixture(ledger),proposal=action(request);
 const id=ledger.dispatch(proposal,request);ledger.settle(id,'not_dispatched');
 assert.equal(ledger.dispatch(proposal,request),null);
 const fresh=fixture(ledger),newId=ledger.dispatch(action(fresh),fresh);assert.ok(newId);
 const snapshot=ledger.snapshot();snapshot.entries[0].sourceValue='999';snapshot.entries.length=0;
 assert.equal(ledger.snapshot().entries[0].sourceValue,'15.00');
});

test('review: malformed ledger containers and statuses fail closed',()=>{
 const ledger=createNumericLedger(),request=fixture(ledger);ledger.dispatch(action(request),request);
 const valid=ledger.snapshot();
 for(const broken of [{...valid,schema:2},{...valid,revision:-1},{...valid,entries:{}},
  {...valid,entries:[{...valid.entries[0],status:'saved'}]},
  {...valid,entries:[valid.entries[0],valid.entries[0]]},
  {...valid,entries:[{...valid.entries[0],anchor:{kind:'readonly',label:'ID',text:''}}]}])
  assert.throws(()=>createNumericLedger(broken),TypeError);
});

test('review: editable descendants and invisible readonly controls cannot become reusable anchors',()=>{
 const ledger=createNumericLedger(),request=fixture(ledger);
 request.observation.snapshot='- textbox "Charge" [ref=e1]: 15.00\n  - statictext "Registry key: K17"';
 request.observation.refs.e9={role:'textbox',name:'Invisible key',readonly:true,exactValue:'K18'};
 const anchors=Object.values(numericIdentityAnchors(request,request.field));
 assert.equal(anchors.some(a=>a.kind==='readonly'),false);
});

test('review: legacy step locks survive history truncation and history-only old tokens stay locked',async()=>{
 for(const legacy of [{numericEdits:[0],history:[]},{history:[{stepIndex:0,action:{source:'numeric_value_binding'},outcome:'unknown'}]}]){
  const sessionId=randomUUID(),observation=fixture(createNumericLedger()).observation;
  const continuation={schema:1,sessionId,intentOrSteps:[intent],scope,stepIndex:0,progressAssessment:[],...legacy};
  let observed=false;
  const result=await act({browser:{sessionId,observe:async()=>observation,execute:async()=>assert.fail('Legacy lock dispatched')},intentOrSteps:intent,scope,continuation,
   authorize:()=>true,decide:async request=>{
    observed=true;assert.equal(request.numericEditBound,true);
    const field=Object.values(request.candidates).find(a=>a.op==='request_input'&&a.name==='Charge');
    assert.equal(valueBindingRequest(request,field).state.computedValues,undefined);
    return {binding:request.binding,choice:'handoff',modelCalled:false};
   }});
  assert.equal(observed,true);assert.deepEqual(result.continuation.numericEdits,[0]);
  assert.deepEqual(result.continuation.numericLedger.entries,[]);
 }
});

test('review: act preserves uncertain dispatch on execution failure and never sends a second gesture',async()=>{
 let calls=0;
 const ledger=createNumericLedger(),observation=fixture(ledger).observation;
 const result=await act({browser:{sessionId:randomUUID(),observe:async()=>observation,execute:async()=>{calls++;throw Error('Transport outcome unavailable');}},
  intentOrSteps:intent,scope,authorize:()=>true,decide:async request=>{
   const fill=Object.entries(request.candidates).find(([,a])=>a.source==='numeric_value_binding');
   if(fill)return {binding:request.binding,choice:fill[0],modelCalled:false};
   const field=Object.values(request.candidates).find(a=>a.op==='request_input'&&a.name==='Charge');
   return {binding:request.binding,assessment:true,valueBinding:bind({...request,field}),modelCalled:false};
  }});
 assert.equal(calls,1);assert.equal(result.returnReason,'action_outcome_unknown');
 assert.equal(result.continuation.numericLedger.entries[0].status,'uncertain');
 assert.equal(result.continuation.numericLedger.entries[0].sourceValue,'15.00');
});
