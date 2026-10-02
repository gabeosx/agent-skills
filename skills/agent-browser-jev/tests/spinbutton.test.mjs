import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverActions} from '../scripts/controls.mjs';
import {createGoalGrounder} from '../scripts/goal-facts.mjs';
const spin=(value,flags='')=>({snapshot:`- spinbutton "Amount" [${flags}ref=e1]: ${value}`,refs:{e1:{role:'spinbutton',name:'Amount'}}});
test('numeric spinbuttons offer standard steps with current readback, without assuming step size',()=>{
 for(const value of ['0','-3','1.5']){
  const actions=discoverActions(spin(value),{},'Set Amount to two.').filter(a=>a.purpose==='adjust_numeric');
  assert.deepEqual(actions.map(a=>a.key),['ArrowUp','ArrowDown']);assert.ok(actions.every(a=>a.ref==='@e1'&&a.currentValue===Number(value)));
 }
 for(const [value,flags] of [['unknown',''],['0','disabled, '],['0','readonly, ']])assert.equal(discoverActions(spin(value,flags)).some(a=>a.purpose==='adjust_numeric'),false);
 const readonly=spin('0');readonly.refs.e1.readonly=true;assert.equal(discoverActions(readonly).some(a=>a.purpose==='adjust_numeric'),false);
});
test('native date parts do not acquire standalone numeric steps, even without a supplied date',()=>{
 const observation={snapshot:'- Date "Start"\n  - spinbutton "Month" [ref=e1]: 1\n  - spinbutton "Day" [ref=e2]: 2\n  - spinbutton "Year" [ref=e3]: 2026',refs:Object.fromEntries(['Month','Day','Year'].map((name,i)=>[`e${i+1}`,{role:'spinbutton',name}]))};
 assert.equal(discoverActions(observation,{},'Set the date.').some(a=>a.purpose==='adjust_numeric'),false);
 assert.equal(discoverActions(observation,{date:'2027-04-05'}).filter(a=>a.op==='set_date').length,1);
});
test('Jev binds a caller target to a native spinbutton while code compares fresh values',()=>{
 const g=createGoalGrounder(),observation=spin('-1.5');
 const r={intent:'Set Amount to minus two.',observation,candidates:Object.fromEntries(discoverActions(observation).map((a,i)=>[`c${i}`,a]))};
 const q=g.prepare(r);g.accept({answers:Object.fromEntries(Object.entries(q.questions).map(([id,q])=>[id,{type:'choice',choice:q.instructions.includes('target value')?'n0':q.instructions.includes('relationship')?'equal':'other'}]))});
 const result=g.evaluate(r);assert.equal(result.facts.numeric[0].target,-2);assert.equal(result.facts.numeric[0].comparison,'above');assert.deepEqual(result.candidates,r.candidates);
});
