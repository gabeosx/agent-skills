import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openResume, sealResume } from '../scripts/run.mjs';
import { agentBrowser } from '../scripts/agent-browser-jev.mjs';
import { discoverActions } from '../scripts/jev-browser.mjs';

const command = fileURLToPath(new URL('../scripts/run.mjs', import.meta.url));

// Settling and location reads are orthogonal to control metadata. These tests
// assert control reads and their order; the location test covers get url.
function observationCommands(path) {
  return JSON.parse(readFileSync(path,'utf8')).filter((args,index,all)=>
    !(args[3]==='get'&&args[4]==='url')&&
    !(index>0&&args[3]==='snapshot'&&args.length===4&&all[index-1][3]==='snapshot'&&all[index-1].length===4));
}

test('the adapter preserves only sanitized observed location and resets window position after a browser action',async()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-capture-navigation-'));
  try{
    const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json'),statePath=join(root,'page.json');
    const listing={snapshot:['- main',...Array.from({length:250},(_,i)=>`  - paragraph\n    - StaticText "Listing context ${i} ${'ordinary text '.repeat(12)}"`),'- button "Open editor" [ref=e1]'].join('\n'),refs:{e1:{role:'button',name:'Open editor'}}};
    const form={snapshot:['- main','  - textbox "Amount" [ref=e2]: 15','  - combobox "Territory" [expanded=false, ref=e3]','    - MenuListPopup',...Array.from({length:500},(_,i)=>`      - option "Territory ${i}" [ref=e${i+4}]`), '  - button "Save" [ref=e504]'].join('\n'),refs:{e2:{role:'textbox',name:'Amount'},e3:{role:'combobox',name:'Territory'},e504:{role:'button',name:'Save'},...Object.fromEntries(Array.from({length:500},(_,i)=>[`e${i+4}`,{role:'option',name:`Territory ${i}`}]))}};
    writeFileSync(binary,`#!${process.execPath}
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const args=process.argv.slice(2),log=${JSON.stringify(argsPath)},state=${JSON.stringify(statePath)};
const calls=existsSync(log)?JSON.parse(readFileSync(log,'utf8')):[];calls.push(args);writeFileSync(log,JSON.stringify(calls));
let editor=existsSync(state),data={value:null};
if(args[3]==='click'){writeFileSync(state,'true');editor=true;}
if(args[3]==='snapshot')data=editor?${JSON.stringify(form)}:${JSON.stringify(listing)};
if(args[3]==='get'&&args[4]==='url')data={url:'https://login:password@work.example/'+(editor?'edit':'list')+'?session=secret#token'};
console.log(JSON.stringify({success:true,data}));`,{mode:0o700});
    const browser=agentBrowser({binary,sessionId:'window-reset',sanitize:v=>v});
    const initial=await browser.observe();assert.ok(initial.observationWindow.pages>2);
    const last=await browser.inspect({op:'inspect_context',captureId:initial.observationWindow.captureId,page:initial.observationWindow.pages-1});
    assert.ok(last.refs.e1);assert.ok(last.observationWindow.index.some(item=>item.page===0));
    await browser.execute({op:'click',role:'button',ref:'@e1',name:'Open editor'});
    const after=await browser.observe();
    assert.equal(after.observationWindow.page,0);assert.ok(after.snapshot.includes('Amount'));assert.ok(after.snapshot.includes('Save'));
    assert.equal(after.location.origin,'https://work.example');assert.match(after.location.identity,/^[a-f0-9]{32}$/);
    assert.ok(!JSON.stringify(after.location).includes('/edit'));assert.notEqual(after.location.identity,initial.location.identity);
    assert.ok(!JSON.stringify(after).includes('password'));assert.ok(!JSON.stringify(after).includes('secret'));
    assert.equal(JSON.parse(readFileSync(argsPath,'utf8')).filter(a=>a[3]==='get'&&a[4]==='url').length,2);
    await assert.rejects(browser.inspect({op:'inspect_context',captureId:initial.observationWindow.captureId,page:0}),/stale/);
  }finally{rmSync(root,{recursive:true,force:true});}
});


