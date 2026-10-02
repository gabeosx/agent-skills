import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverActions} from '../scripts/controls.mjs';
const graphics=observation=>discoverActions(observation).filter(a=>a.purpose==='observed_graphic_text');
test('unique text inside an unreferenced observed graphic supplies literal targets across goal wording',()=>{
 const observation={snapshot:'- generic\n  - SvgRoot\n    - StaticText "Aster"\n    - StaticText "Birch"\n- StaticText "Footer"',refs:{}};
 assert.deepEqual(graphics(observation).map(a=>[a.name,a.text,a.role]),[['Aster','Aster','text'],['Birch','Birch','text']]);
 for(const goal of ['Choose Aster','Open the Birch detail','Click in alphabetical order'])
  assert.deepEqual(discoverActions(observation,{},goal).filter(a=>a.purpose==='observed_graphic_text'),graphics(observation));
});
test('graphic text fallback requires a complete unambiguous observed target and does not make ordinary text a control',()=>{
 const snapshot='- SvgRoot\n  - StaticText "Same"\n  - StaticText "Unique"\n- StaticText "Same"';
 assert.deepEqual(graphics({snapshot,refs:{}}).map(a=>a.text),['Unique']);
 assert.deepEqual(graphics({snapshot,refs:{},limited:true}),[]);
 assert.deepEqual(graphics({snapshot:'- paragraph "SvgRoot"\n  - StaticText "Unique"',refs:{}}),[]);
 assert.deepEqual(graphics({snapshot:'- button "Unique" [ref=e1]\n  - SvgRoot\n    - StaticText "Unique"',refs:{e1:{role:'button',name:'Unique'}}}),[]);
});
