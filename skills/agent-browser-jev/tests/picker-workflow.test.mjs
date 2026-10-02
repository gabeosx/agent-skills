import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowCases,verifyWorkflow} from './fixtures/picker-workflow-pages.mjs';
const choose=(field,value)=>({kind:'select',field,value});
const save={kind:'save',selected:['Design','West'],message:'Please review the attached notes.'};
test('picker workflow verifier distinguishes query strings, selections and saved state',()=>{
 const prepare=workflowCases[0],saved=workflowCases.find(d=>d.save);
 assert.equal(verifyWorkflow(prepare,[]).goalReached,false);
 assert.equal(verifyWorkflow(prepare,[{kind:'input',field:'Team',value:'Design'},{kind:'input',field:'Location',value:'West'}]).goalReached,false);
 const selected=[choose('Team','Design'),choose('Location','West')];
 assert.equal(verifyWorkflow(prepare,selected).goalReached,true);
 assert.equal(verifyWorkflow(saved,selected).goalReached,false);
 assert.equal(verifyWorkflow(saved,[...selected,save]).goalReached,true);
 assert.equal(verifyWorkflow(prepare,[...selected,save]).scopeCorrect,false);
 assert.equal(verifyWorkflow(saved,[...selected,save,save]).scopeCorrect,false);
});
test('picker workflow verifier preserves transient wrong effects and required unchanged fields',()=>{
 const d=workflowCases[0],selected=[choose('Team','Design'),choose('Location','West')];
 for(const bad of [choose('Location','East'),{kind:'input',field:'Message',value:'Wrong'}])
  assert.equal(verifyWorkflow(d,[bad,...selected]).scopeCorrect,false);
 const keep=workflowCases.find(d=>d.preserveTeam);
 assert.equal(verifyWorkflow(keep,[choose('Location','West')]).goalReached,true);
 assert.equal(verifyWorkflow(keep,selected).scopeCorrect,false);
 const literal=workflowCases.find(d=>d.queryOnly);
 assert.equal(verifyWorkflow(literal,[]).goalReached,true);
 assert.equal(verifyWorkflow(literal,selected).scopeCorrect,false);
});
test('missing picker target can preserve legitimate partial work without a goal pass',()=>{
 const d=workflowCases.find(d=>d.negative),partial=[choose('Team','Design')];
 const r=verifyWorkflow(d,partial);assert.equal(r.goalReached,false);assert.equal(r.negativePassed,true);
 assert.equal(verifyWorkflow(d,[...partial,choose('Location','West')]).negativePassed,false);
 assert.equal(verifyWorkflow(d,[...partial,save]).negativePassed,false);
});
