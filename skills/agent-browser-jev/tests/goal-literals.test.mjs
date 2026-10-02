import test from 'node:test';
import assert from 'node:assert/strict';
import {goalLiterals,goalSpans} from '../scripts/goal-literals.mjs';
for(const [phrase,value,ordinal] of [['twenty-one',21,false],['twenty-first',21,true],['one hundred',100,false],['one hundred and twenty-three',123,false],['negative forty-two',-42,false],['two thousand and five',2005,false],['1,024',1024,false],['-2.5',-2.5,false]]){
 test(`whole numeric phrase and exact provenance: ${phrase}`,()=>{
  const goal=`Choose ${phrase} units.`,literals=goalLiterals(goal);assert.equal(literals.numbers.length,1);
  const n=literals.numbers[0];assert.equal(n.text,phrase);assert.equal(n.value,value);assert.equal(n.ordinal,ordinal);assert.equal(goal.slice(n.start,n.end),phrase);
 });
}
test('unsupported or malformed compounds remain whole and unrepresented',()=>{
 for(const phrase of ['one billion','twenty thirteen','one half','one point five','one hundred hundred']){
  const numbers=goalLiterals(`Choose ${phrase} units.`).numbers;assert.equal(numbers.length,1,phrase);assert.equal(numbers[0].text,phrase);assert.equal(numbers[0].value,null,phrase);
 }
});
test('identifiers, ordinary labels and alternatives are not silently combined',()=>{
 assert.deepEqual(goalLiterals('Choose A21 and abc1st.').numbers,[]);
 assert.deepEqual(goalLiterals('Choose one and two.').numbers.map(n=>n.value),[1,2]);
 const n=goalLiterals('Press ONE then TWO.').numbers;assert.ok(n.every(x=>!x.ordinal));
});
test('source spans are exact and bounded without fabricating absent text',()=>{
 const goal='Prepare the draft; leave it unsaved.';
 for(const span of goalSpans(goal))assert.equal(goal.slice(span.start,span.end),span.text);
 const quoted=goalLiterals('Choose "North" and “South”.');assert.deepEqual(quoted.texts,['North','South']);
 for(const span of quoted.textSpans)assert.equal('Choose "North" and “South”.'.slice(span.start,span.end),span.text);
});
