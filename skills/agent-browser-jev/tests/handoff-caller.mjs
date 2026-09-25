// Focused instruction regression: real saved helper results, fresh Codex callers, no browser actions.
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';

const {values}=parseArgs({options:{output:{type:'string'},codex:{type:'string',default:'codex'}}});
if(!values.output)throw new Error('Use --output new-report.json');
const output=resolve(values.output);
await mkdir(dirname(output),{recursive:true,mode:0o700});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const skill=await readFile(new URL('../SKILL.md',import.meta.url),'utf8');
const evidence=await readFile(new URL('../references/evidence/helper-outcomes.json',import.meta.url),'utf8');
const cases=JSON.parse(evidence).outcomes.filter(o=>o.id==='missing-article');
const root=await mkdtemp(join(tmpdir(),'jev-handoff-caller-'));
const report={schema:1,startedAt:new Date().toISOString(),model:'gpt-5.5',effort:'low',
  codexVersion:execFileSync(values.codex,['--version'],{encoding:'utf8'}).trim(),
  scope:'Caller interpretation of three recorded handoffs. No live browser execution, speed comparison or task-cost comparison.',
  skillSha256:createHash('sha256').update(skill).digest('hex'),evidenceSha256:createHash('sha256').update(evidence).digest('hex'),trials:[]};
try{
  for(const evidence of cases){
    const prompt=`Use this skill to handle the returned helper result.\n\n${skill}\n\nThe user's requested browser task was: Read the Billing article. If it is not listed, return to the caller without clicking.\nThe helper has returned the following real recorded result:\n${JSON.stringify(evidence)}\n\nNo subsequent caller work has occurred. For this test, make no tool calls and do not operate a browser. Report the current result as JSON only, with helperReturnReason, outcomeStatus (complete or handoff), and a concise explanation for the user. Do not claim unobserved work.`;
    const trial={round:evidence.round,prompt};report.trials.push(trial);
    const child=spawn(values.codex,['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','-C',root,'-m',report.model,'-c','model_reasoning_effort="low"','-c','approval_policy="never"','--sandbox','read-only','--json','-'],{stdio:['pipe','pipe','pipe']});
    child.stdin.end(prompt);let buffer='',lastMessage;trial.toolCalls=0;
    child.stdout.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))!==-1){let event;try{event=JSON.parse(buffer.slice(0,end));}catch{buffer=buffer.slice(end+1);continue;}buffer=buffer.slice(end+1);
      if(event.type==='item.completed'&&event.item?.type==='agent_message')lastMessage=event.item.text;
      if(event.type==='item.started'&&event.item?.type==='command_execution')trial.toolCalls++;
      if(event.type==='turn.completed')trial.usage=event.usage??null;
    }});
    child.stderr.on('data',()=>{});
    const timer=setTimeout(()=>child.kill('SIGTERM'),90000);
    try{trial.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});}finally{clearTimeout(timer);}
    try{trial.answer=JSON.parse(lastMessage);}catch{trial.unparsedAnswer=lastMessage??null;}
    trial.passed=trial.exitCode===0&&trial.toolCalls===0&&trial.answer?.helperReturnReason==='handoff'&&trial.answer?.outcomeStatus==='handoff';
    console.log(JSON.stringify({round:trial.round,passed:trial.passed,answer:trial.answer}));
  }
}finally{
  await rm(root,{recursive:true,force:true});report.cleanup={temporaryDirectoryRemoved:true};
  report.finishedAt=new Date().toISOString();report.passed=report.trials.length===3&&report.trials.every(t=>t.passed);
  await writeFile(output,JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