test('href-bearing links use keyboard activation; pointer-only link roles never send Enter to prior focus',async()=>{
  for(const href of ['/destination',null]){
    const root=mkdtempSync(join(tmpdir(),'jev-link-click-'));
    try{
      const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
      writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync,existsSync} from 'node:fs';
const path=${JSON.stringify(argsPath)},args=process.argv.slice(2),all=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):[];all.push(args);writeFileSync(path,JSON.stringify(all));
console.log(JSON.stringify({success:true,data:{value:${JSON.stringify(href)}}}));`,{mode:0o700});
      await agentBrowser({binary,sessionId:'link-test',sanitize:v=>v}).execute({op:'click',role:'link',ref:'@e7'});
      assert.deepEqual(observationCommands(argsPath).map(a=>a.slice(3)),[
        ['get','attr','@e7','href'],...(href===null?[['click','@e7']]:[['focus','@e7'],['press','Enter']])]);
    }finally{rmSync(root,{recursive:true,force:true})}
  }
});

test('native date action sends only observed refs and exact date digits through browser UI', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-native-date-'));
  try {
    const binary = join(root, 'browser.mjs'), argsPath = join(root, 'args.json');
    writeFileSync(binary, `#!${process.execPath}\nimport {writeFileSync} from 'node:fs';
const args=process.argv.slice(2);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(args));
console.log(JSON.stringify(args.slice(5).map(()=>({success:true,error:null,result:{}}))));`, { mode: 0o700 });
    const browser = agentBrowser({ binary, sessionId: 'date-test', sanitize: value => value });
    await browser.execute({ op: 'set_date', refs: { month: '@e3', day: '@e4', year: '@e5' }, value: '2026-11-08' });
    assert.deepEqual(JSON.parse(readFileSync(argsPath, 'utf8')), ['--session', 'date-test', '--json', 'batch', '--bail',
      'click @e3', 'press 1', 'press 1', 'click @e4', 'press 0', 'press 8', 'click @e5', 'press 2', 'press 0', 'press 2', 'press 6']);
    await assert.rejects(browser.execute({ op: 'set_date', refs: { month: '@e3', day: '@e4', year: '@e5' }, value: '2026-02-30' }), /Invalid native date/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('element scroll uses an observed ref and rejects arbitrary selectors', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-element-scroll-'));
  try {
    const binary = join(root, 'browser.mjs'), argsPath = join(root, 'args.json');
    writeFileSync(binary, `#!${process.execPath}\nimport {writeFileSync} from 'node:fs';
writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(process.argv.slice(2)));
console.log(JSON.stringify({success:true,data:{scrolled:true}}));`, { mode: 0o700 });
    const browser = agentBrowser({ binary, sessionId:'scroll-test', sanitize:value=>value });
    await browser.execute({op:'scroll',ref:'@e2',direction:'down',amount:1_000_000,purpose:'textarea_end'});
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')),
      ['--session','scroll-test','--json','scroll','down','1000000','--selector','@e2']);
    await assert.rejects(browser.execute({op:'scroll',ref:'#secret',direction:'down',amount:1_000_000,purpose:'textarea_end'}),/Invalid reference/);
  } finally { rmSync(root, {recursive:true,force:true}); }
});

test('unnamed listbox options gain only their visible ref-scoped text', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-listbox-text-'));
  try {
    const binary = join(root, 'browser.mjs'), argsPath = join(root, 'args.json');
    writeFileSync(binary, `#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2), prior=JSON.parse(readFileSync(${JSON.stringify(argsPath)},'utf8'));
