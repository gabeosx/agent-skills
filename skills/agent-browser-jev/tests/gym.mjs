#!/usr/bin/env node
// One local fixture gym: real Jev and browser calls, independent page assertions.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

const exec = promisify(execFile);
const skill = fileURLToPath(new URL('..', import.meta.url));
const { values } = parseArgs({ options: {
  output: { type:'string' }, binary: { type:'string' }, rounds: { type:'string', default:'2' },
  suites: { type:'string', default:'workflow,autocomplete,scenarios,components' }, help: { type:'boolean' },
} });
if (values.help) {
  console.log('node tests/gym.mjs --output /absolute/path/to/new-gym.json [--rounds 2] [--suites workflow,autocomplete,scenarios,components] [--binary /path/to/agent-browser]');
  process.exit(0);
}
const rounds = Number(values.rounds);
const selected = values.suites.split(',').map(x=>x.trim()).filter(Boolean);
const definitions = {
  workflow: { file:'workflow-live.mjs', timeoutMs:300_000 },
  autocomplete: { file:'autocomplete-live.mjs', timeoutMs:300_000 },
  scenarios: { file:'benchmark.mjs', timeoutMs:Math.max(300_000, rounds*6*90_000) },
  components: { file:'component-live.mjs', timeoutMs:3_900_000 },
};
if (!values.output || !Number.isSafeInteger(rounds) || rounds<1 || rounds>20 ||
    !selected.length || new Set(selected).size!==selected.length ||
    selected.some(x=>!Object.hasOwn(definitions,x))) {
  throw new Error('Provide a new --output, --rounds 1..20 and comma-separated suites: workflow,autocomplete,scenarios,components');
}

const output = resolve(values.output);
const details = output.replace(/\.json$/,'')+'.details';
await mkdir(dirname(output),{recursive:true,mode:0o700});
await mkdir(details,{mode:0o700}); // Fail if a previous run owns this evidence directory.
try { await writeFile(output,'{}\n',{flag:'wx',mode:0o600}); }
catch (error) { await rm(details,{recursive:true}); throw error; }
const packageInfo = JSON.parse(await readFile(join(skill,'package.json'),'utf8'));
const hash = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
const report = { schema:1, startedAt:new Date().toISOString(), skillVersion:packageInfo.version,
  node:process.version, platform:`${process.platform}-${process.arch}`,
  measurement:'Helper invocation time excludes process startup and independent assertion; suite wall time includes both. Charges are provider-reported Jev amounts, not browser or caller-model cost.',
  rounds, selectedSuites:selected, sourceSha256:{'tests/gym.mjs':hash}, suites:[], cases:[] };
const save = async()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const sumCost = runs => {
  const costs=runs.map(r=>r?.jev?.costUsd);
  return costs.length && costs.every(Number.isFinite) ? costs.reduce((sum,cost)=>sum+cost,0) : null;
};
const normalize = (name, raw, run) => {
  const items = name==='workflow'||name==='autocomplete'||name==='components' ? raw.cases : raw.trials;
  return (items??[]).map(entry=>{
    const runs=name==='workflow' ? entry.runs??[] : [entry.result].filter(Boolean);
    const times=runs.map(r=>r?.timing?.totalMs);
    return {suite:name,id:entry.id??entry.mode,round:entry.round??run,
      passed:entry.verdict==='passed',failure:entry.failure??null,
      helperMs:times.length&&times.every(Number.isFinite)?times.reduce((a,b)=>a+b,0):null,
      jevCostUsd:sumCost(runs),actions:runs.reduce((n,r)=>n+(r?.actions?.length??0),0),
      decisions:runs.reduce((n,r)=>n+(r?.jev?.calls??0),0),
      returnReason:runs.at(-1)?.returnReason??null};
  });
};
const median = numbers => {
  if (!numbers.length) return null;
  const ordered=[...numbers].sort((a,b)=>a-b), mid=Math.floor(ordered.length/2);
  return ordered.length%2?ordered[mid]:(ordered[mid-1]+ordered[mid])/2;
};
const grouped = cases => {
  const groups=new Map();
  for(const item of cases){
    const key=item.suite+'/'+item.id;
    groups.set(key,[...(groups.get(key)??[]),item]);
  }
  return [...groups.values()];
};

for (const name of selected) for(let run=1;run<=(['scenarios','components'].includes(name)?1:rounds);run++) {
  const suite={name,run,report:join(details,name+'-'+run+'.json')};
  report.suites.push(suite);
  const args=[join(skill,'tests',definitions[name].file),'--output',suite.report];
  if (values.binary) args.push('--binary',values.binary);
  if (name==='scenarios') args.push('--rounds',String(rounds));
  const started=performance.now();
  try {
    await exec(process.execPath,args,{timeout:definitions[name].timeoutMs,maxBuffer:2e6});
    suite.exitCode=0;
  } catch (error) {
    suite.exitCode=Number.isSafeInteger(error.code)?error.code:null;
    suite.error=error.killed?'Runner timed out':String(error.message).slice(0,300);
  }
  suite.wallMs=Math.round(performance.now()-started);
  try {
    const raw=JSON.parse(await readFile(suite.report,'utf8'));
    suite.verdict=raw.verdict??'unknown';
    suite.cleanup=raw.cleanup??null;
    suite.browserVersion=raw.browserVersion??null;
    suite.sourceSha256=raw.sourceSha256??null;
    const cases=normalize(name,raw,run);
    suite.caseCount=cases.length;
    report.cases.push(...cases);
  } catch (error) {
    suite.verdict='missing_report';
    suite.readError=String(error.message).slice(0,300);
  }
  await save();
  console.log(JSON.stringify({suite:name,run,verdict:suite.verdict,wallMs:suite.wallMs,cases:suite.caseCount??0}));
}
const measured=report.cases.map(c=>c.helperMs).filter(Number.isFinite);
const charged=report.cases.map(c=>c.jevCostUsd).filter(Number.isFinite);
report.summary={passed:report.cases.filter(c=>c.passed).length,total:report.cases.length,
  medianHelperMs:median(measured),helperTimeCoverage:measured.length,
  totalJevCostUsd:charged.length===report.cases.length?charged.reduce((a,b)=>a+b,0):null,
  costCoverage:charged.length,
  byCase:grouped(report.cases).map(cases=>({
    id:cases[0].suite+'/'+cases[0].id,passed:cases.filter(c=>c.passed).length,total:cases.length,
    medianHelperMs:median(cases.map(c=>c.helperMs).filter(Number.isFinite)),
    meanJevCostUsd:cases.every(c=>Number.isFinite(c.jevCostUsd))
      ?cases.reduce((sum,c)=>sum+c.jevCostUsd,0)/cases.length:null,
  }))};
report.finishedAt=new Date().toISOString();
report.verdict=report.suites.every(s=>s.verdict==='passed'&&s.exitCode===0&&s.cleanup?.browserClosed===true)&&
  report.cases.length>0&&report.cases.every(c=>c.passed)?'passed':'failed';
await save();
console.log(JSON.stringify({verdict:report.verdict,output,summary:report.summary}));
if (report.verdict!=='passed') process.exitCode=1;
