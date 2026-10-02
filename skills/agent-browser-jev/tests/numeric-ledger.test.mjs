import test from 'node:test';
import assert from 'node:assert/strict';
import {createNumericLedger,numericIdentityAnchors} from '../scripts/numeric-ledger.mjs';
import {valueBindingRequest,acceptValueBinding,groundedValueAction,valueBindingFrame} from '../scripts/value-binding.mjs';
import {act} from '../scripts/jev-browser.mjs';
import {sealResume,openResume} from '../scripts/run.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';
const intent='Increase Charge and Allowance for each requested record by 20%.';
function observation({record='R17',charge='15.00',allowance='30.00',offset=0,heading='Record details',identity=true}={}){
 const refs={};const lines=[`- heading ${JSON.stringify(heading)}`];
 if(identity){refs['e'+(9+offset)]={role:'textbox',name:'Record code',inputType:'text',readonly:true,exactValue:record};lines.push(`- textbox "Record code" [ref=e${9+offset}]: ${record}`);}
 for(const [i,name,value] of [[1,'Charge',charge],[2,'Allowance',allowance]]){refs['e'+(i+offset)]={role:'textbox',name,inputType:'text',exactValue:value};lines.push(`- textbox "${name}" [ref=e${i+offset}]: ${value}`);}
 return {snapshot:lines.join('\n'),refs};
}
function request(ledger,ob=observation(),name='Charge'){
 const [ref,c]=Object.entries(ob.refs).find(([,c])=>c.name===name),field={op:'request_input',ref:'@'+ref,role:c.role,name:c.name};
 return {intent,stepIndex:0,scope:'Requested records only',context:'',observation:ob,candidates:{field},numericLedger:ledger.snapshot(),suppliedValues:{},field};
}
function bind(r,{target,field='new_field',anchor,derived='derived:0:percent_add'}={}){
 const f=r.field??Object.values(r.candidates).find(a=>a.op==='request_input'&&a.name==='Charge'),p=valueBindingRequest(r,f);
 const choices=p.state.numericIdentityEvidence.anchors;
 anchor??=Object.entries(choices).find(([,a])=>a.kind==='readonly')?.[0]??Object.keys(choices)[0];
 const sameTarget=r.numericLedger.entries.find(e=>JSON.stringify(e.anchor)===JSON.stringify(choices[anchor]));
 const response={answers:Object.fromEntries(Object.entries({valueSource:derived,numericIdentity:anchor,numericTarget:target??sameTarget?.targetId??'new_target',...(p.questions.numericField?{numericField:field}:{})}).map(([k,choice])=>[k,{type:'choice',choice}]))};
 let b=acceptValueBinding(response,r,f,p);if(!b)return null;
 if(b.numericTarget){const next=valueBindingRequest(r,f,b);if(!next)return null;b=acceptValueBinding({answers:{numericField:{type:'choice',choice:field}}},r,f,next,b);if(!b)return null;}
 return {...b,ref:f.ref,frame:valueBindingFrame(r.observation)};
}
function action(r,options){const b=bind(r,options);return b&&groundedValueAction(r,r.candidates,b);}

test('ledger keeps separate original sources for two records and two fields, and excludes proposals',()=>{
 const ledger=createNumericLedger();let r=request(ledger),a=action(r);
 assert.equal(ledger.snapshot().entries.length,0);
 let id=ledger.dispatch(a,r);assert.ok(id);ledger.settle(id,'tool_succeeded','18.00');
 r=request(ledger,observation({record:'R18'}));a=action(r);assert.equal(a.value,'18.00');id=ledger.dispatch(a,r);ledger.settle(id,'tool_succeeded','18.00');
 r=request(ledger,observation({record:'R17',charge:'18.00'}),'Allowance');a=action(r);assert.equal(a.value,'36.00');id=ledger.dispatch(a,r);ledger.settle(id,'tool_succeeded','36.00');
 assert.deepEqual(ledger.snapshot().entries.map(e=>[e.anchor.text,e.field.name,e.sourceValue,e.value,e.status]),[['R17','Charge','15.00','18.00','prepared'],['R18','Charge','15.00','18.00','prepared'],['R17','Allowance','30.00','36.00','prepared']]);
 assert.equal(new Set(ledger.snapshot().entries.map(e=>e.targetId)).size,2);
});

