import test from 'node:test';import assert from 'node:assert/strict';
import {callerRequestReserve,createTrialBudget,runWebArenaCaller} from './webarena-caller-agent.mjs';
test('cost reservation uses measured unchanged prefix and conservatively counts only appended bytes',()=>{
 const body={model:'openai/gpt-5.4',max_tokens:1600,tools:[],messages:[{role:'user',content:'x'.repeat(4000)}]};
 const previous={request:structuredClone(body),response:{usage:{prompt_tokens:1000}}};
 body.messages.push({role:'assistant',content:'Observed result ✓'});
 const reserve=callerRequestReserve(body,previous);
 assert.equal(reserve.method,'measured_prefix_plus_new_bytes');
 assert.equal(reserve.inputTokens,1000+Buffer.byteLength(JSON.stringify(body.messages.slice(1)))+1024);
 assert.ok(reserve.usd<callerRequestReserve(body).usd);
});
test('cost reservation invalidates changed parameters/history and missing provider token count',()=>{
 const body={model:'openai/gpt-5.4',max_tokens:1600,tools:[],messages:[{role:'user',content:'original'}]};
 const previous={request:structuredClone(body),response:{usage:{prompt_tokens:100}}};
 for(const changed of [{...body,tools:[{}]},{...body,model:'other'},{...body,messages:[{role:'user',content:'changed'}]}])
  assert.equal(callerRequestReserve(changed,previous).method,'full_request_bytes');
 assert.equal(callerRequestReserve(body,{...previous,response:{usage:{}}}).method,'full_request_bytes');
});
test('long-context price tier and detailed spend stop remain enforced',()=>{
 const body={model:'openai/gpt-5.4',max_tokens:1600,messages:[{role:'user',content:'x'.repeat(273000)}]};
 const reserve=callerRequestReserve(body);assert.equal(reserve.usd,reserve.inputTokens*.000005+1600*.0000225);
 const b=createTrialBudget({deadline:100,now:()=>10,maxUsd:1});b.addCost(.9);
 assert.throws(()=>b.check(.2),e=>e.budgetStop.reason==='spend_reservation'&&e.budgetStop.spentUsd===.9&&e.budgetStop.reserveUsd===.2);
});
test('caller and Jev share one action budget; unmetered calls block further dispatch',()=>{
  const b=createTrialBudget({deadline:100,now:()=>10,maxActions:3,maxUsd:1});b.take(2);b.take();assert.equal(b.remaining,0);assert.throws(()=>b.take());b.addCost(.4);assert.throws(()=>b.check(.7));assert.throws(()=>b.addCost(null),e=>e.unknownCharge);assert.throws(()=>b.check(),/Unknown charge/);
});
test('invalid limits and reservations cannot silently disable the spend guard',()=>{
 for(const limits of [{maxUsd:NaN},{maxUsd:Infinity},{maxUsd:-1},{maxActions:1.5},{deadline:NaN}])
  assert.throws(()=>createTrialBudget({deadline:100,...limits}),/Invalid trial budget/);
 const b=createTrialBudget({deadline:100,now:()=>10});
 for(const value of [NaN,Infinity,-1])assert.throws(()=>b.check(value),/Invalid cost reservation/);
});
const task={intentOrSteps:'Like the matching posts',suppliedValues:{},browser:{sessionId:'unit'}};
function services(mode){const receipts=[],invocations=[];return {mode,apiKey:'unit',authorizationDeadline:new Date(Date.now()+10000).toISOString(),browser:async()=>({snapshot:'Current page'}),readGuidance:async()=>'',save:async x=>receipts.push(structuredClone(x)),receipts,invocations,
  helper:{runTask:async t=>{invocations.push(t);return {returnReason:'handoff',actions:[{operation:'click',outcome:'success'}],jev:{costUsd:.01,calls:1},continuation:{}};},sealResume:()=> 'secret-token',openResume:()=>({invocation:task,continuation:{}}),summarize:(r,t)=>({...r,resumeToken:t})}};}
test('actual handoff is delivered unchanged to caller and token is excluded from durable receipts',async()=>{
  const s=services('caller_with_jev');s.caller=async x=>{const r=await x.dispatch('jev',{});assert.equal(r.resumeToken,'secret-token');await x.dispatch('browser',{args:['click','@e2']});return {status:'complete'};};
  const r=await runWebArenaCaller(task,s);assert.equal(s.invocations[0].intentOrSteps,task.intentOrSteps);assert.equal(r.returnReason,'reported_complete');assert.equal(r.callerStudy.helperCalls[0].result.returnReason,'handoff');assert.equal(r.callerStudy.callerActions,1);assert.ok(!JSON.stringify(s.receipts).includes('secret-token'));assert.equal(r.jev.costUsd,.01);
});
test('returned helper result persists before an unknown cost stops continuation',async()=>{
  const s=services('jev_only');s.helper.runTask=async()=>({returnReason:'handoff',actions:[],jev:{costUsd:null}});
  const r=await runWebArenaCaller(task,s);assert.equal(r.callerStudy.unknownCharge,true);assert.equal(r.jev.costUsd,null);assert.ok(s.receipts.some(x=>x.helperCalls[0]?.result?.jev?.costUsd===null));
});
test('practiced-case helper limit prevents another paid attempt while permitting caller takeover',async()=>{
  const s=services('caller_with_jev');s.maxHelperInvocations=1;s.caller=async x=>{await x.dispatch('jev',{});await assert.rejects(()=>x.dispatch('jev',{}),/invocation limit/);await x.dispatch('browser',{args:['back']});return {status:'handoff'};};
  const r=await runWebArenaCaller(task,s);assert.equal(s.invocations.length,1);assert.equal(r.callerStudy.callerActions,1);
});
test('a caller must be explicit and current-agent cost is unknown rather than zero',async()=>{
 const s=services('caller_with_jev');await assert.rejects(()=>runWebArenaCaller(task,s),/explicit caller/);
 s.caller=async()=>({status:'handoff'});const r=await runWebArenaCaller(task,s);
 assert.equal(r.assistance.model,'Current agent');assert.equal(r.assistance.costUsd,null);assert.equal(r.assistance.promptTokens,null);assert.match(r.callerStudy.costScope,/unmeasured/);
});
