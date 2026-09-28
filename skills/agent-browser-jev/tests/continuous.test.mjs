import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {act, discoverActions} from '../scripts/jev-browser.mjs';
import {summarize, sealResume, openResume} from '../scripts/run.mjs';

const scope='Authorized synthetic task';
function browser(sequence) {
  let index=0; const calls=[];
  return {sessionId:randomUUID(), calls, observe:async()=>structuredClone(sequence[Math.min(index,sequence.length-1)]),
    execute:async action=>{calls.push(action);index++;}};
}
const choose = fn => async r => ({binding:r.binding,choice:Object.entries(r.candidates).find(([,a])=>fn(a,r))?.[0]??'handoff'});
const run = (b,decide,extra={}) => act({browser:b,decide,intentOrSteps:'Complete the draft',scope,authorize:()=>true,...extra});

test('native selects offer observed unique unselected labels on their parent; disabled controls are excluded',()=>{
  const observation={snapshot:'- combobox "Region" [ref=e1]: Select\n  - MenuListPopup\n    - option "Select" [selected, ref=e2]\n    - option "North" [ref=e3]\n    - option "Disabled" [disabled=true, ref=e4]\n- button "Send" [disabled=true, ref=e5]',
    refs:{e1:{role:'combobox',name:'Region'},e2:{role:'option',name:'Select'},e3:{role:'option',name:'North'},e4:{role:'option',name:'Disabled'},e5:{role:'button',name:'Send'}}};
  const actions=discoverActions(observation);
  assert.deepEqual(actions.filter(a=>a.ref),[{op:'select',ref:'@e1',role:'combobox',name:'Region',option:'North'}]);
});

test('duplicate option labels are not converted into ambiguous native selections',()=>{
  const actions=discoverActions({snapshot:'- combobox [ref=e1]\n  - MenuListPopup\n    - option [ref=e2]\n    - option [ref=e3]',
    refs:{e1:{role:'combobox'},e2:{role:'option',name:'Same'},e3:{role:'option',name:'Same'}}});
  assert.equal(actions.filter(a=>a.op==='select').length,0);
});

test('root-level duplicate native options retain their popup parent',()=>{
  const observation={snapshot:'- combobox [expanded=false, ref=e1]: Kazakhstan\n  - MenuListPopup\n    - option "Kazakhstan" [selected, ref=e2]\n    - option "Norfolk Island" [ref=e3]\n- button "Submit" [ref=e4]\n- option "Kazakhstan" [selected, ref=e2]\n- option "Norfolk Island" [ref=e3]',
    refs:{e1:{role:'combobox',name:''},e2:{role:'option',name:'Kazakhstan'},
      e3:{role:'option',name:'Norfolk Island'},e4:{role:'button',name:'Submit'}}};
  const actions=discoverActions(observation);
  assert.ok(actions.some(action=>action.op==='select'&&action.ref==='@e1'&&action.option==='Norfolk Island'));
  assert.equal(actions.some(action=>action.op==='click'&&action.ref==='@e3'),false);
});

test('explicitly clickable generic links and tree list items use their observed text',()=>{
  const observation={snapshot:'- generic\n  - generic [ref=e1] clickable [cursor:pointer]\n    - StaticText "Accumsan"\n  - list\n    - listitem [level=1, ref=e2] clickable [cursor:pointer]\n      - StaticText "Vanda"\n  - generic [ref=e3]\n    - StaticText "Not clickable"',
    refs:{e1:{role:'generic',name:''},e2:{role:'listitem',name:''},e3:{role:'generic',name:''}}};
  assert.deepEqual(discoverActions(observation).filter(action=>action.op==='click'),[
    {op:'click',ref:'@e1',role:'generic',name:'Accumsan'},
    {op:'click',ref:'@e2',role:'listitem',name:'Vanda'},
  ]);
});

test('named tree exploration opens only observed collapsed branches and clicks a unique unreferenced target',()=>{
  const goal='Navigate through the file tree. Find and click on the folder or file named "Keli".';
  const root={snapshot:'- list\n  - listitem [level=1, ref=e1] clickable [cursor:pointer]\n    - StaticText "Bernardine"\n  - listitem [level=1, ref=e2] clickable [cursor:pointer]\n    - StaticText "Deneen"',
    refs:{e1:{role:'listitem',name:'',expandable:true},e2:{role:'listitem',name:'',expandable:true}}};
  assert.deepEqual(discoverActions(root,{},goal).filter(a=>a.op==='click').map(a=>[a.name,a.purpose]),
    [['Bernardine','expand_tree_branch'],['Deneen','expand_tree_branch']]);
  const expanded={snapshot:`${root.snapshot}\n    - list\n      - listitem [level=2]\n        - StaticText "Keli"\n      - listitem [level=2]\n        - StaticText "Kenda"`,
    refs:{e1:{role:'listitem',name:'',expandable:false},e2:{role:'listitem',name:'',expandable:true}}};
  assert.deepEqual(discoverActions(expanded,{},goal).filter(a=>a.op==='click'),
    [{op:'click',role:'listitem',name:'Keli',text:'Keli',purpose:'observed_tree_text'}]);
  const duplicate={...expanded,snapshot:`${expanded.snapshot}\n      - listitem [level=2]\n        - StaticText "Keli"`};
  assert.equal(discoverActions(duplicate,{},goal).some(a=>a.purpose==='observed_tree_text'),false);
  assert.equal(discoverActions(root,{},'Find and click Keli').some(a=>a.purpose==='expand_tree_branch'),false);
});

