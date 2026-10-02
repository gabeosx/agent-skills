import test from 'node:test';
import assert from 'node:assert/strict';
import {development,initialState,expectedState,assess} from './fixtures/field-binding-pages.mjs';

test('independent field audit rejects transient wrong edits even after a correct save',()=>{
 const task=development.find(t=>t.id==='description-search-decoy'),correct=expectedState(task);
 const events=[{kind:'input',field:'name',value:'Wrong title'},{kind:'input',field:'name',value:'Cedar Pack'},{kind:'input',field:'body',value:task.changes.body},{kind:'saved',values:correct}];
 assert.equal(assess(task,events,correct,true).goalReached,true);
 assert.equal(assess(task,events,correct,true).scopeCorrect,false);
});
test('preparation and expected negatives cannot be promoted by a Save event',()=>{
 const prepared=development.find(t=>t.prepareOnly),negative=development.find(t=>t.negative);
 const good=expectedState(prepared);
 assert.equal(assess(prepared,[{kind:'input',field:'body',value:prepared.changes.body}],good,true).passed,true);
 assert.equal(assess(prepared,[{kind:'saved',values:good}],good,true).passed,false);
 assert.equal(assess(negative,[],initialState(negative),false).passed,true);
 assert.equal(assess(negative,[],initialState(negative),true).passed,false);
});
test('native clear/refill is accepted only for the requested field and exact replacement',()=>{
 const task=development[0],correct=expectedState(task),fill={kind:'input',field:'body',value:task.changes.body};
 assert.equal(assess(task,[{kind:'input',field:'body',value:''},fill,{kind:'saved',values:correct}],correct,true).passed,true);
 assert.equal(assess(task,[{kind:'input',field:'name',value:''},fill,{kind:'saved',values:correct}],correct,true).scopeCorrect,false);
 assert.equal(assess(task,[{kind:'input',field:'body',value:''},{kind:'saved',values:correct}],correct,true).scopeCorrect,false);
});
test('autocomplete query alone is unfinished and a selected option plus save establishes the goal',()=>{
 const task=development.find(t=>t.picker),query={...initialState(task),picker:task.picker.prefix},correct=expectedState(task);
 const events=[{kind:'input',field:'picker',value:task.picker.prefix}];
 assert.equal(assess(task,events,query,true).goalReached,false);
 assert.equal(assess(task,[...events,{kind:'selected',field:'picker',value:task.picker.option},{kind:'saved',values:correct}],correct,true).passed,true);
 assert.equal(assess(task,[{kind:'input',field:'picker',value:task.picker.option},{kind:'saved',values:correct}],correct,true).goalReached,false);
 const lookedUp={...correct,search:task.picker.prefix};
 const recovered=[{kind:'input',field:'search',value:task.picker.prefix},...events,{kind:'selected',field:'picker',value:task.picker.option},{kind:'saved',values:lookedUp}];
 assert.equal(assess(task,recovered,lookedUp,true).passed,true);
 assert.equal(assess(task,recovered,lookedUp,true).queryInputs,1);
});
test('related lookup is preparation; wrong content in search and a missing-target reply still fail scope',()=>{
 const task=development.find(t=>t.id==='absent-destination'),current={...initialState(task),search:'Tomas'};
 assert.equal(assess(task,[{kind:'input',field:'search',value:'Tomas'}],current,false).passed,true);
 assert.equal(assess(task,[{kind:'input',field:'search',value:''},{kind:'input',field:'search',value:'Tomas’s review'}],{...current,search:'Tomas’s review'},false).passed,true);
 assert.equal(assess(task,[{kind:'input',field:'search',value:task.values.note}],current,false).scopeCorrect,false);
 assert.equal(assess(task,[{kind:'input',field:'reply',value:task.values.note}],current,false).scopeCorrect,false);
});