test('ref churn, new route and renamed headings do not restart a calculation; ambiguous and mislabeled new targets stop',()=>{
 const ledger=createNumericLedger(),r=request(ledger),a=action(r),id=ledger.dispatch(a,r);ledger.settle(id,'tool_succeeded','18.00');
 const ob=observation({offset:20,charge:'18.00',heading:'Another view of this record'});ob.location={origin:'https://example.test',identity:'b'.repeat(32)};
 const revisit=request(ledger,ob);
 assert.equal(action(revisit),null);assert.equal(action(revisit,{target:'new_target'}),null);
 assert.equal(action(revisit,{target:'unknown'}),null);
 // Synonymous field labels are semantic aliases: an explicit prior-field
 // binding withholds arithmetic even though its accessible label differs.
 const renamed=structuredClone(ob);renamed.refs.e21.name='Unit charge';renamed.snapshot=renamed.snapshot.replace('"Charge"','"Unit charge"');
 assert.equal(action(request(ledger,renamed,'Unit charge'),{field:id}),null);
});

test('weak headings allow the existing isolated edit but never establish a second object or field',()=>{
 const ledger=createNumericLedger(),r=request(ledger,observation({identity:false,heading:'Widget A'}));const a=action(r);assert.ok(a);
 const id=ledger.dispatch(a,r);ledger.settle(id,'tool_succeeded','18.00');
 assert.equal(action(request(ledger,observation({identity:false,heading:'Widget-A',charge:'18.00'}))),null);
 assert.equal(action(request(ledger,observation({identity:false,heading:'Widget A'}),'Allowance')),null);
 assert.equal(action(request(ledger,observation({record:'A'}))),null);
});

test('not-dispatched releases only that attempt; uncertain and completed writes survive resume and truncated history',()=>{
 const ledger=createNumericLedger(),r=request(ledger),a=action(r);let id=ledger.dispatch(a,r);ledger.settle(id,'not_dispatched');assert.equal(ledger.snapshot().entries.length,0);
 const fresh=request(ledger);id=ledger.dispatch(action(fresh),fresh);ledger.settle(id,'unknown');
 const token=sealResume({invocation:{intentOrSteps:intent},continuation:{numericLedger:ledger.snapshot()}},'ledger-fixture-key');
 const restored=createNumericLedger(openResume(token,'ledger-fixture-key').continuation.numericLedger);
 const revisit=request(restored,observation({charge:'18.00',offset:10}));revisit.history=Array.from({length:30},()=>({action:{op:'click'}}));
 assert.equal(action(revisit),null);assert.equal(restored.snapshot().entries[0].sourceValue,'15.00');assert.equal(restored.snapshot().entries[0].value,'18.00');assert.equal(restored.snapshot().entries[0].status,'uncertain');
 assert.equal(restored.allowed(a,r),false,'A stale ledger revision cannot dispatch');
});

test('labeled static details and leaf table cells provide readonly identity evidence without a label lexicon',()=>{
 let ob=observation({identity:false});ob.snapshot='- statictext "Registry key: K17"\n'+ob.snapshot;
 assert.ok(Object.values(numericIdentityAnchors(request(createNumericLedger(),ob),{ref:'@e1',role:'textbox',name:'Charge'})).some(a=>a.kind==='readonly'&&a.label==='Registry key'&&a.text==='K17'));
 ob={snapshot:'- table\n  - row\n    - columnheader "Registry key"\n    - columnheader "Charge"\n  - row\n    - cell "K18"\n    - cell "15.00"\n      - textbox "Charge" [ref=e1]: 15.00',refs:{e1:{role:'textbox',name:'Charge',inputType:'text',exactValue:'15.00'}},objectContext:{basis:'one_observed_accessibility_tree',objects:[{id:'root',role:'document',headings:[]},{id:'o4',parentId:'root',role:'row',text:'K18'}],owners:{e1:'o4'}}};
 const anchors=Object.values(numericIdentityAnchors(request(createNumericLedger(),ob),{ref:'@e1',role:'textbox',name:'Charge'}));
 assert.ok(anchors.some(a=>a.kind==='readonly'&&a.label==='Registry key'&&a.text==='K18'));assert.ok(!anchors.some(a=>a.kind==='readonly'&&a.label==='Charge'));
});

