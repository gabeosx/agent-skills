#!/usr/bin/env node
// Persistent read-only localhost dashboard. Audit files remain the source of truth.
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { campaignSummary } from './browsergym-campaign-lib.mjs';

const {values}=parseArgs({options:{'run-dir':{type:'string'},'campaign-root':{type:'string'},
  port:{type:'string'},help:{type:'boolean'}}});
if(values.help){
  console.log('node tests/browsergym-dashboard.mjs (--run-dir /campaign/path | --campaign-root /runs) [--port 0]');
  process.exit(0);
}
if(Boolean(values['run-dir'])===Boolean(values['campaign-root']))
  throw new Error('Provide exactly one of --run-dir or --campaign-root');
const singleRun=values['run-dir']?resolve(values['run-dir']):null;
const campaignRoot=values['campaign-root']?resolve(values['campaign-root']):null;
const port=values.port===undefined?0:Number(values.port);
if(!Number.isSafeInteger(port)||port<0||port>65535)throw new Error('Port must be 0..65535');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const formatUsd=value=>Number.isFinite(value)?`$${Number(value).toFixed(4)}`:'not authorized';
const formatDuration=ms=>Number.isFinite(ms)?
  `${Math.floor(ms/3_600_000)}h ${Math.floor(ms%3_600_000/60_000)}m`:'not authorized';
const exists=path=>stat(path).then(()=>true,()=>false);

async function readEvents(runDir){
  const eventsDir=join(runDir,'events');
  if(!await exists(eventsDir))return [];
  const names=(await readdir(eventsDir)).filter(name=>/^\d{6}\.json$/.test(name)).sort();
  const events=[];
  for(const name of names)events.push(JSON.parse(await readFile(join(eventsDir,name),'utf8')));
  return events;
}

async function readCampaign(runDir){
  const name=basename(runDir),manifestPath=join(runDir,'manifest.json');
  if(await exists(manifestPath)){
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    const events=await readEvents(runDir);
    return {name,runDir,kind:'campaign',manifest,events,status:campaignSummary(manifest,events)};
  }
  const readinessPath=join(runDir,'readiness.json');
  if(await exists(readinessPath)){
    const readiness=JSON.parse(await readFile(readinessPath,'utf8'));
    return {name,runDir,kind:'readiness',manifest:readiness,events:[],status:{
      kind:'browsergym-campaign-readiness',startedAt:readiness.createdAt,
      stage:readiness.stage??'adapter_validation',iteration:readiness.iteration??0,
      benchmark:readiness.benchmark,checks:readiness.checks??[],blockers:readiness.blockers??[],
      improvements:readiness.improvements??[],suite:readiness.suite,
    }};
  }
  return null;
}