test('an exact unreferenced tree target is not clicked twice when its folder toggles',async()=>{
  const goal='Find and click on the folder or file named "Keli".';
  const initial='- list\n  - listitem [level=1]\n    - StaticText "Keli"';
  const after='- list\n  - listitem [level=1]\n    - StaticText "Keli"\n    - list';
  const b=browser([{snapshot:initial,refs:{}},{snapshot:after,refs:{}}]);
  const result=await act({browser:b,scope,authorize:()=>true,intentOrSteps:goal,
    decide:async request=>({binding:request.binding,
      choice:Object.entries(request.candidates).find(([,action])=>action.purpose==='observed_tree_text')?.[0]??'step_complete'})});
  assert.equal(result.returnReason,'reported_complete');
  assert.deepEqual(b.calls.map(action=>action.purpose),['observed_tree_text']);
});

test('a named slider target offers only one observed keyboard step toward its adjacent readout',()=>{
  const goal='Select -2 with the slider, click the 1st checkbox, then hit Submit.';
  const observation={snapshot:'- generic\n  - generic\n    - generic [ref=e5] focusable [tabindex]\n    - StaticText "10"\n  - checkbox [checked=false, ref=e1]',
    refs:{e5:{role:'generic',name:'',sliderHandle:true},e1:{role:'checkbox',name:''}}};
  const step=discoverActions(observation,{},goal).find(a=>a.purpose==='adjust_slider');
  assert.deepEqual(step,{op:'press',ref:'@e5',role:'generic',name:'slider',key:'ArrowLeft',
    currentValue:10,targetValue:-2,purpose:'adjust_slider'});
  assert.equal(discoverActions({...observation,snapshot:observation.snapshot.replace('"10"','"-2"')},{},goal)
    .some(a=>a.purpose==='adjust_slider'),false);
  assert.equal(discoverActions({...observation,refs:{...observation.refs,e5:{role:'generic',name:''}}},{},goal)
    .some(a=>a.purpose==='adjust_slider'),false);
  assert.equal(discoverActions(observation,{},'Move the slider').some(a=>a.purpose==='adjust_slider'),false);
});

test('an ordinal checkbox goal grounds exactly the requested observed checkbox',()=>{
  const observation={snapshot:'- generic\n  - checkbox [checked=false, ref=e1]\n  - checkbox [checked=false, ref=e2]\n  - checkbox [checked=false, ref=e3]\n  - button "Submit" [ref=e4]',
    refs:{e1:{role:'checkbox',name:''},e2:{role:'checkbox',name:''},e3:{role:'checkbox',name:''},
      e4:{role:'button',name:'Submit'}}};
  const goal='Select -1 with the slider, click the 2nd checkbox, then hit Submit.';
  assert.deepEqual(discoverActions(observation,{},goal).filter(a=>['check','uncheck'].includes(a.op)),[
    {ref:'@e2',role:'checkbox',name:'2nd checkbox',op:'check',purpose:'ordinal_checkbox'}]);
  const selected={...observation,snapshot:observation.snapshot.replace('checked=false, ref=e2','checked=true, ref=e2')};
  assert.equal(discoverActions(selected,{},goal).some(a=>a.purpose==='ordinal_checkbox'),false);
  assert.equal(discoverActions(observation,{},'click the 4th checkbox').some(a=>a.purpose==='ordinal_checkbox'),false);
});

test('a hierarchical menu goal offers hover for intermediate items only',()=>{
  const observation={snapshot:'- menu\n  - menuitem "Sherrie" [ref=e1]\n  - menuitem "Maddalena" [ref=e2]',
    refs:{e1:{role:'menuitem',name:'Sherrie'},e2:{role:'menuitem',name:'Maddalena'}}};
  const actions=discoverActions(observation,{},'Select Sherrie>De>Maddalena');
  assert.deepEqual(actions.filter(a=>a.op==='hover'),[
    {op:'hover',ref:'@e1',role:'menuitem',name:'Sherrie',purpose:'reveal_submenu'}]);
  assert.equal(discoverActions(observation,{},'Select Maddalena').some(a=>a.op==='hover'),false);
});

