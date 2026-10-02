// Host-only persisted-state guard. None of these records enter helper input.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execute=promisify(execFile);
export const redditImage='am1n3e/webarena-verified-reddit@sha256:0594908059a03e5f610005689440a95c05e776e734006197c7b1eba12734cb46';
export const isolationProtocol='fresh-container-v1';
const label='agent-browser-jev.webarena-verified';
const sha=value=>createHash('sha256').update(value).digest('hex');
const docker=(args,timeout=120_000)=>execute('docker',args,{timeout,maxBuffer:8e6});
export const readEnvironment=async path=>JSON.parse(await readFile(path,'utf8'));
export const saveEnvironment=async(path,state)=>writeFile(path,JSON.stringify(state,null,2)+'\n',{mode:0o600});

export function environmentIdentity(path){
  const suffix=sha(resolve(dirname(path))).slice(0,10);
  return {container:`jev-wav-reddit-${suffix}`,network:`jev-wav-${suffix}`};
}

export async function lockEnvironment(path){
  const lock=join(dirname(path),'.isolation-lock');
  await mkdir(lock).catch(()=>{throw new Error('WebArena environment is locked; inspect the owning run before removing its lock');});
  return ()=>rm(lock,{recursive:true});
}

export function assertEnvironment(state,path){
  const names=environmentIdentity(path);
  if(state.kind!=='webarena-verified-environment'||state.site!=='reddit'||
      state.image!==redditImage||state.resourcesRemoved||state.container!==names.container||
      state.network!==names.network||state.siteUrl!==`http://${names.container}`||
      state.resetUrl!==`http://${names.container}:8877`)
    throw new Error('Expected the active pinned scoped Reddit environment');
}

export async function inspectBackend(state){
  const info=JSON.parse((await docker(['inspect',state.container])).stdout)[0];
  if(info.Config.Labels?.[label]!=='true'||info.Image!==redditImage.split('@')[1]||
      info.Mounts.length||!info.State.Running||!info.NetworkSettings.Networks[state.network])
    throw new Error('Backend identity, ownership, image, mounts or network mismatch');
  return {containerId:info.Id,imageId:info.Image,mounts:[],network:state.network};
}

export async function databaseQuery(state,sql){
  return (await docker(['exec','--user','postgres',state.container,'psql','-X',
    '-v','ON_ERROR_STOP=1','-d','postmill','-At','-c',sql])).stdout.trim();
}

