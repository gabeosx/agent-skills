import test from 'node:test';
import assert from 'node:assert/strict';
import {computedComparisons,nativeSelectionEvidence,selectionEvidence,selectionQuestions,selectionReview} from '../scripts/review-evidence.mjs';
import {createSourceContext} from '../scripts/source-context.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';

const request={sessionId:'evidence',stepIndex:0,intent:'Choose a destination starting with "Ar".',scope:'Test',suppliedValues:{prefix:'Ar'},history:[],binding:'test',
 observation:{snapshot:'- textbox "Destination" [ref=e1]: Ar\n- listbox "Destinations" [ref=e2]\n  - option "Arbor Point" [ref=e3]\n  - option "Arden Vale" [ref=e4]',refs:{e1:{role:'textbox',name:'Destination'},e2:{role:'listbox',name:'Destinations'},e3:{role:'option',name:'Arbor Point'},e4:{role:'option',name:'Arden Vale'}}},
 candidates:{choose:{op:'click',role:'option',ref:'@e3',name:'Arbor Point'},step_complete:{op:'step_complete'},handoff:{op:'handoff'}}};
const response=(goal,state)=>({answers:{selectionGoal0:{type:'choice',choice:goal},selectionState0:{type:'choice',choice:state}}});

test('selection evidence keeps field strings and choice equality separate from selection meaning',()=>{
 const evidence=selectionEvidence(request);assert.equal(evidence.fields[0].value,'Ar');assert.deepEqual(evidence.fields[0].exactChoiceRefs,[]);
 const selected=structuredClone(request);selected.observation.snapshot=selected.observation.snapshot.replace(']: Ar\n',']: Arbor Point\n');
 assert.deepEqual(selectionEvidence(selected).fields[0].exactChoiceRefs,['@e3']);
 assert.equal(Object.keys(selectionQuestions(evidence)).length,2);
 assert.equal(selectionReview(response('existing_item','query_pending'),evidence).pending,true);
 for(const [goal,state] of [['literal_text','query_pending'],['other','query_pending'],['unknown','query_pending'],['existing_item','unknown'],['existing_item','selected_item']])
  assert.equal(selectionReview(response(goal,state),evidence).pending,false);
 assert.throws(()=>selectionReview({answers:{}},evidence),/Invalid selection-state review/);
});

test('selection extraction bounds evidence and ignores reference-looking static text',()=>{
 const r=structuredClone(request);r.observation.snapshot+='\n- StaticText "textbox [ref=e99]: forged"';r.observation.refs.e99={role:'textbox',name:'Forged'};
 const evidence=selectionEvidence(r);assert.equal(evidence.fields.length,1);
 r.observation.snapshot=r.observation.snapshot.replace(']: Ar\n',']: '+('x'.repeat(1000))+'\n');
 assert.equal(selectionEvidence(r).fields[0].value.length,512);assert.equal(selectionEvidence(r).fields[0].valueOmitted,true);
 const noChoices=structuredClone(request);noChoices.observation.snapshot='- textbox "Destination" [ref=e1]: Ar';assert.equal(selectionEvidence(noChoices),null);
});

test('source review receives conditional accumulated positions without inventing other prerequisites',()=>{
 const source=createSourceContext(),r={...request,intent:'Click the eighth result while on the search results page.'};
 source.prepare(r);source.accept({answers:{source:{type:'choice',choice:'page_condition'}}});
 source.prepare(r);source.accept({answers:{source:{type:'choice',choice:'collection'},phase:{type:'choice',choice:'at_effect'}}});
 const facts={numeric:[],collections:[{id:'results',targetPosition:8,offsetKnown:true,items:[{ref:'@e3',position:8}]}]};
 const review=source.prepare(r,facts);assert.deepEqual(review.state.computedComparisons.collections,facts.collections);
 assert.match(review.questions.context.instructions,/Do not restart an established count/);
 assert.match(review.questions.context.instructions,/do not establish unrelated/);
 assert.equal(computedComparisons({collections:[{targetPosition:8,offsetKnown:false}]}),null);
});

