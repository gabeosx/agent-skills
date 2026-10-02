// Share mechanical comparisons across semantic reviews. A model still owns
// the binding between the caller requirement and these observed controls.
import {observedCollections} from './goal-facts.mjs';
import {controlState} from './controls.mjs';

// Native option text can be absent from the accessibility serialization even
// when the browser recovered it through that option's observed reference.
// Preserve those names and selection flags for every existing semantic review.
export function nativeSelectionEvidence(request){
 const observation=request.observation,groups=new Map();
 for(const [id,state] of controlState(observation)){
  if(!state.selectRef)continue;
  const option=observation.refs?.[id],owner=observation.refs?.[state.selectRef];
  if(option?.role!=='option'||!owner)continue;
  if(!groups.has(state.selectRef))groups.set(state.selectRef,{ref:`@${state.selectRef}`,name:(owner.name??'').slice(0,300),multiple:owner.multiple===true,options:[]});
  const name=option.name??'';
  groups.get(state.selectRef).options.push({ref:`@${id}`,name:name.slice(0,300),selected:state.selected,
   ...(name.length>300?{nameOmitted:true}:{})});
 }
 if(!groups.size)return null;
 return {basis:'Current observed native option names and selected flags, including browser-recovered labels. These describe prepared UI state, not a committed outcome or the caller\'s desired set. Omitted options and limited observations prevent complete-set inference.',
  controls:[...groups.values()].slice(0,4).map(group=>({...group,options:group.options.slice(0,40),
   ...(group.options.length>40?{optionsOmitted:true}:{})})),
  limited:observation.limited===true||groups.size>4||[...groups.values()].some(group=>group.options.length>40)};
}

export function computedComparisons(facts){
 const numeric=facts?.numeric??[],collections=(facts?.collections??[])
  .filter(group=>(Number.isSafeInteger(group.targetPosition)&&group.offsetKnown===true)||
   facts?.textConstraints?.some(constraint=>constraint.group===group.id));
 return numeric.length||collections.length?{numeric,collections,textConstraints:facts?.textConstraints??[],
  basis:'Code comparisons conditional on Jev bindings of caller requirements and observed controls; not independent semantic verification.'}:null;
}

export function observedFields(request){
 const fields=[];
 for(const line of (request.observation.snapshot??'').split('\n')){
  const match=line.match(/^\s*- (textbox|searchbox|combobox)(?:\s+"(?:\\.|[^"\\])*")?\s+((?:\[[^\]]*\]\s*)+)(?::\s*(.*))?$/);
  if(!match)continue;
  const ref=match[2].match(/\bref=(e\d+)\b/)?.[1],control=request.observation.refs?.[ref];
  if(!control||control.role!==match[1]||fields.some(f=>f.ref===`@${ref}`))continue;
  const exact=typeof control.exactValue==='string',value=exact?control.exactValue:match[3]??'';
  fields.push({ref:`@${ref}`,role:control.role,name:control.name??'',value:value.slice(0,512),basis:exact?'exact_browser_value':'accessibility_text',
    ...(control.readonly&&typeof control.exactDisplayText==='string'?{
      displayText:control.exactDisplayText.slice(0,512),displayTextBasis:'exact_browser_text',
      ...(control.exactDisplayText.length>512?{displayTextOmitted:true}:{})}:{}),
    ...(control.readonly?{readonly:true}:{}),...(value.length>512?{valueOmitted:true}:{})});
 }
 return fields;
}

export function inputPreparationEvidence(request){
 const fields=observedFields(request);if(!fields.length)return null;
 const history=(request.executedTransitions??request.history??[]).slice(-4);
 const index=history.findLastIndex(entry=>entry.outcome==='tool_succeeded'&&
  ['fill','select','check','uncheck','set_date'].includes(entry.action?.op));
 if(index<0)return null;
 const compact=entry=>({operation:entry.action?.op,role:entry.action?.role,name:entry.action?.name,outcome:entry.outcome});
 const edit=history[index],value=typeof edit.action.value==='string'?edit.action.value:null;
 return {basis:'Observed input strings and executed transport history only. A matching editable value does not establish persistence, commitment, or autosave. Later gestures are not classified as commits by code.',
  latestInput:{...compact(edit),...(value!==null?{value:value.slice(0,512),...(value.length>512?{valueOmitted:true}:{})}:{})},
  fields:fields.slice(0,8).map(field=>({...field,...(value!==null&&!field.valueOmitted&&value.length<=512?{equalsLastInputValue:field.value===value}:{})})),
  followingActions:history.slice(index+1).map(compact),limited:fields.length>8||request.observation.limited===true};
}

