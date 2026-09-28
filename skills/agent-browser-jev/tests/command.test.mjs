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
    await browser.execute({op:'scroll',ref:'@e2',direction:'down',amount:2000,purpose:'textarea_end'});
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')),
      ['--session','scroll-test','--json','scroll','down','2000','--selector','@e2']);
    await assert.rejects(browser.execute({op:'scroll',ref:'#secret',direction:'down',amount:2000,purpose:'textarea_end'}),/Invalid reference/);
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
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')),[
      ['--session','listbox-test','--json','snapshot'],
      ['--session','listbox-test','--json','get','text','@e2'],
    ]);
    assert.ok(discoverActions(observation,{},'Select Northern Mariana Islands').some(action=>
      action.op==='click'&&action.ref==='@e2'&&action.name==='Northern Mariana Islands'));
  } finally { rmSync(root,{recursive:true,force:true}); }
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
    assert.equal(observation.refs.e999,undefined);
    assert.equal(observation.limited,true);
    assert.ok(observation.snapshot.length<25000);
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')).map(args=>args.slice(3)),[
      ['snapshot'],['snapshot','--interactive','--compact','--depth','5']]);
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
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')).map(args=>args.slice(3)),[
      ['snapshot'],['snapshot','--interactive','--compact','--depth','5']]);
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
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')).map(args=>args.slice(3)),[
      ['snapshot'],['get','attr','@e1','aria-expanded'],['get','attr','@e1','class'],
      ['get','attr','@e2','aria-expanded'],['get','attr','@e2','class'],
      ['find','text','Keli','click','--exact']]);
    await assert.rejects(browser.execute({op:'click',role:'listitem',name:'Keli',text:'Other',purpose:'observed_tree_text'}),/Invalid reference/);
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
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')).map(args=>args.slice(3)),[
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
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')).map(args=>args.slice(3)),[
      ['snapshot'],['get','attr','@e2','aria-haspopup'],['get','html','@e2'],
      ['get','attr','@e3','aria-haspopup'],['get','html','@e3']]);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('only an explicitly refused covered-button click uses keyboard activation', async () => {
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
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')).map(args=>args.slice(3)),
      [['click','@e1'],['focus','@e1'],['press','Enter']]);
    writeFileSync(argsPath,'[]');
    await assert.rejects(browser.execute({op:'click',ref:'@e1',role:'link'}));
    await assert.rejects(browser.execute({op:'click',ref:'@e9',role:'button'}));
    assert.deepEqual(JSON.parse(readFileSync(argsPath,'utf8')).map(args=>args.slice(3)),
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
