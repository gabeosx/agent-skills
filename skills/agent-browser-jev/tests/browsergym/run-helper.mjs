// Runs the selected helper against the CDP-bound agent-browser session.
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { suppliedValuesForGoal } from './task-values.mjs';

let input='';
for await(const chunk of process.stdin) input+=chunk;
const task=JSON.parse(input);
const helper=await import(pathToFileURL(join(task.helperDir,'scripts/run.mjs')).href);
const trace=[];
try{
  const raw=await helper.runTask({browser:{binary:'agent-browser',sessionId:task.session},
    intentOrSteps:task.goal,suppliedValues:suppliedValuesForGoal(task.taskName,task.goal),
    budget:{maxActions:45,maxDecisions:90,timeoutMs:150000}},
    {apiKey:process.env.OPENROUTER_API_KEY,onEvent:event=>trace.push(event)});
  const result=helper.summarize(raw,null);
  process.stdout.write(JSON.stringify({result,
    trace:trace.length?trace:(raw.actions??[]).map(entry=>({type:'action',...entry})),
    traceCoverage:trace.length?'frontier_and_actions':'actions_only'})+'\n');
}catch(error){
  process.stdout.write(JSON.stringify({error:String(error.message)})+'\n');
  process.exitCode=1;
}
