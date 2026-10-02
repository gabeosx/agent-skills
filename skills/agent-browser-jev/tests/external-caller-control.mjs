#!/usr/bin/env node
// Local interface for the active agent to serve a qualified study's UI mailbox.
// Commands are files so caller text never needs shell interpolation.
import {readFile,readdir,writeFile,link,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';import {parseArgs} from 'node:util';
import {observationWindows} from '../scripts/observation-windows.mjs';
const {values,positionals}=parseArgs({allowPositionals:true,options:{page:{type:'string'},seq:{type:'string'},'command-file':{type:'string'},'resume-latest':{type:'boolean'}}});
const [mode,directory]=positionals;if(!['read','respond'].includes(mode)||!directory)throw Error('Use read DIRECTORY [--page N], or respond DIRECTORY --seq N --command-file FILE [--resume-latest]');
const dir=resolve(directory),names=(await readdir(dir)).filter(x=>/^request-\d+\.json$/.test(x)).sort((a,b)=>Number(a.slice(8,-5))-Number(b.slice(8,-5)));
if(!names.length)throw Error('No pending caller request');
const latest=JSON.parse(await readFile(join(dir,names.at(-1)),'utf8'));
if(mode==='read'){
 const r=latest.result,ob=r.initialObservation??r.observation??r;
 const pages=ob.snapshot?(observationWindows(ob,{maxChars:13000})??[ob]):[],page=Number(values.page??0);
 if(!Number.isSafeInteger(page)||page<0||pages.length&&!pages[page])throw Error('Invalid observation page');
 console.log(JSON.stringify({seq:latest.seq,goal:r.goal,values:r.values,skill:r.skill,deadline:r.deadline,returnReason:r.returnReason,inputRequired:r.inputRequired,actions:r.actions,error:r.error,resumable:Boolean(r.resumeToken),page,pages:pages.length,snapshot:pages[page]?.snapshot,refs:pages[page]?.refs,window:pages[page]?.observationWindow},null,2));
}else{
 if(Number(values.seq)!==latest.seq||!values['command-file'])throw Error('Use the current request sequence and an explicit command file');
 const command=JSON.parse(await readFile(resolve(values['command-file']),'utf8'));
 if(!['jev','browser','finish','skill_reference'].includes(command.tool))throw Error('Unknown caller tool');
 if(values['resume-latest']){
  let token;for(const name of [...names].reverse()){const r=JSON.parse(await readFile(join(dir,name),'utf8'));if(r.result?.resumeToken){token=r.result.resumeToken;break;}}
  if(!token)throw Error('No returned continuation');command.args??={};command.args.resumeToken=token;
 }
 const path=join(dir,`response-${latest.seq}.json`),temp=path+`.${process.pid}.tmp`;
 await writeFile(temp,JSON.stringify(command),{flag:'wx',mode:0o600});
 try{await link(temp,path);}finally{await unlink(temp);} // Publish atomically; never replace an existing decision.
 console.log(JSON.stringify({respondedTo:latest.seq,tool:command.tool}));
}
