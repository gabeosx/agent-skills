import test from 'node:test';
import assert from 'node:assert/strict';
import {settledObservation} from '../scripts/observation-settle.mjs';
import {discoverActions} from '../scripts/controls.mjs';

test('delayed fields replace the initial application shell before selection',async()=>{
  let time=0,reads=0;
  const data=await settledObservation({now:()=>time,wait:async ms=>{time+=ms},
    capture:async()=>{reads++;return {snapshot:time<1800?'- heading "Record" [ref=e1]':'- textbox "Amount" [ref=e2]: 42'};}});
  assert.match(data.snapshot,/Amount/);assert.ok(time>=3000);assert.ok(reads<16);
});

test('ref churn does not prevent quiescence and the latest refs survive',async()=>{
  let time=0,ref=0;
  const data=await settledObservation({now:()=>time,wait:async ms=>{time+=ms},
    capture:async()=>({snapshot:`- button "Continue" [ref=e${++ref}]`})});
  assert.equal(time,2000);assert.match(data.snapshot,new RegExp(`ref=e${ref}`));
});

test('continuous rendering is bounded and cancellation does not return stale evidence',async()=>{
  let time=0;
  await settledObservation({now:()=>time,wait:async ms=>{time+=ms},capture:async()=>({snapshot:String(time)})});
  assert.equal(time,6000);
  const controller=new AbortController();
  await assert.rejects(settledObservation({signal:controller.signal,now:()=>0,
    capture:async()=>({snapshot:'shell'}),wait:async()=>controller.abort()}),{name:'AbortError'});
});

test('clickable generic retains its exact rendered name when refs omit it',()=>{
  const actions=discoverActions({snapshot:'- generic "Shipping & handling" [ref=e8] clickable [cursor:pointer]',refs:{e8:{role:'generic',name:''}}},{},'Inspect delivery');
  assert.equal(actions.find(a=>a.ref==='@e8'&&a.op==='click').name,'Shipping & handling');
});
