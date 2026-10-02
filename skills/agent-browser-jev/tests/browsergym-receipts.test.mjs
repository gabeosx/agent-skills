import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {recoverBrowserGymReceipts} from './browsergym-receipts.mjs';
const execute=promisify(execFile);
const trial={id:'click-button',seed:123,arm:'baseline',variant:'miniwob',round:1};
async function workspace(t){const dir=await mkdtemp(join(tmpdir(),'jev-receipts-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir}
async function receipt(dir,session,phase,value){await writeFile(join(dir,session+'.episode.json'),JSON.stringify({schema:1,kind:'browsergym-episode-receipt',session,phase,trial:value}))}

test('recover returned paid result after evaluator interruption without inventing reward',async t=>{
  const dir=await workspace(t);
  await receipt(dir,'one','invoking_helper',trial);
  await writeFile(join(dir,'one.bridge.json'),JSON.stringify({schema:1,kind:'browsergym-helper-receipt',session:'one',phase:'returned',response:{result:{returnReason:'reported_complete',jev:{costUsd:.03}},trace:[{type:'action'}]}}));
  const recovered=await recoverBrowserGymReceipts(dir);
  assert.equal(recovered.trials[0].result.jev.costUsd,.03);
  assert.equal(recovered.trials[0].result.returnReason,'reported_complete');
  assert.equal(recovered.trials[0].verification.passed,false);
  assert.equal(recovered.trials[0].reward,undefined);
  assert.equal(recovered.trials[0].recovery.cleanupConfirmed,false);
  assert.equal(recovered.trials[0].failureClass,'infrastructure');
});

test('recovery keeps evaluated results, deduplicates recorded arms and reports corrupt receipts',async t=>{
  const dir=await workspace(t),complete={...trial,reward:1,done:true,verification:{passed:true},failureClass:'passed'};
  await receipt(dir,'one','evaluated',complete);
  const recovered=await recoverBrowserGymReceipts(dir);
  assert.equal(recovered.trials[0].verification.passed,true);
  assert.equal(recovered.trials[0].recovery.cleanupConfirmed,false);
  assert.equal((await recoverBrowserGymReceipts(dir,[complete])).trials.length,0);
  await writeFile(join(dir,'bad.episode.json'),'{');
  await writeFile(join(dir,'unfinished.episode.tmp'),'{');
  assert.equal((await recoverBrowserGymReceipts(dir)).errors.length,1);
});

test('a killed ordinary helper leaves its last model event on disk',async t=>{
  const dir=await workspace(t),helper=join(dir,'helper');await mkdir(join(helper,'scripts'),{recursive:true});
  await writeFile(join(helper,'scripts/run.mjs'),`export async function runTask(_,options){options.onEvent({type:'model_decision',decision:{cost:.02}});await new Promise(resolve=>setTimeout(resolve,60000));} export const summarize=x=>x;`);
  const child=spawn(process.execPath,[resolve('tests/browsergym/run-helper.mjs')],{stdio:['pipe','pipe','pipe'],env:{...process.env,OPENROUTER_API_KEY:'',JEV_GYM_RECEIPTS:dir}});
  t.after(()=>child.kill('SIGKILL'));
  const closed=once(child,'close');child.stdin.end(JSON.stringify({helperDir:helper,session:'killed',taskName:'click-button',goal:'Click the button.'}));
  const path=join(dir,'killed.bridge.json');let value;
  for(let i=0;i<100;i++){
    try{value=JSON.parse(await readFile(path,'utf8'));if(value.phase==='running')break}catch{}
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  assert.equal(value?.phase,'running');child.kill('SIGKILL');await closed;
  const durable=JSON.parse(await readFile(path,'utf8'));
  assert.equal(durable.response.trace[0].decision.cost,.02);
  assert.equal(durable.response.result,undefined);
  assert.equal((await stat(path)).mode&0o777,0o600);
});

test('Python journal is atomic and scheduling halts on infrastructure or unknown charges',async t=>{
  const dir=await workspace(t);
  const script=`import sys, json, os\nsys.path.insert(0, ${JSON.stringify(resolve('tests/browsergym'))})\nfrom receipts import save_episode, stop_reason\ntrial = {'result': {'jev': {'costUsd': 0.01}}}\nassert stop_reason(trial) is None\nfor cost in [None, -1, float('nan'), float('inf'), True]:\n trial['result']['jev']['costUsd'] = cost\n assert stop_reason(trial)\ntrial['result']['jev']['costUsd'] = 0.01\nfor assistance in [None, {}, {'calls': 1, 'costUsd': None}]:\n trial['result']['assistance'] = assistance\n assert stop_reason(trial)\ntrial['result']['assistance'] = {'calls': 0, 'costUsd': None}\nassert stop_reason(trial) is None\ntrial['failureClass'] = 'infrastructure'\nassert stop_reason(trial, smoke=True)\nsave_episode('one', 'helper_returned', trial)\nsave_episode('one', 'evaluated', {**trial, 'reward': 0})\n`;
  await execute('python3',['-c',script],{env:{...process.env,JEV_GYM_RECEIPTS:dir,PYTHONDONTWRITEBYTECODE:'1'}});
  const record=JSON.parse(await readFile(join(dir,'one.episode.json'),'utf8'));
  assert.equal(record.phase,'evaluated');assert.equal(record.trial.reward,0);
  assert.equal((await stat(join(dir,'one.episode.json'))).mode&0o777,0o600);
});
