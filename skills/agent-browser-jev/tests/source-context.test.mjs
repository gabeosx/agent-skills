import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceContext,historicalReadback,observedTransitionEvidence} from '../scripts/source-context.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';
const request=(snapshot='Collection',history=[],stepIndex=0)=>({binding:'bound',sessionId:'session',stepIndex,intent:'Enable alerts while viewing the invoice details.',observation:{snapshot},history,candidates:{handoff:{op:'handoff'}}});
function accept(context,answers){return context.accept({answers:Object.fromEntries(Object.entries(answers).map(([id,choice])=>[id,{type:'choice',choice,confidence:0.8}]))});}
function requirement(context,r,phase='at_effect'){
 const query=context.prepare(r);assert.deepEqual(query.state,{intent:r.intent});
 accept(context,{source:'page_condition',evidence:'s0'});context.prepare(r);
 accept(context,{source:'detail',phase});
}
function observe(context,r,match,progress='pending'){assert.ok(context.prepare(r));accept(context,{pageKind:match==='matches'?'detail':'collection',context:match,progress});}
const executed=(before,after,op='click')=>({outcome:'tool_succeeded',action:{op,name:'Enable alerts'},before:{snapshot:before},after:{snapshot:after}});
test('large readbacks preserve complete boundary and executed-control lines within a marked bound',()=>{
 const snapshot=['Page heading',...Array.from({length:180},(_,i)=>`- link "Entry ${i}" [ref=e${i}]`),'- button "Enable alerts" [ref=e999]',...Array.from({length:180},(_,i)=>`- text "Other ${i}"`),'Footer'].join('\n');
 const readback=historicalReadback(snapshot,{name:'Enable alerts'});
 assert.equal(readback.limited,true);assert.ok(readback.snapshot.length<=2400);
 assert.ok(readback.snapshot.includes('Page heading'));assert.ok(readback.snapshot.includes('Footer'));
 assert.ok(readback.snapshot.includes('- button "Enable alerts" [ref=e999]'));
 for(const line of readback.snapshot.split('\n'))assert.ok(snapshot.split('\n').includes(line)||line==='[history lines omitted]');
 const history=observedTransitionEvidence({executedTransitions:Array.from({length:4},()=>executed(snapshot,snapshot))});
 assert.ok(JSON.stringify(history).length<22000);assert.ok(history.every(entry=>entry.limited));
 assert.equal(historicalReadback('x'.repeat(30000)).snapshot,'[history lines omitted]');
});
test('explicit requirement carries an exact caller span and timing, without page text in goal classification',()=>{
 const c=createSourceContext(),r=request();requirement(c,r);observe(c,r,'mismatch');
 const result=c.evaluate(r);assert.equal(result.facts.sourcePageMismatch,true);
 assert.equal(result.facts.requirement.sourceSpan.text,r.intent);assert.equal(result.facts.timing,'at_effect');
 assert.equal(result.intent,r.intent,'semantic mismatch must not replace the caller goal');assert.equal(c.prepare(r),null);
});
test('visiting then leaving the required page does not satisfy an at-effect condition',()=>{
 const c=createSourceContext(),r=request();requirement(c,r);
 const detail=request('Invoice details');observe(c,detail,'matches');
 assert.equal(c.evaluate(detail).facts.priorVisitObserved,true);
 const left=request('Collection',[executed('Invoice details','Collection')]);
 assert.equal(c.evaluate(left).facts.currentEvidenceFresh,false);observe(c,left,'mismatch');
 assert.equal(c.evaluate(left).facts.sourcePageMismatch,true);assert.equal(c.evaluate(left).facts.effectAssessed,false);
});
test('an observed contextual commit can move to confirmation without imposing the source as final screen',()=>{
 const c=createSourceContext(),r=request('Invoice details');requirement(c,r);observe(c,r,'matches');
 const after=request('Alerts enabled',[executed('Invoice details','Alerts enabled')]);observe(c,after,'mismatch','effect_observed');
 assert.equal(c.evaluate(after).facts.effectAssessed,true);assert.equal(c.evaluate(after).facts.sourcePageMismatch,false);
 const step=request('Alerts enabled',[],1);assert.ok(c.prepare(step));assert.equal(c.evaluate(step).facts.effectAssessed,false);
});
test('before-effect visits and final-state conditions have different lifetimes',()=>{
 for(const phase of ['before_effect','final_state']){
  const c=createSourceContext(),r=request('Invoice details');requirement(c,r,phase);observe(c,r,'matches');
  const next=request('Collection',[executed('Invoice details','Collection')]);observe(c,next,'mismatch','effect_observed');
  assert.equal(c.evaluate(next).facts.sourcePageMismatch,phase==='final_state');
  if(phase==='final_state')assert.equal(c.evaluate(next).intent,next.intent,'final-screen condition does not block work elsewhere');
 }
});
test('unknown, unrepresented and contradictory interpretations never manufacture a resolved constraint',()=>{
 for(const [kind,phase] of [['other','unknown'],['detail','none']]){
  const c=createSourceContext(),r=request();c.prepare(r);accept(c,{source:'page_condition',evidence:'unknown'});c.prepare(r);accept(c,{source:kind,phase});
  observe(c,r,'mismatch');const result=c.evaluate(r);assert.equal(result.facts.requirement.uncertain,true);assert.equal(result.facts.sourcePageMismatch,false);
 }
 const c=createSourceContext(),r=request();c.prepare(r);accept(c,{source:'unconstrained',phase:'none',evidence:'unknown'});assert.equal(c.prepare(r),null);assert.equal(c.evaluate(r).hasRequirement,false);
});
test('a claimed effect without executed readback cannot retire the contextual requirement',()=>{
 const c=createSourceContext(),r=request();requirement(c,r);observe(c,r,'mismatch','effect_observed');
 assert.equal(c.evaluate(r).facts.effectAssessed,false);assert.equal(c.evaluate(r).facts.sourcePageMismatch,true);
 const changedHistory=request('Collection',[{action:{op:'click'},outcome:'unknown'}]);assert.ok(c.prepare(changedHistory));
});
test('malformed requirement decisions preserve charge and cannot silently become a browser action',async()=>{
 const api={alpha:{decisions:{create:async()=>({answers:{source:{type:'choice',choice:'invented'}},usage:{cost:0.02}})}}};
 await assert.rejects(jevDecider(api)(request()),error=>error.decisionCost===0.02);
});