prior.push(args);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(prior));
const data=args.includes('snapshot')?{snapshot:'- listbox [ref=e1]\\n  - option [ref=e2]\\n- textbox [ref=e3]',refs:{e1:{role:'listbox',name:''},e2:{role:'option',name:''},e3:{role:'textbox',name:''}}}:{text:'Northern Mariana Islands'};
console.log(JSON.stringify({success:true,data}));`, {mode:0o700});
    writeFileSync(argsPath,'[]');
    const browser=agentBrowser({binary,sessionId:'listbox-test',sanitize:value=>value});
    const observation=await browser.observe();
    assert.equal(observation.refs.e2.name,'Northern Mariana Islands');
    assert.equal(observation.refs.e3.name,'');
    assert.deepEqual(observationCommands(argsPath),[
      ['--session','listbox-test','--json','snapshot'],
      ['--session','listbox-test','--json','batch','get attr @e3 placeholder','get attr @e3 title','get attr @e3 aria-label'],
      ['--session','listbox-test','--json','batch','get attr @e3 type','get attr @e3 readonly','get attr @e3 aria-readonly'],
      ['--session','listbox-test','--json','get','attr','@e1','multiple'],
      ['--session','listbox-test','--json','get','text','@e2'],
    ]);
    assert.ok(discoverActions(observation,{},'Select Northern Mariana Islands').some(action=>
      action.op==='click'&&action.ref==='@e2'&&action.name==='Northern Mariana Islands'));
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('native text metadata inspects only observed textboxes and preserves readonly scroll support',async()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-readonly-'));
  try{
    const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
    const snapshot=`- textbox "Passage" [ref=e1]: ${'text '.repeat(80)}\n- textbox "Notes" [ref=e2]: ${'editable '.repeat(50)}\n- textbox "Name" [ref=e3]`;
    writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),prior=JSON.parse(readFileSync(${JSON.stringify(argsPath)},'utf8'));
prior.push(args);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(prior));
const data=args.includes('snapshot')?{snapshot:${JSON.stringify(snapshot)},refs:{e1:{role:'textbox',name:'Passage'},e2:{role:'textbox',name:'Notes'},e3:{role:'textbox',name:'Name'}}}:{value:args.at(-2)==='@e1'?'':null};
console.log(JSON.stringify({success:true,data}));`,{mode:0o700});
    writeFileSync(argsPath,'[]');
    const observation=await agentBrowser({binary,sessionId:'readonly-test',sanitize:value=>value}).observe();
    assert.equal(observation.refs.e1.readonly,true);
    assert.equal(observation.refs.e2.readonly,undefined);
    const actions=discoverActions(observation,{name:'Mara'});
    assert.equal(actions.find(a=>a.purpose==='textarea_end')?.ref,'@e1');
    assert.equal(actions.some(a=>a.op==='fill'&&a.ref==='@e1'),false);
    assert.equal(actions.some(a=>a.op==='fill'&&a.ref==='@e2'),true);
    assert.deepEqual(observationCommands(argsPath).map(a=>a.slice(3)),[
      ['snapshot'],['batch','get attr @e1 type','get attr @e1 readonly','get attr @e1 aria-readonly','get attr @e2 type','get attr @e2 readonly','get attr @e2 aria-readonly','get attr @e3 type','get attr @e3 readonly','get attr @e3 aria-readonly'],['get','attr','@e1','readonly'],['get','attr','@e2','readonly']]);
  }finally{rmSync(root,{recursive:true,force:true})}
});