async function readOverview(){
  if(singleRun){
    const campaign=await readCampaign(singleRun);
    if(!campaign)throw new Error('No manifest.json or readiness.json in run directory');
    return {root:singleRun,campaigns:[campaign],current:campaign};
  }
  const campaigns=[];
  for(const entry of await readdir(campaignRoot,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const campaign=await readCampaign(join(campaignRoot,entry.name));
    if(campaign)campaigns.push(campaign);
  }
  campaigns.sort((a,b)=>String(b.status.startedAt).localeCompare(String(a.status.startedAt)));
  const terminal=new Set(['complete','complete_with_gaps','time_limit','spend_limit']);
  // A stale readiness record can remain open after its real campaign starts, while
  // a newer readiness record legitimately represents the next campaign. Prefer a
  // running campaign, otherwise whichever is newer: the latest campaign result or
  // the latest active preparation record.
  const activeCampaign=campaigns.find(item=>item.kind==='campaign'&&!terminal.has(item.status.stage));
  const latestCampaign=campaigns.find(item=>item.kind==='campaign');
  const latestReadiness=campaigns.find(item=>item.kind==='readiness'&&!terminal.has(item.status.stage));
  const newestPrepared=latestReadiness&&(!latestCampaign||
    String(latestReadiness.status.startedAt)>String(latestCampaign.status.startedAt))?latestReadiness:null;
  const current=activeCampaign??newestPrepared??latestCampaign??latestReadiness??campaigns[0]??null;
  return {root:campaignRoot,campaigns,current};
}

function shell(title,subtitle,body){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="10"><title>${escapeHtml(title)}</title><style>
  :root{color-scheme:dark;font:15px Inter,ui-sans-serif,system-ui,sans-serif;background:#09111d;color:#edf3fb}body{max-width:1240px;margin:0 auto;padding:30px 22px 50px}h1{font-size:30px;margin:0 0 6px}h2{font-size:19px;margin:0 0 12px}.muted{color:#9fb0c6}.eyebrow{color:#72d5bb;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:750}a{color:#91ccff;text-decoration:none}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:22px 0}.card{background:#121f31;border:1px solid #283b54;border-radius:13px;padding:15px}.value{font-size:25px;font-weight:760;margin-top:5px}.bar{height:9px;background:#23334a;border-radius:9px;overflow:hidden}.bar span{display:block;height:100%;background:linear-gradient(90deg,#5fc5a7,#75aef5)}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #26384e}th{color:#9fb0c6}section{margin-top:30px;overflow:auto}.pill{display:inline-block;border-radius:20px;padding:3px 8px;background:#25364d}.pill.passed,.pill.complete{background:#185746}.pill.needs_improvement,.pill.exhausted,.pill.infrastructure_incomplete{background:#6a302c}.pill.deferred,.pill.awaiting_budget,.pill.complete_with_gaps{background:#665322}.pill.running{background:#244f77}li{margin:7px 0}time{color:#8ea4c0;font-size:12px;margin-right:8px}code{color:#a7d5ff}.score{font-variant-numeric:tabular-nums}.notice{border-left:3px solid #e2b955;background:#211d15;padding:12px 14px;border-radius:6px}.good{border-left-color:#64cbaa}.empty{color:#7f91a8;font-style:italic}</style></head><body>
  <div class="eyebrow">Agent Browser Jev · read-only evidence</div><h1>${escapeHtml(title)}</h1><p class="muted">${escapeHtml(subtitle)} · refreshes every 10 seconds</p>${body}</body></html>`;
}

function score(value){
  if(!value||value.total===0)return 'not reserved';
  return `${value.candidatePassed}/${value.scored} candidate · ${value.baselinePassed}/${value.scored} baseline`;
}

function renderReadiness(campaign){
  const {manifest,status}=campaign;
  const checks=(status.checks??[]).map(check=>`<tr><td>${escapeHtml(check.name)}</td><td><span class="pill ${escapeHtml(check.status)}">${escapeHtml(check.status)}</span></td><td>${escapeHtml(check.detail??'')}</td></tr>`).join('');
  const improvements=(status.improvements??[]).map(item=>`<li>${escapeHtml(item)}</li>`).join('');
  const blockers=(status.blockers??[]).map(item=>`<li>${escapeHtml(item)}</li>`).join('');
  return shell(manifest.title??'WebArena-Verified campaign',`${manifest.benchmark} · iteration ${status.iteration}`,
    `<p><strong>Current stage:</strong> <span class="pill ${escapeHtml(status.stage)}">${escapeHtml(status.stage.replaceAll('_',' '))}</span></p>
    ${blockers?`<div class="notice"><strong>Blocked before scored calls</strong><ul>${blockers}</ul></div>`:''}
    <section><h2>Adapter and environment readiness</h2><table><thead><tr><th>Check</th><th>Status</th><th>Evidence</th></tr></thead><tbody>${checks||'<tr><td colspan="3" class="empty">Checks have not started.</td></tr>'}</tbody></table></section>
    <section><h2>Dashboard improvements from earlier cycles</h2><ul>${improvements||'<li class="empty">None recorded.</li>'}</ul></section>
    <p class="muted">This preparation record is not a benchmark score. First-attempt, retry-trained, and held-out evidence will remain separate once a bounded campaign is authorized.</p>`);
}

function renderCampaign(campaign){
  const {manifest,events,status,runDir}=campaign;
  const resolved=status.counts.passed+status.counts.exhausted+status.counts.deferred;
  const pct=status.totalTasks?Math.min(100,Math.round(resolved/status.totalTasks*100)):0;
  const recent=events.filter(event=>['trial','change','defer','run_error','charge_reconciled','validation'].includes(event.type)).slice(-12).reverse();
  const rows=status.tasks.map(task=>`<tr><td>${escapeHtml(task.id)}</td><td>${task.seed}</td><td>${escapeHtml(task.cohort)}</td><td><span class="pill ${escapeHtml(task.state)}">${escapeHtml(task.state.replaceAll('_',' '))}</span></td><td>${task.attempts}</td><td>${task.firstTrial?.candidatePassed===undefined?'—':task.firstTrial.candidatePassed?'pass':'fail'}</td><td>${task.candidatePassed===null?'—':task.candidatePassed?'pass':'fail'}</td><td>${escapeHtml(task.failure??'')}</td></tr>`).join('');
  const activity=recent.map(event=>`<li><time>${escapeHtml(event.at)}</time> <strong>${escapeHtml(event.type)}</strong> ${escapeHtml(event.type==='trial'?`${event.id}/${event.seed} attempt ${event.attempt}: ${event.candidatePassed?'pass':event.candidateFailure??event.verdict}`:event.type==='change'?event.note:event.type==='defer'?`${event.id}/${event.seed}: ${event.reason}`:event.type==='charge_reconciled'?`${event.id}/${event.seed}: reserved ${formatUsd(event.reservedUsd)}`:event.type==='validation'?`${event.note}: ${event.passed}/${event.total} passed`:event.error)}</li>`).join('');
  const impacts=status.changeImpacts.map(item=>`<tr><td>${item.iteration}</td><td>${escapeHtml(item.note)}</td><td>${item.changedFiles.length}</td><td>${item.targets.length}</td><td>${item.verifiedPasses} pass · ${item.verifiedFailures} fail · ${item.pending} pending</td></tr>`).join('');
  const current=status.active?`${status.active.id}/${status.active.seed}, attempt ${status.active.attempt}`:
    status.stage.replaceAll('_',' ');
  return shell(`${manifest.benchmark}`,`Iteration ${status.iteration} · ${escapeHtml(current)}`,
    `<div class="bar" aria-label="${pct}% resolved"><span style="width:${pct}%"></span></div>
    <div class="cards"><div class="card">Stage<div class="value">${escapeHtml(status.stage.replaceAll('_',' '))}</div></div><div class="card">Resolved<div class="value">${resolved}/${status.totalTasks}</div></div><div class="card">First attempt<div class="value score">${score(status.views.frozenFirstAttempt)}</div></div><div class="card">Repaired development<div class="value score">${score(status.views.repairedDevelopment)}</div></div><div class="card">Untouched holdout<div class="value score">${score(status.views.untouchedHoldout)}</div></div><div class="card">Trials / retries<div class="value">${status.totalTrials} / ${status.retries}</div><small>${status.totalValidations} validations</small></div><div class="card">Budget accounted<div class="value">${formatUsd(status.costUsd)}</div><small>${formatUsd(status.reportedCostUsd)} measured + ${formatUsd(status.reservedCostUsd)} reserved; cap ${formatUsd(status.maxCostUsd)}</small></div><div class="card">Elapsed<div class="value">${formatDuration(status.elapsedMs)}</div><small>Limit ${formatDuration(status.maxDurationMs)}</small></div></div>
    <p class="muted">Started ${escapeHtml(status.startedAt)} · Deadline ${escapeHtml(status.deadlineAt)} · Latest skill change: ${escapeHtml(status.latestChange?.note??'initial candidate')}</p>
    <section><h2>Improvement impact by iteration</h2><table><thead><tr><th>Iteration</th><th>Change</th><th>Files</th><th>Targeted trials</th><th>Observed impact</th></tr></thead><tbody>${impacts||'<tr><td colspan="5" class="empty">No post-baseline skill change has been tested in this campaign.</td></tr>'}</tbody></table></section>
    <section><h2>Tasks</h2><table><thead><tr><th>Case</th><th>Seed</th><th>Cohort</th><th>Status</th><th>Attempts</th><th>First</th><th>Latest</th><th>Failure</th></tr></thead><tbody>${rows}</tbody></table></section>
    <section><h2>Recent audit events</h2><ol>${activity||'<li class="empty">No events recorded.</li>'}</ol></section><p class="muted">Chained audit events and private reports remain in <code>${escapeHtml(runDir)}</code>. No key or raw page trace is served.</p>`);
}

function renderOverview(overview){
  if(overview.campaigns.length===1)return overview.campaigns[0].kind==='readiness'?
    renderReadiness(overview.campaigns[0]):renderCampaign(overview.campaigns[0]);
  const rows=overview.campaigns.map(item=>{
    const href=`/campaign/${encodeURIComponent(item.name)}/`;
    const status=item.status;
    const progress=item.kind==='campaign'?`${status.counts.passed}/${status.totalTasks} latest passes`:
      `${status.checks.filter(check=>check.status==='passed').length}/${status.checks.length} readiness checks`;
    return `<tr><td><a href="${href}">${escapeHtml(item.name)}</a></td><td>${escapeHtml(item.manifest.benchmark)}</td><td>${escapeHtml(status.stage.replaceAll('_',' '))}</td><td>${status.iteration}</td><td>${escapeHtml(progress)}</td><td>${escapeHtml(status.startedAt)}</td></tr>`;
  }).join('');
  const current=overview.current;
  return shell('Benchmark campaign center','Persistent overview of development, holdout, and readiness runs',
    `${current?`<div class="notice good"><strong>Current:</strong> <a href="/campaign/${encodeURIComponent(current.name)}/">${escapeHtml(current.name)}</a> · ${escapeHtml(current.status.stage.replaceAll('_',' '))} · iteration ${current.status.iteration}</div>`:''}
    <section><h2>Campaigns</h2><table><thead><tr><th>Run</th><th>Benchmark</th><th>Stage</th><th>Iteration</th><th>Progress</th><th>Started</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">No campaigns found.</td></tr>'}</tbody></table></section>`);
}

function publicOverview(overview){
  return {kind:'browsergym-dashboard-overview',current:overview.current?.name??null,
    campaigns:overview.campaigns.map(item=>({name:item.name,kind:item.kind,
      benchmark:item.manifest.benchmark,stage:item.status.stage,iteration:item.status.iteration,
      startedAt:item.status.startedAt,
      ...(item.kind==='campaign'?{counts:item.status.counts,views:item.status.views,
        costUsd:item.status.costUsd,maxCostUsd:item.status.maxCostUsd}:{})}))};
}

const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
  try{
    const overview=await readOverview();
    if(req.url==='/status.json'){
      res.setHeader('Content-Type','application/json; charset=utf-8');
      res.end(JSON.stringify(singleRun?overview.current.status:publicOverview(overview)));return;
    }
    const match=req.url?.match(/^\/campaign\/([^/]+)\/(status\.json)?$/);
    if(match&&!singleRun){
      const name=decodeURIComponent(match[1]);
      const campaign=overview.campaigns.find(item=>item.name===name);
      if(!campaign){res.statusCode=404;res.end('Not found');return}
      if(match[2]){res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(campaign.status));return}
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end(campaign.kind==='readiness'?renderReadiness(campaign):renderCampaign(campaign));return;
    }
    if(req.url==='/'){
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(renderOverview(overview));
    }else{res.statusCode=404;res.end('Not found')}
  }catch(error){res.statusCode=500;res.end(`Dashboard unavailable: ${error.message}`)}
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({
  url:`http://127.0.0.1:${server.address().port}/`,
  ...(singleRun?{runDir:singleRun}:{campaignRoot}),persistent:true})));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close());
