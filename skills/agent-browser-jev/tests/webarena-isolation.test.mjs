import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCleanState, assertQualified, runIsolatedArm, isolationProtocol } from './webarena-isolation.mjs';
const clean={protocol:isolationProtocol,passed:true,containerId:'new-backend',referenceSha256:'clean',readbackSha256:'clean'};

test('persisted-state gate rejects missing and dirty references',()=>{
  assert.throws(()=>assertCleanState({}, {sha256:'clean'}),/clean-start/);
  const state={isolation:{protocol:isolationProtocol,reference:{sha256:'clean'}}};
  assert.throws(()=>assertCleanState(state,{sha256:'dirty'}),/clean-start/);
  assert.doesNotThrow(()=>assertCleanState(state,{sha256:'clean'}));
});

test('dirty or missing clean-start evidence blocks model dispatch after restoration',async()=>{
  for(const evidence of [null,{...clean,passed:false},{...clean,containerId:'stale'},
    {...clean,readbackSha256:'dirty'},{...clean,referenceSha256:null}]){
    let calls=0;
    await assert.rejects(runIsolatedArm({restore:async()=>clean,verify:async()=>evidence,
      run:async()=>calls++}),/clean-start/);
    assert.equal(calls,0);
  }
  let calls=0;
  await assert.rejects(runIsolatedArm({restore:async()=>clean,
    verify:async()=>{throw new Error('dirty database');},run:async()=>calls++}),/dirty/);
  assert.equal(calls,0);
});

test('every arm restores and verifies before model dispatch, in both run orders',async()=>{
  for(const order of [['candidate','baseline'],['baseline','candidate']]){
    const events=[];
    for(const arm of order)await runIsolatedArm({
      restore:async()=>{events.push(`${arm}:restore`);return clean;},
      verify:async()=>{events.push(`${arm}:verify`);return clean;},
      run:async proof=>{assert.equal(proof.readbackSha256,'clean');events.push(`${arm}:model`);},
    });
    assert.deepEqual(events,order.flatMap(arm=>['restore','verify','model'].map(stage=>`${arm}:${stage}`)));
  }
});

test('paid readiness requires isolation and both evaluators from the current harness',()=>{
  const state={isolation:{qualification:{passed:true,harnessFingerprint:'v1',dirtyStartBlocked:true,
    cycles:[{passed:true},{passed:true}]},evaluatorControls:{
      negative:{passed:true,harnessFingerprint:'v1'},positive:{passed:true,harnessFingerprint:'v1'},
    }}};
  assert.doesNotThrow(()=>assertQualified(state,'v1'));
  assert.throws(()=>assertQualified(state,'v2'),/isolation/);
  delete state.isolation.evaluatorControls.positive;
  assert.throws(()=>assertQualified(state,'v1'),/both no-model/);
});