test('oversized pages retry with a bounded interactive snapshot before model input',async()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-narrow-observation-'));
  try {
    const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
    writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),prior=JSON.parse(readFileSync(${JSON.stringify(argsPath)},'utf8'));
prior.push(args);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(prior));
const narrow=args.includes('--interactive');
const data=narrow?{snapshot:'- textbox "Comment" [ref=e1]\\n- button "Post" [ref=e2]\\n'+'x'.repeat(45000)+'\\n- button "Late" [ref=e999]',refs:{e1:{role:'textbox',name:'Comment'},e2:{role:'button',name:'Post'},e999:{role:'button',name:'Late'}}}:{snapshot:'x'.repeat(50000),refs:{}};
console.log(JSON.stringify({success:true,data}));`,{mode:0o700});
    writeFileSync(argsPath,'[]');
    const browser=agentBrowser({binary,sessionId:'narrow-test',sanitize:value=>value});
    const observation=await browser.observe();
    assert.equal(observation.refs.e1.name,'Comment');
    assert.equal(observation.refs.e999.name,'Late');
    assert.equal(observation.limited,true);
    assert.ok(observation.snapshot.length<25000);
    assert.deepEqual(observationCommands(argsPath).map(args=>args.slice(3)),[
      ['snapshot'],['snapshot','--interactive','--compact','--depth','5'],['batch','get attr @e1 type','get attr @e1 readonly','get attr @e1 aria-readonly']]);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('an empty compact tree falls back to a bounded window of the richer observed tree',async()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-rich-observation-fallback-'));
  try {
    const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
    writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),prior=JSON.parse(readFileSync(${JSON.stringify(argsPath)},'utf8'));
prior.push(args);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(prior));
const compact=args.includes('--interactive');
const data=compact?{snapshot:'- image',refs:{}}:{snapshot:'- button "Subscribe" [ref=e1]\\n'+'x'.repeat(50000),refs:{e1:{role:'button',name:'Subscribe'}}};
console.log(JSON.stringify({success:true,data}));`,{mode:0o700});
    writeFileSync(argsPath,'[]');
    const browser=agentBrowser({binary,sessionId:'rich-fallback-test',sanitize:value=>value});
    const observation=await browser.observe();
    assert.match(observation.snapshot,/button "Subscribe"/);
    assert.equal(observation.refs.e1.name,'Subscribe');
    assert.equal(observation.limited,true);
    assert.ok(observation.snapshot.length<25000);
    assert.deepEqual(observationCommands(argsPath).map(args=>args.slice(3)),[
      ['snapshot'],['snapshot','--interactive','--compact','--depth','5']]);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('a bounded large-page window retains actionable controls at both document edges',async()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-edge-observation-'));
  try {
    const binary=join(root,'browser.mjs');
    writeFileSync(binary,`#!${process.execPath}\nconst compact=process.argv.includes('--interactive');
const data=compact?{snapshot:'- button "First" [ref=e1]\\n'+'- link "filler" [ref=e2]\\n'.repeat(3000)+'- button "Subscribe" [ref=e3]',refs:{e1:{role:'button',name:'First'},e2:{role:'link',name:'filler'},e3:{role:'button',name:'Subscribe'}}}:{snapshot:'x'.repeat(50000),refs:{}};
console.log(JSON.stringify({success:true,data}));`,{mode:0o700});
    const observation=await agentBrowser({binary,sessionId:'edge-test',sanitize:value=>value}).observe();
    assert.match(observation.snapshot,/button "First"/);
    assert.match(observation.snapshot,/button "Subscribe"/);
    assert.match(observation.snapshot,/Middle of large accessibility tree omitted/);
    assert.equal(observation.refs.e1.name,'First');
    assert.equal(observation.refs.e3.name,'Subscribe');
    assert.ok(observation.snapshot.length<20000);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('tree observation identifies only observed expandable branches and exact text clicks stay literal',async()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-tree-'));
  try {
    const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
    writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),prior=JSON.parse(readFileSync(${JSON.stringify(argsPath)},'utf8'));
prior.push(args);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(prior));
let data={};
if(args.includes('snapshot'))data={snapshot:'- list\\n  - listitem [level=1, ref=e1] clickable\\n    - StaticText "Branch"\\n  - listitem [level=1, ref=e2] clickable\\n    - StaticText "Leaf"',refs:{e1:{role:'listitem',name:''},e2:{role:'listitem',name:''}}};
if(args.at(-1)==='aria-expanded')data={value:null};
if(args.at(-1)==='class')data={value:args.at(-2)==='@e1'?'expandable':'leaf'};
console.log(JSON.stringify({success:true,data}));`,{mode:0o700});
    writeFileSync(argsPath,'[]');
    const browser=agentBrowser({binary,sessionId:'tree-test',sanitize:value=>value});
    const observation=await browser.observe();
    assert.equal(observation.refs.e1.expandable,true);
    assert.equal(observation.refs.e2.expandable,undefined);
    await browser.execute({op:'click',role:'listitem',name:'Keli',text:'Keli',purpose:'observed_tree_text'});
    assert.deepEqual(observationCommands(argsPath).map(args=>args.slice(3)),[
      ['snapshot'],['get','attr','@e1','aria-expanded'],['get','attr','@e1','class'],
      ['get','attr','@e2','aria-expanded'],['get','attr','@e2','class'],
      ['find','text','Keli','click','--exact']]);
    await assert.rejects(browser.execute({op:'click',role:'listitem',name:'Keli',text:'Other',purpose:'observed_tree_text'}),/Invalid reference/);
    await browser.execute({op:'click',role:'text',name:'Aster',text:'Aster',purpose:'observed_graphic_text'});
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')).at(-1).slice(3),['find','text','Aster','click','--exact']);
    await assert.rejects(browser.execute({op:'click',role:'text',name:'Aster',text:'Birch',purpose:'observed_graphic_text'}),/Invalid reference/);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('only an observed slider handle gains step-key control',async()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-slider-'));
  try {
    const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
    writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),prior=JSON.parse(readFileSync(${JSON.stringify(argsPath)},'utf8'));
prior.push(args);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(prior));
const data=args.includes('snapshot')?{snapshot:'- generic [ref=e5] focusable [tabindex]\\n- StaticText "10"',refs:{e5:{role:'generic',name:''}}}:{value:'ui-slider-handle ui-state-default'};
console.log(JSON.stringify({success:true,data}));`,{mode:0o700});
    writeFileSync(argsPath,'[]');
    const browser=agentBrowser({binary,sessionId:'slider-test',sanitize:value=>value});
    assert.equal((await browser.observe()).refs.e5.sliderHandle,true);
    await browser.execute({op:'press',ref:'@e5',role:'generic',name:'slider',key:'ArrowLeft',purpose:'adjust_slider'});
    assert.deepEqual(observationCommands(argsPath).map(args=>args.slice(3)),[
      ['snapshot'],['get','attr','@e5','class'],['focus','@e5'],['press','ArrowLeft']]);
    await assert.rejects(browser.execute({op:'press',ref:'@e5',role:'generic',name:'other',key:'ArrowRight',purpose:'adjust_slider'}),/Unsupported action/);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('menu metadata is extracted from observed refs without exposing raw HTML',async()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-menu-icons-'));
  try {
    const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
    writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),prior=JSON.parse(readFileSync(${JSON.stringify(argsPath)},'utf8'));
prior.push(args);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(prior));
let data={};
if(args.includes('snapshot'))data={snapshot:'- menu [ref=e1]\\n  - menuitem "Save" [ref=e2]\\n  - menuitem "Playback" [ref=e3]',refs:{e1:{role:'menu',name:''},e2:{role:'menuitem',name:'Save'},e3:{role:'menuitem',name:'Playback'}}};
if(args.includes('aria-haspopup'))data={value:args.at(-2)==='@e3'?'true':null};
if(args.includes('html'))data={html:args.at(-1)==='@e2'?'<span class="ui-icon ui-icon-disk"></span>Save':'<span class="ui-menu-icon ui-icon ui-icon-caret-1-e"></span>Playback'};
console.log(JSON.stringify({success:true,data}));`,{mode:0o700});
    writeFileSync(argsPath,'[]');
    const browser=agentBrowser({binary,sessionId:'menu-icon-test',sanitize:value=>value});
    const observation=await browser.observe();
    assert.equal(observation.refs.e2.menuIcon,'ui-icon-disk');
    assert.equal(observation.refs.e3.menuParent,true);
    assert.equal(observation.refs.e3.menuIcon,'ui-icon-caret-1-e');
    assert.ok(!JSON.stringify(observation).includes('<span'));
    assert.deepEqual(observationCommands(argsPath).map(args=>args.slice(3)),[
      ['snapshot'],['get','attr','@e2','aria-haspopup'],['get','html','@e2'],
      ['get','attr','@e3','aria-haspopup'],['get','html','@e3']]);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('only an explicitly refused button pointer click may retry through keyboard activation', async () => {
  const root=mkdtempSync(join(tmpdir(),'jev-covered-button-'));
  try {
    const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
    writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),prior=JSON.parse(readFileSync(${JSON.stringify(argsPath)},'utf8'));
prior.push(args);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(prior));
if(args.includes('click')){
 const ref=args.at(-1),error=ref==='@e9'?'Click outcome uncertain':\`Element '\${ref}' is covered by <button#other> at its click point, so the input would land on that element instead.\`;
 console.log(JSON.stringify({success:false,data:null,error}));process.exit(1);
}
console.log(JSON.stringify({success:true,data:{activated:true}}));`,{mode:0o700});
    writeFileSync(argsPath,'[]');
    const browser=agentBrowser({binary,sessionId:'covered-test',sanitize:value=>value});
    await browser.execute({op:'click',ref:'@e1',role:'button'});
    assert.deepEqual(observationCommands(argsPath).map(args=>args.slice(3)),
      [['click','@e1'],['focus','@e1'],['press','Enter']]);
    writeFileSync(argsPath,'[]');
    await assert.rejects(browser.execute({op:'click',ref:'@e1',role:'menuitem'}));
    await assert.rejects(browser.execute({op:'click',ref:'@e9',role:'button'}));
    assert.deepEqual(observationCommands(argsPath).map(args=>args.slice(3)),
      [['click','@e1'],['click','@e9']]);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('agent command documents direct structured output and no file control surface', () => {
  const stdout = execFileSync(process.execPath, [command, '--help'], { cwd: tmpdir(), encoding: 'utf8' });
  assert.match(stdout, /non-interactive and returns one JSON result on stdout/);
  for (const removed of ['--task', '--policy', '--output', 'result.json']) assert.ok(!stdout.includes(removed));
});

