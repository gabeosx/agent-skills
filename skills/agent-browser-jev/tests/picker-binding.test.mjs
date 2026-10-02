import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {pickerReadbacks,pickerBindingRequest,acceptPickerBinding,pickerPreparationRequest} from '../scripts/picker-binding.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';
import {act} from '../scripts/jev-browser.mjs';
const observation={snapshot:'- heading "Design" [ref=e9]\n- combobox "Team" [expanded=false, ref=e1]: Design\n  - textbox "Find team" [ref=e2]: Design\n    - StaticText "Design"\n- paragraph\n  - StaticText "Selected Team: Design"',refs:{e1:{role:'combobox',name:'Team'},e2:{role:'textbox',name:'Find team'},e9:{role:'heading',name:'Design'}}};
test('proof sources exclude input descendants, headings and choices; semantic ownership remains a model binding',()=>{
 assert.deepEqual(pickerReadbacks(observation).items,[{id:'r0',kind:'current_noneditable_text',text:'Selected Team: Design'}]);
 const request={intent:'Keep Design selected',observation,candidates:{}},p=pickerBindingRequest(request);
 const r=acceptPickerBinding({answers:{pickerGoal0:{type:'choice',choice:'existing_item'},pickerProof0:{type:'choice',choice:'r0'}}},request,p);
 assert.equal(r.pending.length,0);assert.equal(r.fields[0].independentlyVerified,false);
 assert.throws(()=>acceptPickerBinding({answers:{pickerGoal0:{type:'choice',choice:'existing_item'},pickerProof0:{type:'choice',choice:'r99'}}},request,p),/Invalid/);
 assert.equal(pickerBindingRequest({...request,observation:{...observation,limited:true}}),null);
});
function fixture({approve=true,allowed=true,missing=false,literal=false,needsQuery=false,openFirst=false}={}){
 let opened=false,selected=false,query=needsQuery?'':'Design';const actions=[],decisions=[];let checks=0;
 const browser={sessionId:randomUUID(),observe:async()=>({snapshot:'- combobox "Team" [expanded='+opened+', ref=e1]: '+query+'\n  - textbox "Find team" [ref=e2]: '+query+(opened?'\n- listbox "Teams" [ref=e3]\n  - option "'+(missing?'Support':'Design')+'" [ref=e4]':'')+(selected?'\n- paragraph: Selected Team: Design':''),refs:{e1:observation.refs.e1,e2:{...observation.refs.e2,exactValue:query},...(opened?{e3:{role:'listbox',name:'Teams'},e4:{role:'option',name:missing?'Support':'Design'}}:{})}}),execute:async a=>{actions.push(a);if(a.op==='fill'){query=a.value;opened=true;}else if(a.role==='combobox'){if(!needsQuery)opened=true;}else if(a.role==='option'){selected=true;opened=false;}}};
 const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
  let answers;
  if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
  else if(r.questions.pickerGoal0)answers={pickerGoal0:{type:'choice',choice:literal?'literal_text':'existing_item'},pickerProof0:{type:'choice',choice:selected?'r0':'none'}};
  else if(r.questions.pickerTarget)answers={pickerTarget:{type:'choice',choice:missing?'none':(openFirst?Object.entries(r.questions.pickerTarget.criteria).find(([,v])=>v.includes('\"role\":\"combobox\"')&&v.includes('\"op\":\"click\"'))?.[0]:null)??Object.keys(r.questions.pickerTarget.criteria).find(k=>k!=='none')}};
  else if(r.questions.actionCheck){checks++;answers={actionCheck:{type:'choice',choice:approve?'preparation':'unknown'},suggestedNext:{type:'choice',choice:'none'},literalAssignment:{type:'choice',choice:'matches'}};}
  else if(r.questions.completion)answers={destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:'complete'}};
  else if(r.questions.action)answers={action:{type:'choice',choice:'step_complete'}};
  else throw Error('Unexpected '+Object.keys(r.questions));
  return {answers,usage:{cost:.001}};
 }}}};const decide=jevDecider(api);
 return {browser,decide:async(...args)=>{const r=await decide(...args);decisions.push(r);return r},authorize:a=>allowed||a.role!=='combobox',actions,decisions,get checks(){return checks}};
}
test('observed field binding completes through separately reviewed inspection and option actions',async()=>{
 const f=fixture(),r=await act({...f,intentOrSteps:'Select Design and leave unsaved.',scope:'Test'});
 assert.equal(r.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.role),['combobox','option']);assert.equal(f.checks,2);
 assert.equal(f.decisions.filter(d=>d.interpretations?.some(i=>i.kind==='picker_action_proposal')).length,2);
});
test('rejected, disallowed, absent and budget-limited routes do not become completion or wrong selections',async()=>{
 for(const options of [{approve:false},{allowed:false},{missing:true}]){
  const f=fixture(options),r=await act({...f,intentOrSteps:'Select Design and leave unsaved.',scope:'Test'});
  assert.equal(r.returnReason,'handoff');assert.deepEqual(f.actions.map(a=>a.role),options.missing?['combobox']:[]);
 }
 const f=fixture(),r=await act({...f,intentOrSteps:'Select Design and leave unsaved.',scope:'Test',budget:{maxActions:1}});
 assert.equal(r.returnReason,'action_budget');assert.equal(f.actions.length,1);
});
test('literal query goal remains untouched',async()=>{
 const f=fixture({literal:true}),r=await act({...f,intentOrSteps:'Keep query Design unselected.',scope:'Test'});
 assert.equal(r.returnReason,'reported_complete');assert.equal(f.actions.length,0);
});

