import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {captureIndex,captureChoices} from '../scripts/capture-index.mjs';
import {act} from '../scripts/jev-browser.mjs';

test('capture index summarizes local structure without exposing historical control refs',()=>{
  const pages=Array.from({length:75},(_,page)=>({snapshot:'',refs:{e1:{role:'link',name:'Site navigation'},[`e${page+2}`]:{role:'textbox',name:`Local field ${page}`}}}));
  const index=captureIndex(pages);
  assert.equal(index.length,64);assert.match(index[7].description,/Local field 7/);
  assert.ok(!JSON.stringify(index).includes('Site navigation'));assert.ok(!JSON.stringify(index).includes('ref'));
  assert.ok(index.every(item=>item.description.length<=140));
  const inventory=captureIndex([{observationWindow:{section:'- combobox "Territory" [expanded=false, ref=e3]'},
    refs:{e3:{role:'combobox',name:'Territory'},e4:{role:'option',name:'East'},e5:{role:'option',name:'West'}}}])[0];
  assert.ok(!inventory.description.includes('ref='));assert.match(inventory.description,/East.*West/);
});

test('indexed inspection jumps directly to a same-capture window before exposing its controls',async()=>{
  const captureId=randomUUID();let page=0;const jumps=[],executed=[];
  const index=[{page:0,description:'Form and current selections'},{page:1,description:'Territory options'},{page:2,description:'Account details'}];
  const observe=()=>({snapshot:page===2?'- textbox "Note" [ref=e9]':'- heading "Captured section"',refs:page===2?{e9:{role:'textbox',name:'Note'}}:{},
    observationWindow:{captureId,page,pages:3,index,inspectedPages:[0,page]}});
  const browser={sessionId:randomUUID(),observe:async()=>observe(),inspect:async action=>{jumps.push(action.page);page=action.page;return observe();},execute:async action=>executed.push(action)};
  const result=await act({browser,intentOrSteps:'Prepare Note',scope:'Requested task',suppliedValues:{note:'Exact'},authorize:()=>true,
    decide:async r=>{if(page===0){assert.ok(!Object.values(r.candidates).some(a=>a.ref==='@e9'));return {binding:r.binding,choice:'inspect_window_2'};}
      return {binding:r.binding,choice:executed.length?'step_complete':Object.keys(r.candidates).find(k=>r.candidates[k].op==='fill')};}});
  assert.equal(result.returnReason,'reported_complete');assert.deepEqual(jumps,[2]);assert.equal(executed.length,1);assert.equal(executed[0].ref,'@e9');
});

test('capture choices cannot introduce out-of-range windows or bypass capture freshness',async()=>{
  const view={captureId:'current',page:0,pages:2,index:[{page:-1},{page:2},{page:1,description:'Other'}, {page:'1'}]};
  assert.deepEqual(Object.keys(captureChoices(view)),['inspect_window_1']);
  const browser={sessionId:randomUUID(),observe:async()=>({snapshot:'- heading "Here"',refs:{},observationWindow:view}),
    inspect:async()=>({snapshot:'stale',refs:{},observationWindow:{captureId:'old',page:1,pages:2}}),execute:async()=>{throw Error('No gesture expected');}};
  const result=await act({browser,intentOrSteps:'Inspect another section',scope:'Requested task',authorize:()=>true,
    decide:async r=>({binding:r.binding,choice:'inspect_window_1'})});
  assert.equal(result.returnReason,'invalid_observation');assert.equal(result.actions.length,0);
});