const ownedTables=['comments','submissions','comment_votes','submission_votes','forum_subscriptions'];
export async function readPersistedState(state){
  const tables=(await databaseQuery(state,"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).split('\n');
  if(!tables.includes('users')||!tables.includes('comments')||tables.some(x=>!/^[a-z_]+$/.test(x)))
    throw new Error('Unexpected Reddit database schema');
  const counts=tables.map(table=>`SELECT '${table}' AS name,count(*)::text AS count FROM "${table}"`).join(' UNION ALL ');
  // Explicit user projection excludes passwords, email and other credentials.
  const user="SELECT id,username,biography,front_page,front_page_sort_mode,last_seen FROM users WHERE username='MarvelsGrantMan136'";
  const records=ownedTables.map(table=>`'${table}',(SELECT COALESCE(json_agg(t ORDER BY id),'[]'::json) FROM (SELECT * FROM ${table} WHERE user_id=(SELECT id FROM users WHERE username='MarvelsGrantMan136')) t)`);
  // Forum creation makes the actor a moderator. Capture saved public content,
  // including description, which the resulting forum page may not display.
  records.push(`'moderated_forums',(SELECT COALESCE(json_agg(t ORDER BY id),'[]'::json) FROM
    (SELECT f.id,f.name,f.title,f.description,f.sidebar FROM forums f JOIN moderators m ON m.forum_id=f.id
     WHERE m.user_id=(SELECT id FROM users WHERE username='MarvelsGrantMan136')) t)`);
  const sequences=(await databaseQuery(state,"SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public' ORDER BY sequence_name")).split('\n').filter(Boolean);
  if(sequences.some(x=>!/^[a-z_]+$/.test(x)))throw new Error('Unexpected sequence name');
  const sequenceSql=sequences.map(name=>`SELECT '${name}' AS name,last_value::text,is_called FROM "${name}"`).join(' UNION ALL ');
  const value=JSON.parse(await databaseQuery(state,`SELECT json_build_object(
    'counts',(SELECT json_agg(t ORDER BY name) FROM (${counts}) t),
    'users',(SELECT json_agg(t ORDER BY id) FROM (${user}) t),
    ${records.join(',')},
    'sequences',(SELECT json_agg(t ORDER BY name) FROM (${sequenceSql}) t))`));
  if(value.users?.length!==1)throw new Error('Benchmark actor missing or ambiguous');
  return {sha256:sha(JSON.stringify(value)),value};
}

export function assertCleanState(state,current){
  if(state.isolation?.protocol!==isolationProtocol||!state.isolation?.reference?.sha256||
      state.isolation.reference.sha256!==current.sha256)
    throw new Error('WebArena clean-start check failed: persisted state differs from the fresh-image reference');
}

async function waitReady(state){
  for(let attempt=0;attempt<180;attempt++){
    try{
      const response=await docker(['exec',state.container,'curl','-fsS','--max-time','5','http://127.0.0.1:8877/status'],10_000);
      if(JSON.parse(response.stdout).success===true)return;
    }catch{}
    await new Promise(done=>setTimeout(done,1000));
  }
  throw new Error('Reddit services did not become ready');
}

export async function launchBackend(state){
  // Capture ownership before starting. A name collision never authorizes removal
  // of the pre-existing container in an error handler.
  const created=await docker(['create','--name',state.container,'--network',state.network,
    '--platform','linux/amd64','--memory','6g','--cpus','4','--pids-limit','1024',
    '--label',`${label}=true`,redditImage],900_000);
  const createdId=created.stdout.trim();
  try{
    await docker(['start',createdId]);
    await waitReady(state);
    // /init configures the app only. Restoration comes from container replacement.
    try{await docker(['exec',state.container,'curl','-fsS','--max-time','30','-X','POST','http://127.0.0.1:8877/init'],60_000)}
    catch(error){if(!String(error.stderr).includes('Empty reply from server'))throw error;}
    await waitReady(state);
    return await inspectBackend(state);
  }catch(error){
    await docker(['rm','--force',createdId]);
    throw error;
  }
}

export async function replaceBackend(state,path){
  assertEnvironment(state,path);
  const previous=await inspectBackend(state);
  await docker(['rm','--force',state.container]);
  const backend=await launchBackend(state);
  if(backend.containerId===previous.containerId)throw new Error('Backend was not replaced');
  const current=await readPersistedState(state);
  assertCleanState(state,current);
  return {protocol:isolationProtocol,passed:true,checkedAt:new Date().toISOString(),
    previousContainerId:previous.containerId,...backend,referenceSha256:state.isolation.reference.sha256,
    readbackSha256:current.sha256};
}

export async function checkCleanStart(state,path){
  assertEnvironment(state,path);
  const backend=await inspectBackend(state),current=await readPersistedState(state);
  assertCleanState(state,current);
  return {protocol:isolationProtocol,passed:true,checkedAt:new Date().toISOString(),...backend,
    referenceSha256:state.isolation.reference.sha256,readbackSha256:current.sha256};
}

export async function harnessFingerprint(){
  const root=dirname(fileURLToPath(import.meta.url)),files={};
  for(const name of ['webarena-isolation.mjs','webarena-verified-env.mjs','browsergym-study.mjs','browsergym-study-lib.mjs',
    'browsergym/episode.py','browsergym/receipts.py','browsergym-receipts.mjs',
    'browsergym/run-helper.mjs','browsergym/task-values.mjs','browsergym/Dockerfile',
    'webarena-caller-agent.mjs','caller-workflow-agent.mjs','webarena-caller-study.mjs'])
    files[name]=sha(await readFile(join(root,name)));
  return sha(JSON.stringify(files));
}

export function assertQualified(state,fingerprint){
  const q=state.isolation?.qualification,c=state.isolation?.evaluatorControls;
  if(!q?.passed||q.harnessFingerprint!==fingerprint||!q.dirtyStartBlocked||q.cycles?.length!==2||
      !q.cycles.every(cycle=>cycle.passed))throw new Error('Qualify reset isolation on this harness before scored calls');
  if(!c?.negative?.passed||!c?.positive?.passed||c.negative.harnessFingerprint!==fingerprint||
      c.positive.harnessFingerprint!==fingerprint)
    throw new Error('Pass both no-model evaluator controls on this harness before scored calls');
}

export async function runIsolatedArm({restore,verify,run}){
  const restoration=await restore();
  const cleanStart=await verify();
  if(restoration?.passed!==true||cleanStart?.passed!==true||
      cleanStart.protocol!==isolationProtocol||!cleanStart.containerId||
      cleanStart.containerId!==restoration.containerId||
      !cleanStart.readbackSha256||cleanStart.readbackSha256!==cleanStart.referenceSha256)
    throw new Error('Missing or inconsistent clean-start evidence; scoring blocked');
  return run({...cleanStart,previousContainerId:restoration.previousContainerId});
}

export async function qualifyIsolation(state,path){
  const record={passed:false,harnessFingerprint:await harnessFingerprint(),cycles:[],dirtyStartBlocked:false};
  // A synthetic database intervention tests restoration independently of the browser
  // and evaluator. It is not a scored task or caller recovery.
  for(const order of ['candidate-to-baseline','baseline-to-candidate']){
    const before=await replaceBackend(state,path);
    await databaseQuery(state,`BEGIN;
      UPDATE users SET biography='jev-isolation-sentinel',front_page_sort_mode='new' WHERE username='MarvelsGrantMan136';
      INSERT INTO comments(id,user_id,submission_id,parent_id,body,timestamp,visibility,user_flag,net_score)
        SELECT nextval('comments_id_seq'),u.id,s.id,NULL,'jev-isolation-sentinel',now(),'visible','none',0
        FROM users u CROSS JOIN (SELECT id FROM submissions ORDER BY id LIMIT 1) s WHERE u.username='MarvelsGrantMan136';
      DELETE FROM forum_subscriptions WHERE user_id=(SELECT id FROM users WHERE username='MarvelsGrantMan136');
      INSERT INTO forum_subscriptions(id,user_id,forum_id,subscribed_at)
        SELECT '11111111-1111-4111-8111-111111111111',u.id,f.id,now() FROM users u
        CROSS JOIN (SELECT id FROM forums ORDER BY id LIMIT 1) f WHERE u.username='MarvelsGrantMan136';
      INSERT INTO submission_votes(id,user_id,submission_id,upvote,timestamp)
        SELECT nextval('submission_votes_id_seq'),u.id,s.id,true,now() FROM users u
        CROSS JOIN (SELECT id FROM submissions WHERE id NOT IN (SELECT submission_id FROM submission_votes WHERE user_id=(SELECT id FROM users WHERE username='MarvelsGrantMan136')) ORDER BY id LIMIT 1) s
        WHERE u.username='MarvelsGrantMan136';
      INSERT INTO moderators(id,forum_id,user_id,timestamp)
        SELECT '22222222-2222-4222-8222-222222222222',f.id,u.id,now() FROM users u
        CROSS JOIN (SELECT id FROM forums ORDER BY id LIMIT 1) f WHERE u.username='MarvelsGrantMan136';
      UPDATE forums SET title='jev-isolation-title',description='jev-isolation-description',sidebar='jev-isolation-sidebar'
        WHERE id=(SELECT forum_id FROM moderators WHERE id='22222222-2222-4222-8222-222222222222');
      COMMIT;`);
    const dirty=await readPersistedState(state);
    const mutations={biography:dirty.value.users[0].biography==='jev-isolation-sentinel',
      sort:dirty.value.users[0].front_page_sort_mode==='new',
      comment:dirty.value.comments.some(item=>item.body==='jev-isolation-sentinel'),
      subscription:dirty.value.forum_subscriptions.some(item=>item.id==='11111111-1111-4111-8111-111111111111'),
      vote:dirty.value.submission_votes.length===state.isolation.reference.value.submission_votes.length+1,
      forum:dirty.value.moderated_forums.some(item=>item.title==='jev-isolation-title'&&
        item.description==='jev-isolation-description'&&item.sidebar==='jev-isolation-sidebar')};
    if(dirty.sha256===before.readbackSha256||!Object.values(mutations).every(Boolean))
      throw new Error('Synthetic mutation did not persist');
    let blocked=false;
    try{await runIsolatedArm({restore:async()=>before,verify:()=>checkCleanStart(state,path),
      run:async()=>{throw new Error('Dirty state reached the model dispatch callback');}})}
    catch(error){if(/clean-start check failed/.test(error.message))blocked=true;else throw error;}
    if(!blocked)throw new Error('Dirty state reached the scoring gate');
    const restored=await replaceBackend(state,path);
    record.cycles.push({order,passed:true,before,mutations,dirtySha256:dirty.sha256,dirtyStartBlocked:blocked,restored});
  }
  record.dirtyStartBlocked=true;record.passed=true;record.finishedAt=new Date().toISOString();
  state.isolation.qualification=record;
  await saveEnvironment(path,state);
  return record;
}