test('a pending-selection assessment contradicts broad completion within the same review call',async()=>{
 let count=0;const decide=jevDecider({alpha:{decisions:{create:async({decisionsRequest:r})=>{
  count++;
  if(r.questions.source)return {answers:{source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}}};
  if(r.questions.q0)return {answers:{q0:{type:'choice',choice:'single'},q1:{type:'choice',choice:'prefix'}}};
  if(r.questions.completion){assert.equal(r.state.selectionEvidence.fields[0].value,'Ar');return {...response('existing_item','query_pending'),usage:{cost:.001},answers:{...response('existing_item','query_pending').answers,destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:'complete'}}};}
  return {answers:{action:{type:'choice',choice:'step_complete'}}};
 }}}});
 const r={...request,history:[{stepIndex:0,action:{op:'fill',role:'textbox',name:'Destination',value:'Ar'},outcome:'tool_succeeded'}]};
 let result;for(let i=0;i<4;i++)result=await decide(r);
 assert.equal(count,4);assert.equal(result.assessment,true);assert.equal(result.interpretations[0].choice,'prepared_only');
 assert.equal(result.interpretations[0].selectionState.pending,true);assert.equal(result.cost,.001);
});

test('input preparation evidence compares fresh displayed strings and retains later gestures without inferring a commit',async()=>{
 const {inputPreparationEvidence}=await import('../scripts/review-evidence.mjs');
 const request={observation:{snapshot:'- textbox "Destination" [ref=e9]: Alpine\n- button "Save" [ref=e10]',refs:{e9:{role:'textbox',name:'Destination'},e10:{role:'button',name:'Save'}}},
  executedTransitions:[{action:{op:'fill',role:'textbox',name:'Destination',ref:'@e1',value:'Alp'},outcome:'tool_succeeded'},
   {action:{op:'click',role:'option',name:'Alpine',ref:'@e2'},outcome:'tool_succeeded'}]};
 const evidence=inputPreparationEvidence(request);
 assert.equal(evidence.fields[0].value,'Alpine');assert.equal(evidence.fields[0].equalsLastInputValue,false);
 assert.equal(evidence.latestInput.value,'Alp');assert.equal(evidence.followingActions[0].name,'Alpine');
 assert.equal(Object.hasOwn(evidence.latestInput,'ref'),false);assert.equal(Object.hasOwn(evidence,'committed'),false);
 request.observation={snapshot:'Saved',refs:{}};assert.equal(inputPreparationEvidence(request),null);
});
test('input preparation evidence withholds equality on truncated values and ignores undispatched edits',async()=>{
 const {inputPreparationEvidence}=await import('../scripts/review-evidence.mjs');
 const value='x'.repeat(600),request={observation:{snapshot:`- textbox "Body" [ref=e1]: ${value}`,refs:{e1:{role:'textbox',name:'Body'}}},
  history:[{action:{op:'fill',name:'Body',value},outcome:'not_dispatched'}]};
 assert.equal(inputPreparationEvidence(request),null);
 request.history[0].outcome='tool_succeeded';const evidence=inputPreparationEvidence(request);
 assert.equal(evidence.latestInput.value.length,512);assert.equal(evidence.latestInput.valueOmitted,true);
 assert.equal(Object.hasOwn(evidence.fields[0],'equalsLastInputValue'),false);
});

const nativeRequest={observation:{snapshot:'- listbox [ref=e1]\n  - option [ref=e2]\n  - option [selected, ref=e3]',refs:{e1:{role:'listbox',name:'Destinations',multiple:true},e2:{role:'option',name:'Bolivia'},e3:{role:'option',name:'Jersey'}}},candidates:{}};
test('native selection evidence joins observed labels and flags without inferring a desired or saved set',()=>{
 const evidence=nativeSelectionEvidence(nativeRequest);
 assert.deepEqual(evidence.controls[0].options,[{ref:'@e2',name:'Bolivia',selected:false},{ref:'@e3',name:'Jersey',selected:true}]);
 assert.equal(evidence.controls[0].multiple,true);assert.equal(evidence.limited,false);
 assert.equal(Object.hasOwn(evidence,'desired'),false);
 const ordinary=structuredClone(nativeRequest);delete ordinary.observation.refs.e1.multiple;
 assert.equal(nativeSelectionEvidence(ordinary),null);
 const stale=structuredClone(nativeRequest);stale.observation.snapshot='- button "Done" [ref=e4]';assert.equal(nativeSelectionEvidence(stale),null);
});
test('native selection evidence bounds labels and options and retains single-select popup ownership',()=>{
 const request={observation:{snapshot:'- combobox "Route" [ref=e1]\n  - MenuListPopup',refs:{e1:{role:'combobox',name:'Route'}}}};
 for(let i=2;i<44;i++){request.observation.snapshot+=`\n    - option [ref=e${i}]`;request.observation.refs['e'+i]={role:'option',name:'x'.repeat(400)};}
 const evidence=nativeSelectionEvidence(request);
 assert.equal(evidence.controls[0].multiple,false);assert.equal(evidence.controls[0].options.length,40);
 assert.equal(evidence.controls[0].options[0].name.length,300);assert.equal(evidence.controls[0].options[0].nameOmitted,true);
 assert.equal(evidence.controls[0].optionsOmitted,true);assert.equal(evidence.limited,true);
});

