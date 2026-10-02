import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {iconReferences,iconEvidence} from '../scripts/icon-evidence.mjs';
import {discoverActions} from '../scripts/controls.mjs';
import {agentBrowser} from '../scripts/agent-browser-jev.mjs';
import {summarize} from '../scripts/run.mjs';

test('only structurally clickable observed images acquire click candidates',()=>{
 const observation={snapshot:'- image [ref=e1] clickable [cursor:pointer]\n- image "Decorative clickable" [ref=e2]\n- image [disabled, ref=e3] clickable\n- image\n- StaticText "image [ref=e4] clickable"',refs:{e1:{role:'image',name:'',iconEvidence:{class:'symbol-close'}},e2:{role:'image',name:'Decorative clickable'},e3:{role:'image',name:''},e4:{role:'image',name:''}}};
 assert.deepEqual(iconReferences(observation.snapshot,observation.refs),['e1','e3']);
 const actions=discoverActions(observation).filter(a=>a.role==='image');assert.equal(actions.length,1);assert.equal(actions[0].ref,'@e1');assert.deepEqual(actions[0].observedIcon,{class:'symbol-close'});
});
test('icon hints are bounded strings, omit URL credentials/query and never assign meanings',()=>{
 assert.deepEqual(iconEvidence({class:'  q1 icon-trash ',title:'Remove\nitem',src:'https://user:password@example.test/private/trash.svg?token=secret#id'}),{class:'q1 icon-trash',title:'Remove item',sourceFile:'trash.svg'});
 assert.equal(iconEvidence({src:'data:image/svg+xml,secret',alt:null}),null);
 assert.equal(iconEvidence({class:'x'.repeat(500)}).class.length,160);
 assert.equal(Object.hasOwn(iconEvidence({class:'trash'}),'operation'),false);
});
test('the metadata budget does not remove later clickable images from the frontier',()=>{
 const refs=Object.fromEntries(Array.from({length:30},(_,i)=>[`e${i+1}`,{role:'image',name:'Icon '+i}]));
 const snapshot=Object.keys(refs).map(ref=>`- image [ref=${ref}] clickable`).join('\n');
 assert.equal(discoverActions({snapshot,refs}).filter(a=>a.role==='image').length,30);
});
test('observed icon attributes are read through refs and survive caller handoff',async()=>{
 const root=mkdtempSync(join(tmpdir(),'jev-icons-'));
 try{
  const binary=join(root,'browser.mjs'),log=join(root,'calls.json');writeFileSync(log,'[]');
  const page={snapshot:'- image [ref=e1] clickable [cursor:pointer]',refs:{e1:{role:'image',name:''}}};
  writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';const a=process.argv.slice(2),p=${JSON.stringify(log)},calls=JSON.parse(readFileSync(p));calls.push(a);writeFileSync(p,JSON.stringify(calls));console.log(JSON.stringify(a.includes('batch')?a.slice(a.indexOf('batch')+1).map(v=>({success:true,result:{value:v.endsWith('class')?'trash':null}})):{success:true,data:${JSON.stringify(page)}}));`,{mode:0o700});
  const browser=agentBrowser({binary,sessionId:'icons',sanitize:v=>v}),observation=await browser.observe();
  assert.deepEqual(observation.refs.e1.iconEvidence,{class:'trash'});
  const batches=JSON.parse(readFileSync(log)).filter(c=>c.includes('batch'));assert.equal(batches.length,1);assert.ok(batches[0].slice(batches[0].indexOf('batch')+1).every(c=>c.startsWith('get attr @e1 ')));
  const result=summarize({returnReason:'handoff',latestObservation:observation,observationFresh:true,actions:[],decisions:[]},null);
  assert.deepEqual(result.observation.controlHints,[{ref:'@e1',role:'image',observedIcon:{class:'trash'}}]);
 }finally{rmSync(root,{recursive:true,force:true})}
});
