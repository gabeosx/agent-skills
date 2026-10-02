import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {appendLine,validateAppend} from '../scripts/text-edit.mjs';
import {discoverActions,act} from '../scripts/jev-browser.mjs';
import {agentBrowser} from '../scripts/agent-browser-jev.mjs';
const observation={snapshot:'- textbox "Body" [ref=e1]: Existing text',refs:{e1:{role:'textbox',name:'Body',exactValue:'Existing text\n  preserved whitespace  '}}};
test('append preserves exact old bytes and line boundaries, replacement remains independently available',()=>{
  assert.equal(appendLine('First\n  Second  ','Added'),'First\n  Second  \nAdded');
  assert.equal(appendLine('First\n','Added'),'First\nAdded');
  assert.equal(appendLine('','Added'),'Added');
  const actions=discoverActions(observation,{note:'Added'}).filter(a=>a.op==='fill');
  assert.equal(actions.length,2);
  assert.equal(actions[0].value,'Added');
  assert.equal(actions[1].value,'Existing text\n  preserved whitespace  \nAdded');
  assert.throws(()=>validateAppend({...actions[1],value:'Invented'},actions[1].expectedValue),/Invalid/);
});
test('unreadable, readonly, disabled, missing addition and overlong values cannot supply append actions',()=>{
  for(const o of [{...observation,refs:{e1:{role:'textbox',name:'Body'}}},
    {...observation,refs:{e1:{...observation.refs.e1,readonly:true}}},
    {...observation,refs:{e1:{...observation.refs.e1,disabled:true}}},
    {...observation,refs:{e1:{...observation.refs.e1,exactValue:'x'.repeat(8192)}}}])
    assert.equal(discoverActions(o,{line:'Added'}).some(a=>a.source==='observed_append_line'),false);
  assert.equal(discoverActions(observation,{}).some(a=>a.source==='observed_append_line'),false);
});
test('numeric scalars do not offer newline composition as an increment',()=>{
  const numeric={snapshot:'- textbox "Count" [ref=e1]: 17',refs:{e1:{role:'textbox',name:'Count',exactValue:'17'}}};
  const actions=discoverActions(numeric,{received:'6'});
  assert.equal(actions.some(a=>a.source==='observed_append_line'),false);
  assert.ok(actions.some(a=>a.op==='request_input'));
  assert.ok(actions.some(a=>a.op==='fill'&&a.value==='6'));
});
test('adapter rechecks the exact field and never dispatches a stale or altered append',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jev-append-'));
  try{
    const binary=join(root,'browser.mjs'),log=join(root,'calls.json');await writeFile(log,'[]');
    await writeFile(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(5),p=${JSON.stringify(log)},calls=JSON.parse(readFileSync(p));calls.push(args);writeFileSync(p,JSON.stringify(calls));
console.log(JSON.stringify({success:true,data:{value:'Changed independently'}}));`,{mode:0o700});
    const browser=agentBrowser({binary,sessionId:'test',sanitize:v=>v});
    const action=discoverActions(observation,{line:'Added'}).find(a=>a.source==='observed_append_line');
    await assert.rejects(browser.execute(action),error=>error.code==='JEV_NOT_DISPATCHED');
    assert.deepEqual(JSON.parse(await readFile(log,'utf8')),[['get','value','@e1']]);
  }finally{await rm(root,{recursive:true,force:true})}
});
test('exact text inspection excludes masked types, unobserved refs and oversized values',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jev-text-observation-'));
  try{
    const binary=join(root,'browser.mjs'),log=join(root,'calls.json');await writeFile(log,'[]');
    await writeFile(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(5),p=${JSON.stringify(log)},calls=JSON.parse(readFileSync(p));calls.push(args);writeFileSync(p,JSON.stringify(calls));
if(args[0]==='snapshot')console.log(JSON.stringify({success:true,data:{snapshot:'- textbox "Body" [ref=e1]: Existing\\n- textbox "Masked" [ref=e2]: ****\\n- textbox "Long" [ref=e3]: long',refs:{e1:{role:'textbox'},e2:{role:'textbox'},e3:{role:'textbox'},e99:{role:'textbox'}}}}));
else if(args[0]==='batch')console.log(JSON.stringify(args.slice(1).map(command=>({success:true,result:{value:command==='get attr @e2 type'?'password':command==='get value @e1'?'Original\\n  exact  ':command==='get value @e3'?'x'.repeat(8193):null}}))));
else console.log(JSON.stringify({success:true,data:{value:null}}));`,{mode:0o700});
    const observed=await agentBrowser({binary,sessionId:'text-inspection',sanitize:v=>v}).observe();
    assert.equal(observed.refs.e1.exactValue,'Original\n  exact  ');
    assert.equal(observed.refs.e2.exactValue,undefined);assert.equal(observed.refs.e3.exactValue,undefined);
    const calls=JSON.parse(await readFile(log,'utf8')).flat();
    assert.equal(calls.includes('get value @e2'),false);assert.equal(calls.some(x=>x.includes('@e99')),false);
  }finally{await rm(root,{recursive:true,force:true})}
});
test('a failed pre-dispatch freshness check returns new evidence without retrying a mutation',async()=>{
  let observed=0,attempts=0;
  const result=await act({browser:{sessionId:'stale-append-test',observe:async()=>{observed++;return observation;},execute:async()=>{attempts++;const e=new Error('changed');e.code='JEV_NOT_DISPATCHED';throw e;}},
    suppliedValues:{line:'Added'},scope:'Append authorized line',intentOrSteps:'Append a line',authorize:()=>true,
    decide:async r=>({binding:r.binding,choice:Object.entries(r.candidates).find(([,a])=>a.source==='observed_append_line')[0]})});
  assert.equal(result.returnReason,'stale_observation');assert.equal(attempts,1);assert.equal(observed,2);
  assert.equal(result.actions[0].outcome,'not_dispatched');assert.equal(result.observationFresh,true);
});
