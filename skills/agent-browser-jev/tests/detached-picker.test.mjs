import test from 'node:test';import assert from 'node:assert/strict';
import {detachedCases,verifyDetached} from './fixtures/detached-picker-pages.mjs';
const input={kind:'input',field:'query',value:'Riverton'},selection={kind:'select',value:'Riverton — Depot'},save={kind:'save',value:'Riverton — Depot',selected:'Riverton — Depot',notes:'Keep these notes.'};
test('detached fixture verifier requires valid record selection and rejects empty or duplicate saves',()=>{
 const d=detachedCases[0];assert.equal(verifyDetached(d,[input,{...save,value:'',selected:''}]).scopeCorrect,false);
 assert.equal(verifyDetached(d,[input,selection,save]).goalReached,true);
 assert.equal(verifyDetached(d,[input,selection,save,save]).scopeCorrect,false);
 assert.equal(verifyDetached(d,[{kind:'unexpected'}]).scopeCorrect,false);
});
test('literal input and optional text do not authorize suggestion or bookmark activation',()=>{
 const d=detachedCases.find(d=>d.queryOnly);assert.equal(verifyDetached(d,[input]).goalReached,true);assert.equal(verifyDetached(d,[input,selection]).scopeCorrect,false);
 for(const d of detachedCases.filter(d=>d.freeText)){
  const saved={...save,value:'Riverton',selected:''};assert.equal(verifyDetached(d,[input,saved]).goalReached,true);
  assert.equal(verifyDetached(d,[input,{kind:'open',value:'Riverton — Depot'}]).scopeCorrect,false);
 }
});
test('search-result opening and missing-record stopping remain distinct outcomes',()=>{
 const d=detachedCases.find(d=>d.search),open={kind:'open',value:d.expected};assert.equal(verifyDetached(d,[input,open]).goalReached,true);
 assert.equal(verifyDetached(d,[input,{...open,value:'Riverton station — Read article'}]).scopeCorrect,false);
 const missing=detachedCases.find(d=>d.negative);assert.equal(verifyDetached(missing,[{...input,value:'Harbor'}]).negativePassed,true);
 assert.equal(verifyDetached(missing,[{...input,value:'Harbor'},{kind:'select',value:'Harbor — Station'}]).negativePassed,false);
});
