import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../scripts/run.mjs';
import {objectObservations} from '../scripts/object-context.mjs';

test('caller handoff preserves bounded historical ownership and icon meaning without changing execution state',()=>{
 const before=objectObservations({snapshot:'- article\n  - heading "Arden" [ref=e1]\n  - image [ref=e2] clickable',refs:{e1:{role:'heading',name:'Arden'},e2:{role:'image',name:''}}})[0];
 const entry={stepIndex:1,action:{op:'click',name:'',role:'image',ref:'@e2',observedIcon:{class:'trash',sourceFile:'trash.svg'}},outcome:'tool_succeeded',before,after:{snapshot:'- heading "Messages"'}};
 const handoff={stepIndex:1,reason:'handoff',lastAction:{operation:'click',target:'',outcome:'tool_succeeded'}};
 const raw={handoff,actions:[{...entry,stepIndex:0},entry,entry,entry],decisions:[],returnReason:'handoff'};
 const original=structuredClone(raw);const result=summarize(raw,null);
 assert.deepEqual(raw,original);assert.equal(result.handoff.lastAction.target,'image');
 assert.equal(result.actions.at(-1).observedIconBefore.class,'trash');
 const evidence=result.handoff.recentEvidence;
 assert.equal(evidence.historical,true);assert.equal(evidence.transitions.length,2);
 assert.match(evidence.references,/Do not replay/);
 assert.ok(evidence.transitions[0].targetObjectsBefore.path.some(object=>object.headings.includes('Arden')));
 assert.ok(evidence.transitions[0].before.snapshot.includes('ref=e2'));
 assert.equal(evidence.transitions[0].after.snapshot,'- heading "Messages"');
});

test('unknown readback remains absent and large historical snapshots carry explicit omission flags',()=>{
 const snapshot=Array.from({length:300},(_,i)=>`- StaticText "Line ${i} ${'x'.repeat(100)}"`).join('\n');
 const result=summarize({returnReason:'action_outcome_unknown',handoff:{stepIndex:0,lastAction:{target:'Save'}},
  actions:[{stepIndex:0,action:{op:'click',name:'Save',role:'button'},before:{snapshot},outcome:'unknown'}],decisions:[]},null);
 const transition=result.handoff.recentEvidence.transitions[0];
 assert.equal(transition.after,null);assert.equal(transition.before.limited,true);
 assert.ok(transition.before.snapshot.length<2400);assert.equal(transition.outcome,'unknown');
 assert.equal(summarize({returnReason:'reported_complete',actions:[],decisions:[]},null).handoff,undefined);
});