test('an absent exact menu label permits safe hover exploration, then only the matching leaf click',()=>{
  const goal='Click the "Menu" button, and then find and click on the item labeled "Prev".';
  const refs={e1:{role:'menu',name:''},e2:{role:'menuitem',name:'Save'},
    e3:{role:'menuitem',name:'Playback'}};
  const open={snapshot:'- menu [ref=e1]\n  - menuitem "Save" [ref=e2]\n  - menuitem "Playback" [ref=e3]',refs};
  const first=discoverActions(open,{},goal);
  assert.deepEqual(first.filter(a=>a.purpose==='explore_submenu').map(a=>a.name),['Save','Playback']);
  assert.equal(first.some(a=>a.op==='click'&&a.role==='menuitem'),false);
  const revealed={snapshot:`${open.snapshot}\n    - menuitem "Prev" [ref=e4]`,
    refs:{...refs,e4:{role:'menuitem',name:'Prev'}}};
  const second=discoverActions(revealed,{},goal);
  assert.deepEqual(second.filter(a=>a.op==='click'&&a.role==='menuitem').map(a=>a.name),['Prev']);
  assert.equal(second.some(a=>a.purpose==='explore_submenu'),false);
  assert.equal(discoverActions(open,{},'Click the item with the ui-icon-seek-end icon.').some(a=>a.purpose==='explore_submenu'),false);
});

test('an icon-named menu goal reveals observed parents and clicks only the matching visible icon',()=>{
  const goal='Click the "Menu" button, and then find and click on the item with the "ui-icon-seek-end" icon.';
  const open={snapshot:'- menu [ref=e1]\n  - menuitem "Save" [ref=e2]\n  - menuitem "Playback" [ref=e3]',
    refs:{e1:{role:'menu',name:''},e2:{role:'menuitem',name:'Save',menuIcon:'ui-icon-disk'},
      e3:{role:'menuitem',name:'Playback',menuIcon:'ui-icon-caret-1-e',menuParent:true}}};
  const first=discoverActions(open,{},goal);
  assert.deepEqual(first.filter(a=>a.op==='hover').map(a=>[a.name,a.purpose]),[['Playback','reveal_icon_submenu']]);
  assert.equal(first.some(a=>a.op==='click'&&a.role==='menuitem'),false);
  const visible={...open,snapshot:`${open.snapshot}\n    - menu\n      - menuitem "Next" [ref=e4]`,
    refs:{...open.refs,e4:{role:'menuitem',name:'Next',menuIcon:'ui-icon-seek-end'}}};
  assert.deepEqual(discoverActions(visible,{},goal).filter(a=>a.op==='click'&&a.role==='menuitem'),
    [{op:'click',ref:'@e4',role:'menuitem',name:'Next',purpose:'matching_menu_icon'}]);
  assert.equal(discoverActions({...visible,refs:{...visible.refs,e4:{role:'menuitem',name:'Next'}}},{},goal)
    .some(a=>a.op==='click'&&a.name==='Next'),false);
});

test('a successful exact icon click does not reopen the submenu',async()=>{
  const goal='Click the item with the "ui-icon-seek-end" icon.';
  const before={snapshot:'- menu [ref=e1]\n  - menuitem "Playback" [ref=e2]\n    - menu\n      - menuitem "Next" [ref=e3]',
    refs:{e1:{role:'menu',name:''},e2:{role:'menuitem',name:'Playback',menuParent:true},
      e3:{role:'menuitem',name:'Next',menuIcon:'ui-icon-seek-end'}}};
  const after={snapshot:'- menu [ref=e1]\n  - menuitem "Playback" [ref=e2]',
    refs:{e1:{role:'menu',name:''},e2:{role:'menuitem',name:'Playback',menuParent:true}}};
  const b=browser([before,after]);
  const result=await act({browser:b,scope,authorize:()=>true,intentOrSteps:goal,
    decide:async request=>({binding:request.binding,
      choice:Object.entries(request.candidates).find(([,action])=>
        ['matching_menu_icon','reveal_icon_submenu'].includes(action.purpose))?.[0]??'step_complete'})});
  assert.equal(result.returnReason,'reported_complete');
  assert.deepEqual(b.calls.map(action=>action.purpose),['matching_menu_icon']);
});

