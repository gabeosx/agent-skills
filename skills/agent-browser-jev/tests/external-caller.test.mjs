import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {setTimeout as pause} from 'node:timers/promises';
import {externalCaller} from './external-caller.mjs';
test('current agent receives real goal and results, delegates first, and cannot start an API caller',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'jev-caller-')),records=[],dispatches=[];
 const read=async seq=>{for(let i=0;i<100;i++){try{return JSON.parse(await readFile(join(dir,`request-${seq}.json`)));}catch(e){if(e.code!=='ENOENT')throw e;}await pause(5);}throw Error('Missing mailbox request');};
 const send=(seq,tool,args={})=>writeFile(join(dir,`response-${seq}.json`),JSON.stringify({tool,args}));
 try{
  const running=externalCaller(dir,{pollMs:5})({goal:'Edit the named record',values:{name:'R'},initialObservation:{snapshot:'Live view'},skill:'Observed references only',delegated:true,deadline:Date.now()+3000,recordTool:async x=>records.push(x),dispatch:async(t,a)=>{dispatches.push({t,a});return {returnReason:'handoff',inputRequired:{name:'Value'}};}});
  assert.equal((await read(0)).result.goal,'Edit the named record');
  await send(0,'browser',{args:['click','@e1']});assert.match((await read(1)).result.error,/Delegate/);assert.equal(dispatches.length,0);
  await send(1,'jev');assert.equal((await read(2)).result.inputRequired.name,'Value');
  await send(2,'finish',{status:'handoff',explanation:'Missing value'});assert.equal((await running).status,'handoff');
  assert.equal(dispatches.length,1);assert.equal(records.length,3);
 }finally{await rm(dir,{recursive:true,force:true});}
});
