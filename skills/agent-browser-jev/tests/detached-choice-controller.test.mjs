import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {recentChoiceEvidence,pickerBindingRequest,acceptPickerBinding} from '../scripts/picker-binding.mjs';import {jevDecider} from '../scripts/agent-browser-jev.mjs';import {act} from '../scripts/jev-browser.mjs';
const observation={snapshot:'- textbox "Destination" [ref=e1]: River\n- list [ref=e2]\n  - listitem "River depot" [ref=e3] clickable [cursor:pointer]',refs:{e1:{role:'textbox',name:'Destination',exactValue:'River'},e2:{role:'list',name:''},e3:{role:'listitem',name:'River depot'}}};
const action={op:'fill',role:'textbox',ref:'@e1',name:'Destination',value:'River'},request={intent:'Choose the river depot',observation,candidates:{item:{op:'click',role:'listitem',ref:'@e3',name:'River depot'}},executedTransitions:[{action,outcome:'tool_succeeded',before:{snapshot:'- textbox "Destination" [ref=e1]',refs:observation.refs},after:observation}]};
test('detached association requires an actual fresh input/readback and current same field/value',()=>{
 assert.equal(recentChoiceEvidence(request).widgets[0].kind,'post_input_choices');
 for(const alter of [r=>r.observation.limited=true,r=>r.executedTransitions[0].outcome='unknown',r=>r.executedTransitions[0].action.ref='@e9',r=>r.executedTransitions[0].action.value='Other',r=>r.executedTransitions[0].after={snapshot:'Older',refs:{}},r=>r.candidates={}]){const r=structuredClone(request);alter(r);assert.equal(recentChoiceEvidence(r),null);}
});
test('a search result or unknown association does not become a selection prerequisite',()=>{
 const p=pickerBindingRequest(request);
 for(const association of ['suggestions','results','unrelated','unknown']){
  const r=acceptPickerBinding({answers:{pickerAssociation0:{type:'choice',choice:association},pickerGoal0:{type:'choice',choice:'existing_item'},pickerProof0:{type:'choice',choice:'none'}}},request,p);
  assert.equal(r.pending.length,association==='suggestions'?1:0);assert.equal(r.uncertain,false);
 }
 assert.throws(()=>acceptPickerBinding({answers:{pickerGoal0:{type:'choice',choice:'existing_item'},pickerProof0:{type:'choice',choice:'none'}}},request,p),/association/);
});
test('actual detached suggestion binding is reviewed and reaches a saved goal',async()=>{
 let value='',selected=false,saved=false,targets=0;const gestures=[];
 const observe=()=>saved?{snapshot:'Saved destination: River depot',refs:{}}:{snapshot:'- textbox "Destination" [ref=e1]: '+value+'\n- button "Save" [ref=e4]'+(value&&!selected?'\n- list [ref=e2]\n  - listitem "River depot" [ref=e3] clickable [cursor:pointer]':''),refs:{e1:{role:'textbox',name:'Destination',exactValue:value},e4:{role:'button',name:'Save'},...(value&&!selected?{e2:{role:'list',name:''},e3:{role:'listitem',name:'River depot'}}:{})}};
 const browser={sessionId:randomUUID(),observe:async()=>observe(),execute:async a=>{gestures.push(a);if(a.op==='fill')value=a.value;else if(a.role==='listitem'){selected=true;value='River depot';}else if(a.role==='button')saved=true;}};
 const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
  let answers;
  if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
  else if(r.questions.pickerGoal0&&!r.questions.pickerAssociation0)answers={pickerGoal0:{type:'choice',choice:'existing_item'}};
  else if(r.questions.pickerAssociation0)answers={pickerAssociation0:{type:'choice',choice:'suggestions'},pickerGoal0:{type:'choice',choice:'existing_item'},pickerProof0:{type:'choice',choice:'none'}};
  else if(r.questions.pickerTarget){targets++;answers={pickerTarget:{type:'choice',choice:Object.keys(r.questions.pickerTarget.criteria).find(k=>k!=='none')}};}
  else if(r.questions.actionCheck)answers={actionCheck:{type:'choice',choice:'preparation'},suggestedNext:{type:'choice',choice:'none'},literalAssignment:{type:'choice',choice:'matches'}};
  else if(r.questions.completion)answers={destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'},completion:{type:'choice',choice:'complete'}};
  else if(r.questions.action){const choices=Object.entries(r.questions.action.criteria);answers={action:{type:'choice',choice:saved?'step_complete':choices.find(([,v])=>v.includes(!value?'"op":"fill"':'"name":"Save"'))[0]}};}
  else throw Error('Unexpected '+Object.keys(r.questions));for(const [id,q] of Object.entries(r.questions))if(q.type==='noul')answers[id]={type:'noul',noul:1};return {answers,usage:{cost:.001}};
 }}}};const result=await act({browser,decide:jevDecider(api),intentOrSteps:'Choose River depot as destination and save.',suppliedValues:{query:'River'},scope:'Test',authorize:()=>true});
 assert.equal(result.returnReason,'reported_complete');assert.deepEqual(gestures.map(a=>a.op),['fill','click','click']);assert.equal(targets,1);
});

