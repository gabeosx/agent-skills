#!/usr/bin/env node
// Prepare frozen caller arms, qualify their transport without a model, or run
// one predeclared matrix. The existing study owns isolation and official reward.
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assertQualified,harnessFingerprint,readEnvironment} from './webarena-isolation.mjs';
const execute=promisify(execFile),skill=fileURLToPath(new URL('..',import.meta.url));
const {values}=parseArgs({options:{'run-dir':{type:'string'},prepare:{type:'boolean'},qualify:{type:'boolean'},deadline:{type:'string'},'max-usd':{type:'string'}}});
if(!values['run-dir'])throw Error('Provide --run-dir with a predeclared plan.json');
const root=resolve(values['run-dir']),plan=JSON.parse(await readFile(join(root,'plan.json'),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex'),json=x=>JSON.stringify(x,null,2)+'\n';
const arms=['caller_only','jev_only','caller_with_jev'];
const callerRuntime=plan.callerRuntime??'current_agent';
if(!['current_agent','openrouter-api'].includes(callerRuntime))throw Error('Unsupported explicit callerRuntime');
if(callerRuntime==='openrouter-api'&&plan.callerModel!=='openai/gpt-5.4')throw Error('Legacy API study requires an explicit supported callerModel in its plan');
async function hashFiles(path,prefix=''){
 const result={};for(const name of (await readdir(join(path,prefix),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const relative=join(prefix,name.name);if(name.isDirectory())Object.assign(result,await hashFiles(path,relative));else result[relative]=sha(await readFile(join(path,relative)));
 }return result;
}
const entry=mode=>`import * as helper from './jev-run.mjs';
import {runWebArenaCaller} from '../adapter/webarena-caller-agent.mjs';
import {externalCaller} from '../adapter/external-caller.mjs';
import {callerUiBrowser} from '../adapter/caller-ui-browser.mjs';
import {runCaller} from '../adapter/caller-workflow-agent.mjs';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {readFile,writeFile,rename} from 'node:fs/promises';import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const execute=promisify(execFile),root=fileURLToPath(new URL('..',import.meta.url));
export const summarize=x=>x;
export async function runTask(task,{apiKey,onEvent}){
 const command=async args=>{const r=await execute('agent-browser',['--session',task.browser.sessionId,'--json',...args],{timeout:30000,maxBuffer:3e6});const d=JSON.parse(r.stdout);if(!d.success)throw Error('Browser command failed: '+String(d.error));return d.data;};
 const browser=callerUiBrowser({command,receiptsDirectory:process.env.JEV_CALLER_RECEIPTS});
 const readGuidance=async path=>{if(!['SKILL.md','README.md'].includes(path)&&!/^references\\/[a-z0-9-]+\\.md$/.test(path))throw Error('Only installed skill guidance is readable');return readFile(join(root,path),'utf8');};
 const save=async evidence=>{const p=join(process.env.JEV_CALLER_RECEIPTS,task.browser.sessionId+'.json');await writeFile(p+'.tmp',JSON.stringify(evidence));await rename(p+'.tmp',p);};
 const qualification=process.env.JEV_CALLER_QUALIFICATION;
 const act=async dispatch=>{
  const click=async(role,name)=>{const d=await dispatch('browser',{args:['snapshot']});const found=Object.entries(d.refs??{}).filter(([,v])=>v.role===role&&v.name.trim()===name);if(found.length!==1)throw Error('Qualification control missing: '+name);await dispatch('browser',{args:['click','@'+found[0][0]]});};
  await click('button','MarvelsGrantMan136');await click('link','User settings');await click('link','Edit biography');
  const d=await dispatch('browser',{args:['snapshot']});const ref=Object.entries(d.refs??{}).find(([,v])=>v.role==='textbox'&&v.name.trim()==='Biography')?.[0];if(!ref)throw Error('Qualification textbox missing');
  await dispatch('browser',{args:['fill','@'+ref,'I am a robot']});await click('button','Save');
 };
 const scriptedHelper={...helper,runTask:async()=>{if(qualification==='positive')await act(async(_,x)=>browser(x.args));return {returnReason:qualification==='positive'?'reported_complete':'handoff',actions:[],jev:{costUsd:0,calls:0},observation:await browser(['snapshot'])};},summarize:x=>x,sealResume:()=>null};
 const scriptedCaller=async({dispatch,delegated})=>{if(delegated)await dispatch('jev',{});else if(qualification==='positive')await act(dispatch);return {status:qualification==='positive'?'complete':'handoff'};};
 return runWebArenaCaller(task,{apiKey,helper:qualification?scriptedHelper:helper,browser,readGuidance,save,mode:${JSON.stringify(mode)},onEvent,
  authorizationDeadline:process.env.JEV_CALLER_DEADLINE,maxUsd:Number(process.env.JEV_CALLER_MAX_USD),maxHelperInvocations:Number(process.env.JEV_CALLER_MAX_INVOCATIONS),
  callerIdentity:${JSON.stringify(callerRuntime==='current_agent'?{name:'Current agent',costMeasured:false}:{name:plan.callerModel,costMeasured:true})},
  caller:qualification?scriptedCaller:${callerRuntime==='current_agent'?"externalCaller(join(process.env.JEV_CALLER_RECEIPTS,task.browser.sessionId+'.interactive'))":'args=>runCaller({...args,model:'+JSON.stringify(plan.callerModel)+'})'}});
}
`;
if(values.prepare){
 await mkdir(join(root,'arms'),{recursive:true});
 const manifest={createdAt:new Date().toISOString(),planSha256:sha(await readFile(join(root,'plan.json'))),harnessFingerprint:await harnessFingerprint(),arms:{}};
 for(const arm of arms){const dir=join(root,'arms',arm);await mkdir(dir,{recursive:false});
  for(const name of ['SKILL.md','README.md','package.json','package-lock.json','scripts','references'])await cp(join(skill,name),join(dir,name),{recursive:true});
  await cp(join(dir,'scripts/run.mjs'),join(dir,'scripts/jev-run.mjs'));
  await mkdir(join(dir,'adapter'));for(const name of ['caller-workflow-agent.mjs','webarena-caller-agent.mjs','external-caller.mjs','caller-ui-browser.mjs'])await cp(join(skill,'tests',name),join(dir,'adapter',name));
  await writeFile(join(dir,'scripts/run.mjs'),entry(arm));manifest.arms[arm]=await hashFiles(dir);
 }
 await writeFile(join(root,'source-manifest.json'),json(manifest),{flag:'wx'});console.log('Frozen three arms');process.exit(0);
}
const manifest=JSON.parse(await readFile(join(root,'source-manifest.json'),'utf8'));
if(manifest.harnessFingerprint!==await harnessFingerprint())throw Error('Harness changed after freeze; requalify a new recorded freeze');
for(const arm of arms)if(JSON.stringify(await hashFiles(join(root,'arms',arm)))!==JSON.stringify(manifest.arms[arm]))throw Error('Frozen arm changed');
const environment=join(root,'environment/environment.json');assertQualified(await readEnvironment(environment),manifest.harnessFingerprint);
const deadline=values.qualify?Date.now()+1800000:Date.parse(values.deadline),maxUsd=values.qualify?0:Number(values['max-usd']);
if(!Number.isFinite(deadline)||deadline<=Date.now()||(!values.qualify&&!(maxUsd>0)))throw Error('Explicit unexpired paid time and spend authorization required');
if(!values.qualify){const q=JSON.parse(await readFile(join(root,'transport-qualification.json'),'utf8'));if(!q.passed||q.sourceManifestSha256!==sha(await readFile(join(root,'source-manifest.json'))))throw Error('Qualify the frozen caller transport first');}
const out=join(root,values.qualify?'transport-qualification.json':'report.json');
const report={kind:values.qualify?'webarena-caller-no-model':'webarena-caller-three-arm',startedAt:new Date().toISOString(),deadline:new Date(deadline).toISOString(),maxUsd,costUsd:0,trials:[],sourceManifestSha256:sha(await readFile(join(root,'source-manifest.json')))};
await writeFile(out,json(report),{flag:'wx',mode:0o600});const save=()=>writeFile(out,json(report));
const cohort=values.qualify?['399']: [...plan.frozenFirstAttemptCohort,...plan.practicedDiagnostic];
const tasks=values.qualify?[...arms.map(arm=>({id:'399',arm,qualification:'positive'})),{id:'399',arm:'caller_with_jev',qualification:'negative'}]:cohort.flatMap((id,i)=>[...arms.slice(i%3),...arms.slice(0,i%3)].map(arm=>({id,arm})));
try{
 for(const [i,item] of tasks.entries()){
  if(Date.now()+1000>=deadline||(!values.qualify&&report.costUsd+1>maxUsd))throw Error('Study time or spend limit reached');
  const resultPath=join(root,'reports',String(i+1).padStart(2,'0')+'-'+item.id+'-'+item.arm+(item.qualification?'-'+item.qualification:'')+'.json');await mkdir(dirname(resultPath),{recursive:true});
  const t={...item,output:resultPath,startedAt:new Date().toISOString()};report.trials.push(t);await save();
  const dir=join(root,'arms',item.arm),invocations=plan.practicedDiagnostic.includes(item.id)?1:3;
  try{await execute(process.execPath,[join(skill,'tests/browsergym-study.mjs'),'--suite','webarena-verified','--cases',item.id,'--seeds','0','--arm','candidate','--baseline-dir',dir,'--candidate-dir',dir,'--webarena-environment',environment,'--output',resultPath],{
    timeout:360000,maxBuffer:4e6,env:{...process.env,JEV_CALLER_DEADLINE:new Date(deadline).toISOString(),JEV_CALLER_MAX_USD:'1',JEV_CALLER_MAX_INVOCATIONS:String(invocations),JEV_CALLER_QUALIFICATION:item.qualification??''}});
  }catch(error){t.processError=String(error.message).slice(-1500);}
  const r=JSON.parse(await readFile(resultPath,'utf8'));t.reportSha256=sha(await readFile(resultPath));const trial=r.cases?.[0];
  const result=trial?.result,cost=result?.callerStudy?.totalCostUsd;t.reward=trial?.reward;t.returnReason=result?.returnReason;t.costUsd=cost;t.cleanup=r.cleanup;t.finishedAt=new Date().toISOString();await save();
  if(!Number.isFinite(cost)){report.unknownCharge=true;throw Error('Missing or unknown caller/Jev charges; inspect private receipts');}
  report.costUsd+=cost;await save();
  if(r.verdict!=='single_arm_recorded'||r.cleanup?.containerRemoved!==true||r.cleanup?.backendRestored?.passed!==true||trial?.cleanStart?.passed!==true)throw Error('Trial infrastructure or cleanup failed');
  if(values.qualify&&(cost!==0||trial.verification?.passed!==(item.qualification==='positive')))throw Error('No-model caller transport did not satisfy evaluator control');
  console.log(JSON.stringify({id:item.id,arm:item.arm,reward:t.reward,returned:t.returnReason,costUsd:cost}));
 }
 report.passed=true;
}catch(error){report.failure=String(error.message);process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({out,costUsd:report.costUsd,trials:report.trials.length,failure:report.failure}));}
