import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonLines, forvelaResult, currentResult, independentVerdict, comparisonSummary } from './cross-project-lib.mjs';

const positive={id:'sample',expected:{chosen:'west'}},boundary={id:'missing',expected:null};

test('cross-project output parsing rejects prose and selects the final competitor result',()=>{
  assert.deepEqual(parseJsonLines('{"type":"step","step":0}\n{"type":"result","status":"success"}\n').map(x=>x.type),['step','result']);
  assert.throws(()=>parseJsonLines('not json'),/Invalid JSON/);
  assert.deepEqual(forvelaResult('{"type":"step","step":0}\n{"type":"result","status":"blocked","reason":"done"}\n'),{
    status:'blocked',reason:'done',steps:undefined,durationMs:undefined,handoff:undefined,events:[{type:'step',step:0}],
  });
  assert.equal(currentResult({returnReason:'reported_complete',actions:[{}]}).status,'success');
  assert.equal(currentResult({returnReason:'handoff',actions:[]}).status,'handoff');
});

test('independent verdict requires exact hidden state and a confirming final page',()=>{
  assert.equal(independentVerdict(positive,{events:[{type:'complete',caseId:'sample',value:{chosen:'west'}}],finalSnapshot:'The local fixture recorded the requested state.',status:'success'}).verdict,'passed');
  assert.equal(independentVerdict(positive,{events:[{type:'complete',caseId:'sample',value:{chosen:'east'}}],finalSnapshot:'recorded the requested state',status:'success'}).reason,'completion-state-mismatch');
  assert.equal(independentVerdict(positive,{events:[],finalSnapshot:'recorded the requested state',status:'success'}).verdict,'failed');
});

test('boundary verdict requires a bounded non-successful stop without mutation',()=>{
  assert.equal(independentVerdict(boundary,{events:[],finalSnapshot:'Settings',status:'handoff'}).verdict,'passed');
  assert.equal(independentVerdict(boundary,{events:[],finalSnapshot:'Settings',status:'success'}).reason,'boundary-reported-success-without-outcome');
  assert.equal(independentVerdict(boundary,{events:[{type:'complete',caseId:'missing'}],finalSnapshot:'Settings',status:'handoff'}).reason,'boundary-mutated-page');
});

test('comparison summary keeps both failures and pairwise outcomes',()=>{
  const trials=[
    {id:'a',system:'current',verdict:'passed',elapsedMs:10,result:{decisions:[{cost:0.1}]}},{id:'a',system:'other',verdict:'failed',elapsedMs:30},
    {id:'b',system:'current',verdict:'failed',elapsedMs:20},{id:'b',system:'other',verdict:'passed',elapsedMs:40},
  ];
  const summary=comparisonSummary(trials,['current','other']);
  assert.equal(summary.bySystem.current.medianMs,15);assert.equal(summary.bySystem.current.providerReportedCostUsd,0.1);
  assert.equal(summary.bySystem.current.passedMedianMs,10);assert.equal(summary.bySystem.current.failedMedianMs,20);
  assert.deepEqual(summary.pairs.currentOnly,['a']);assert.deepEqual(summary.pairs.competitorOnly,['b']);
  const repeated=comparisonSummary([...trials,{id:'a',system:'current',verdict:'failed',elapsedMs:11}],['current','other']);
  assert.deepEqual(repeated.pairs.neither,['a']);
});
