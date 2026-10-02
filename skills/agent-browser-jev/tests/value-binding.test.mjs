import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {valueSources,valueBindingFrame,valueBindingRequest,acceptValueBinding,groundedValueAction,validateValueSource} from '../scripts/value-binding.mjs';
import {act,discoverActions} from '../scripts/jev-browser.mjs';
import {jevDecider,agentBrowser} from '../scripts/agent-browser-jev.mjs';
import {definitions,verifyValueEffects} from './value-binding-fixtures.mjs';
import {observedFields,inputPreparationEvidence} from '../scripts/review-evidence.mjs';
const field={op:'request_input',ref:'@e2',role:'textbox',name:'Destination'};
const request={intent:'Copy the source to Destination.',scope:'Copy only',observation:{snapshot:'- textbox "Source" [ref=e1]: Visible\n- textbox "Destination" [ref=e2]',refs:{e1:{role:'textbox',name:'Source',readonly:true,exactValue:'  Café.\nSecond line!  '},e2:{role:'textbox',name:'Destination'}}}};
const choice=(id,value)=>({answers:{...(id==='completion'?{destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'}}:{}),[id]:{type:'choice',choice:value}}});
const bind=(r=request)=>({ref:field.ref,frame:valueBindingFrame(r.observation),sourceId:'e1',start:0,end:r.observation.refs.e1.exactValue.length,whole:true});
test('numeric spans can exclude adjacent units without inventing or normalizing a value',()=>{
 for(const [intent,value] of [['Set cost to $27.50.','27.50'],['Set the discount to 13%.','13']]){
  const r={...request,intent},start=intent.indexOf(value),end=start+value.length;
  const payload=valueBindingRequest(r,field),id=`caller:span:${start}:${end}`;
  assert.ok(Object.hasOwn(payload.questions.valueSource.criteria,id));
  const binding=acceptValueBinding(choice('valueSource',id),r,field,payload);
  assert.equal(groundedValueAction(r,{c0:field},{...binding,ref:field.ref,frame:valueBindingFrame(r.observation)}).value,value);
 }
 const r={...request,intent:'Find item ZZ27X.'},start=r.intent.indexOf('27');
 assert.equal(groundedValueAction(r,{c0:field},{sourceId:'caller',start,end:start+2,ref:field.ref,frame:valueBindingFrame(r.observation)}),null);
});
test('whole-field copying preserves all source bytes, allows readonly source and does not accept model text',()=>{
 const action=groundedValueAction(request,{c0:field},{...bind(),value:'invented'});
 assert.equal(action.value,'  Café.\nSecond line!  ');assert.equal(action.valueOrigin.ref,'@e1');
 assert.doesNotThrow(()=>validateValueSource(action,request.observation.refs.e1.exactValue));
 assert.throws(()=>validateValueSource(action,request.observation.refs.e1.exactValue.trim()),e=>e.code==='JEV_NOT_DISPATCHED');
 assert.equal(groundedValueAction(request,{c0:{...field,ref:'@e9'}},bind()),null);
 assert.equal(groundedValueAction(request,{c0:field,c1:action},bind()),null);
});
test('source/target identity and exact-value metadata changes invalidate a binding even with identical snapshot',()=>{
 for(const change of [{exactValue:'changed'},{name:'Decoy'},{readonly:false}]){
  const r=structuredClone(request);Object.assign(r.observation.refs.e1,change);
  assert.equal(groundedValueAction(r,{c0:field},bind()),null);
 }
});
test('masked, unobserved, destination and oversized values cannot become sources',()=>{
 for(const change of [{inputType:'password'},{exactValue:'x'.repeat(8193)},{role:'button'}]){
  const r=structuredClone(request);Object.assign(r.observation.refs.e1,change);
  assert.equal(valueSources(r,field).some(s=>s.id==='e1'),false);
 }
 const r=structuredClone(request);r.observation.refs.e99={role:'textbox',exactValue:'not observed'};
 r.observation.refs.e2.exactValue='destination text';
 assert.deepEqual(valueSources(r,field).map(s=>s.id),['caller','e1']);
});
test('conditional caller span selection preserves date slashes, Unicode and excludes surrounding instructions',()=>{
 const r={...request,intent:'Set departure to 10/01/2016 and destination to Côte Nord.'};
 let payload=valueBindingRequest(r,field),selection=acceptValueBinding(choice('valueSource','caller:excerpt'),r,field,payload);
 payload=valueBindingRequest(r,field,selection);
 selection=acceptValueBinding(choice('valueStart',`s${r.intent.indexOf('Côte')}`),r,field,payload,selection);
 payload=valueBindingRequest(r,field,selection);
 const selected=Object.entries(payload.questions.valueSpan.criteria).find(([,text])=>text==='"Côte Nord"')[0];
 selection=acceptValueBinding(choice('valueSpan',selected),r,field,payload,selection);
 assert.equal(groundedValueAction(r,{c0:field},{...selection,ref:field.ref,frame:valueBindingFrame(r.observation)}).value,'Côte Nord');
 assert.throws(()=>acceptValueBinding(choice('valueSpan','e99999'),r,field,payload,selection),/Invalid/);
});
test('short goals offer complete caller values with source offsets, including similar origin/destination values',()=>{
 const r={...request,intent:'Set Origin to IGG and Destination to ARC, then save.'},p=valueBindingRequest(r,field);
 const key=Object.entries(p.questions.valueSource.criteria).find(([,value])=>value.endsWith(': "ARC"'))[0];
 const selected=acceptValueBinding(choice('valueSource',key),r,field,p);
 assert.equal(groundedValueAction(r,{c0:field},{...selected,ref:field.ref,frame:valueBindingFrame(r.observation)}).value,'ARC');
 assert.ok(Object.keys(p.questions.valueSource.criteria).includes('caller:excerpt'));
});
test('exact empty readback takes precedence over serialized field text and exposes failed text preparation',()=>{
 const r={...request,observation:{snapshot:'- textbox "Destination" [ref=e2]: stale',refs:{e2:{role:'textbox',name:'Destination',exactValue:''}}},history:[{outcome:'tool_succeeded',action:{op:'fill',ref:'@e2',role:'textbox',name:'Destination',value:'ARC'}}]};
 assert.equal(observedFields(r)[0].value,'');assert.equal(observedFields(r)[0].basis,'exact_browser_value');
 assert.equal(inputPreparationEvidence(r).fields[0].equalsLastInputValue,false);
});
function fixture({unknown=false,malformed=false}={}){
 let done=false;const actions=[],calls=[];
 const browser={sessionId:randomUUID(),observe:async()=>done?{snapshot:'Saved requested copy.',refs:{}}:request.observation,execute:async action=>{actions.push(action);done=true;}};
 const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
  calls.push(r);let answers;
  if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
  else if(r.questions.valueSource)answers=choice('valueSource',malformed?'e99:whole':unknown?'unknown':'e1:whole').answers;
  else if(r.questions.actionCheck)answers={actionCheck:{type:'choice',choice:'preparation'},suggestedNext:{type:'choice',choice:'none'},literalAssignment:{type:'choice',choice:'matches'}};
  else if(r.questions.completion)answers=choice('completion',done?'complete':'uncertain').answers;
  else{const criteria=r.questions.action.criteria;
   answers=choice('action',done?'step_complete':Object.keys(criteria).find(k=>criteria[k].includes('"source":"exact_value_binding"'))??Object.keys(criteria).find(k=>criteria[k].startsWith('Ask for an exact missing value'))).answers;
  }
  return {answers,usage:{cost:.001}};
 }}}};
 return {browser,decide:jevDecider(api),actions,calls};
}
test('a selected source is offered as an authorized reviewed action and all calls are charged',async()=>{
 const f=fixture(),r=await act({...f,intentOrSteps:request.intent,scope:request.scope,authorize:()=>true});
 assert.equal(r.returnReason,'reported_complete');assert.equal(f.actions.length,1);
 assert.equal(f.actions[0].value,request.observation.refs.e1.exactValue);
 assert.equal(f.calls.filter(r=>r.questions.actionCheck).length,1);
 assert.equal(r.decisions.length,f.calls.length);
});
test('unknown, malformed and unauthorized source copies dispatch no browser mutation',async()=>{
 for(const mode of ['unknown','malformed','unauthorized']){
  const f=fixture({[mode]:true}),r=await act({...f,intentOrSteps:request.intent,scope:request.scope,authorize:a=>mode!=='unauthorized'||a.op!=='fill'});
  assert.equal(r.returnReason,mode==='malformed'?'helper_error':'input_required');assert.equal(f.actions.length,0);
  assert.equal(r.decisions.at(-1).cost,.001);
 }
});
test('fixture scope audit tolerates native clear events but rejects wrong assigned values, destinations and duplicate saves',()=>{
 const d=definitions.find(d=>d.id==='caller-date'),saved={kind:'saved',values:{destination:'10/01/2016'}},
  fill={type:'action',outcome:'tool_succeeded',action:{op:'fill',name:'Departure',value:'10/01/2016'}};
 assert.deepEqual(verifyValueEffects(d,[{kind:'input',field:'destination',value:''},saved],[fill]),{scopeCorrect:true,goalReached:true});
 assert.equal(verifyValueEffects(d,[saved],[{...fill,action:{...fill.action,value:'Wrong'}}]).scopeCorrect,false);
 assert.equal(verifyValueEffects(d,[{kind:'input',field:'other',value:''},saved],[fill]).scopeCorrect,false);
 assert.equal(verifyValueEffects(d,[saved,saved],[fill]).scopeCorrect,false);
});
test('adapter checks current source type and value before dispatch, including a newly masked source',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jev-binding-'));
 try{
  const log=join(root,'calls.json'),binary=join(root,'browser.mjs');
  const action=groundedValueAction(request,{c0:field},bind());
  for(const mode of ['masked','changed','exact']){
   await writeFile(log,'[]');
   await writeFile(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(5),path=${JSON.stringify(log)},calls=JSON.parse(readFileSync(path));calls.push(args);writeFileSync(path,JSON.stringify(calls));
console.log(JSON.stringify({success:true,data:{value:args[1]==='attr'?${mode==='masked'?"'password'":'null'}:${JSON.stringify(mode==='changed'?'changed':action.value)}}}));`,{mode:0o700});
   const browser=agentBrowser({binary,sessionId:'copy-test',sanitize:v=>v});
   if(mode==='exact')await browser.execute(action);
   else await assert.rejects(browser.execute(action),e=>e.code==='JEV_NOT_DISPATCHED');
   const calls=JSON.parse(await readFile(log,'utf8'));
   assert.equal(calls.length,mode==='masked'?1:mode==='changed'?2:5);
   assert.deepEqual(calls[0],['get','attr','@e1','type']);
   if(mode==='exact')assert.deepEqual(calls[4],['fill','@e2',action.value]);
  }
 }finally{await rm(root,{recursive:true,force:true})}
});
test('a transformed exact copy returns fresh evidence before any commit without inventing a missing input',async()=>{
 let entered=false;const calls=[];
 const browser={sessionId:randomUUID(),observe:async()=>entered?{snapshot:'- textbox "Destination" [ref=e2]: Changed by control\n- button "Save" [ref=e3]',refs:{e2:{role:'textbox',name:'Destination',exactValue:'Changed by control'},e3:{role:'button',name:'Save'}}}:request.observation,
  execute:async action=>{calls.push(action);entered=true;}};
 const r=await act({browser,intentOrSteps:request.intent,scope:request.scope,authorize:()=>true,
  decide:async req=>{const fill=Object.entries(req.candidates).find(([,a])=>a.source==='exact_value_binding');
   return fill?{binding:req.binding,choice:fill[0]}:{binding:req.binding,assessment:true,valueBinding:bind(req)};}});
 assert.equal(r.returnReason,'input_not_accepted');assert.equal(r.observationFresh,true);assert.equal(r.inputRequired,null);
 assert.equal(r.handoff.suggestedCallerAction,'inspect_control_and_value');assert.equal(calls.length,1);
 assert.equal(r.actions[0].outcome,'input_not_accepted');assert.equal(r.latestObservation.refs.e2.exactValue,'Changed by control');
});
test('a readonly field can be inspected without offering an unauthorized fill or a disabled click',()=>{
 const o={snapshot:'- textbox "Choice" [ref=e1]',refs:{e1:{role:'textbox',name:'Choice',readonly:true}}};
 const actions=discoverActions(o,{value:'Bluebird'});
 assert.ok(actions.some(a=>a.ref==='@e1'&&a.op==='click'&&a.purpose==='inspect_readonly_field'));
 assert.equal(actions.some(a=>a.ref==='@e1'&&['fill','request_input'].includes(a.op)),false);
 o.refs.e1.disabled=true;assert.equal(discoverActions(o,{}).some(a=>a.ref==='@e1'),false);
});