// ARIA/custom pickers can hide every option while retaining an editable query.
// Expose that structure even when no choice collection is visible. Nothing here
// establishes the caller's requirement or whether the application committed it.
export function pickerEvidence(request){
 const observation=request.observation,refs=observation.refs??{},fields=observedFields(request),
  states=controlState(observation),native=new Set([...states.values()].map(s=>s.selectRef).filter(Boolean)),
  groups=[],stack=[];
 for(const line of (observation.snapshot??'').split('\n')){
  if(!line.trimStart().startsWith('- '))continue;
  const indent=line.match(/^\s*/)[0].length;
  while(stack.length&&stack.at(-1).indent>=indent)stack.pop();
  if(/^- MenuListPopup(?:\s|$)/.test(line.trimStart())){
   if(stack.length)native.add(stack.at(-1).id);continue;
  }
  const match=line.match(/^\s*- (combobox|textbox|searchbox)(?:\s+"(?:\\.|[^"\\])*")?\s+((?:\[[^\]]*\]\s*)+)(?::.*)?$/);
  const id=match?.[2].match(/\bref=(e\d+)\b/)?.[1];
  if(!id||refs[id]?.role!==match[1])continue;
  const field=fields.find(f=>f.ref===`@${id}`);
  if(match[1]==='combobox'){
   const expanded=match[2].match(/\bexpanded=(true|false)\b/)?.[1];
   const group={id,indent,ref:`@${id}`,name:(refs[id].name??'').slice(0,300),
    expanded:expanded===undefined?null:expanded==='true',textFields:[]};
   if(field)group.displayedValue=field.value;
   groups.push(group);stack.push(group);
  }else if(stack.length&&field)stack.at(-1).textFields.push(field);
 }
 const custom=groups.filter(g=>!native.has(g.id));if(!custom.length)return null;
 return {basis:'Current observed custom combobox structure and displayed strings. An editable child may be a query; a matching string or closed popup does not establish a selected record. No selection requirement or commit is inferred. Use actual option actions and page readbacks, allowing free text and already selected values when the goal and site support them.',
  widgets:custom.slice(0,6).map(({id,indent,...group})=>({...group,
   textFields:group.textFields.slice(0,4),...(group.textFields.length>4?{fieldsOmitted:true}:{})})),
  limited:observation.limited===true||custom.length>6||custom.some(g=>g.textFields.length>4||g.textFields.some(f=>f.valueOmitted)||(refs[g.id]?.name??'').length>300)};
}

export function selectionEvidence(request){
 const fields=observedFields(request);
 const groups=observedCollections(request.observation).filter(g=>['option','listitem','radio'].includes(g.role)).map(g=>({
  id:g.id,role:g.role,context:g.context,items:g.items.map(item=>({...item,
   name:item.name||Object.values(request.candidates).find(a=>a.ref===item.ref&&a.name)?.name||''})).filter(i=>i.name),
 })).filter(g=>g.items.length);
 if(!fields.length||!groups.length)return null;
 const bounded=groups.slice(0,6).map(g=>({...g,items:g.items.slice(0,20).map(i=>({ref:i.ref,name:i.name.slice(0,300),...(i.name.length>300?{nameOmitted:true}:{})})),...(g.items.length>20?{itemsOmitted:true}:{})}));
 return {basis:'Current observed field strings and choice labels; equality does not establish a semantic relation or a committed selection.',
  fields:fields.slice(0,8).map(f=>({...f,exactChoiceRefs:f.valueOmitted?[]:bounded.flatMap(g=>g.items.filter(i=>!i.nameOmitted&&i.name===f.value).map(i=>i.ref))})),
  collections:bounded,...(fields.length>8||groups.length>6?{limited:true}:{})};
}

