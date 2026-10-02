import test from 'node:test';import assert from 'node:assert/strict';
import {callerUiBrowser} from './caller-ui-browser.mjs';
import {validateBrowserArgs,isGesture} from './caller-workflow-agent.mjs';
const png=()=>{const data=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(data);data.writeUInt32BE(800,16);data.writeUInt32BE(600,20);return data;};

test('screenshots use generated receipt paths and do not spend a gesture',async()=>{
  const calls=[],browser=callerUiBrowser({receiptsDirectory:'/receipts',readImage:async()=>png(),command:async args=>{calls.push(args);return {};}});
  const result=await browser(['screenshot']);
  assert.match(result.screenshot.file,/^caller-[a-f0-9-]+\.png$/);
  assert.deepEqual(calls,[['screenshot','/receipts/'+result.screenshot.file]]);
  assert.equal(isGesture(['screenshot']),false);
  assert.throws(()=>validateBrowserArgs(['screenshot','/somewhere/private']));
});
test('pointer fallback is bounded by a fresh screenshot and invalidated after a gesture',async()=>{
  const calls=[];let time=0;
  const browser=callerUiBrowser({receiptsDirectory:'/receipts',readImage:async()=>png(),now:()=>time,command:async args=>{calls.push(args);return {};}});
  await assert.rejects(()=>browser(['click_at','40','50']),/fresh viewport/);
  await browser(['screenshot']);await browser(['click_at','40','50']);
  assert.deepEqual(calls.slice(-3),[['mouse','move','40','50'],['mouse','down'],['mouse','up']]);
  await assert.rejects(()=>browser(['click_at','40','50']),/fresh viewport/);
  await browser(['screenshot']);await assert.rejects(()=>browser(['click_at','800','50']),/in-bounds/);
  await browser(['screenshot']);time=31000;await assert.rejects(()=>browser(['click_at','40','50']),/fresh viewport/);
  await browser(['screenshot']);await browser(['click','@e1']);await assert.rejects(()=>browser(['click_at','40','50']),/fresh viewport/);
});
test('exact-text fallback requires unique fresh observed UI text',async()=>{
  let snapshot='- StaticText "Select all"',calls=[];
  const browser=callerUiBrowser({command:async args=>{calls.push(args);return {snapshot};}});
  await browser(['find','text','Select all','click','--exact']);
  assert.deepEqual(calls.map(c=>c[0]),['snapshot','find']);
  snapshot+='\n- StaticText "Select all"';calls=[];
  await assert.rejects(()=>browser(['find','text','Select all','click','--exact']),/one current/);
  assert.deepEqual(calls,[['snapshot']]);
  await assert.rejects(()=>browser(['find','text','Unobserved','click','--exact']),/one current/);
});
