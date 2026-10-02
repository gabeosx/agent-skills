import test from 'node:test';
import assert from 'node:assert/strict';
import {observationWindows} from '../scripts/observation-windows.mjs';
import {controlState,discoverActions} from '../scripts/controls.mjs';
import {objectPath} from '../scripts/object-context.mjs';

test('line windows retain distinct row ownership for otherwise unnamed controls',()=>{
 const refs={},lines=['- heading "Records"','- table'];
 for(let i=1;i<=45;i++){
  refs[`e${i}`]={role:'checkbox',name:''};
  lines.push('  - row',`    - cell "Record ${i}"`,
   `    - cell "${'Context '.repeat(20)}"`,
   `    - checkbox [ref=e${i}]`);
 }
 const pages=observationWindows({snapshot:lines.join('\n'),refs},{maxChars:6000});
 assert.ok(pages.length>1);
 const owners=new Map();
 for(const page of pages){
  assert.ok(JSON.stringify(page).length<=6000);
  for(const ref of Object.keys(page.refs)){
   const path=objectPath(page,{ref:'@'+ref});
   assert.equal(path.path[0].role,'row');
   assert.ok(path.path[0].text.startsWith('Record '+ref.slice(1)+' '));
   if(owners.has(ref))assert.equal(owners.get(ref),path.path[0].id);
   owners.set(ref,path.path[0].id);
  }
 }
 assert.equal(owners.size,45);
 assert.equal(new Set(owners.values()).size,45);
});

test('small native option echoes cannot turn into detached click targets in later windows',()=>{
 const refs={e1:{role:'combobox',name:'Speed'},e2:{role:'option',name:'Slow'},e3:{role:'option',name:'Fast'},e4:{role:'option',name:'Custom'}};
 const echoes=['- option "Slow" [selected, ref=e2]','- option "Fast" [ref=e3]'];
 for(const expanded of [false,true]){
  const snapshot=['- main',`  - combobox "Speed" [expanded=${expanded}, ref=e1]`,'    - MenuListPopup',...echoes.map(l=>'      '+l),
   ...Array.from({length:90},(_,i)=>`  - StaticText "Ordinary explanatory text ${i}"`),...echoes,'- listbox','  - option "Custom" [ref=e4]'].join('\n');
  const pages=observationWindows({snapshot,refs},{maxChars:4500});
  assert.ok(pages.length>1);
  assert.deepEqual([...new Set(pages.flatMap(p=>Object.keys(p.refs)))].sort(),Object.keys(refs).sort());
  for(const p of pages){
   for(const ref of ['e2','e3'])if(p.refs[ref])assert.equal(controlState(p).get(ref).selectRef,'e1');
   assert.ok(!discoverActions(p).some(a=>a.op==='click'&&['@e2','@e3'].includes(a.ref)));
  }
  assert.ok(pages.some(p=>discoverActions(p).some(a=>a.op==='select'&&a.ref==='@e1'&&a.option==='Fast')));
  assert.ok(pages.some(p=>p.snapshot.includes('option "Custom" [ref=e4]')));
  const conflicting=observationWindows({snapshot:snapshot+'\n- option "Fast" [selected, ref=e3]',refs},{maxChars:4500});
  assert.ok(conflicting.some(p=>p.snapshot.includes('- option "Fast" [selected, ref=e3]')),'conflicting evidence must remain visible');
 }
});