test('a contextual match cannot contradict the observed page kind or retire a wrong-source effect',()=>{
 const c=createSourceContext(),r=request('Invoice list');requirement(c,r);c.prepare(r);accept(c,{pageKind:'collection',context:'matches',progress:'pending'});
 assert.equal(c.evaluate(r).facts.currentContext,'mismatch');
 const after=request('Invoice list: alerts enabled',[executed('Invoice list','Invoice list: alerts enabled')]);c.prepare(after);accept(c,{pageKind:'collection',context:'matches',progress:'effect_observed'});
 assert.equal(c.evaluate(after).facts.effectAssessed,false);assert.equal(c.evaluate(after).facts.sourcePageMismatch,true);
});

test('retained visits do not duplicate transition history, and retained effect evidence keeps only its supporting readback',()=>{
 const c=createSourceContext(),detail='Invoice details';const r=request(detail);requirement(c,r);observe(c,r,'matches');
 const history=[executed('Collection',detail),executed(detail,'Alerts enabled')];
 const saved=request('Alerts enabled',history);observe(c,saved,'mismatch','effect_observed');
 const next=request('Confirmation',history);const query=c.prepare(next);
 assert.equal(query.state.priorVisit.history,undefined);
 assert.equal(query.state.effect.history.length,1);
 assert.equal(query.state.effect.history[0].after,'Alerts enabled');
 assert.equal(query.state.history.length,2);
});

test('qualified target requirements stay available for action preflight without a whole-page veto',()=>{
 const c=createSourceContext(),r={...request('Mixed collection'),intent:'Star all entries by Kai in the archive.'};
 c.prepare(r);accept(c,{source:'qualified_target',phase:'at_effect',evidence:'s0'});
 assert.equal(c.prepare(r),null);assert.equal(c.evaluate(r).hasRequirement,true);
 assert.equal(c.evaluate(r).facts.requirement.kind,'qualified_target');
 assert.equal(c.evaluate(r).facts.currentEvidenceFresh,false);
});

test('page kind and timing cannot be selected before establishing an explicit page-condition shape',()=>{
 const c=createSourceContext(),r={...request(),intent:'Open the named archive record and edit it.'};
 const query=c.prepare(r);assert.equal(query.questions.phase,undefined);assert.equal(query.questions.source.criteria.collection,undefined);
 accept(c,{source:'unconstrained'});assert.equal(c.prepare(r),null);assert.equal(c.evaluate(r).hasRequirement,false);
 const next={...r,stepIndex:1,intent:'Edit the record while viewing its detail page.'};c.prepare(next);accept(c,{source:'page_condition'});
 const scoped=c.prepare(next);assert.ok(scoped.questions.phase);assert.ok(scoped.questions.source.criteria.detail);
 assert.equal(scoped.state.explicitConditionSpan.text,next.intent);
});
