import test from 'node:test';import assert from 'node:assert/strict';
import {exactNumericChange,numericValueOptions,validateNumericSource} from '../scripts/numeric-value.mjs';
import {valueBindingRequest,acceptValueBinding,groundedValueAction,valueBindingFrame} from '../scripts/value-binding.mjs';
const field={op:'request_input',ref:'@e1',role:'textbox',name:'Adjustment'};
function request(value='69.00',intent='Reduce the current adjustment by 10%'){return {intent,scope:'Test',suppliedValues:{},observation:{snapshot:'- textbox "Adjustment" [ref=e1]: '+value,refs:{e1:{role:'textbox',name:'Adjustment',inputType:'text',exactValue:value}}},candidates:{field}};}
test('code performs exact decimal amount and percentage changes without floating-point error or invented rounding',()=>{
 assert.equal(exactNumericChange('0.10','0.20','add'),'0.30');assert.equal(exactNumericChange('69.00','10','percent_subtract'),'62.10');
 assert.equal(exactNumericChange('69.00','10.25','percent_subtract'),'61.9275');assert.equal(exactNumericChange('0.01','10','percent_subtract'),'0.009');
 assert.equal(exactNumericChange('-4.20','3','add'),'-1.20');assert.equal(exactNumericChange('120','10','percent_add'),'132');assert.equal(exactNumericChange('15.00','5','subtract'),'10.00');
 assert.equal(exactNumericChange('69','1/3','subtract'),null);assert.equal(exactNumericChange('69','3','divide'),null);
});
test('Jev binds the offered operation to the original goal; code validates the span, field, source and result',()=>{
 const r=request(),p=valueBindingRequest(r,field);assert.equal(p.state.computedValues['derived:0:percent_subtract'].value,'62.10');
 const b=acceptValueBinding({answers:{valueSource:{type:'choice',choice:'derived:0:percent_subtract'}}},r,field,p);
 b.ref=field.ref;b.frame=valueBindingFrame(r.observation);const a=groundedValueAction(r,r.candidates,b);assert.equal(a.value,'62.10');assert.equal(a.source,'numeric_value_binding');
 validateNumericSource(a,'69.00');assert.throws(()=>validateNumericSource(a,'70.00'),e=>e.code==='JEV_NOT_DISPATCHED');
 const forged=structuredClone(b);forged.value='1.00';assert.equal(groundedValueAction(r,r.candidates,forged),null);
 const changed=request('69.00','Reduce another item by 10%');assert.equal(groundedValueAction(changed,changed.candidates,b),null);
 const missing=structuredClone(r);delete missing.observation.refs.e1;assert.equal(groundedValueAction(missing,missing.candidates,b),null);
});
test('missing, readonly, secret, unrepresented and already-used source changes provide no arithmetic offer',()=>{
 assert.deepEqual(numericValueOptions(request(''),field),{});assert.deepEqual(numericValueOptions(request('1e3'),field),{});
 for(const attr of [{readonly:true},{disabled:true},{inputType:'password'}]){const r=request();Object.assign(r.observation.refs.e1,attr);assert.deepEqual(numericValueOptions(r,field),{});}
 assert.deepEqual(numericValueOptions(request('69.00','Reduce the adjustment by half'),field),{});
 const used=request('62.10');used.history=[{action:{source:'numeric_value_binding'}}];assert.deepEqual(numericValueOptions(used,field),{});
 const bound=request('62.10');bound.numericEditBound=true;assert.deepEqual(numericValueOptions(bound,field),{});
});
import {agentBrowser} from '../scripts/agent-browser-jev.mjs';
import {mkdtemp,writeFile,chmod,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
test('native numeric source freshness is checked before dispatch and changed sensitive types are not read',async()=>{
 const r=request(),p=valueBindingRequest(r,field),b=acceptValueBinding({answers:{valueSource:{type:'choice',choice:'derived:0:percent_subtract'}}},r,field,p);Object.assign(b,{ref:field.ref,frame:valueBindingFrame(r.observation)});const action=groundedValueAction(r,r.candidates,b);
 for(const mode of ['unchanged','changed','sensitive']){
  const d=await mkdtemp(join(tmpdir(),'jev-number-proof-')),binary=join(d,'browser'),log=join(d,'calls');
  try{await writeFile(binary,`#!/usr/bin/env node\nimport {appendFileSync} from 'node:fs';const a=process.argv.slice(process.argv.indexOf('--json')+1);appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+'\\n');let value=null;if(a[0]==='get'&&a[1]==='value')value=${JSON.stringify(mode==='changed'?'70.00':'69.00')};if(a[0]==='get'&&a[1]==='attr'&&a[3]==='type')value=${JSON.stringify(mode==='sensitive'?'password':'text')};process.stdout.write(JSON.stringify({success:true,data:{value}}));\n`);await chmod(binary,0o700);const browser=agentBrowser({binary,sessionId:'fixture-'+mode,sanitize:x=>x});if(mode==='unchanged')await browser.execute(action);else await assert.rejects(()=>browser.execute(action),e=>e.code==='JEV_NOT_DISPATCHED');const calls=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(calls.some(x=>x[0]==='fill'),mode==='unchanged');if(mode==='sensitive')assert.equal(calls.some(x=>x[0]==='get'&&x[1]==='value'),false);
  }finally{await rm(d,{recursive:true,force:true});}
 }
});
import {act} from '../scripts/jev-browser.mjs';
import {sealResume,openResume} from '../scripts/run.mjs';
test('numeric dispatch protection survives truncated history and resume, while another step remains available',async()=>{
 const sessionId='numeric-resume-test';const observation=request().observation;
 let current=structuredClone(observation),executed=0;
 const first=await act({browser:{sessionId,observe:async()=>current,execute:async a=>{assert.equal(a.source,'numeric_value_binding');executed++;current=structuredClone(observation);current.refs.e1.exactValue=a.value;current.snapshot=current.snapshot.replace('69.00',a.value);}},scope:'Test',intentOrSteps:request().intent,authorize:()=>true,decide:async req=>{
  if(executed)return {binding:req.binding,choice:'handoff',modelCalled:false};
  const fill=Object.entries(req.candidates).find(([,a])=>a.source==='numeric_value_binding');if(fill)return {binding:req.binding,choice:fill[0],modelCalled:false};
  const destination=Object.values(req.candidates).find(a=>a.op==='request_input'&&a.ref==='@e1');const payload=valueBindingRequest(req,destination),b=acceptValueBinding({answers:{valueSource:{type:'choice',choice:'derived:0:percent_subtract'},numericIdentity:{type:'choice',choice:'anchor_0'},numericTarget:{type:'choice',choice:'new_target'},...(payload.questions.numericField?{numericField:{type:'choice',choice:'new_field'}}:{})}},req,destination,payload);Object.assign(b,{ref:destination.ref,frame:valueBindingFrame(req.observation)});return {binding:req.binding,assessment:true,valueBinding:b,modelCalled:false};
 }});
 assert.equal(executed,1);assert.deepEqual(first.continuation.numericEdits,[]);assert.equal(first.continuation.numericLedger.entries[0].sourceValue,'69.00');
 const token=sealResume({invocation:{intentOrSteps:request().intent},continuation:first.continuation},'synthetic-resume-key');const decoded=openResume(token,'synthetic-resume-key');assert.equal(decoded.continuation.numericLedger.entries[0].value,'62.10');
 // A legacy token cannot reconstruct target ownership from a truncated tail.
 const continuation={schema:1,sessionId,intentOrSteps:['Reduce the current adjustment by10%'],scope:'Test',stepIndex:0,suppliedValues:{},history:Array.from({length:30},()=>({stepIndex:0,action:{op:'click',name:'Inspect'},outcome:'tool_succeeded'})),progressAssessment:[],numericEdits:[0]};
 const r=await act({browser:{sessionId,observe:async()=>observation,execute:async()=>assert.fail('No dispatch expected')},scope:'Test',intentOrSteps:continuation.intentOrSteps,continuation,authorize:()=>true,decide:async req=>{assert.equal(req.numericEditBound,true);assert.deepEqual(numericValueOptions({...req,intent:'Reduce the current adjustment by10%'},field),{});return {binding:req.binding,choice:'handoff',modelCalled:false};}});
 assert.deepEqual(r.continuation.numericEdits,[0]);
 await assert.rejects(()=>act({browser:{sessionId},scope:'Test',intentOrSteps:continuation.intentOrSteps,continuation:{...continuation,numericEdits:[-1]},decide:()=>{}}),/Invalid numeric continuation/);
 assert.ok(Object.keys(numericValueOptions(request(),field)).length>0);
});
