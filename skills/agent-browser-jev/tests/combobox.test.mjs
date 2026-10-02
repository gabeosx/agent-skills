import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {discoverActions} from '../scripts/controls.mjs';import {agentBrowser} from '../scripts/agent-browser-jev.mjs';
import {verify,cases} from './fixtures/combobox-pages.mjs';
const observation=readonly=>({snapshot:'- combobox "Category" [ref=e1]\n  - textbox "Current choice" [ref=e2]\n- textbox "Body" [ref=e3]',refs:{e1:{role:'combobox',name:'Category'},e2:{role:'textbox',name:'Current choice',readonly},e3:{role:'textbox',name:'Body'}}});
test('picker verifier rejects a typed-but-unselected save and retains a repaired wrong-field event',()=>{
 const d=cases.find(c=>c.id==='editable-picker');
 assert.equal(verify(d,[{kind:'input',field:'query',value:'Science'},{kind:'saved',value:'',body:'Keep body'}]).scopeCorrect,false);
 const corrected=[{kind:'input',field:'body',value:'Keep bodyScience'},{kind:'input',field:'body',value:'Keep body'},
  {kind:'select',value:'Science'},{kind:'saved',value:'Science',body:'Keep body'}];
 assert.deepEqual(verify(d,corrected),{goalReached:true,scopeCorrect:false,negativePassed:false});
});
test('replacement verifier accepts the normal clear-then-fill sequence but rejects unrelated text',()=>{
 const d=cases.find(c=>c.id==='aria-false-text');
 const events=[{kind:'input',field:'choice',value:''},{kind:'input',field:'choice',value:d.expected},{kind:'saved',value:d.expected,body:'Keep body'}];
 assert.equal(verify(d,events).scopeCorrect,true);
 assert.equal(verify(d,[{kind:'input',field:'choice',value:'Wrong'},...events]).scopeCorrect,false);
});
test('compound picker wrapper is inspected while only its editable child is offered text entry',()=>{
 for(const readonly of [true,false]){
  const actions=discoverActions(observation(readonly),{value:'Art'});
  assert.ok(actions.some(a=>a.ref==='@e1'&&a.op==='click'));
  assert.equal(actions.some(a=>a.ref==='@e1'&&['fill','request_input'].includes(a.op)),false);
  assert.equal(actions.some(a=>a.ref==='@e2'&&a.op==='fill'),!readonly);
  assert.ok(actions.some(a=>a.ref==='@e3'&&a.op==='fill'));
 }
});
test('standalone editable combobox remains writable and disabled controls remain unavailable',()=>{
 const plain={snapshot:'- combobox "Search" [ref=e1]',refs:{e1:{role:'combobox',name:'Search'}}};
 assert.ok(discoverActions(plain,{q:'Art'}).some(a=>a.op==='fill'));
 const o=observation(true);o.refs.e1.disabled=true;o.refs.e2.disabled=true;
 assert.equal(discoverActions(o,{q:'Art'}).some(a=>['@e1','@e2'].includes(a.ref)),false);
});
test('adapter observes ARIA readonly and rechecks late changes before dispatching text input',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jev-aria-readonly-'));
 try{
  const binary=join(root,'browser.mjs'),log=join(root,'calls.json');
  for(const [label,aria,native,accepted] of [['aria-true','true',null,false],['aria-false','false',null,true],['native-empty',null,'',false],['missing-readback',undefined,null,false]]){
   await writeFile(log,'[]');
   await writeFile(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(5),log=${JSON.stringify(log)},calls=JSON.parse(readFileSync(log));calls.push(args);writeFileSync(log,JSON.stringify(calls));
const value=attr=>attr==='aria-readonly'?${aria===undefined?'undefined':JSON.stringify(aria)}:attr==='readonly'?${JSON.stringify(native)}:null;
if(args[0]==='snapshot')console.log(JSON.stringify({success:true,data:${JSON.stringify(observation(false))}}));
else if(args[0]==='batch')console.log(JSON.stringify(args.slice(1).map(x=>({success:true,result:{value:value(x.split(' ').at(-1))}}))));
else console.log(JSON.stringify({success:true,data:{value:value(args.at(-1))}}));`,{mode:0o700});
   const browser=agentBrowser({binary,sessionId:'unit',sanitize:v=>v});
   const seen=await browser.observe();assert.equal(seen.refs.e2.readonly===true,aria==='true'||native!==null,label);
   const action={op:'fill',ref:'@e2',role:'textbox',value:'Art'};
   if(accepted)await browser.execute(action);else await assert.rejects(browser.execute(action),e=>e.code==='JEV_NOT_DISPATCHED');
   assert.equal(JSON.parse(await readFile(log,'utf8')).some(a=>a[0]==='fill'),accepted,label);
  }
 }finally{await rm(root,{recursive:true,force:true})}
});
