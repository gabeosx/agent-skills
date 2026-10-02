// Runs the selected helper against the CDP-bound agent-browser session.
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { writeFileSync, renameSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { suppliedValuesForGoal } from './task-values.mjs';

let input='';
for await(const chunk of process.stdin) input+=chunk;
const task=JSON.parse(input);
const trace=[];
const directory=process.env.JEV_GYM_RECEIPTS;
function save(phase,response={}){
  if(!directory)return;
  const path=join(directory,task.session+'.bridge.json'),temporary=path+'.tmp';
  writeFileSync(temporary,JSON.stringify({schema:1,kind:'browsergym-helper-receipt',
    session:task.session,phase,updatedAt:new Date().toISOString(),response:{trace,...response}}),{mode:0o600});
  const file=openSync(temporary,'r');try{fsyncSync(file)}finally{closeSync(file)}
  renameSync(temporary,path);
}
save('started');
try{
  const helper=await import(pathToFileURL(join(task.helperDir,'scripts/run.mjs')).href);
  const raw=await helper.runTask({browser:{binary:'agent-browser',sessionId:task.session},
    intentOrSteps:task.goal,suppliedValues:suppliedValuesForGoal(task.taskName,task.goal),
    budget:{maxActions:45,maxDecisions:90,timeoutMs:150000}},
    {apiKey:process.env.OPENROUTER_API_KEY,onEvent:event=>{trace.push(event);save('running')}});
  const result=helper.summarize(raw,null);
  const response={result,
    trace:trace.length?trace:(raw.actions??[]).map(entry=>({type:'action',...entry})),
    traceCoverage:trace.length?'frontier_and_actions':'actions_only'};
  save('returned',response);
  process.stdout.write(JSON.stringify(response)+'\n');
}catch(error){
  save('failed',{error:String(error.message)});
  process.stdout.write(JSON.stringify({error:String(error.message)})+'\n');
  process.exitCode=1;
}
