import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const identity=trial=>JSON.stringify([trial.variant,trial.id,trial.seed,trial.arm]);

// Recover evidence after the container has stopped. A helper result is never
// promoted into evaluator success; incomplete episodes retain their phase.
export async function recoverBrowserGymReceipts(directory,recorded=[]){
  const files=await readdir(directory),errors=[],episodes=[],bridges=new Map();
  for(const file of files.filter(name=>/\.(episode|bridge)\.json$/.test(name)).sort()){
    try{
      const value=JSON.parse(await readFile(join(directory,file),'utf8'));
      if(value.schema!==1||typeof value.session!=='string')throw new Error('Invalid receipt');
      if(value.kind==='browsergym-episode-receipt'&&value.trial&&
          typeof value.trial.id==='string'&&Number.isSafeInteger(value.trial.seed)&&
          ['baseline','candidate','smoke'].includes(value.trial.arm))episodes.push({file,...value});
      else if(value.kind==='browsergym-helper-receipt'&&value.response)
        bridges.set(value.session,{file,...value});
      else throw new Error('Invalid receipt kind or trial');
    }catch(error){errors.push({file,error:String(error.message)})}
  }
  const keys=new Set(recorded.map(identity)),trials=[];
  for(const episode of episodes){
    const bridge=bridges.get(episode.session);bridges.delete(episode.session);
    if(keys.has(identity(episode.trial)))continue;
    const trial={...episode.trial};
    if(!trial.result&&bridge?.phase==='returned')Object.assign(trial,bridge.response);
    else if(!trial.trace&&bridge?.response?.trace)trial.trace=bridge.response.trace;
    trial.recovery={phase:episode.phase,episodeReceipt:episode.file,
      ...(bridge?{helperReceipt:bridge.file,helperPhase:bridge.phase}:{}),
      cleanupConfirmed:episode.phase==='complete'};
    if(!trial.verification){
      trial.failureClass='infrastructure';
      trial.verification={passed:false,conditions:{evaluationRecorded:false}};
    }
    keys.add(identity(trial));trials.push(trial);
  }
  return {trials,errors,orphanHelperReceipts:[...bridges.values()]};
}
