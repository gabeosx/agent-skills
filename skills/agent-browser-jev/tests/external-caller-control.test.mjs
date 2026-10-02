import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
const exec=promisify(execFile),script=fileURLToPath(new URL('external-caller-control.mjs',import.meta.url));
test('mailbox control hides continuation tokens and atomically rejects stale or repeated decisions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'jev-mailbox-control-'));
 try{
  await writeFile(join(dir,'request-2.json'),JSON.stringify({seq:2,result:{returnReason:'handoff',resumeToken:'private-unit-token',observation:{snapshot:'- button "Commit" [ref=e1]',refs:{e1:{role:'button',name:'Commit'}}}}}));
  const read=await exec(process.execPath,[script,'read',dir]);assert.doesNotMatch(read.stdout,/private-unit-token/);assert.equal(JSON.parse(read.stdout).resumable,true);
  const command=join(dir,'command.json');await writeFile(command,JSON.stringify({tool:'jev',args:{context:'Field supplied'}}));
  await assert.rejects(()=>exec(process.execPath,[script,'respond',dir,'--seq','1','--command-file',command]),/current request sequence/);
  await exec(process.execPath,[script,'respond',dir,'--seq','2','--command-file',command,'--resume-latest']);
  assert.equal(JSON.parse(await readFile(join(dir,'response-2.json'))).args.resumeToken,'private-unit-token');
  await assert.rejects(()=>exec(process.execPath,[script,'respond',dir,'--seq','2','--command-file',command]),/EEXIST/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