test('directory and file symlink entrypoints execute instead of silently exiting', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-skill-symlink-'));
  try {
    symlinkSync(fileURLToPath(new URL('..', import.meta.url)), join(root, 'skill'), 'dir');
    symlinkSync(command, join(root, 'run.mjs'));
    for (const entry of ['skill/scripts/run.mjs', 'run.mjs']) {
      const stdout = execFileSync(process.execPath, [entry, '--help'], { cwd: root, encoding: 'utf8' });
      assert.match(stdout, /Agent-only browser task helper/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('valid handoff returns final state and encrypted resume token without writing result files', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-direct-result-'));
  try {
    const binary = join(root, 'browser.mjs'), argsPath = join(root, 'args.json');
    writeFileSync(binary, `#!${process.execPath}\nimport {writeFileSync} from 'node:fs';
writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(process.argv.slice(2)));
console.log(JSON.stringify({success:true,data:{snapshot:'x'.repeat(46000),refs:{}}}));`, { mode: 0o700 });
    const apiKey = 'test-only-no-network';
    const stdout = execFileSync(process.execPath, [command, '--intent', 'Inspect the page', '--binary', binary, '--session', 'portal-test', '--allow', 'click:Save draft'], {
      cwd: root, env: { ...process.env, OPENROUTER_API_KEY: apiKey }, encoding: 'utf8',
    });
    const result = JSON.parse(stdout);
    assert.equal(result.returnReason, 'observation_too_large');
    assert.equal(result.resumable, true);
    assert.match(result.resumeToken, /^jev1\./);
    assert.deepEqual(openResume(result.resumeToken, apiKey).invocation.allowedActions, [{ operation: 'click', name: 'Save draft' }]);
    assert.deepEqual(JSON.parse(readFileSync(argsPath, 'utf8')), ['--session', 'portal-test', '--json',
      'snapshot','--interactive','--compact','--depth','5']);
    assert.deepEqual(readdirSync(root).sort(), ['args.json', 'browser.mjs']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('agent command rejects unsupported allowlist operations', () => {
  let failure;
  try {
    execFileSync(process.execPath, [command, '--intent', 'Inspect the page', '--allow', 'evaluate'], {
      env: { ...process.env, OPENROUTER_API_KEY: 'offline-no-network' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) { failure = error; }
  assert.equal(failure?.status, 1);
  assert.match(JSON.parse(failure.stdout).message, /Use --allow operation/);
});

test('removed file-oriented options fail instead of silently preserving compatibility', () => {
  let failure;
  try {
    execFileSync(process.execPath, [command, '--task', 'task.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) { failure = error; }
  assert.equal(failure?.status, 1);
  assert.equal(JSON.parse(failure.stdout).returnReason, 'invalid_invocation');
});

test('resume tokens are encrypted, authenticated and expire', () => {
  const value = {
    invocation: { browser: { binary: '/browser', sessionId: 'same' }, intentOrSteps: 'Finish', context: '' },
    continuation: { schema: 1, sessionId: 'same', intentOrSteps: ['Finish'], scope: 'scope', stepIndex: 0,
      suppliedValues: { subject: 'Exact original' }, history: [], progressAssessment: [] },
  };
  const token = sealResume(value, 'key', 1000);
  assert.ok(!token.includes('Exact original'));
  assert.deepEqual(openResume(token, 'key', 1001).continuation.suppliedValues, { subject: 'Exact original' });
  const parts = token.split('.');
  parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
  assert.throws(() => openResume(parts.join('.'), 'key', 1001), /Invalid or expired/);
  assert.throws(() => openResume(token, 'key', 1000 + 30 * 60 * 1000), /Invalid or expired/);
  assert.equal(sealResume({
    invocation: value.invocation,
    continuation: { ...value.continuation, suppliedValues: { oversized: 'x'.repeat(1_000_001) } },
  }, 'key', 1000), null);
});

test('direct resume preserves the absolute browser and needs no evidence file', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-token-resume-'));
  try {
    const binary = join(root, 'browser.mjs');
    writeFileSync(binary, `#!${process.execPath}\nconsole.log(JSON.stringify({success:true,data:{snapshot:'x'.repeat(46000),refs:{}}}));`, { mode: 0o700 });
    const env = { ...process.env, OPENROUTER_API_KEY: 'offline-no-network' };
    const first = JSON.parse(execFileSync(process.execPath, [command, '--intent', 'Continue the draft', '--binary', './browser.mjs', '--session', 'relative'], { cwd: root, env, encoding: 'utf8' }));
    const second = JSON.parse(execFileSync(process.execPath, [command, '--resume-token', first.resumeToken], { cwd: tmpdir(), env, encoding: 'utf8' }));
    assert.equal(second.returnReason, 'observation_too_large');
    assert.equal(second.resumable, true);
    assert.deepEqual(readdirSync(root).sort(), ['browser.mjs']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('link destinations use only observed refs and exclude query, fragment and credentials',async()=>{
 const root=mkdtempSync(join(tmpdir(),'jev-link-destinations-'));
 try{
  const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
  const snapshot='- link "Resource" [ref=e9]\n- link "Details" [ref=e1]\n- link "Unsafe" [ref=e2]';
  writeFileSync(argsPath,'[]');
  writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),prior=JSON.parse(readFileSync(${JSON.stringify(argsPath)},'utf8'));prior.push(args);writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(prior));
if(args.includes('snapshot'))console.log(JSON.stringify({success:true,data:{snapshot:${JSON.stringify(snapshot)},refs:{e1:{role:'link',name:'Details'},e9:{role:'link',name:'Resource'},e2:{role:'link',name:'Unsafe'},e99:{role:'link',name:'Unobserved'}}}}));
else console.log(JSON.stringify(['https://user:password@example.com/image.png?secret=abc#token','/items/42?auth=private','javascript:alert(1)'].map(value=>({success:true,result:{value}}))));`,{mode:0o700});
  const browser=agentBrowser({binary,sessionId:'metadata',sanitize:value=>value});
  const observed=await browser.observe();await browser.observe();
  assert.equal(observed.refs.e9.destination,'https://example.com/image.png');assert.equal(observed.refs.e1.destination,'/items/42');
  assert.equal(observed.refs.e2.destination,undefined);assert.equal(observed.refs.e99.destination,undefined);
  const commands=observationCommands(argsPath);assert.deepEqual(commands[1].slice(3),['batch','get attr @e9 href','get attr @e1 href','get attr @e2 href']);
  assert.equal(commands.filter(a=>a.includes('batch')).length,2,'each new observation refreshes destinations even when accessible names are unchanged');
  assert.ok(discoverActions(observed).some(a=>a.ref==='@e1'&&a.destination==='/items/42'));
 }finally{rmSync(root,{recursive:true,force:true})}
});

test('ambiguous textbox actions carry observed placeholder hints without inventing a field name',async()=>{
 const root=mkdtempSync(join(tmpdir(),'jev-text-hints-'));
 try{
  const binary=join(root,'browser.mjs'),argsPath=join(root,'args.json');
  writeFileSync(argsPath,'[]');
  writeFileSync(binary,`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),path=${JSON.stringify(argsPath)},all=JSON.parse(readFileSync(path));all.push(args);writeFileSync(path,JSON.stringify(all));
if(args[3]==='batch')console.log(JSON.stringify(args.slice(4).map(c=>({success:true,result:{value:c.endsWith(' placeholder')?'Find records':null}}))));
else console.log(JSON.stringify({success:true,data:args[3]==='snapshot'?{snapshot:'- textbox "⌕" [ref=e1]\\n- textbox "Message" [ref=e2]',refs:{e1:{role:'textbox',name:'⌕'},e2:{role:'textbox',name:'Message'},e99:{role:'textbox',name:''}}}:{value:''}}));`,{mode:0o700});
  const ob=await agentBrowser({binary,sessionId:'hint-test',sanitize:v=>v}).observe();
  assert.equal(ob.refs.e1.name,'⌕');
  assert.deepEqual(ob.refs.e1.textHints,{placeholder:'Find records'});
  assert.equal(ob.refs.e2.textHints,undefined);
  assert.equal(ob.refs.e99.textHints,undefined);
  const fill=discoverActions(ob,{message:'Ready for review'}).find(a=>a.ref==='@e1'&&a.op==='fill');
  assert.deepEqual(fill.observedTextHints,{placeholder:'Find records'});
  assert.ok(!JSON.stringify(observationCommands(argsPath)).includes('@e99'));
 }finally{rmSync(root,{recursive:true,force:true})}
});