test('an explicit table lookup offers the unique observed cell, never a guessed value',()=>{
  const observation={snapshot:'- generic\n  - table\n    - row\n      - gridcell "Color" [ref=e1]\n      - gridcell "gray" [ref=e2]\n    - row\n      - gridcell "Gender" [ref=e3]\n      - gridcell "Female" [ref=e4]\n  - textbox [ref=e5]',
    refs:{e1:{role:'gridcell',name:'Color'},e2:{role:'gridcell',name:'gray'},
      e3:{role:'gridcell',name:'Gender'},e4:{role:'gridcell',name:'Female'},e5:{role:'textbox',name:''}}};
  const goal='Enter the value of Color into the text field and press Submit.';
  const fill=discoverActions(observation,{},goal).filter(a=>a.op==='fill');
  assert.deepEqual(fill,[{ref:'@e5',role:'textbox',name:'',op:'fill',
    valueId:'observed table: Color',value:'gray',source:'observed_table'}]);
  assert.equal(discoverActions(observation,{},'Enter a color into the text field').some(a=>a.op==='fill'),false);
  const duplicate={...observation,snapshot:observation.snapshot.replace('  - textbox',
    '    - row\n      - gridcell "Color" [ref=e6]\n      - gridcell "blue" [ref=e7]\n  - textbox'),
    refs:{...observation.refs,e6:{role:'gridcell',name:'Color'},e7:{role:'gridcell',name:'blue'}}};
  assert.equal(discoverActions(duplicate,{},goal).some(a=>a.op==='fill'),false);
});

test('a uniquely observed table value can be copied after navigating to a later form',async()=>{
  const goal='In Contacts, copy the tracking code for Amara Bell into the intake form and submit it.';
  const table={snapshot:'- table\n  - row\n    - columnheader "Name" [ref=e1]\n    - columnheader "Tracking code" [ref=e2]\n  - row\n    - gridcell "Naomi Chen" [ref=e3]\n    - gridcell "NC-482" [ref=e4]\n  - row\n    - gridcell "Amara Bell" [ref=e5]\n    - gridcell "AB-719" [ref=e6]\n- link "Open intake form" [ref=e7]',
    refs:{e1:{role:'columnheader',name:'Name'},e2:{role:'columnheader',name:'Tracking code'},
      e3:{role:'gridcell',name:'Naomi Chen'},e4:{role:'gridcell',name:'NC-482'},
      e5:{role:'gridcell',name:'Amara Bell'},e6:{role:'gridcell',name:'AB-719'},
      e7:{role:'link',name:'Open intake form'}}};
  const form={snapshot:'- textbox "Tracking code" [ref=e8]\n- button "Submit intake" [ref=e9]',
    refs:{e8:{role:'textbox',name:'Tracking code'},e9:{role:'button',name:'Submit intake'}}};
  const b=browser([table,form,form]);
  const result=await act({browser:b,scope,authorize:()=>true,intentOrSteps:goal,
    decide:choose(a=>b.calls.length===0?a.op==='click'&&a.role==='link':
      b.calls.length===1?a.op==='fill'&&a.source==='observed_table_prior':a.op==='step_complete')});
  assert.equal(result.returnReason,'reported_complete');
  assert.deepEqual(b.calls.map(a=>a.op),['click','fill']);
  assert.equal(b.calls[1].value,'AB-719');
  assert.equal(discoverActions({...table,snapshot:table.snapshot.replace('Tracking code','Other code')},{},goal)
    .some(a=>a.source==='observed_table'),false);
});

test('observed table values are scoped to one requested step',async()=>{
  const observation={snapshot:'- table\n  - row\n    - gridcell "Color" [ref=e1]\n    - gridcell "gray" [ref=e2]\n- textbox "Project name" [ref=e3]',
    refs:{e1:{role:'gridcell',name:'Color'},e2:{role:'gridcell',name:'gray'},
      e3:{role:'textbox',name:'Project name'}}};
  let secondStep=false;
  const result=await act({browser:browser([observation]),scope,authorize:()=>true,
    intentOrSteps:['Enter the value of Color into the text field.', 'Enter a new project name.'],
    decide:async request=>{
      if(request.stepIndex===1){
        secondStep=true;
        assert.equal(Object.values(request.candidates).some(a=>a.source==='observed_table_prior'),false);
      }
      return {binding:request.binding,choice:request.stepIndex===0?'step_complete':'handoff'};
    }});
  assert.equal(secondStep,true);
  assert.equal(result.returnReason,'handoff');
});

