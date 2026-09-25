import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {autocompletePage,autocompleteIntent,autocompleteExpected} from './fixtures/autocomplete-page.mjs';
import {configuredBrowser} from '../scripts/config.mjs';
const exec=promisify(execFile),{values}=parseArgs({options:{output:{type:'string'},binary:{type:'string'}}});
if(!values.output)throw Error('--output required');
const skill=fileURLToPath(new URL('..',import.meta.url)),binary=values.binary||configuredBrowser(),output=resolve(values.output);
await mkdir(dirname(output),{recursive:true});await writeFile(output,'{}\n',{flag:'wx',mode:0o600});
const root=await mkdtemp(join(tmpdir(),'jev-autocomplete-')),session='jev-autocomplete-'+randomUUID();let events=[];
const server=createServer(async(req,res)=>{if(req.url==='/events'){let body='';for await(const c of req)body+=c;events.push(JSON.parse(body));res.writeHead(204);res.end();return;}const mode=req.url.slice(1);if(!['click','enter'].includes(mode)){res.writeHead(404);res.end();return;}res.setHeader('content-type','text/html');res.end(autocompletePage(mode))});
let origin;
const report={version:JSON.parse(await readFile(join(skill,'package.json'))).version,startedAt:new Date().toISOString(),sourceSha256:{},cases:[],cleanup:{}};
for(const f of ['scripts/controls.mjs','scripts/agent-browser-jev.mjs','scripts/jev-browser.mjs','scripts/run.mjs','tests/autocomplete-live.mjs','tests/fixtures/autocomplete-page.mjs'])report.sourceSha256[f]=createHash('sha256').update(await readFile(join(skill,f))).digest('hex');
const browser=async args=>{const r=JSON.parse((await exec(binary,['--session',session,'--json',...args],{timeout:30000,maxBuffer:2e6})).stdout);assert.equal(r.success,true);return r.data;};
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});origin='http://127.0.0.1:'+server.address().port;
 report.browserVersion=(await exec(binary,['--version'])).stdout.trim();
 for(const mode of ['click','enter']){
  events=[];const entry={mode};report.cases.push(entry);
  try{
   let code=0,command;
   try{command=await exec(process.execPath,[join(skill,'scripts/run.mjs'),'--binary',binary,'--session',session,'--url',origin+'/'+mode,'--intent',autocompleteIntent+(mode==='click'?'':' Use keyboard selection for BOTH fields; commit the highlighted match with '+(mode==='tab'?'Tab':'Enter')+'.'),'--value','contactQuery=adobe','--value','accountQuery=software'],{timeout:150000,maxBuffer:3e6});}catch(e){command=e;code=e.code;}
   const result=JSON.parse(command.stdout);
   entry.result={...result,resumeToken:result.resumeToken?'[redacted]':null};
   assert.equal(code,0);
   entry.independentSnapshot=(await browser(['snapshot'])).snapshot;
   assert.ok(!result.actions.some(a=>a.operation==='select'));
   if(mode==='click'){
    assert.equal(result.returnReason,'reported_complete');assert.match(entry.independentSnapshot,/Selection confirmed/);
    assert.deepEqual(events,[{type:'confirm',selected:autocompleteExpected}]);
   }else{
    assert.notEqual(result.returnReason,'reported_complete');assert.doesNotMatch(entry.independentSnapshot,/Selection confirmed/);
    assert.deepEqual(events,[]);assert.equal(result.actions.some(a=>a.operation==='press'&&['ArrowDown','ArrowUp'].includes(a.detail)),false);
   }
   entry.verdict='passed';
  }catch(e){entry.verdict='failed';entry.failure=e.message;process.exitCode=1;}
  entry.events=structuredClone(events);await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({mode,verdict:entry.verdict,reason:entry.result?.returnReason}));
 }
}finally{
 try{await browser(['close']);report.cleanup.browserClosed=true;}catch{report.cleanup.browserClosed=false;}
 if(server.listening)await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});report.cleanup.serverClosed=!server.listening;report.cleanup.temporaryDirectoryRemoved=true;
 report.finishedAt=new Date().toISOString();report.verdict=report.cases.length===2&&report.cases.every(c=>c.verdict==='passed')&&report.cleanup.browserClosed?'passed':'failed';
 await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({verdict:report.verdict,output}));if(report.verdict!=='passed')process.exitCode=1;
}
