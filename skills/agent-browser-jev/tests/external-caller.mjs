// The agent running the study supplies decisions through this local mailbox.
// No additional model API, evaluator, filesystem or navigation tool is exposed.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
export function externalCaller(directory,{pollMs=100,now=Date.now}={}){
 return async({goal,values,initialObservation,skill,delegated,deadline,dispatch,recordTool})=>{
  await mkdir(directory,{recursive:true,mode:0o700});let seq=0,delegatedOnce=!delegated;
  let result={goal,values,initialObservation,skill,delegated,deadline:new Date(deadline).toISOString(),caller:'Current agent; no separate caller API'};
  while(now()<deadline){
   const request=join(directory,`request-${seq}.json`);
   await writeFile(request+'.tmp',JSON.stringify({seq,result}),{mode:0o600,flag:'wx'});await rename(request+'.tmp',request);
   let command;
   while(now()<deadline){
    try{command=JSON.parse(await readFile(join(directory,`response-${seq}.json`),'utf8'));break;}
    catch(e){if(e.code!=='ENOENT')throw e;}
    await pause(pollMs);
   }
   if(!command)break;
   const start=performance.now(),{tool,args={}}=command;
   try{
    if(!delegatedOnce&&!['jev','skill_reference'].includes(tool))throw Error('Delegate the original goal first');
    if(tool==='finish'){
     if(!['complete','handoff'].includes(args.status))throw Error('Invalid final assessment');
     await recordTool({name:tool,args,result:args,actor:'current agent',elapsedMs:performance.now()-start});return args;
    }
    result=await dispatch(tool,args);if(tool==='jev')delegatedOnce=true;
   }catch(e){if(e.unknownCharge||e.stopStudy)throw e;result={error:String(e.message)};}
   await recordTool({name:tool,args,result,actor:'current agent',elapsedMs:performance.now()-start});seq++;
  }
  return {status:'handoff',explanation:'External caller deadline'};
 };
}