test('caller requirement assessment excludes option availability and current values',async()=>{
 const {pickerGoalRequest,acceptPickerGoals}=await import('../scripts/picker-binding.mjs');
 const first=pickerGoalRequest(pickerBindingRequest(request));
 const changed=structuredClone(request);changed.observation.snapshot=changed.observation.snapshot.replaceAll('River depot','Other place');changed.observation.refs.e3.name='Other place';changed.candidates.item.name='Other place';changed.executedTransitions[0].after=changed.observation;
 const second=pickerGoalRequest(pickerBindingRequest(changed));assert.deepEqual(first,second);
 assert.equal(first.state.fields[0].name,'Destination');assert.equal(Object.hasOwn(first.state,'observation'),false);
 const requirements=acceptPickerGoals({answers:{pickerGoal0:{type:'choice',choice:'existing_item'}}},first);
 const p=pickerBindingRequest(request,requirements);assert.equal(Object.hasOwn(p.questions,'pickerGoal0'),false);
 const result=acceptPickerBinding({answers:{pickerGoal0:{type:'choice',choice:'literal_text'},pickerAssociation0:{type:'choice',choice:'suggestions'},pickerProof0:{type:'choice',choice:'none'}}},request,p);
 assert.equal(result.pending.length,1);assert.equal(result.fields[0].independentlyVerified,false);
 assert.throws(()=>acceptPickerGoals({answers:{pickerGoal0:{type:'choice',choice:'invented'}}},first),/Invalid/);
});
test('target identity judgments preserve affirmative choices and reject weak or malformed matches',async()=>{
 const {pickerTargetRequest,acceptPickerTarget}=await import('../scripts/picker-binding.mjs');
 const p=pickerTargetRequest(request,{widget:recentChoiceEvidence(request).widgets[0]});
 for(const noul of [0,0.49,0.5,0.51,1]){
  const answer=acceptPickerTarget({answers:{pickerTarget:{type:'choice',choice:'item'},pickerMatch_item:{type:'noul',noul}}},p);
  assert.equal(answer.choice,noul>0.5?'item':'none');assert.equal(answer.identityAssessment.independentlyVerified,false);
 }
 for(const noul of [undefined,NaN,-1,1.1,'1'])assert.throws(()=>acceptPickerTarget({answers:{pickerTarget:{type:'choice',choice:'item'},pickerMatch_item:{type:'noul',noul}}},p),/Invalid/);
 assert.equal(acceptPickerTarget({answers:{pickerTarget:{type:'choice',choice:'none'}}},p).choice,'none');
});

test('caller scope and context changes invalidate a staged requirement assessment',async()=>{
 let goals=0,associations=0;
 const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
  let answers;
  if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'}};
  else if(r.questions.pickerGoal0&&!r.questions.pickerAssociation0){goals++;answers={pickerGoal0:{type:'choice',choice:'existing_item'}};}
  else if(r.questions.pickerAssociation0){associations++;answers={pickerAssociation0:{type:'choice',choice:'results'},pickerProof0:{type:'choice',choice:'none'}};}
  else throw Error('Unexpected '+Object.keys(r.questions));
  return {answers,usage:{cost:.001}};
 }}}};
 const decide=jevDecider(api),r={...request,binding:'current',sessionId:'scope-context',stepIndex:0,scope:'Scope one',suppliedValues:{query:'River'},history:[]};
 for(let i=0;i<5&&goals===0;i++)await decide(r);
 assert.equal(goals,1);await decide(r);assert.equal(goals,1);assert.equal(associations,1);
 await decide({...r,scope:'Scope two'});assert.equal(goals,2);
 await decide({...r,scope:'Scope two',context:'Updated caller restriction'});assert.equal(goals,3);
});