test('explicit textarea-bottom intent offers only the unique observed long disabled textbox for element scroll',()=>{
  const body='Agreement text. '.repeat(25);
  const observation={snapshot:`- textbox [disabled, ref=e1]: ${body}\n- textbox "Name" [disabled, ref=e2]`,
    refs:{e1:{role:'textbox',name:''},e2:{role:'textbox',name:'Name'}}};
  const goal='Scroll to the bottom of the textarea, enter the name "Truman" then press "Cancel"';
  assert.deepEqual(discoverActions(observation,{},goal).filter(a=>a.purpose==='textarea_end'),
    [{op:'scroll',ref:'@e1',role:'textbox',direction:'down',amount:2000,purpose:'textarea_end'}]);
  assert.equal(discoverActions(observation,{},'Enter the name "Truman"').some(a=>a.purpose==='textarea_end'),false);
  const ambiguous={...observation,snapshot:`${observation.snapshot}\n- textbox [disabled, ref=e3]: ${body}`,
    refs:{...observation.refs,e3:{role:'textbox',name:''}}};
  assert.equal(discoverActions(ambiguous,{},goal).some(a=>a.purpose==='textarea_end'),false);
});

test('checkbox choices set the opposite observed state instead of blindly toggling',()=>{
  const actions=discoverActions({snapshot:'- checkbox "On" [checked=true, ref=e1]\n- checkbox "Off" [checked=false, ref=e2]',
    refs:{e1:{role:'checkbox',name:'On'},e2:{role:'checkbox',name:'Off'}}});
  assert.deepEqual(actions.filter(a=>a.ref).map(a=>a.op),['uncheck','check']);
});

test('observed native date segments offer one exact ISO-date action',()=>{
  const observation={snapshot:'- Date "Departure date"\n  - generic\n    - spinbutton "Month Month" [ref=e1]: 0\n    - spinbutton "Day Day" [ref=e2]: 0\n    - spinbutton "Year Year" [ref=e3]: 0\n  - button "Show date picker" [ref=e4]\n- textbox "Name" [ref=e5]',
    refs:{e1:{role:'spinbutton',name:'Month Month'},e2:{role:'spinbutton',name:'Day Day'},e3:{role:'spinbutton',name:'Year Year'},e4:{role:'button',name:'Show date picker'},e5:{role:'textbox',name:'Name'}}};
  const actions=discoverActions(observation,{date:'2026-11-08',name:'Jordan Lee'});
  assert.deepEqual(actions.filter(a=>a.op==='set_date'),[{op:'set_date',role:'date',name:'Departure date',refs:{month:'@e1',day:'@e2',year:'@e3'},valueId:'date',value:'2026-11-08'}]);
  assert.equal(actions.some(a=>['fill','request_input','press'].includes(a.op)&&['@e1','@e2','@e3'].includes(a.ref)),false);
  assert.ok(actions.some(a=>a.op==='fill'&&a.ref==='@e5'&&a.value==='Jordan Lee'));
  assert.equal(discoverActions(observation,{date:'2026-02-30'}).some(a=>a.op==='set_date'),false);
});

test('missing input pauses without typing, then resumes with new refs and retained progress',async()=>{
  const first={snapshot:'- button "Edit" [ref=e1]',refs:{e1:{role:'button',name:'Edit'}}};
  const field={snapshot:'- textbox "Note" [ref=e2]',refs:{e2:{role:'textbox',name:'Note'}}};
  const b=browser([first,field]);
  const paused=await run(b,choose(a=>['click','request_input'].includes(a.op)));
  assert.equal(paused.returnReason,'input_required'); assert.equal(paused.inputRequired.name,'Note');
  assert.equal(b.calls.length,1);
  const next={...b, observe:async()=>({snapshot:'- textbox "Note" [ref=e99]',refs:{e99:{role:'textbox',name:'Note'}}})};
  const done=await run(next,choose((a,r)=>{
    assert.equal(r.history[0].action.name,'Edit');
    return a.op === (r.history.length === 1 ? 'fill' : 'step_complete');
  }),{continuation:JSON.parse(JSON.stringify(paused.continuation)),suppliedValues:{Note:'Exact note'}});
  assert.equal(done.returnReason,'reported_complete');
  assert.equal(b.calls.at(-1).ref,'@e99'); assert.equal(b.calls.at(-1).value,'Exact note');
  assert.equal(done.continuation,null);
});

test('resume preserves completed intents and does not repeat an earlier step',async()=>{
  const b=browser([{snapshot:'ready',refs:{}}]);
  const paused=await act({browser:b,scope,authorize:()=>true,intentOrSteps:['First','Second'],
    decide:async r=>({binding:r.binding,choice:r.stepIndex===0?'step_complete':'handoff'})});
  assert.equal(paused.continuation.stepIndex,1);
  const done=await act({browser:b,scope,authorize:()=>true,intentOrSteps:['First','Second'],continuation:paused.continuation,
    decide:async r=>{assert.equal(r.intent,'Second');return {binding:r.binding,choice:'step_complete'};}});
  assert.equal(done.progressAssessment.length,2);
});