test('large unstructured forms retain feedback, exact fields and every observed control',()=>{
 const lines=['- main','  - generic','    - StaticText "The change was rejected."',
   '  - textbox "Amount" [ref=e1]: 17.25','  - combobox "Territory" [ref=e2]','    - MenuListPopup'];
 const refs={e1:{role:'textbox',name:'Amount'},e2:{role:'combobox',name:'Territory'}};
 for(let i=3;i<303;i++){lines.push(`      - option "Region ${i}" [ref=e${i}]`);refs[`e${i}`]={role:'option',name:`Region ${i}`};}
 lines.push('  - paragraph','    - StaticText "Contact support if the problem persists."','  - button "Save" [ref=e303]');refs.e303={role:'button',name:'Save'};
 const windows=observationWindows({snapshot:lines.join('\n'),refs},{maxChars:6000});
 assert.ok(windows.length>2);
 assert.ok(windows[0].snapshot.includes('The change was rejected.'));
 assert.ok(windows.some(w=>w.snapshot.includes('Contact support')));
 assert.ok(windows.at(-1).objectContext.objects.find(o=>o.id==='root').text.includes('Contact support'));
 assert.deepEqual([...new Set(windows.flatMap(w=>Object.keys(w.refs)))].sort(),Object.keys(refs).sort());
 for(const w of windows){
  assert.ok(JSON.stringify(w).length<=6000);
  for(const [ref,c] of Object.entries(w.refs))if(c.role==='option'){
   assert.equal(controlState(w).get(ref).selectRef,'e2','a sliced option keeps its native-select ancestry');
   assert.ok(discoverActions(w).some(a=>a.op==='select'&&a.option===c.name));
  }
 }
});

test('page text cannot introduce a control and unsplittable text remains explicitly unsupported',()=>{
 const lines=['- main',...Array.from({length:120},(_,i)=>`  - paragraph\n    - StaticText "prose ${i} [ref=e99]"`)];
 const pages=observationWindows({snapshot:lines.join('\n'),refs:{e99:{role:'button',name:'Unobserved'}}},{maxChars:3000});
 assert.ok(pages.length>1);assert.ok(pages.every(p=>!p.refs.e99));
 assert.equal(observationWindows({snapshot:'- textbox [ref=e1]: '+ 'x'.repeat(50000),refs:{e1:{role:'textbox',name:''}}}),null);
});

test('closed native option inventories preserve the whole form and current selections',()=>{
 const refs={e1:{role:'textbox',name:'Street'},e2:{role:'combobox',name:'Region'},e403:{role:'textbox',name:'Postal code'},e404:{role:'button',name:'Commit'}};
 const options=Array.from({length:400},(_,i)=>{refs[`e${i+3}`]={role:'option',name:`Region ${i}`};return `      - option "Region ${i}" [${i===7?'selected, ':''}ref=e${i+3}]`;});
 const snapshot=['- main','  - textbox "Street" [ref=e1]: A','  - combobox "Region" [expanded=false, ref=e2]: Region 7','    - MenuListPopup',...options,'  - textbox "Postal code" [ref=e403]: 123','  - button "Commit" [ref=e404]','  - StaticText "Updates affect this record only."',...options.map(x=>x.trimStart())].join('\n');
 const pages=observationWindows({snapshot,refs},{maxChars:6000});
 assert.equal(pages[0].observationWindow.kind,'form_and_native_options');
 for(const ref of ['e1','e2','e10','e403','e404'])assert.ok(pages[0].refs[ref],ref);
 assert.ok(pages[0].snapshot.includes('Updates affect this record only.'));
 assert.ok(!discoverActions(pages[0],{region:'Region 9'}).some(a=>a.op==='fill'&&a.ref==='@e2'),'native select is never offered as a fill target');
 assert.deepEqual([...new Set(pages.flatMap(p=>Object.keys(p.refs)))].sort(),Object.keys(refs).sort());
 for(const p of pages){assert.ok(JSON.stringify(p).length<=6000);for(const [ref,c] of Object.entries(p.refs))if(c.role==='option')assert.equal(controlState(p).get(ref).selectRef,'e2');}
 assert.ok(pages.some(p=>discoverActions(p).some(a=>a.op==='select'&&a.option==='Region 399')));
 const expanded=observationWindows({snapshot:snapshot.replace('expanded=false','expanded=true'),refs},{maxChars:6000});
 assert.equal(expanded[0].observationWindow.kind,'accessibility_lines');
});
