import test from 'node:test';
import assert from 'node:assert/strict';
import {goalLiterals,observedCollections,createGoalGrounder} from '../scripts/goal-facts.mjs';
import {act} from '../scripts/jev-browser.mjs';
import {randomUUID} from 'node:crypto';
function bind(grounder,request,select){
 const assessment=grounder.prepare(request);if(!assessment)return;
 grounder.accept({answers:Object.fromEntries(Object.entries(assessment.questions).map(([id,q])=>[id,{type:'choice',choice:select(q,assessment.state)}]))});
}
function slider(value,goal='Set Quality to minus two, then Submit.'){
 return {intent:goal,scope:'Test',observation:{snapshot:'- slider "Quality" [ref=e1]',refs:{e1:{role:'slider',name:'Quality'}}},candidates:{
 left:{ref:'@e1',name:'Quality',purpose:'adjust_slider',op:'press',key:'ArrowLeft',currentValue:value},
 right:{ref:'@e1',name:'Quality',purpose:'adjust_slider',op:'press',key:'ArrowRight',currentValue:value},
 submit:{ref:'@e2',name:'Submit',role:'button',op:'click'},step_complete:{op:'step_complete'},handoff:{op:'handoff'}}};
}
const numericBinding=q=>q.instructions.includes('relationship')?'equal':q.instructions.includes('target value')?'n0':q.instructions.includes('observed control')?'commit':'none';
test('extracts signed decimal and spelled ordinal literals without evaluating a task template',()=>{
 assert.deepEqual(goalLiterals('Set A to -2.5, B to minus two; select the sixth item.').numbers.map(x=>x.value),[-2.5,-2,6]);
});
test('exact comparison advises on a negative slider without turning semantic bindings into authorization',()=>{
 const g=createGoalGrounder(),r=slider(-5);bind(g,r,numericBinding);
 assert.deepEqual(g.evaluate(r).candidates,r.candidates);assert.equal(g.evaluate(r).facts.numeric[0].satisfied,false);
 const next=slider(-2);bind(g,next,numericBinding);const reached=g.evaluate(next);assert.deepEqual(reached.candidates,slider(-2).candidates);
 assert.equal(reached.facts.numeric[0].satisfied,true);
});
test('unrelated numeric literals do not impose a numeric target',()=>{
 const g=createGoalGrounder(),r=slider(8,'Choose the second checkbox; leave Quality unchanged.');
 bind(g,r,q=>q.instructions.includes('observed control')?'other':'none');
 assert.deepEqual(g.evaluate(r).candidates,r.candidates);
});
function page(labels,nav='Next'){
 const refs={},candidates={step_complete:{op:'step_complete'},handoff:{op:'handoff'}};
 const lines=['- generic','  - generic'];
 labels.forEach((name,i)=>{const ref=`e${i+1}`;refs[ref]={role:'link',name};lines.push(`    - link "${name}" [ref=${ref}]`);candidates[ref]={op:'click',ref:`@${ref}`,role:'link',name};});
 refs.e20={role:'link',name:nav};lines.push('  - list',`    - link "${nav}" [ref=e20]`);candidates.nav={op:'click',ref:'@e20',role:'link',name:nav};
 return {intent:'Choose the sixth result.',scope:'Test',observation:{snapshot:lines.join('\n'),refs},candidates};
}
const ordinalBinding=q=>q.instructions.includes('literal in goal specifies')?'n0':q.instructions.includes('Which observed collection')?'g0':q.instructions.includes('observed control')?(q.instructions.includes('Next')?'next':'other'):'none';
test('counts observed content across pages and keeps navigation outside that collection',()=>{
 const g=createGoalGrounder(),a=page(['A','B','C']);assert.equal(observedCollections(a.observation).length,2);
 bind(g,a,ordinalBinding);let result=g.evaluate(a);assert.deepEqual(result.candidates,a.candidates);assert.equal(result.facts.collections[0].targetLocation,'after_page');
 g.record(a.candidates.nav,result.classes);
 const b=page(['D','E','F']);bind(g,b,ordinalBinding);result=g.evaluate(b);
 assert.deepEqual(result.facts.collections[0].items.map(x=>x.position),[4,5,6]);
 assert.deepEqual(result.candidates,b.candidates);assert.equal(result.facts.collections[0].targetPosition,6);
});
test('truncated observations do not claim exact global positions',()=>{
 const g=createGoalGrounder(),r=page(['A','B','C']);r.observation.limited=true;bind(g,r,ordinalBinding);
 assert.equal(g.evaluate(r).facts.collections[0].offsetKnown,false);
});
test('computes combined prefix and suffix matches while preserving authorized alternatives',()=>{
 const g=createGoalGrounder(),r={intent:'Choose an item beginning with "North" and ending with "Co".',scope:'Test',observation:{snapshot:'- listbox\n  - option "North Bay" [ref=e1]\n  - option "North Co" [ref=e2]',refs:{e1:{role:'option',name:'North Bay'},e2:{role:'option',name:'North Co'}}},candidates:{a:{op:'click',ref:'@e1'},b:{op:'click',ref:'@e2'},handoff:{op:'handoff'}}};
 bind(g,r,q=>q.instructions.includes('one item')?'single':q.instructions.includes('literal \"North\"')?'prefix':'suffix');
 const evaluated=g.evaluate(r);assert.deepEqual(evaluated.candidates,r.candidates);assert.deepEqual(evaluated.facts.collections[0].items.map(x=>x.matches),[false,true]);
});
test('any qualifying item is distinct from a particular requested item, without removing alternatives',()=>{
 for(const policy of ['single','any_single','unknown']){
  const g=createGoalGrounder(),r={intent:'Enter an item starting with "Ar".',observation:{snapshot:'- listbox\n  - option "Arbor" [ref=e1]\n  - option "Arden" [ref=e2]\n  - option "Birch" [ref=e3]',refs:{e1:{role:'option',name:'Arbor'},e2:{role:'option',name:'Arden'},e3:{role:'option',name:'Birch'}}},candidates:{a:{op:'click',ref:'@e1'},b:{op:'click',ref:'@e2'},c:{op:'click',ref:'@e3'}}};
  bind(g,r,q=>q.instructions.includes('one item')?policy:'prefix');const result=g.evaluate(r);
  assert.deepEqual(result.candidates,r.candidates);
  if(policy==='unknown')assert.deepEqual(result.facts.collections,[]);
  else{assert.deepEqual(result.facts.collections[0].items.map(i=>i.matches),[true,true,false]);assert.equal(result.facts.collections[0].choicePolicy,policy==='single'?'specific_item':'any_matching');}
 }
});
test('assessment requests consume decision budget and charges without executing a gesture',async()=>{
 let calls=0;const r=await act({browser:{sessionId:randomUUID(),observe:async()=>({snapshot:'- button "Save" [ref=e1]',refs:{e1:{role:'button',name:'Save'}}}),execute:async()=>calls++},intentOrSteps:'Prepare form',scope:'Test',authorize:()=>true,budget:{maxDecisions:2},decide:async request=>({binding:request.binding,assessment:true,cost:0.01})});
 assert.equal(r.returnReason,'decision_budget');assert.equal(r.decisions.length,2);assert.equal(calls,0);
 assert.ok(r.decisions.every(d=>d.op==='goal_assessment'&&d.cost===0.01));
});
test('numbered labels and digits inside identifiers do not become position requirements',()=>{
 for(const intent of ['Click button ONE, then click button TWO.','Select mT4dZFt and q8tqel8.','Choose item abc1st.']){
  const g=createGoalGrounder(),r=page(['ONE','TWO']);r.intent=intent;
  assert.equal(g.prepare(r),null);assert.deepEqual(g.evaluate(r).candidates,r.candidates);
 }
 assert.deepEqual(goalLiterals('Select mT4dZFt and q8tqel8.').numbers,[]);
});
test('native select constraints resolve the selected option under its observed parent',()=>{
 const g=createGoalGrounder(),r={intent:'Choose the item starting with "North".',observation:{snapshot:'- listbox "Region" [ref=e1]\n  - option "South" [ref=e2]\n  - option "North Co" [ref=e3]',refs:{e1:{role:'listbox',name:'Region'},e2:{role:'option',name:'South'},e3:{role:'option',name:'North Co'}}},candidates:{a:{op:'select',ref:'@e1',option:'South'},b:{op:'select',ref:'@e1',option:'North Co'},handoff:{op:'handoff'}}};
 bind(g,r,q=>q.instructions.includes('one item')?'single':'prefix');const evaluated=g.evaluate(r);assert.deepEqual(evaluated.candidates,r.candidates);assert.deepEqual(evaluated.facts.collections[0].items.map(x=>x.matches),[false,true]);
});
test('multiple requested labels are not combined into one impossible exact match',()=>{
 const g=createGoalGrounder(),r={intent:'Select "North" and "South".',observation:{snapshot:'- listbox\n  - option "North" [ref=e1]\n  - option "South" [ref=e2]',refs:{e1:{role:'option',name:'North'},e2:{role:'option',name:'South'}}},candidates:{a:{op:'click',ref:'@e1'},b:{op:'click',ref:'@e2'},handoff:{op:'handoff'}}};
 bind(g,r,q=>q.instructions.includes('one item')?'multiple':'exact');assert.deepEqual(g.evaluate(r).candidates,r.candidates);
});
test('a nonmatching parent remains observable as a route to matching descendants',()=>{
 const g=createGoalGrounder(),r={intent:'Choose "Earlier".',observation:{snapshot:'- menu\n  - menuitem "History" [ref=e1]',refs:{e1:{role:'menuitem',name:'History',menuParent:true}}},candidates:{click:{op:'click',ref:'@e1',name:'History',hasSubmenu:true},hover:{op:'hover',ref:'@e1',name:'History'},handoff:{op:'handoff'}}};
 bind(g,r,q=>q.instructions.includes('one item')?'single':'exact');const result=g.evaluate(r);
 assert.equal(result.facts.collections[0].items[0].childNavigation,'hover');assert.ok(result.candidates.hover);assert.ok(result.candidates.click,'advisory classification cannot erase an authorized alternative');
});
test('a new caller step clears semantic bindings even when its text is identical',()=>{
 const g=createGoalGrounder(),r=slider(2);r.stepIndex=0;bind(g,r,numericBinding);assert.equal(g.prepare(r),null);
 assert.ok(g.prepare({...r,stepIndex:1}));
});
test('flat top-level controls still form a collection without an explicit container',()=>{
 const g=createGoalGrounder(),r={intent:'Enable the second checkbox.',observation:{snapshot:'- checkbox "Audit" [ref=e1]\n- checkbox "Details" [ref=e2]',refs:{e1:{role:'checkbox',name:'Audit'},e2:{role:'checkbox',name:'Details'}}},candidates:{a:{op:'check',ref:'@e1'},b:{op:'check',ref:'@e2'},handoff:{op:'handoff'}}};
 bind(g,r,q=>q.instructions.includes('Which observed collection')?'g0':'n0');
 const result=g.evaluate(r);assert.deepEqual(result.candidates,r.candidates);assert.equal(result.facts.collections[0].targetPosition,2);
});
test('unequal page sizes contribute their observed item counts, not a fixed page width',()=>{
 const g=createGoalGrounder(),a=page(['A','B']);a.intent='Choose the fifth result.';bind(g,a,ordinalBinding);let result=g.evaluate(a);g.record(a.candidates.nav,result.classes);
 const b=page(['C','D','E','F']);b.intent=a.intent;bind(g,b,ordinalBinding);result=g.evaluate(b);
 assert.deepEqual(result.facts.collections[0].items.map(x=>x.position),[3,4,5,6]);assert.deepEqual(result.candidates,b.candidates);assert.equal(result.facts.collections[0].targetPosition,5);
});
test('computed position facts say when a target lies after or within a page',()=>{
 const g=createGoalGrounder(),a=page(['A','B','C']);bind(g,a,ordinalBinding);let r=g.evaluate(a);assert.equal(r.facts.collections[0].targetLocation,'after_page');g.record(a.candidates.nav,r.classes);
 const b=page(['D','E','F']);bind(g,b,ordinalBinding);r=g.evaluate(b);assert.equal(r.facts.collections[0].targetLocation,'visible');
});
test('an item named Next in the requested content collection is not navigation',()=>{
 const g=createGoalGrounder(),a=page(['A','Next']);a.intent='Choose the second result.';bind(g,a,ordinalBinding);const r=g.evaluate(a);
 assert.equal(r.classes['@e2'],'other');assert.ok(r.candidates.e2);
});