test('execution readback evidence excludes proposals, unknown outcomes and truncated history',()=>{
 const before={snapshot:'- option "Design" [ref=e4]',refs:{e4:{role:'option',name:'Design'}}},after={snapshot:'- textbox "Find team" [ref=e2]: Design',refs:{e2:{role:'textbox',name:'Find team'}}};
 const transition={action:{op:'click',role:'option',name:'Design'},outcome:'tool_succeeded',before,after};
 const read=pickerReadbacks(after,{executedTransitions:[transition]});assert.equal(read.items[0].kind,'executed_option_readback');assert.equal(read.items[0].historical,true);
 for(const entry of [{...transition,outcome:'unknown'},{...transition,outcome:'not_dispatched'},{...transition,after:{...after,limited:true}}])assert.equal(pickerReadbacks(after,{executedTransitions:[entry]}).items.length,0);
 const request={intent:'Select Design',observation,executedTransitions:[transition,{action:{op:'fill',role:'textbox',name:'Find team',value:'Support'},outcome:'tool_succeeded',before:after,after}]};
 const payload=pickerBindingRequest(request);assert.equal(payload.state.executionEvidence.at(-1).action.value,'Support');assert.match(payload.questions.pickerProof0.instructions,/supersede/);
});

test('picker preparation offers only current owned fills and opening, preserving exact values',()=>{
 const field={widget:{ref:'@e1',textFields:[{ref:'@e2'}]}},request={observation:{snapshot:''},candidates:{owned:{op:'fill',ref:'@e2',name:'Find team',value:'Design'},wrong:{op:'fill',ref:'@e99',value:'Erase message'},open:{op:'click',role:'combobox',ref:'@e1'},other:{op:'click',role:'combobox',ref:'@e9'}}};
 const p=pickerPreparationRequest(request,field);assert.deepEqual(Object.keys(p.questions.pickerTarget.criteria),['none','owned','open']);
 delete request.candidates.owned;assert.equal(pickerPreparationRequest(request,field),null);
});
test('query-driven picker types authorized text before choosing an observed option',async()=>{
 const f=fixture({needsQuery:true}),r=await act({...f,intentOrSteps:'Select Design and leave unsaved.',scope:'Test',suppliedValues:{query:'Design'}});
 assert.equal(r.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.op),['fill','click']);assert.equal(f.actions[0].value,'Design');
});

test('an ineffective opener leaves an authorized query fill available rather than repeating or stopping',async()=>{
 const f=fixture({needsQuery:true,openFirst:true}),r=await act({...f,intentOrSteps:'Select Design and leave unsaved.',scope:'Test',suppliedValues:{query:'Design'}});
 assert.equal(r.returnReason,'reported_complete');assert.deepEqual(f.actions.map(a=>a.op),['click','fill','click']);assert.equal(f.actions[1].value,'Design');
});

test('picker questions retain caller-supplied values when the intent names their keys',()=>{
 const request={intent:'Choose the supplied team',suppliedValues:{team:'Design'},observation,candidates:{fill:{op:'fill',ref:'@e2',name:'Find team',value:'Design'},choose:{op:'click',ref:'@e4',role:'option',name:'Design'}}};
 const p=pickerBindingRequest(request),field={widget:p.state.widgets[0],requirement:'existing_item',proof:'none'};
 assert.deepEqual(p.state.suppliedValues,request.suppliedValues);assert.deepEqual(pickerPreparationRequest(request,field).state.suppliedValues,request.suppliedValues);
});