test('continuation cannot silently switch task, scope or session',async()=>{
  const b=browser([{snapshot:'ready',refs:{}}]);
  const paused=await run(b,choose(a=>a.op==='handoff'));
  for(const extra of [{intentOrSteps:'Different'},{scope:'Different'},{browser:{...b,sessionId:'Different'}}]){
    await assert.rejects(act({browser:b,scope,authorize:()=>true,intentOrSteps:'Complete the draft',decide:choose(a=>a.op==='step_complete'),continuation:paused.continuation,...extra}),/Continuation/);
  }
});

test('resume token preserves task state without exposing exact literals',()=>{
  const state={invocation:{browser:{binary:'/fork',sessionId:'same'},intentOrSteps:'Finish',context:'Earlier'},
    continuation:{schema:1,sessionId:'same',intentOrSteps:['Finish'],scope,suppliedValues:{subject:'Exact original'},stepIndex:0,history:[],progressAssessment:[]}};
  const token=sealResume(state,'test-key',1000);
  assert.ok(!token.includes('Exact original'));
  const opened=openResume(token,'test-key',1001);
  assert.equal(opened.invocation.browser.binary,'/fork');
  assert.equal(opened.continuation.suppliedValues.subject,'Exact original');
});

test('summary returns final observation and marks truncation without writing evidence',()=>{
  const summary=summarize({returnReason:'input_required',actions:[],decisions:[{cost:0.1}],
    latestObservation:{snapshot:'x'.repeat(17000)},observationFresh:true,continuation:{suppliedValues:{hidden:'NOT_FOR_SUMMARY'}}},'opaque-token');
  assert.equal(summary.observation.snapshot.length,16000);assert.equal(summary.observation.truncated,true);
  assert.equal(summary.resumable,true);assert.equal(summary.jev.costUsd,0.1);
  assert.equal(summary.resumeToken,'opaque-token');
  assert.ok(!JSON.stringify(summary).includes('NOT_FOR_SUMMARY'));
});

test('an uncertain gesture is read back once without being replayed',async()=>{
  const b=browser([{snapshot:'- button "Save" [ref=e1]',refs:{e1:{role:'button',name:'Save'}}}]);
  b.execute=async()=>{throw Error('unknown effect');};
  const result=await run(b,choose(a=>a.op==='click'));
  assert.equal(result.returnReason,'action_outcome_unknown');assert.equal(summarize(result,'token').observation.fresh,true);
  assert.equal(b.calls.length,0);
});

test('a post-action observation failure never presents the pre-action page as fresh',async()=>{
  const b=browser([{snapshot:'page',refs:{e1:{role:'button',name:'Save'}}}]);
  b.observe=async()=>{if(b.calls.length)throw Error('lost connection');return {snapshot:'before',refs:{e1:{role:'button',name:'Save'}}};};
  const result=await run(b,choose(a=>a.op==='click'));
  assert.equal(result.observationFresh,false);assert.equal(result.actions.length,1);
});

test('three identical actions with no observed effect stop before a fourth',async()=>{
  const b=browser([{snapshot:'stable',refs:{e1:{role:'button',name:'Open'}}}]);
  const result=await run(b,choose(a=>a.op==='click'));
  assert.equal(result.returnReason,'no_progress');assert.equal(b.calls.length,3);
});

test('an unchanged native date action stops without repeated entry',async()=>{
  const observation={snapshot:'- Date "Departure date"\n  - spinbutton "Month Month" [ref=e1]\n  - spinbutton "Day Day" [ref=e2]\n  - spinbutton "Year Year" [ref=e3]',refs:{e1:{role:'spinbutton',name:'Month Month'},e2:{role:'spinbutton',name:'Day Day'},e3:{role:'spinbutton',name:'Year Year'}}};
  const b=browser([observation]);
  const result=await run(b,choose(a=>a.op==='set_date'),{suppliedValues:{date:'2026-11-08'}});
  assert.equal(result.returnReason,'no_progress');assert.equal(b.calls.length,1);
});

test('five unchanged waits remove wait and leave other controls available',async()=>{
  const b=browser([{snapshot:'- button "Retry" [ref=e1]',refs:{e1:{role:'button',name:'Retry'}}}]);
  const result=await run(b,async r=>{
    if (r.candidates.wait) return {binding:r.binding,choice:'wait'};
    assert.ok(Object.values(r.candidates).some(a=>a.op==='click'&&a.name==='Retry'));
    return {binding:r.binding,choice:'handoff'};
  },{budget:{maxActions:30}});
  assert.equal(result.returnReason,'handoff');assert.equal(b.calls.length,5);
});

test('candidate overflow hands back without asking the provider or dropping controls',async()=>{
  const refs=Object.fromEntries(Array.from({length:260},(_,i)=>['e'+i,{role:'button',name:'Item '+i}]));
  const b=browser([{snapshot:'large catalog',refs}]);
  const result=await run(b,()=>assert.fail('provider must not be called'));
  assert.equal(result.returnReason,'candidate_limit');assert.equal(b.calls.length,0);
});

