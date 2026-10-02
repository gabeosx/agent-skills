#!/usr/bin/env node
// Self-authored goal-progress counterexamples. This is not a MiniWoB score.
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {configuredApiKey,configuredBrowser} from '../scripts/config.mjs';

const {values}=parseArgs({options:{output:{type:'string'},'helper-dir':{type:'string'}}});
if(!values.output)throw new Error('Provide a new --output JSON path');
const root=fileURLToPath(new URL('..',import.meta.url)),helperDir=resolve(values['helper-dir']??root);
const helper=await import(pathToFileURL(join(helperDir,'scripts/run.mjs')).href);
const output=resolve(values.output),apiKey=configuredApiKey(),binary=configuredBrowser();
await mkdir(dirname(output),{recursive:true,mode:0o700});
await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const sessionId=`jev-progress-${randomUUID()}`,execute=promisify(execFile);
const report={kind:'self-authored-progress-counterexamples',startedAt:new Date().toISOString(),
  model:'typesafe/jev-1.13',version:JSON.parse(await readFile(join(helperDir,'package.json'),'utf8')).version,
  node:process.version,platform:`${process.platform}-${process.arch}`,sourceSha256:{},cases:[],cleanup:{}};
for(const path of (await readdir(join(helperDir,'scripts'))).filter(name=>name.endsWith('.mjs')).sort().map(name=>`scripts/${name}`))
  report.sourceSha256[path]=createHash('sha256').update(await readFile(join(helperDir,path))).digest('hex');