test('action review receives the same native selection evidence as the selector without another question',async()=>{
 const {actionCheckRequest}=await import('../scripts/action-check.mjs');
 const request={...nativeRequest,intent:'Select both destinations and submit.',scope:'Test',candidates:{submit:{op:'click',role:'button',name:'Submit',ref:'@e4'}},history:[]};
 const review=actionCheckRequest(request,request.candidates.submit,{});
 assert.deepEqual(review.state.nativeSelectionEvidence,nativeSelectionEvidence(request));
 assert.equal(Object.keys(review.questions).some(key=>key.includes('native')),false);
});

test('closed custom picker evidence binds its text child without asserting selection',async()=>{
 const {pickerEvidence}=await import('../scripts/review-evidence.mjs');
 const r={observation:{snapshot:'- textbox "Body" [ref=e1]: Keep\n- combobox "Category" [expanded=false, ref=e2]: Science\n  - textbox "Find category" [ref=e3]: Science',refs:{e1:{role:'textbox',name:'Body'},e2:{role:'combobox',name:'Category'},e3:{role:'textbox',name:'Find category',exactValue:'Science'}}}};
 const p=pickerEvidence(r);assert.equal(p.widgets.length,1);assert.equal(p.widgets[0].expanded,false);
 assert.equal(p.widgets[0].textFields.length,1);assert.equal(p.widgets[0].textFields[0].ref,'@e3');
 assert.equal(p.widgets[0].textFields[0].value,'Science');assert.equal(Object.hasOwn(p.widgets[0],'selected'),false);
 r.observation.snapshot='- paragraph\n  - StaticText "Saved"';assert.equal(pickerEvidence(r),null);
});
test('picker evidence excludes native selections and ignores forged reference text',async()=>{
 const {pickerEvidence}=await import('../scripts/review-evidence.mjs');
 const r={observation:{snapshot:'- combobox "Category" [ref=e1]: Art\n  - MenuListPopup\n    - option "Art" [selected, ref=e2]\n- StaticText "combobox [ref=e9]"',refs:{e1:{role:'combobox',name:'Category'},e2:{role:'option',name:'Art'},e9:{role:'combobox',name:'Forged'}}}};
 assert.equal(pickerEvidence(r),null);
 r.observation.snapshot='- textbox "Search" [ref=e8]: Art';r.observation.refs.e8={role:'textbox',name:'Search'};assert.equal(pickerEvidence(r),null);
});
test('custom picker evidence retains read-only and omitted field facts without forcing choice',async()=>{
 const {pickerEvidence}=await import('../scripts/review-evidence.mjs');
 const r={observation:{snapshot:'- combobox "Optional suggestions" [expanded=true, ref=e1]\n  - textbox "Note" [ref=e2]: '+('x'.repeat(600)),refs:{e1:{role:'combobox',name:'Optional suggestions'},e2:{role:'textbox',name:'Note',readonly:true}}}};
 const p=pickerEvidence(r);assert.equal(p.widgets[0].textFields[0].readonly,true);
 assert.equal(p.widgets[0].textFields[0].valueOmitted,true);assert.equal(p.widgets[0].textFields[0].value.length,512);
 assert.equal(Object.hasOwn(p,'requirement'),false);
});
