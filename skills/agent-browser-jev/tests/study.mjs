#!/usr/bin/env node
// Paired local studies. Browser pages and hidden verifiers come from this
// checkout; --baseline-dir and --candidate-dir choose only the helper code.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { componentCases } from './fixtures/component-pages.mjs';
import { assertSeed, assertVariant, compareStudyArms, componentConditions, classifyComponentTrial } from './study-lib.mjs';

const exec=promisify(execFile),skill=fileURLToPath(new URL('..',import.meta.url));
const {values}=parseArgs({options:{
  output:{type:'string'},'baseline-dir':{type:'string'},'candidate-dir':{type:'string'},
  'baseline-report':{type:'string'},'candidate-report':{type:'string'},
  cases:{type:'string',default:'native-date,similar-record,command-palette,delayed-toast,missing-target'},
  variants:{type:'string',default:'base,reordered,slow,injection'},seeds:{type:'string',default:'1'},rounds:{type:'string',default:'1'},
  binary:{type:'string'},help:{type:'boolean'},
}});
if(values.help){
  console.log('node tests/study.mjs --baseline-dir /path/to/skill --candidate-dir /path/to/skill --output /absolute/path/to/new-study.json [--cases id,id] [--variants base,reordered,slow,injection] [--seeds 1,2] [--rounds 1..10] [--binary /path/to/agent-browser]\nOffline: --baseline-report /path/to/component.json --candidate-report /path/to/component.json --output /absolute/path/to/new-study.json');
  process.exit(0);
}
const reportMode=Boolean(values['baseline-report']||values['candidate-report']);
if(!values.output || (reportMode && (!values['baseline-report']||!values['candidate-report']||values['baseline-dir']||values['candidate-dir'])) ||
    (!reportMode && !values['baseline-dir'])) throw new Error('Provide an output and either both reports or a baseline helper directory');
const cases=values.cases.split(',').map(x=>x.trim()).filter(Boolean);
const variants=values.variants.split(',').map(x=>assertVariant(x.trim()));
const seeds=values.seeds.split(',').map(x=>assertSeed(Number(x.trim())));
const rounds=Number(values.rounds);
if(!cases.length||new Set(cases).size!==cases.length||cases.some(id=>!componentCases.some(c=>c.id===id))||
    !variants.length||new Set(variants).size!==variants.length||!seeds.length||new Set(seeds).size!==seeds.length||
    !Number.isSafeInteger(rounds)||rounds<1||rounds>10)
  throw new Error('Choose unique component cases, variants, seeds and 1..10 rounds');
const output=resolve(values.output),runsDir=output.replace(/\.json$/,'')+'.runs';
await mkdir(dirname(output),{recursive:true,mode:0o700});
await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
if(!reportMode)await mkdir(runsDir,{mode:0o700});

async function manifest(dir){
  const paths=['package.json','package-lock.json',...(await readdir(join(dir,'scripts'))).filter(name=>name.endsWith('.mjs')).sort().map(name=>`scripts/${name}`)];
  const sourceSha256={};
  for(const path of paths)sourceSha256[path]=createHash('sha256').update(await readFile(join(dir,path))).digest('hex');
  const pkg=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));
  return {directory:dir,version:pkg.version,sourceSha256};
}
function normalize(raw,round=1){
  const definitions=new Map(componentCases.map(c=>[c.id,c]));
  return (raw.cases??[]).map(trial=>{
    const definition=definitions.get(trial.id);
    if(!definition)throw new Error(`Unknown case in report: ${trial.id}`);
    const variant=trial.variant??raw.variant??'base',seed=assertSeed(trial.seed??raw.seed??1);
    assertVariant(variant);
    const verification=trial.verification??componentConditions({definition,events:trial.events,
      finalSnapshot:trial.finalSnapshot,result:trial.result,exitCode:trial.exitCode});
    const entry={...trial,round,variant,seed,verification};
    return {...entry,failureClass:classifyComponentTrial(entry)};
  });
}
const study={schema:1,kind:'paired-component-study',startedAt:new Date().toISOString(),
  taskRevision:1,model:'typesafe/jev-1.13',cases:reportMode?null:cases,variants:reportMode?null:variants,seeds:reportMode?null:seeds,
  rounds:reportMode?null:rounds,arms:{baseline:{cases:[]},candidate:{cases:[]}},runs:[]};
const save=()=>writeFile(output,JSON.stringify(study,null,2)+'\n');
try{
  if(reportMode){
    for(const [arm,path] of [['baseline',values['baseline-report']],['candidate',values['candidate-report']]]){
      const raw=JSON.parse(await readFile(resolve(path),'utf8'));
      study.arms[arm].source=resolve(path);
      study.arms[arm].cases=normalize(raw);
      study.arms[arm].version=raw.version??null;
    }
  }else{
    const dirs={baseline:resolve(values['baseline-dir']),candidate:resolve(values['candidate-dir']??skill)};
    for(const arm of ['baseline','candidate'])study.arms[arm].manifest=await manifest(dirs[arm]);
    for(let round=1;round<=rounds;round++)for(const seed of seeds)for(const variant of variants){
      const order=(round+seed+variants.indexOf(variant))%2?['baseline','candidate']:['candidate','baseline'];
      for(const arm of order){
        const path=join(runsDir,`${round}-${seed}-${variant}-${arm}.json`);
        const args=[join(skill,'tests/component-live.mjs'),'--output',path,'--cases',cases.join(','),
          '--variant',variant,'--seed',String(seed),'--diagnostics','--helper-dir',dirs[arm]];
        if(values.binary)args.push('--binary',values.binary);
        const run={round,seed,variant,arm,report:path,startedAt:new Date().toISOString()};study.runs.push(run);await save();
        try{await exec(process.execPath,args,{timeout:3_900_000,maxBuffer:2e6});run.exitCode=0}
        catch(error){run.exitCode=Number.isSafeInteger(error.code)?error.code:null;run.error=error.killed?'Runner timed out':String(error.message).slice(0,300)}
        const raw=JSON.parse(await readFile(path,'utf8'));
        run.verdict=raw.verdict??'incomplete';run.cleanup=raw.cleanup??null;
        run.browserVersion=raw.browserVersion??null;
        study.arms[arm].cases.push(...normalize(raw,round));
        run.finishedAt=new Date().toISOString();await save();
        console.log(JSON.stringify({round,seed,variant,arm,verdict:run.verdict,cases:raw.cases?.length??0}));
      }
    }
  }
  study.analysis=compareStudyArms(study.arms.baseline,study.arms.candidate);
  const expected=reportMode?null:rounds*seeds.length*variants.length*cases.length;
  const complete=reportMode||study.runs.every(run=>run.cleanup?.browserClosed===true&&run.cleanup?.serverClosed===true&&run.cleanup?.temporaryFilesRemoved===true);
  study.verdict=complete&&(!expected||study.arms.baseline.cases.length===expected&&study.arms.candidate.cases.length===expected)
    ?study.analysis.verdict:'incomplete';
}catch(error){study.verdict='incomplete';study.error=String(error.message);process.exitCode=1}
study.finishedAt=new Date().toISOString();await save();
console.log(JSON.stringify({verdict:study.verdict,output,summary:study.analysis?.summary??null}));
if(study.verdict==='incomplete'||study.verdict==='regressed')process.exitCode=1;
