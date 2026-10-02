import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {agentBrowser} from '../scripts/agent-browser-jev.mjs';
import {observedFields} from '../scripts/review-evidence.mjs';
import {pickerReadbacks,pickerBindingRequest} from '../scripts/picker-binding.mjs';

test('readonly display survives an empty native value without reading masked fields',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jev-display-readback-'));
 try{
  const binary=join(root,'browser.mjs'),log=join(root,'calls.json');
  await writeFile(binary,`#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),log=${JSON.stringify(log)};let prior=[];try{prior=JSON.parse(readFileSync(log))}catch{}prior.push(args);writeFileSync(log,JSON.stringify(prior));
const result=command=>{
 if(command.startsWith('get attr'))return {value:command.endsWith('type')?(command.includes('@e3')?'password':null):command.endsWith('aria-readonly')?'true':null};
 if(command.startsWith('get value'))return {value:''};
 if(command.startsWith('get text'))return {text:'Glass studio'};
 return {value:null};
};
if(args[3]==='batch')console.log(JSON.stringify(args.slice(4).map(c=>({success:true,result:result(c)}))));
else if(args[3]==='snapshot')console.log(JSON.stringify({success:true,data:{snapshot:'- combobox "Department" [expanded=false, ref=e1]\\n  - textbox "Current department" [ref=e2]\\n    - StaticText "Glass studio"\\n- textbox "Secret" [ref=e3]',refs:{e1:{role:'combobox',name:'Department'},e2:{role:'textbox',name:'Current department'},e3:{role:'textbox',name:'Secret'}}}}));
else console.log(JSON.stringify({success:true,data:{value:null}}));
`,{mode:0o700});
  const observation=await agentBrowser({binary,sessionId:'test',sanitize:x=>x}).observe();
  const field=observedFields({observation}).find(f=>f.ref==='@e2');
  assert.equal(field.value,'');assert.equal(field.basis,'exact_browser_value');
  assert.equal(field.displayText,'Glass studio');assert.equal(field.displayTextBasis,'exact_browser_text');
  const commands=JSON.parse(await readFile(log,'utf8')).flat();
  assert.ok(commands.includes('get text @e2'));
  assert.ok(!commands.includes('get text @e3'));assert.ok(!commands.includes('get value @e3'));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('readonly display evidence stays separate; editable or truncated text cannot prove selection',()=>{
 const o={snapshot:'- combobox "Department" [expanded=false, ref=e1]\n  - textbox "Current department" [ref=e2]\n    - StaticText "Glass studio"',refs:{e1:{role:'combobox',name:'Department'},e2:{role:'textbox',name:'Current department',readonly:true,exactValue:'',exactDisplayText:'Glass studio'}}};
 const proof=pickerReadbacks(o).items[0];
 assert.equal(proof.kind,'current_readonly_field');assert.equal(proof.field.value,'');
 assert.equal(proof.field.displayText,'Glass studio');assert.equal(proof.field.displayTextBasis,'exact_browser_text');
 const p=pickerBindingRequest({intent:'Keep Glass studio selected',observation:o,candidates:{}});
 assert.equal(p.state.readbacks[0].field.displayText,'Glass studio');
 assert.match(p.questions.pickerProof0.instructions,/identifies both this field/);
 assert.equal(pickerReadbacks({...o,refs:{...o.refs,e2:{...o.refs.e2,readonly:false}}}).items.length,0);
 assert.equal(pickerReadbacks({...o,refs:{...o.refs,e2:{...o.refs.e2,exactDisplayText:'x'.repeat(513)}}}).items.length,0);
});

test('observed text control hints reach action reviews without assigning a widget type or reading secrets',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jev-text-hints-'));
 try{
  const binary=join(root,'browser.mjs'),log=join(root,'calls.json');
  await writeFile(binary,`#!${process.execPath}
import {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),log=${JSON.stringify(log)};let prior=[];try{prior=JSON.parse(readFileSync(log))}catch{}prior.push(args);writeFileSync(log,JSON.stringify(prior));
const value=c=>c.endsWith(' type')?(c.includes('@e2')?'password':'text'):c.endsWith(' aria-autocomplete')?'list':c.endsWith(' aria-haspopup')?'listbox':c.endsWith(' class')?(c.includes('@e3')?'x'.repeat(161):'widget-suggest-field'):null;
if(args[3]==='batch')console.log(JSON.stringify(args.slice(4).map(c=>({success:true,result:{value:c.startsWith('get value')?'':value(c)}}))));
else if(args[3]==='snapshot')console.log(JSON.stringify({success:true,data:{snapshot:'- textbox "Entry" [ref=e1]\\n- textbox "Secret" [ref=e2]\\n- textbox "Long metadata" [ref=e3]',refs:{e1:{role:'textbox',name:'Entry'},e2:{role:'textbox',name:'Secret'},e3:{role:'textbox',name:'Long metadata'}}}}));
else console.log(JSON.stringify({success:true,data:{value:null}}));
`,{mode:0o700});
  const observation=await agentBrowser({binary,sessionId:'test',sanitize:x=>x}).observe();
  assert.deepEqual(observation.refs.e1.textHints,{'aria-autocomplete':'list','aria-haspopup':'listbox',class:'widget-suggest-field'});
  assert.equal(observation.refs.e2.textHints,undefined);
  assert.equal(observation.refs.e3.textHints.class,undefined);
  const commands=JSON.parse(await readFile(log,'utf8')).flat();
  assert.ok(!commands.includes('get attr @e2 class'));assert.ok(!commands.includes('get value @e2'));
  const {discoverActions}=await import('../scripts/controls.mjs');
  const actions=discoverActions(observation,{prefix:'Al'});
  const action=actions.find(a=>a.ref==='@e1'&&a.op==='fill');
  assert.deepEqual(action.observedTextHints,observation.refs.e1.textHints);
  assert.equal(action.purpose,undefined);
  const {actionCheckRequest}=await import('../scripts/action-check.mjs');
  assert.deepEqual(actionCheckRequest({observation,candidates:{c0:action}},action).state.proposedAction.observedTextHints,observation.refs.e1.textHints);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('display fixture separates redundant same-item selection from wrong or extra effects',async()=>{
 const {displayCases,verifyDisplay}=await import('./fixtures/readonly-display-pages.mjs');
 const d=displayCases[0],events=[{kind:'inspect'},{kind:'select',value:'Glass studio'},{kind:'input',value:'Bench test'},{kind:'save',selected:'Glass studio',message:'Bench test'}];
 const same=verifyDisplay(d,events);assert.equal(same.goalReached,true);assert.equal(same.scopeCorrect,true);assert.equal(same.unnecessaryReselections,1);
 const wrong=verifyDisplay(d,[{kind:'select',value:'Metal studio'},...events]);assert.equal(wrong.goalReached,true);assert.equal(wrong.scopeCorrect,false);
 assert.equal(verifyDisplay(d,[...events,events.at(-1)]).scopeCorrect,false);
});