test('changed evidence invalidates semantic bindings even when the browser reuses refs and labels',()=>{
 const g=createGoalGrounder(),r=slider(4);bind(g,r,numericBinding);assert.equal(g.evaluate(r).facts.numeric[0].target,-2);
 const other={...r,observation:{...r.observation,snapshot:'Unrelated form\n- slider "Quality" [ref=e1]'}};
 assert.deepEqual(g.evaluate(other).facts.numeric,[]);assert.ok(g.prepare(other));
});
test('unknown model interpretations cannot remove choices or assert a numeric fact',()=>{
 const g=createGoalGrounder(),r=slider(8,'Set Quality to one billion.');
 bind(g,r,()=> 'unknown');const evaluated=g.evaluate(r);
 assert.deepEqual(evaluated.candidates,r.candidates);assert.deepEqual(evaluated.facts.numeric,[]);
 assert.equal(evaluated.facts.unrepresented[0].text,'one billion');assert.ok(evaluated.facts.uncertain.length);
});
test('high-confidence semantic errors remain advisory and cannot prune the authorized frontier',()=>{
 const g=createGoalGrounder(),r=slider(8,'Leave Quality unchanged; item 2 is the target.');
 bind(g,r,numericBinding);const evaluated=g.evaluate(r);
 assert.deepEqual(evaluated.candidates,r.candidates);assert.equal(evaluated.facts.independentlyVerified,false);
 const fact=evaluated.facts.numeric[0];assert.equal(r.intent.slice(fact.sourceSpan.start,fact.sourceSpan.end),'2');
});
test('an unsupported text relation is unknown, not a fabricated exact or substring match',()=>{
 const g=createGoalGrounder(),r={intent:'Choose a name rhyming with "Blue".',observation:{snapshot:'- listbox\n  - option "True" [ref=e1]',refs:{e1:{role:'option',name:'True'}}},candidates:{a:{op:'click',ref:'@e1'},handoff:{op:'handoff'}}};
 bind(g,r,q=>q.instructions.includes('one item')?'single':'unknown');const result=g.evaluate(r);
 assert.deepEqual(result.candidates,r.candidates);assert.deepEqual(result.facts.textConstraints,[]);assert.equal(result.facts.uncertain[0].kind,'text');
});
