// Adapter-side caller experiment. This module is copied beside the frozen helper;
// it is not part of ordinary Jev execution and exposes no evaluator tools.
import {validateBrowserArgs,isGesture} from './caller-workflow-agent.mjs';

// Reserve uncached input and the entire output allowance. Reuse a provider's
// measured prefix only when all non-message parameters and prefix messages are
// unchanged. New UTF-8 bytes plus framing slack deliberately overestimate tokens;
// this is a scheduling estimate, not a replacement for authoritative charges.
export function callerRequestReserve(body,previous){
  const {messages,...parameters}=body;
  const prior=previous?.request,usage=previous?.response?.usage;
  let inputTokens=Buffer.byteLength(JSON.stringify(body))+1024,method='full_request_bytes';
  if(prior&&Number.isSafeInteger(usage?.prompt_tokens)&&usage.prompt_tokens>0&&Array.isArray(messages)){
    const {messages:prefix,...oldParameters}=prior;
    if(Array.isArray(prefix)&&messages.length>=prefix.length&&
        JSON.stringify(parameters)===JSON.stringify(oldParameters)&&
        JSON.stringify(messages.slice(0,prefix.length))===JSON.stringify(prefix)){
      inputTokens=usage.prompt_tokens+Buffer.byteLength(JSON.stringify(messages.slice(prefix.length)))+1024;
      method='measured_prefix_plus_new_bytes';
    }
  }
  // Frozen GPT-5.4 rate card: premium long-context tier starts at 272k.
  const promptRate=inputTokens>=272000?0.000005:0.0000025;
  const outputRate=inputTokens>=272000?0.0000225:0.000015;
  return {method,inputTokens,outputTokens:body.max_tokens??1600,
    usd:inputTokens*promptRate+(body.max_tokens??1600)*outputRate};
}

export function createTrialBudget({deadline,maxActions=30,maxUsd=1,now=Date.now}){
  if(!Number.isFinite(deadline)||!Number.isFinite(maxUsd)||maxUsd<0||!Number.isSafeInteger(maxActions)||maxActions<0)
    throw Error('Invalid trial budget');
  let actions=0,cost=0,unknown=false;
  return {
    get actions(){return actions;},get cost(){return cost;},get remaining(){return maxActions-actions;},
    check(reserve=0){if(!Number.isFinite(reserve)||reserve<0)throw Error('Invalid cost reservation');
      const reason=unknown?'unknown_charge':now()>=deadline?'deadline':cost+reserve>maxUsd?'spend_reservation':null;
      if(reason)throw Object.assign(Error(reason==='unknown_charge'?'Unknown charge':`Trial stopped: ${reason}`),
        {stopStudy:true,budgetStop:{reason,spentUsd:cost,reserveUsd:reserve,maxUsd,deadline}});},
    addCost(value){if(!Number.isFinite(value)||value<0){unknown=true;throw Object.assign(Error('Unknown charge'),{unknownCharge:true});}cost+=value;},
    take(count=1){if(!Number.isSafeInteger(count)||count<0||actions+count>maxActions)
      throw Error('Shared browser-action limit reached');actions+=count;},
  };
}

