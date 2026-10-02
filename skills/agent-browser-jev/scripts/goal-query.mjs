// The model selects a span; code copies that exact caller text. This facility is
// limited to discovering existing information, never composing a final value.
export function queryWords(intent){
  return [...intent.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’_\/-]*(?:\.[\p{L}\p{N}'’_\/-]+)*/gu)]
    .map(match=>({text:match[0],start:match.index,end:match.index+match[0].length}));
}
export function emptyObservedSearch(request,field){
  if(field.role!=='searchbox'||!/^@e\d+$/.test(field.ref??''))return false;
  const line=(request.observation.snapshot??'').split('\n').find(line=>
    /^\s*- searchbox\b/.test(line)&&new RegExp(`\\bref=${field.ref.slice(1)}\\b`).test(line));
  if(!line)return false;
  const match=line.match(new RegExp(`\\bref=${field.ref.slice(1)}\\b[^\\]]*\\](?:\\s*\\[[^\\]]*\\])*(?::\\s*(.*))?\\s*$`));
  return Boolean(match)&&!(match[1]??'').trim();
}

export function goalQueryRequest(request,field){
  const words=queryWords(request.intent);if(!words.length||words.length>160)return null;
  const boundaries={unknown:'No unambiguous exact caller-text span is established.',
    ...Object.fromEntries(words.map((word,i)=>[`w${i}`,`${i}: ${word.text} (context: ${words.slice(Math.max(0,i-2),i+3).map(w=>w.text).join(' ')})`]))};
  return {state:{intent:request.intent,authorizedScope:request.scope,callerContext:request.context,
    observation:request.observation.snapshot,observationLimited:request.observation.limited===true,
    field,suppliedValues:request.suppliedValues,words},questions:{
    queryUse:{type:'choice',criteria:{
      discovery:'This field searches or filters EXISTING information, and a short exact span already in the caller goal identifies what to discover. Entering it is justified toward the goal.',
      final_value:'This field needs content to create, post, save, send, or set as a final value, rather than a query to find existing information. Do not derive this value here.',
      unknown:'The field purpose or a useful exact query is not established. Return the original missing-input boundary.',
    },instructions:'Classify this particular observed field. Only an exact caller-text search query is eligible. A task identifier, instruction verb, unrelated clause or arbitrary page text is not a query. Do not derive user facts, credentials, final content, messages or form answers.'},
    queryStart:{type:'choice',criteria:boundaries,instructions:'Choose the FIRST indexed word of the shortest useful exact caller-text search query for this field. Choose unknown if this is not a discovery field or no unambiguous contiguous span identifies the target. Select the specific identifying name or topic. Exclude surrounding task verbs and generic words that merely describe the kind of object being sought. Do not select the whole instruction.'},
  }};
}

// End selection is conditional on an already chosen start. The model chooses
// among complete exact strings, so independent endpoint answers cannot silently
// combine different entities into one broad query.
export function goalQuerySpanRequest(request,field,anchor){
  const words=queryWords(request.intent),first=words.find(word=>word.start===anchor);
  if(!first)return null;
  const criteria={unknown:'No useful exact entity/name/topic span begins here; do not invent a query.'};
  words.forEach((word,index)=>{
    if(word.start>=anchor&&word.end-anchor<=160)criteria[`w${index}`]=JSON.stringify(request.intent.slice(anchor,word.end));
  });
  return {state:{intent:request.intent,authorizedScope:request.scope,callerContext:request.context,
    observation:request.observation.snapshot,observationLimited:request.observation.limited===true,
    field,suppliedValues:request.suppliedValues,queryAnchor:{start:anchor,text:first.text}},
    questions:{querySpan:{type:'choice',criteria,instructions:'Choose the shortest complete exact identifying name or topic suitable for this observed discovery field. Each choice starts at the previously selected word; select the whole literal query, not an independent endpoint. Keep multiword names intact. Exclude later instructions, ownership/filter clauses and final content that describe the requested outcome instead of this one query. Select unknown if these strings are not useful discovery queries. No rewriting or invented final content.'}}};
}
export function acceptGoalQuery(response,request,field,payload){
  const selected={};
  for(const [id,question] of Object.entries(payload.questions)){
    const answer=response?.answers?.[id];
    if(answer?.type!=='choice'||!Object.hasOwn(question.criteria,answer.choice))throw new Error('Invalid goal-query assessment');
    selected[id]=answer.choice;
  }
  const words=queryWords(request.intent);
  if(payload.questions.querySpan){
    if(selected.querySpan==='unknown')return null;
    const first=words.find(word=>word.start===payload.state.queryAnchor.start),last=words[Number(selected.querySpan.slice(1))];
    if(!first||!last||last.start<first.start||last.end-first.start>160)return null;
    return {ref:field.ref,start:first.start,end:last.end};
  }
  if(selected.queryUse!=='discovery'||selected.queryStart==='unknown')return null;
  const first=words[Number(selected.queryStart.slice(1))];
  return first?{anchor:first.start}:null;
}

export function groundedQueryAction(intent,candidates,span){
  if(!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<0||
    span.end<=span.start||span.end>intent.length||span.end-span.start>160)return null;
  const words=queryWords(intent);
  if(!words.some(word=>word.start===span.start)||!words.some(word=>word.end===span.end))return null;
  const field=Object.values(candidates).find(action=>action.op==='request_input'&&action.ref===span.ref&&['textbox','searchbox','combobox'].includes(action.role));
  if(!field)return null;
  const value=intent.slice(span.start,span.end);
  if(Object.values(candidates).some(action=>action.op==='fill'&&action.ref===span.ref&&action.value===value))return null;
  return {op:'fill',ref:field.ref,role:field.role,name:field.name,value,
    source:'caller_goal_query',callerSpan:{start:span.start,end:span.end},modelAssessed:true};
}
