import test from 'node:test';
import assert from 'node:assert/strict';
import {factoredActionRequest,acceptFactoredAction,decisionEvidence} from '../scripts/decision-policy.mjs';
const candidates={c1:{op:'click',ref:'@e1',role:'button',name:'Save'},c2:{op:'click',ref:'@e2',role:'button',name:'Cancel'},
 c3:{op:'fill',ref:'@e3',role:'textbox',name:'Title',value:'Exact'},handoff:{op:'handoff'},step_complete:{op:'step_complete'}};
test('independent heads see available actions in shared state and keep operation targets compatible',()=>{
 const p=factoredActionRequest({intent:'Save a draft'},candidates);
 assert.deepEqual(Object.keys(p.state.availableActions.click),['c1','c2']);assert.equal(p.questions.target_fill,undefined);
 assert.deepEqual(Object.keys(p.questions.target_click.criteria),['none','c1','c2']);
 assert.equal(acceptFactoredAction({answers:{operation:{type:'choice',choice:'fill'},target_click:{type:'choice',choice:'c2'}}},p,candidates).choice,'c3');
 assert.equal(acceptFactoredAction({answers:{operation:{type:'choice',choice:'click'},target_click:{type:'choice',choice:'none'}}},p,candidates).choice,'handoff');
 assert.throws(()=>acceptFactoredAction({answers:{operation:{type:'choice',choice:'click'},target_click:{type:'choice',choice:'c3'}}},p,candidates),/Invalid target/);
 assert.throws(()=>acceptFactoredAction({answers:{operation:{type:'choice',choice:'invented'}}},p,candidates),/Invalid operation/);
});
test('diagnostics preserve numeric distributions without raw state or invalid answer/provider text',()=>{
 const p={decisionsRequest:factoredActionRequest({intent:'private context'},candidates)};
 const e=decisionEvidence(p,{answers:{operation:{type:'choice',choice:'fill',confidence:.6,probabilities:{fill:.7,click:.3,'invented private text':.9}}},usage:{cost:.01}});
 assert.equal(e.state,undefined);assert.equal(e.answers.operation.confidence,.6);
 assert.deepEqual(e.answers.operation.probabilities,{fill:.7,click:.3});assert.equal(e.cost,.01);
 assert.equal(decisionEvidence(p,{answers:{operation:{choice:'private provider error'}}}).answers.operation.choice,'[invalid]');
});

test('factored questions preserve candidate-specific semantics, including singleton completion',()=>{
 const criteria={step_complete:'Completion requires all observed outcomes; offered fills are not executed.',c3:'Replace only the destination with its exact bound value.'};
 const p=factoredActionRequest({intent:'Fill then save'},candidates,{criteria,instructions:'Do not treat offered actions as results.'});
 assert.equal(p.questions.operation.criteria.step_complete,criteria.step_complete);
 assert.equal(p.questions.operation.criteria.fill,criteria.c3);
 assert.equal(p.state.availableActions.fill.c3.description,criteria.c3);
 assert.match(p.questions.operation.instructions,/Do not treat offered actions as results/);
});
