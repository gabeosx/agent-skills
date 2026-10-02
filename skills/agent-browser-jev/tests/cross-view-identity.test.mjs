import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {objectObservations} from '../scripts/object-context.mjs';
import {createCrossViewIdentity} from '../scripts/cross-view-identity.mjs';
import {createNumericLedger} from '../scripts/numeric-ledger.mjs';
import {valueBindingRequest,acceptValueBinding,groundedValueAction,valueBindingFrame} from '../scripts/value-binding.mjs';
import {agentBrowser} from '../scripts/agent-browser-jev.mjs';
import {act} from '../scripts/jev-browser.mjs';
const intent='Increase Charge by 20% on the requested records.';
function listing(){
 const snapshot='- heading "Registry"\n- table\n  - row\n    - columnheader "Registry key"\n    - columnheader "Label"\n    - columnheader "Color"\n    - columnheader "Charge"\n  - row\n    - cell "Q4"\n    - cell "Item"\n      - link "Open" [ref=e1]\n    - cell "Blue"\n    - cell "15.00"\n  - row\n    - cell "Q5"\n    - cell "Item"\n      - link "Open" [ref=e2]\n    - cell "Blue"\n    - cell "15.00"';
 return objectObservations({snapshot,refs:{e1:{role:'link',name:'Open'},e2:{role:'link',name:'Open'}}})[0];
}
function detail(code='Q4',{offset=0,charge='15.00',identityName='External code'}={}){
 const refs={},snapshot=[`- heading "Edit item"`];
 for(const [index,name,value]of [[1,identityName,code],[2,'Charge',charge],[3,'Color','Blue']]){refs['e'+(index+offset)]={role:'textbox',name,inputType:'text',exactValue:value};snapshot.push(`- textbox ${JSON.stringify(name)} [ref=e${index+offset}]: ${value}`);}
 return {snapshot:snapshot.join('\n'),refs};
}
function witness(code='Q4',ref='@e1'){
 const state=createCrossViewIdentity();state.record({action:{op:'click',ref,role:'link',name:'Open'},before:listing(),after:detail(code),outcome:'tool_succeeded'},{stepIndex:0,intent,verdict:'navigation'});return state;
}
function request(state,ledger=createNumericLedger(),ob=detail()){
 const [ref,c]=Object.entries(ob.refs).find(([,c])=>c.name==='Charge'),field={op:'request_input',ref:'@'+ref,role:c.role,name:c.name};
 return {intent,scope:'Requested records',context:'',stepIndex:0,observation:ob,candidates:{field},field,suppliedValues:{},numericLedger:ledger.snapshot(),crossViewWitness:state.forRequest({stepIndex:0,intent})};
}
function bind(r,{role='stable_identifier'}={}){
 const p=valueBindingRequest(r,r.field),id=Object.keys(p.state.numericIdentityEvidence.witnesses)[0];if(!id)return null;
 const anchor=p.state.numericIdentityEvidence.anchors[id],prior=r.numericLedger.entries.find(e=>e.anchor.text===anchor.text);
 const choices={valueSource:'derived:0:percent_add',numericIdentity:id,numericTarget:prior?.targetId??'new_target',...(p.questions.numericField?{numericField:'new_field'}:{}),numericWitnessRole:role};
 let b=acceptValueBinding({answers:Object.fromEntries(Object.entries(choices).map(([k,choice])=>[k,{type:'choice',choice}]))},r,r.field,p);
 if(b?.numericTarget){const next=valueBindingRequest(r,r.field,b);b=next&&acceptValueBinding({answers:{numericField:{type:'choice',choice:'new_field'}}},r,r.field,next,b);}
 return b&&{...b,ref:r.field.ref,frame:valueBindingFrame(r.observation)};
}
function action(r,options){const b=bind(r,options);return b&&groundedValueAction(r,r.candidates,b);}

test('readonly row identity follows its own reviewed navigation to a fresh editable identifier, without editing identity',()=>{
 const state=witness(),ledger=createNumericLedger(),r=request(state,ledger),a=action(r);
 assert.ok(a);assert.equal(a.valueOrigin.ledger.witness.detail.ref,'@e1');assert.equal(a.ref,'@e2');assert.equal(a.valueOrigin.ledger.witness.detail.editable,true);
 assert.equal(r.observation.refs.e1.readonly,undefined);assert.equal(ledger.allowed(a,r),true);
 const omitted=structuredClone(a);delete omitted.valueOrigin.ledger.witness;assert.equal(ledger.allowed(omitted,r),false);
 assert.equal(action(r,{role:'non_identity'}),null);assert.equal(action(r,{role:'unknown'}),null);
});

test('wrong detail sharing price and common color cannot inherit row identity; unknown, duplicate and non-row evidence do not bind',()=>{
 const state=witness('WRONG');assert.deepEqual(state.snapshot().anchors,[{kind:'readonly',label:'Registry key',text:'Q4'}]);
 assert.equal(action(request(state,createNumericLedger(),detail('WRONG'))),null);
 const duplicated=detail();duplicated.refs.e7={role:'textbox',name:'Other code',inputType:'text',exactValue:'Q4'};duplicated.snapshot+='\n- textbox "Other code" [ref=e7]: Q4';
 assert.equal(action(request(state,createNumericLedger(),duplicated)),null);
 for(const variant of ['unreviewed','wrong-owner','unknown']){
  const w=createCrossViewIdentity(),before=listing();if(variant==='wrong-owner')before.objectContext.owners.e1='root';
  w.record({action:{op:'click',ref:'@e1',role:'link',name:'Open'},before,after:detail(),outcome:variant==='unknown'?'unknown':'tool_succeeded'},{stepIndex:0,intent,verdict:variant==='unreviewed'?undefined:'navigation'});
  assert.equal(w.snapshot(),null);
 }
});