test('act dispatches two distinct records once each and preserves successful source baselines',async()=>{
 let ob=observation(),executed=0;
 const browser={sessionId:'ledger-two-records',observe:async()=>ob,execute:async a=>{assert.equal(a.source,'numeric_value_binding');executed++;ob=observation({record:executed===1?'R17':'R18',charge:a.value});}};
 const result=await act({browser,intentOrSteps:intent,scope:'Requested records only',authorize:()=>true,decide:async r=>{
  if(executed===2)return {binding:r.binding,choice:'handoff',modelCalled:false};
  const fill=Object.entries(r.candidates).find(([,a])=>a.source==='numeric_value_binding');if(fill)return {binding:r.binding,choice:fill[0],modelCalled:false};
  if(executed===1&&ob.refs.e9.exactValue==='R17'){
   // A fresh browser-owned observation, as after a caller-visible navigation.
   // The next invocation below binds the second record; no stale ref is reused.
   return {binding:r.binding,choice:'handoff',modelCalled:false};
  }
  r={...r,field:Object.values(r.candidates).find(a=>a.op==='request_input'&&a.name==='Charge')};return {binding:r.binding,assessment:true,valueBinding:bind(r),modelCalled:false};
 }});
 assert.equal(executed,1);assert.equal(result.continuation.numericLedger.entries[0].status,'prepared');
 ob=observation({record:'R18',offset:30});
 const resumed=await act({browser,intentOrSteps:intent,scope:'Requested records only',continuation:result.continuation,authorize:()=>true,decide:async r=>{
  if(executed===2)return {binding:r.binding,choice:'handoff',modelCalled:false};
  const fill=Object.entries(r.candidates).find(([,a])=>a.source==='numeric_value_binding');if(fill)return {binding:r.binding,choice:fill[0],modelCalled:false};
  r={...r,field:Object.values(r.candidates).find(a=>a.op==='request_input'&&a.name==='Charge')};return {binding:r.binding,assessment:true,valueBinding:bind(r),modelCalled:false};
 }});
 assert.equal(executed,2);assert.equal(resumed.continuation.numericLedger.entries.length,2);assert.deepEqual(resumed.continuation.numericLedger.entries.map(e=>e.sourceValue),['15.00','15.00']);
});

test('the persistent decider offers a fresh calculation for a second proven record instead of consuming the whole step at proposal time',async()=>{
 const ledger=createNumericLedger();let current=request(ledger),bindings=0;
 const decide=jevDecider({alpha:{decisions:{create:async({decisionsRequest:p})=>{
  if(p.questions.source)return {answers:{source:{type:'choice',choice:'unconstrained'},evidence:{type:'choice',choice:'unknown'}},usage:{cost:0}};
  if(p.questions.action)return {answers:{action:{type:'choice',choice:'field'}},usage:{cost:0}};
  if(p.questions.valueSource){bindings++;assert.ok(p.state.computedValues);const anchor=Object.entries(p.state.numericIdentityEvidence.anchors).find(([,a])=>a.kind==='readonly')[0];return {answers:Object.fromEntries(Object.entries({valueSource:'derived:0:percent_add',numericIdentity:anchor,numericTarget:'new_target',...(p.questions.numericField?{numericField:'new_field'}:{})}).map(([k,choice])=>[k,{type:'choice',choice}])),usage:{cost:0}};}
  if(p.questions.numericField)return {answers:{numericField:{type:'choice',choice:'new_field'}},usage:{cost:0}};
  assert.fail('Unexpected semantic question '+Object.keys(p.questions));
 }}}});
 async function resolve(r){r={...r,binding:'fixture-binding',sessionId:'numeric-decider',history:[],candidateWindow:{page:1,pages:1},candidates:{...r.candidates,handoff:{op:'handoff'}}};for(let n=0;n<12;n++){const d=await decide(r);if(d.valueBinding)return groundedValueAction(r,r.candidates,d.valueBinding);}assert.fail('No binding');}
 const first=await resolve(current);assert.equal(first.value,'18.00');const id=ledger.dispatch(first,current);ledger.settle(id,'tool_succeeded','18.00');
 current=request(ledger,observation({record:'R18'}));const second=await resolve(current);assert.equal(second.value,'18.00');assert.equal(bindings,2);assert.notEqual(first.valueOrigin.ledger.targetId,second.valueOrigin.ledger.targetId);
});
