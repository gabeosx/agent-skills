import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultPolicy } from '../scripts/run.mjs';

const configModule = new URL('../scripts/config.mjs', import.meta.url).href;
const setup = fileURLToPath(new URL('../scripts/setup.mjs', import.meta.url));
test('interactive terminal prompt never echoes an immediately pasted key', () => {
  execFileSync('python3', ['-c', `
import os,pty,subprocess,tempfile,pathlib,select,time,shutil,sys
root=pathlib.Path(tempfile.mkdtemp(prefix='jev-hidden-prompt-'))
try:
 for name,body in [('npm','#!/bin/sh\\nexit 0\\n'),('browser','#!/bin/sh\\necho agent-browser-test\\n')]:
  p=root/name;p.write_text(body);p.chmod(0o700)
 env={**os.environ,'XDG_CONFIG_HOME':str(root),'OPENROUTER_API_KEY':'','AGENT_BROWSER_BINARY':'','PATH':str(root)+':'+os.environ['PATH']}
 master,slave=pty.openpty()
 child=subprocess.Popen([sys.argv[2],sys.argv[1],'--binary',str(root/'browser')],stdin=slave,stdout=slave,stderr=slave,env=env)
 os.close(slave);output=b'';sent=False;deadline=time.monotonic()+15
 while time.monotonic()<deadline:
  if select.select([master],[],[],.1)[0]:
   try:chunk=os.read(master,65536)
   except OSError:break
   if not chunk:break
   output+=chunk
   if b'(hidden): ' in output and not sent:
    os.write(master,b'fixture-hidden-key\\r');sent=True
  if child.poll() is not None:break
 child.wait(timeout=3);os.close(master)
 assert child.returncode==0 and sent
 assert b'fixture-hidden-key' not in output, 'Hidden prompt echoed its input'
 assert 'fixture-hidden-key' in (root/'agent-browser-jev/config.json').read_text()
finally:shutil.rmtree(root)
`, setup, process.execPath], { timeout: 20_000, stdio: 'pipe' });
});
test('setup saves stdin key privately, reuses chosen browser, and never prints the key', () => {
  const root = mkdtempSync(join(tmpdir(),'jev-setup-test-'));
  try {
    writeFileSync(join(root,'npm'),'#!/bin/sh\nexit 0\n',{mode:0o700});
    const binary=join(root,'existing-browser');
    writeFileSync(binary,'#!/bin/sh\necho "agent-browser test-fixture"\n',{mode:0o700});
    const env={...process.env,XDG_CONFIG_HOME:root,OPENROUTER_API_KEY:'',AGENT_BROWSER_BINARY:'',PATH:`${root}:${process.env.PATH}`};
    const stdout=execFileSync(process.execPath,[setup,'--key-stdin','--binary',binary],{env,input:'fixture-secret-key\n',encoding:'utf8'});
    assert.ok(!stdout.includes('fixture-secret-key'));
    const path=join(root,'agent-browser-jev','config.json');
    assert.deepEqual(JSON.parse(readFileSync(path,'utf8')),{apiKey:'fixture-secret-key',browserBinary:binary});
    assert.equal(statSync(path).mode&0o777,0o600);
    assert.match(stdout,/Ready: agent-browser test-fixture/);
    const again=execFileSync(process.execPath,[setup],{env,encoding:'utf8'});
    assert.match(again,/Using your saved OpenRouter key/);
    const result=execFileSync(process.execPath,['--input-type=module','-e',`import {configuredApiKey,configuredBrowser} from ${JSON.stringify(configModule)};console.log(JSON.stringify({environmentWins:configuredApiKey()==='env-fixture',browser:configuredBrowser()}));`],{env:{...env,OPENROUTER_API_KEY:'env-fixture'},encoding:'utf8'});
    assert.deepEqual(JSON.parse(result),{environmentWins:true,browser:binary});
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('setup without a key explains non-interactive configuration before installing',()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-no-key-'));
  try{
    assert.throws(()=>execFileSync(process.execPath,[setup],{env:{...process.env,XDG_CONFIG_HOME:root,OPENROUTER_API_KEY:''},stdio:['ignore','pipe','pipe']}),error=>{
      assert.equal(error.status,1);assert.match(error.stderr.toString(),/OPENROUTER_API_KEY or --key-stdin/);return true;
    });
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('setup installs a local browser automatically when none is available on PATH',()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-auto-browser-'));
  try{
    const log=join(root,'install-log.jsonl');
    writeFileSync(join(root,'npm'),`#!${process.execPath}
const {appendFileSync,mkdirSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const args=process.argv.slice(2);appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+'\\n');
if(args[0]==='install'){
  const runtime=args[args.indexOf('--prefix')+1], bin=join(runtime,'node_modules','.bin');mkdirSync(bin,{recursive:true});
  writeFileSync(join(bin,'agent-browser'),'#!/bin/sh\\necho agent-browser-auto-test\\n',{mode:0o700});
}`,{mode:0o700});
    const stdout=execFileSync(process.execPath,[setup],{encoding:'utf8',env:{...process.env,PATH:root,XDG_CONFIG_HOME:root,AGENT_BROWSER_BINARY:'',OPENROUTER_API_KEY:'environment-test-key'}});
    assert.match(stdout,/Ready: agent-browser-auto-test/);
    const config=JSON.parse(readFileSync(join(root,'agent-browser-jev','config.json'),'utf8'));
    assert.equal(config.browserBinary,join(root,'agent-browser-jev','runtime','node_modules','.bin','agent-browser'));
    assert.equal(config.apiKey,undefined,'Environment credentials should not be copied into config');
    const commands=readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(commands[0][0],'ci');assert.ok(commands[1].includes('agent-browser@0.38.1'));
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('default policy permits observed actions and passes only visible observation fields',()=>{
  assert.equal(defaultPolicy.authorize({op:'click',name:'Save preferences'}),true);
  assert.equal(defaultPolicy.authorize({op:'fill',value:'Exact value'}),true);
  assert.deepEqual(defaultPolicy.sanitize({snapshot:'Visible',refs:{},storage:'not observation data'}),{snapshot:'Visible',refs:{}});
});
test('plain intent works without task/policy/output files and creates private evidence',()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-default-cli-'));
  let evidence;
  try{
    const binary=join(root,'browser.mjs');
    writeFileSync(binary,`#!${process.execPath}\nconsole.log(JSON.stringify({success:true,data:{snapshot:'x'.repeat(46000),refs:{}}}));`,{mode:0o700});
    assert.throws(()=>execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/run.mjs',import.meta.url)),'--intent','Inspect the page','--binary',binary],{
      cwd:root,env:{...process.env,XDG_CONFIG_HOME:root,OPENROUTER_API_KEY:'fixture-no-network'},encoding:'utf8',stdio:['ignore','pipe','pipe'],
    }),error=>{
      assert.equal(error.status,2);const result=JSON.parse(error.stdout);evidence=result.evidence;
      assert.equal(result.returnReason,'observation_too_large');
      assert.equal(statSync(evidence).mode&0o777,0o600);
      assert.equal(JSON.parse(readFileSync(evidence,'utf8')).sessionId,'default');return true;
    });
  }finally{rmSync(root,{recursive:true,force:true});if(evidence)rmSync(dirname(evidence),{recursive:true,force:true});}
});