test('witness survives same-page field edits and resume/ref churn; unrelated navigation and changed task context invalidate it',()=>{
 const state=witness();state.record({action:{op:'fill',ref:'@e2'},before:detail(),after:detail('Q4',{charge:'18.00'}),outcome:'tool_succeeded'},{stepIndex:0,intent,verdict:'preparation'});
 const saved=JSON.parse(JSON.stringify(state.snapshot())),restored=createCrossViewIdentity(saved);
 assert.ok(action(request(restored,createNumericLedger(),detail('Q4',{offset:30,identityName:'Registry reference'}))));
 assert.equal(restored.forRequest({stepIndex:0,intent,context:'Different scope'}),null);
 assert.equal(restored.forRequest({stepIndex:1,intent}),null);
 restored.record({action:{op:'back'},before:detail(),after:listing(),outcome:'tool_succeeded'},{stepIndex:0,intent});assert.equal(restored.snapshot(),null);
 const other=witness();other.record({action:{op:'click',ref:'@e1'},before:detail(),after:detail(),outcome:'tool_succeeded'},{stepIndex:0,intent,verdict:'navigation'});assert.equal(other.snapshot(),null);
 for(const op of ['press','select','fill']){const moved=witness(),before={...detail(),location:{origin:'https://example.test',identity:'a'.repeat(32)}},after={...detail(),location:{origin:'https://example.test',identity:'b'.repeat(32)}};moved.record({action:{op},before,after,outcome:'tool_succeeded'},{stepIndex:0,intent,verdict:'preparation'});assert.equal(moved.snapshot(),null,op+' changed the observed location');}
});

test('observed row identity cell metadata survives structural capture windows without exposing editable cell aggregates',()=>{
 const full=listing();const rows=full.objectContext.objects.filter(o=>o.cells);assert.equal(rows.length,2);assert.deepEqual(rows[0].cells[0],{label:'Registry key',text:'Q4',readonly:true});
 const data={snapshot:'- table\n  - row\n    - columnheader "Key"\n    - columnheader "Charge"\n  - row\n    - cell "Q7"\n    - cell "15.00"\n      - textbox "Charge" [ref=e1]: 15.00',refs:{e1:{role:'textbox',name:'Charge'}}};
 const observed=objectObservations(data)[0],row=observed.objectContext.objects.find(o=>o.cells);assert.equal(row.cells[1].readonly,false);
});

test('native identity drift or newly sensitive type blocks before numeric reads and fill',async()=>{
 const r=request(witness()),a=action(r);
 for(const mode of ['same','changed','sensitive']){
  const dir=await mkdtemp(join(tmpdir(),'jev-witness-')),binary=join(dir,'browser.mjs'),log=join(dir,'calls');
  try{
   await writeFile(binary,`#!/usr/bin/env node\nimport {appendFileSync} from 'node:fs';const a=process.argv.slice(process.argv.indexOf('--json')+1);appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+'\\n');let value=null;if(a[0]==='get'&&a[1]==='attr'&&a[3]==='type')value=a[2]==='@e1'&&${JSON.stringify(mode)}==='sensitive'?'password':'text';if(a[0]==='get'&&a[1]==='value')value=a[2]==='@e1'?${JSON.stringify(mode==='changed'?'Q5':'Q4')}:'15.00';process.stdout.write(JSON.stringify({success:true,data:{value}}));\n`);await chmod(binary,0o700);
   const browser=agentBrowser({binary,sessionId:'witness-'+mode,sanitize:x=>x});
   if(mode==='same')await browser.execute(a);else await assert.rejects(()=>browser.execute(a),e=>e.code==='JEV_NOT_DISPATCHED');
   const calls=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);
   assert.equal(calls.some(c=>c[0]==='fill'),mode==='same');if(mode==='sensitive')assert.equal(calls.some(c=>c[0]==='get'&&c[1]==='value'),false);
  }finally{await rm(dir,{recursive:true,force:true});}
 }
});

test('act records a row-owned navigation witness before its value binding and preserves it in continuation',async()=>{
 let current=listing(),writes=0,opened=false;
 const browser={sessionId:'witness-act-fixture',observe:async()=>current,execute:async a=>{if(a.op==='click'){opened=true;current=detail();}else{writes++;current=detail('Q4',{charge:a.value});}}};
 const result=await act({browser,intentOrSteps:intent,scope:'Requested records',authorize:()=>true,decide:async r=>{
  if(!opened){const [choice]=Object.entries(r.candidates).find(([,a])=>a.op==='click'&&a.ref==='@e1');return {binding:r.binding,choice,modelCalled:false,goalFacts:{actionCheck:{verdict:'navigation'}}};}
  if(writes)return {binding:r.binding,choice:'handoff',modelCalled:false};
  const existing=Object.entries(r.candidates).find(([,a])=>a.source==='numeric_value_binding');if(existing)return {binding:r.binding,choice:existing[0],modelCalled:false};
  assert.ok(r.crossViewWitness);const field=Object.values(r.candidates).find(a=>a.op==='request_input'&&a.name==='Charge');return {binding:r.binding,assessment:true,valueBinding:bind({...r,field}),modelCalled:false};
 }});
 assert.equal(writes,1);assert.ok(result.continuation.crossViewIdentity);assert.equal(result.continuation.numericLedger.entries[0].sourceValue,'15.00');
});