test('an unchanged immediate snapshot is polled before the next decision, without repeating the gesture',async()=>{
  let clicked=false,reads=0,decisions=0;
  const b={sessionId:randomUUID(),observe:async()=>({snapshot:clicked&&++reads>1?'new screen':'old screen',refs:{e1:{role:'button',name:'Next'}}}),execute:async()=>{clicked=true;}};
  const result=await run(b,async r=>{decisions++;if(decisions===1)return {binding:r.binding,choice:'c0'};assert.equal(r.observation.snapshot,'new screen');return {binding:r.binding,choice:'step_complete'};});
  assert.equal(result.actions.length,1);assert.equal(result.returnReason,'reported_complete');assert.ok(result.timing.settleMs>0);
});

test('starting navigation is serialized with all other actions on the same session',async()=>{
  let release,ready;const started=new Promise(r=>ready=r);
  const b=browser([{snapshot:'ready',refs:{}}]);
  const first=run(b,r=>new Promise(resolve=>{release=()=>resolve({binding:r.binding,choice:'handoff'});ready();}));
  await started;
  const second=await run(b,choose(a=>a.op==='handoff'),{initialUrl:'https://example.com'});
  assert.equal(second.returnReason,'session_busy');assert.equal(b.calls.length,0);
  release();await first;
});

test('invalid tasks and denied starting URLs cannot navigate',async()=>{
  const b=browser([{snapshot:'ready',refs:{}}]);
  await assert.rejects(run(b,choose(a=>a.op==='handoff'),{initialUrl:'https://example.com',intentOrSteps:''}));
  const denied=await run(b,choose(a=>a.op==='handoff'),{initialUrl:'https://example.com',authorize:()=>false});
  assert.equal(denied.returnReason,'permission_denied');assert.equal(b.calls.length,0);
});

test('superseded observations are never advertised as fresh',async()=>{
  const {invalidateBrowserObservation}=await import('../scripts/jev-browser.mjs');
  const b=browser([{snapshot:'ready',refs:{}}]);
  const result=await run(b,async r=>{invalidateBrowserObservation(b.sessionId);return {binding:r.binding,choice:'step_complete'};});
  assert.equal(result.returnReason,'superseded_observation');assert.equal(summarize(result,'token').observation.fresh,false);
});


test('custom listbox options remain clickable and do not suppress autocomplete typing',()=>{
  const observation={snapshot:'- combobox "Contact" [expanded=true, ref=e1]\n  - listbox "Matches" [ref=e2]\n    - option "Adobe Inc" [ref=e3]',
    refs:{e1:{role:'combobox',name:'Contact'},e2:{role:'listbox',name:'Matches'},e3:{role:'option',name:'Adobe Inc'}}};
  const actions=discoverActions(observation,{contact:'adobe'});
  assert.equal(actions.some(a=>a.op==='select'),false);
  assert.equal(actions.some(a=>a.op==='press'&&a.key==='Tab'),false);
  assert.ok(actions.some(a=>a.op==='click'&&a.ref==='@e3'));
  assert.ok(actions.some(a=>a.op==='fill'&&a.ref==='@e1'&&a.value==='adobe'));
  assert.equal(actions.some(a=>a.op==='press'&&a.ref==='@e1'),false);
});

test('menu checkbox and radio items are offered as grounded clicks',()=>{
  const actions=discoverActions({snapshot:'- menuitemcheckbox "Show grid" [checked=false, ref=e1]\n- menuitemradio "Compact" [checked=true, ref=e2]',refs:{e1:{role:'menuitemcheckbox',name:'Show grid'},e2:{role:'menuitemradio',name:'Compact'}}});
  assert.deepEqual(actions.filter(a=>a.op==='click').map(a=>a.ref),['@e1','@e2']);
});

test('file controls offer only caller-supplied absolute paths and never open a chooser',()=>{
  const observation={snapshot:'- button "Contract file" [ref=e1]: No file chosen\n- button "Submit" [ref=e2]',refs:{e1:{role:'button',name:'Contract file'},e2:{role:'button',name:'Submit'}}};
  const actions=discoverActions(observation,{contract:'/private/tmp/contract.pdf',note:'not-a-path'});
  assert.deepEqual(actions.filter(a=>a.ref==='@e1'),[{ref:'@e1',role:'button',name:'Contract file',op:'upload',valueId:'contract',path:'/private/tmp/contract.pdf'}]);
  assert.ok(actions.some(a=>a.ref==='@e2'&&a.op==='click'));
});