export async function runWebArenaCaller(task,{apiKey,helper,browser,readGuidance,save,
  mode,authorizationDeadline,maxUsd=1,maxHelperInvocations=3,caller,callerIdentity={name:'Current agent',costMeasured:false},maxActions=30,timeoutMs=180000,onEvent=()=>{}}){
  if(!['caller_only','jev_only','caller_with_jev'].includes(mode))throw Error('Unknown caller arm');
  if(mode!=='jev_only'&&typeof caller!=='function')throw Error('Choose an explicit caller; no separate GPT API is started automatically');
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<=0)throw Error('Invalid caller timeout');
  const deadline=Math.min(Date.parse(authorizationDeadline),Date.now()+timeoutMs);
  if(!Number.isFinite(deadline))throw Error('Explicit authorized deadline required');
  const budget=createTrialBudget({deadline,maxUsd,maxActions});
  const evidence={kind:'webarena-independent-caller',mode,startedAt:new Date().toISOString(),
    callerIdentity,costScope:callerIdentity.costMeasured?'Metered caller and Jev API charges':'Jev API charges; current-agent cost and tokens unmeasured',
    limits:{maxActions,callerDecisions:callerIdentity.costMeasured?40:null,deadline:new Date(deadline).toISOString(),maxUsd,maxHelperInvocations},
    callerCalls:[],callerTools:[],helperCalls:[],callerActions:0,helperActions:0,callerCostUsd:0,jevCostUsd:0};
  const secrets=new Set();
  const redact=value=>typeof value==='string'?[...secrets].reduce((s,t)=>s.replaceAll(t,'[private resume token]'),value):
    Array.isArray(value)?value.map(redact):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='resumeToken'&&v?'[private resume token]':redact(v)])):value;
  const persist=()=>save(redact(evidence));
  const helperCall=async args=>{
    budget.check(0.2);
    if(evidence.helperCalls.length>=maxHelperInvocations)throw Error('Helper invocation limit reached; take over with caller tools if useful');
    if(budget.remaining<1)throw Error('Shared browser-action limit reached');
    let invocation;
    if(args.resumeToken){const saved=helper.openResume(args.resumeToken,apiKey);invocation={...saved.invocation,
      continuation:saved.continuation,suppliedValues:{...saved.invocation.suppliedValues,...args.values},
      ...(args.context!==undefined?{context:args.context}:{})};}
    else invocation={...task,suppliedValues:{...task.suppliedValues,...args.values},
      ...(args.context!==undefined?{context:args.context}:{})};
    const maxActions=Math.min(budget.remaining,args.maxActions??30);
    invocation.budget={maxActions,maxDecisions:2*maxActions,timeoutMs:Math.max(1,Math.min(120000,deadline-Date.now()))};
    const record={startedAt:new Date().toISOString(),resumed:Boolean(args.resumeToken),
      suppliedValues:args.values??{},context:args.context??null,trace:[]};
    evidence.helperCalls.push(record);await persist();
    let raw;
    try{raw=await helper.runTask(invocation,{apiKey,onEvent:event=>{record.trace.push(event);onEvent(event);}});}
    catch(error){error.unknownCharge=true;throw error;}
    const token=raw.returnReason==='reported_complete'?null:helper.sealResume({invocation,continuation:raw.continuation},apiKey);
    if(token)secrets.add(token);
    const result=helper.summarize(raw,token);record.result=result;record.finishedAt=new Date().toISOString();
    // Save every returned paid result before cost checks, observation or evaluation.
    await persist();budget.addCost(result.jev?.costUsd);evidence.jevCostUsd+=result.jev.costUsd;
    const count=result.actions.filter(a=>a.operation!=='inspect_context'&&a.outcome!=='not_dispatched').length;
    budget.take(count);evidence.helperActions+=count;await persist();return result;
  };
  try{
    budget.check();evidence.initialObservation=await browser(['snapshot']);await persist();
    if(mode==='jev_only'){
      const result=await helperCall({});evidence.finalAssessment={status:result.returnReason==='reported_complete'?'complete':'handoff',helperReturnReason:result.returnReason};
    }else evidence.finalAssessment=await caller({goal:task.intentOrSteps,values:task.suppliedValues,
      initialObservation:evidence.initialObservation,skill:await readGuidance('SKILL.md'),delegated:mode==='caller_with_jev',apiKey,deadline,
      beforeRequest:async body=>{const reservation=callerRequestReserve(body,evidence.callerCalls.at(-1));
        budget.check(reservation.usd);
        evidence.callerCalls.push({startedAt:new Date().toISOString(),reservation,request:structuredClone(body)});await persist();},
      recordCall:async call=>{Object.assign(evidence.callerCalls.at(-1),call);await persist();
        budget.addCost(call.response.usage?.cost);evidence.callerCostUsd+=call.response.usage.cost;await persist();},
      recordTool:async tool=>{evidence.callerTools.push(tool);await persist();},
      dispatch:async(name,args)=>{
        budget.check();if(name==='jev')return helperCall(args);
        if(name==='skill_reference')return {text:await readGuidance(args.path)};
        if(name!=='browser')throw Error('Unknown tool');validateBrowserArgs(args.args);
        if(isGesture(args.args)){budget.take();evidence.callerActions++;}
        return browser(args.args);
      },
    });
  }catch(error){evidence.failure=String(error.message);evidence.unknownCharge=Boolean(error.unknownCharge);
    if(error.budgetStop)evidence.budgetStop=error.budgetStop;
    evidence.finalAssessment??={status:'handoff',explanation:evidence.failure};}
  try{evidence.finalObservation=await browser(['snapshot']);}catch{evidence.finalObservationUnavailable=true;}
  evidence.finishedAt=new Date().toISOString();evidence.elapsedMs=Date.parse(evidence.finishedAt)-Date.parse(evidence.startedAt);
  evidence.totalCostUsd=evidence.unknownCharge?null:budget.cost;
  if(!callerIdentity.costMeasured)evidence.callerCostUsd=null;
  await persist();
  const helperResults=evidence.helperCalls.map(x=>x.result).filter(Boolean);
  return {
    returnReason:mode==='jev_only'?(helperResults[0]?.returnReason??'helper_error'):
      evidence.finalAssessment.status==='complete'?'reported_complete':'handoff',
    observation:evidence.finalObservation,actions:helperResults.flatMap(x=>x.actions??[]),
    jev:{costUsd:evidence.unknownCharge?null:evidence.jevCostUsd,calls:helperResults.reduce((n,x)=>n+(x.jev?.calls??0),0)},
    ...(mode==='jev_only'?{}:{assistance:{kind:mode,model:callerIdentity.name,calls:evidence.callerCalls.length,callUnit:'metered API requests',callerCostMeasured:callerIdentity.costMeasured,
      // Caller decisions remain fully visible. Acceptance alone is not recovery.
      interventionUnit:'caller gesture or additional helper invocation',
      interventions:mode==='caller_only'?0:evidence.callerActions+Math.max(0,evidence.helperCalls.length-1),costUsd:evidence.unknownCharge||!callerIdentity.costMeasured?null:evidence.callerCostUsd,
      promptTokens:!callerIdentity.costMeasured?null:evidence.callerCalls.reduce((n,x)=>n+(x.response?.usage?.prompt_tokens??0),0),
      completionTokens:!callerIdentity.costMeasured?null:evidence.callerCalls.reduce((n,x)=>n+(x.response?.usage?.completion_tokens??0),0)}}),
    callerStudy:redact(evidence),
  };
}