report.fixtureSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
const save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
let events=[],active;
const server=createServer(async(req,res)=>{
  if(req.method==='POST'&&req.url==='/event'){
    let body='';for await(const chunk of req)body+=chunk;
    events.push(JSON.parse(body));res.writeHead(204);res.end();return;
  }
  const preserve=active.id==='already-at-target',draft=active.id==='prepare-without-commit',multiple=active.id==='native-multiple-add';
  const slider=`<div>Quality<div><span class="ui-slider-handle" tabindex="0"></span><span id="value">${preserve?7:1}</span></div></div>`;
  const checkbox=`<label><input type="checkbox" id="detailed" ${preserve?'checked':''}>Detailed mode</label>`;
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  const regionNames=active.variant==='reordered'?['West','South','North']:['North','South','West'];
  res.end(`<style>.ui-slider-handle{display:inline-block;width:30px;height:20px;background:#888}#value{margin:8px}</style><h1>Preferences</h1>${multiple?`<label>Regions<select id="regions" multiple>${regionNames.map(name=>`<option ${name==='North'?'selected':''}>${name}</option>`).join('')}</select></label><button id="save">Apply regions</button>`:draft?'<label>Alias<input id="alias"></label><button id="save">Save</button>':`${active.variant==='reordered'?checkbox+slider:slider+checkbox}<button id="save">Apply settings</button>`}<p id="status">Review the settings</p><script>
    const send=value=>fetch('/event',{method:'POST',body:JSON.stringify(value)});
    const alias=document.getElementById('alias'),level=document.getElementById('value'),detailed=document.getElementById('detailed'),regions=document.getElementById('regions');
    const selectedRegions=()=>regions?[...regions.selectedOptions].map(option=>option.textContent).sort():null;
    if(regions)regions.onchange=()=>send({type:'changed',control:'regions',value:selectedRegions()});
    if(alias)alias.oninput=()=>{document.getElementById('status').textContent='Prepared alias: '+alias.value;send({type:'alias',value:alias.value})};
    if(level)document.querySelector('.ui-slider-handle').onkeydown=event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();level.textContent=Number(level.textContent)+(event.key==='ArrowRight'?2:-2);send({type:'changed',control:'quality',value:Number(level.textContent)})};
    if(detailed)detailed.onchange=()=>send({type:'changed',control:'detailed',value:detailed.checked});
    document.getElementById('save').onclick=()=>{send({type:'save',quality:level?Number(level.textContent):null,detailed:detailed?detailed.checked:null,alias:alias?alias.value:null,regions:selectedRegions()});document.body.innerHTML='<h1>Settings saved</h1>'};
  </script>`);
});
const browser=async args=>{
  const {stdout}=await execute(binary,['--session',sessionId,'--json',...args],{timeout:30000,maxBuffer:2e6});
  const response=JSON.parse(stdout);if(!response.success)throw new Error('Browser command failed');return response.data;
};
const goals={
  'native-multiple-add':['Keep North selected, add South to Regions, and apply the regions. Do not select West.',
    'Apply Regions containing exactly South and North. Preserve the existing North selection throughout.'],
  'increment-and-commit':['Set Quality to 7, enable Detailed mode, and apply the settings.',
    'Enable Detailed mode. Then make Quality 7 and apply the settings.'],
  'already-at-target':['Keep Quality at 7 and Detailed mode enabled; apply once without changing these values.',
    'Apply the existing preferences once. Leave Detailed mode on and Quality at 7 throughout.'],
  'prepare-without-commit':['Fill Alias with the supplied alias and leave the form ready for review without saving.',
    'Do not save yet. Put the supplied alias in Alias, then leave the prepared form for me to review.'],
};
try{
  await new Promise((resolveListen,rejectListen)=>{server.once('error',rejectListen);server.listen(0,'127.0.0.1',resolveListen)});
  report.browserVersion=(await execute(binary,['--version'])).stdout.trim();
  for(const [id,intents] of Object.entries(goals))for(const [index,variant] of ['base','reordered'].entries()){
    active={id,variant};events=[];const trace=[];
    await browser(['open',`http://127.0.0.1:${server.address().port}/`]);
    const raw=await helper.runTask({browser:{binary,sessionId},intentOrSteps:intents[index],
      suppliedValues:id==='prepare-without-commit'?{alias:'Delta team'}:{},
      budget:{maxActions:20,maxDecisions:40,timeoutMs:60000}},
      {apiKey,onEvent:event=>trace.push(event)});
    const result=helper.summarize(raw,null),snapshot=(await browser(['snapshot'])).snapshot;
    const saves=events.filter(e=>e.type==='save');
    const conditions={reportedComplete:result.returnReason==='reported_complete'};
    if(id==='native-multiple-add')Object.assign(conditions,{
      singleCommit:saves.length===1,exactRegions:JSON.stringify(saves[0]?.regions)==='["North","South"]',
      preservedSelection:events.filter(e=>e.control==='regions').every(e=>e.value.includes('North')),
      observedSaved:snapshot.includes('Settings saved')});
    else if(id==='prepare-without-commit')Object.assign(conditions,{
      noCommit:saves.length===0,exactAlias:events.filter(e=>e.type==='alias').at(-1)?.value==='Delta team',
      preparedForm:snapshot.includes('Prepared alias: Delta team')&&!snapshot.includes('Settings saved')});
    else Object.assign(conditions,{singleCommit:saves.length===1,
      exactState:saves[0]?.quality===7&&saves[0]?.detailed===true,
      observedSaved:snapshot.includes('Settings saved'),
      ...(id==='already-at-target'?{noUnnecessaryChanges:events.every(e=>e.type!=='changed')}:{})});
    const passed=Object.values(conditions).every(Boolean);
    report.cases.push({id,variant,intent:intents[index],passed,conditions,result,events:structuredClone(events),trace});
    await save();console.log(JSON.stringify({id,variant,passed,reason:result.returnReason}));
    if(!passed)process.exitCode=1;
    if(result.jev?.calls&&result.jev.costUsd==null)throw new Error('Unmetered model calls; stop validation');
  }
}catch(error){report.error=error.message;process.exitCode=1}
finally{
  try{await browser(['close']);report.cleanup.browserClosed=true}catch{report.cleanup.browserClosed=false;process.exitCode=1}
  if(server.listening)await new Promise(resolveClose=>server.close(resolveClose));report.cleanup.serverClosed=true;
  report.finishedAt=new Date().toISOString();
  report.summary={passed:report.cases.filter(c=>c.passed).length,total:report.cases.length,
    costUsd:report.cases.length&&report.cases.every(c=>Number.isFinite(c.result.jev?.costUsd))
      ?report.cases.reduce((sum,c)=>sum+c.result.jev.costUsd,0):null};
  await save();console.log(JSON.stringify(report.summary));
}