test('hover is offered only when the observed page says the interaction requires it',()=>{
  const refs={e1:{role:'button',name:'Account'}};
  assert.ok(discoverActions({snapshot:'- button "Account" [ref=e1]\n- paragraph "Hover to reveal links"',refs}).some(a=>a.op==='hover'&&a.ref==='@e1'));
  assert.equal(discoverActions({snapshot:'- button "Account" [ref=e1]',refs}).some(a=>a.op==='hover'),false);
});

test('readonly custom combobox can open but cannot be filled or keyboard-selected',()=>{
  const actions=discoverActions({snapshot:'- combobox "Account" [readonly=true, ref=e1]',refs:{e1:{role:'combobox',name:'Account'}}},{query:'Software'});
  assert.ok(actions.some(a=>a.op==='click'&&a.ref==='@e1'));
  assert.equal(actions.some(a=>['fill','request_input','press'].includes(a.op)&&a.ref==='@e1'),false);
});

test('ordinary text inputs retain Enter without autocomplete arrow navigation',()=>{
  const actions=discoverActions({snapshot:'- textbox "Search guides" [ref=e1]',refs:{e1:{role:'textbox',name:'Search guides'}}},{query:'recovery'});
  assert.ok(actions.some(a=>a.op==='press'&&a.ref==='@e1'&&a.key==='Enter'));
  assert.equal(actions.some(a=>a.op==='press'&&['ArrowDown','ArrowUp'].includes(a.key)),false);
});

test('an open custom listbox suppresses Enter on autocomplete text inputs',()=>{
  const observation={snapshot:'- textbox "Account" [ref=e1]\n- listbox "Matches" [ref=e2]\n  - option "Software assets" [ref=e3]',
    refs:{e1:{role:'textbox',name:'Account'},e2:{role:'listbox',name:'Matches'},e3:{role:'option',name:'Software assets'}}};
  assert.equal(discoverActions(observation,{query:'software'}).some(a=>a.op==='press'&&a.ref==='@e1'),false);
});

test('a prefix fill observes debounced autocomplete choices before asking for input',async()=>{
  const empty={snapshot:'- textbox "Tags" [ref=e1]',refs:{e1:{role:'textbox',name:'Tags'}}};
  const filled={snapshot:'- textbox "Tags" [ref=e1]: Norw',refs:empty.refs};
  const suggested={snapshot:'- textbox "Tags" [ref=e1]: Norw\n- listitem [ref=e2] clickable\n  - StaticText "Norway"',
    refs:{...empty.refs,e2:{role:'listitem',name:''}}};
  const done={snapshot:'- textbox "Tags" [ref=e1]: Norway\n- button "Submit" [ref=e3]',
    refs:{e1:{role:'textbox',name:'Tags'},e3:{role:'button',name:'Submit'}}};
  let reads=0,selected=false;const calls=[];
  const b={sessionId:randomUUID(),observe:async()=>selected?done:[empty,filled,suggested][Math.min(reads++,2)],
    execute:async action=>{calls.push(action);if(action.op==='click')selected=true;}};
  const result=await run(b,choose((a,r)=>r.history.length===0?a.op==='fill'&&a.value==='Norw':
    r.history.length===1?a.op==='click'&&a.name==='Norway':a.op==='step_complete'),
  {intentOrSteps:'Enter an item that starts with "Norw" and ends with "rway".',suppliedValues:{prefix:'Norw'}});
  assert.equal(result.returnReason,'reported_complete');
  assert.deepEqual(calls.map(a=>a.op),['fill','click']);
  assert.equal(calls[1].name,'Norway');
  assert.ok(reads>=3);
});

test('a supplied autocomplete prefix is tried before requesting an unknown full value',()=>{
  const goal='Enter an item that starts with "Cro" and ends with "tia".';
  const empty={snapshot:'- textbox "Tags" [ref=e1]',refs:{e1:{role:'textbox',name:'Tags'}}};
  const first=discoverActions(empty,{query:'Cro'},goal);
  assert.ok(first.some(a=>a.op==='fill'&&a.value==='Cro'&&a.purpose==='autocomplete_prefix'));
  assert.equal(first.some(a=>a.op==='request_input'),false);
  const filled={...empty,snapshot:'- textbox "Tags" [ref=e1]: Cro'};
  assert.ok(discoverActions(filled,{query:'Cro'},goal).some(a=>a.op==='request_input'));
  assert.ok(discoverActions(empty,{},goal).some(a=>a.op==='request_input'));
  const ambiguous={snapshot:'- textbox "Tags" [ref=e1]\n- textbox "Other" [ref=e2]',
    refs:{...empty.refs,e2:{role:'textbox',name:'Other'}}};
  assert.ok(discoverActions(ambiguous,{query:'Cro'},goal).some(a=>a.op==='request_input'));
});