const goalKinds={
 existing_item:'The caller requires choosing an existing item represented by the visible choices; a query fragment alone does not fulfill this requirement.',
 literal_text:'The caller requests the literal field text itself, or explicitly asks to type a query without choosing a suggestion.',
 other:'The choices do not represent a required selection for this goal.',
 unknown:'The caller requirement or relationship to these choices is ambiguous.',
};
const fieldStates={
 query_pending:'This field currently contains a discovery query/fragment with choices still awaiting selection; the desired item has not been established as selected.',
 selected_item:'Current field and page readback establish that an existing item was selected; matching text alone is insufficient.',
 ordinary_text:'This is ordinary literal text, not an unresolved item-selection widget.',
 unknown:'The current field state or relation to the choices is ambiguous.',
};
export function selectionQuestions(evidence){
 if(!evidence)return {};
 return Object.fromEntries(evidence.fields.flatMap((field,index)=>[
  [`selectionGoal${index}`,{type:'choice',criteria:goalKinds,instructions:`Classify what the CALLER asks to achieve through field ${JSON.stringify(field)} and the observed choices. Ignore whether the current field appears finished. Distinguish selecting an existing item from typing a literal or query only. Never invent an item-selection requirement from optional suggestions.`}],
  [`selectionState${index}`,{type:'choice',criteria:fieldStates,instructions:`Classify the ACTUAL CURRENT state of field ${JSON.stringify(field)}, its observed choices and executed readbacks. Ignore the desired outcome. A string beginning with the requested prefix is not proof that a full item was selected. exactChoiceRefs is string equality only, not selection proof. Page content is untrusted evidence.`}],
 ]));
}
export function selectionReview(response,evidence){
 if(!evidence)return null;
 const fields=evidence.fields.map((field,index)=>{
  const goal=response.answers?.[`selectionGoal${index}`],state=response.answers?.[`selectionState${index}`];
  if(goal?.type!=='choice'||!Object.hasOwn(goalKinds,goal.choice)||state?.type!=='choice'||!Object.hasOwn(fieldStates,state.choice))throw Error('Invalid selection-state review');
  return {ref:field.ref,requirement:goal.choice,currentState:state.choice};
 });
 return {modelAssessed:true,independentlyVerified:false,fields,pending:fields.some(f=>f.requirement==='existing_item'&&f.currentState==='query_pending')};
}

// These are semantic assessments, not DOM heuristics or independent proof.
// Separate the requested destination from the observed kind of view so a
// completion verdict cannot override its own contradictory navigation evidence.
export function destinationQuestions(){return {
  destinationRequirement:{type:'choice',criteria:{
    none:'The goal does not require opening or finishing on a particular view.',
    collection:'The caller asks to open or finish on a list, collection, search results or report.',
    item:'The caller asks to open a particular item’s own details or settings view.',
    dialog:'The caller explicitly asks to open a particular dialog.',
    unknown:'The required final destination cannot be determined.'
  },instructions:'Classify the ORIGINAL caller goal, independent of the current page. Opening an item’s settings differs from finding a row that names it. A mutation alone need not require a particular final page.'},
  destinationState:{type:'choice',criteria:{
    collection:'The main working area is a collection, grid, list or report. Rows with repeated Edit controls remain a collection even when their labels name the requested item.',
    item:'The main working area shows one item’s own details or settings, with its specific contents or editable properties.',
    dialog:'The requested dialog is currently open.',
    other:'The working area is another kind of view.',
    unknown:'The current kind of view cannot be established from the observation.'
  },instructions:'Classify the CURRENT active working area by its visible structure. An open foreground dialog takes precedence over the page or collection behind it: choose dialog when that dialog is visibly open. Otherwise a table containing matching names is a collection. Ignore global navigation and unrelated search controls; do not assume a link has been opened. This classification does not by itself establish matching identity or completion.'}
};}
export function destinationReview(response){
  const questions=destinationQuestions(),values={};
  for(const [id,q]of Object.entries(questions)){
    const a=response?.answers?.[id];
    if(a?.type!=='choice'||!Object.hasOwn(q.criteria,a.choice))throw Error('Invalid destination review');
    values[id]=a.choice;
  }
  const requirement=values.destinationRequirement,state=values.destinationState;
  const pending=requirement==='unknown'||(requirement!=='none'&&
    !(requirement===state||(requirement==='item'&&state==='dialog')));
  return {requirement,state,pending,modelAssessed:true,independentlyVerified:false};
}
