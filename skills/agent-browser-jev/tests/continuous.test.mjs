import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {act, discoverActions} from '../scripts/jev-browser.mjs';
import {summarize, sealResume, openResume} from '../scripts/run.mjs';

const scope='Authorized synthetic task';
test('a failed decision after a charged action keeps both attempts and an unknown total',async()=>{
  let calls=0;
  const b=browser([{snapshot:'- button "Open" [ref=e1]',refs:{e1:{role:'button',name:'Open'}}}]);
  const result=await act({browser:b,scope,authorize:()=>true,intentOrSteps:'Open and inspect',
    decide:async request=>{
      if(calls++===0)return {binding:request.binding,choice:'c0',cost:0.1};
      const error=new Error('private provider body');error.statusCode=503;throw error;
    }});
  const summary=summarize(result,null);
  assert.equal(summary.returnReason,'helper_error');
  assert.deepEqual(summary.jev,{calls:2,costUsd:null});
  assert.deepEqual(summary.failure,{kind:'decision_failed',httpStatus:503});
  assert.equal(b.calls.length,1);
  assert.equal(result.decisions[0].cost,0.1);
  assert.ok(!JSON.stringify(summary).includes('private provider body'));
});

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

test('tree affordances survive paraphrases and duplicate leaf text is never offered',()=>{
  const observation={snapshot:'- list\n  - listitem [level=1, ref=e1] clickable [cursor:pointer]\n    - StaticText "Projects"\n    - list\n      - listitem [level=2]\n        - StaticText "Invoices"\n      - listitem [level=2]\n        - StaticText "Archive"',
    refs:{e1:{role:'listitem',name:'',expandable:true}}};
  const goals=['Find the file named "Invoices".','Open Invoices under Projects.','Browse the folder tree'];
  const expected=discoverActions(observation,{},goals[0]);
  for(const goal of goals)assert.deepEqual(discoverActions(observation,{},goal),expected);
  assert.deepEqual(expected.filter(a=>a.purpose==='observed_tree_text').map(a=>a.text),['Invoices','Archive']);
  assert.ok(expected.some(a=>a.purpose==='expand_tree_branch'&&a.ref==='@e1'));
  const duplicate={...observation,snapshot:observation.snapshot+'\n      - listitem [level=2]\n        - StaticText "Invoices"'};
  assert.equal(discoverActions(duplicate).some(a=>a.text==='Invoices'),false);
  assert.equal(discoverActions({snapshot:'- StaticText "Invoices"',refs:{}}).some(a=>a.text),false);
});

test('tree history does not hide an identically named control on a later page',async()=>{
  const tree='- list\n  - listitem [level=1]\n    - StaticText "Invoices"';
  const b=browser([{snapshot:'- heading "First account"\n'+tree,refs:{}},
    {snapshot:'- heading "Second account"\n'+tree,refs:{}},{snapshot:'Done',refs:{}}]);
  const result=await act({browser:b,scope,authorize:()=>true,intentOrSteps:'Inspect Invoices for both accounts',
    decide:async r=>({binding:r.binding,
      choice:Object.entries(r.candidates).find(([,a])=>a.text==='Invoices')?.[0]??'step_complete'})});
  assert.equal(result.returnReason,'reported_complete');
  assert.equal(b.calls.length,2);
});

test('exact tree text clicks require an untruncated observation without conflicting referenced names',()=>{
  const observation={snapshot:'- list\n  - listitem [level=1]\n    - StaticText "Invoices"',refs:{}};
  assert.equal(discoverActions({...observation,limited:true}).some(a=>a.text),false);
  assert.equal(discoverActions({...observation,refs:{e1:{role:'button',name:'Invoices'}}}).some(a=>a.text),false);
});

test('slider choices expose observed mechanics without solving an intent template',()=>{
  const observation={snapshot:'- generic\n  - generic [ref=e5] focusable [tabindex]\n  - StaticText "10"',
    refs:{e5:{role:'generic',name:'',sliderHandle:true}}};
  const goals=['Select -2 with the slider','Set the slider to negative two','Adjust the level'];
  for(const goal of goals){
    const steps=discoverActions(observation,{},goal).filter(a=>a.purpose==='adjust_slider');
    assert.deepEqual(steps.map(a=>a.key),['ArrowLeft','ArrowRight']);
    assert.ok(steps.every(a=>a.currentValue===10&&!('targetValue' in a)));
  }
  assert.equal(discoverActions({...observation,refs:{e5:{role:'generic',name:''}}}).some(a=>a.purpose==='adjust_slider'),false);
});

test('slider steps stop when repeated readbacks show no progress',async()=>{
  const observation={snapshot:'- generic [ref=e5] focusable [tabindex]\n- StaticText "10"',
    refs:{e5:{role:'generic',name:'',sliderHandle:true}}};
  const b=browser([observation]);
  const result=await run(b,choose(a=>a.purpose==='adjust_slider'&&a.key==='ArrowRight'));
  assert.equal(result.returnReason,'no_progress');
  assert.equal(b.calls.length,3);
});

test('ordinal wording does not remove other checkbox controls or change accessible names',()=>{
  const observation={snapshot:'- checkbox [checked=false, ref=e1]\n- checkbox [checked=true, ref=e2]',
    refs:{e1:{role:'checkbox',name:''},e2:{role:'checkbox',name:''}}};
  const goals=['Click the 2nd checkbox','Clear the second checkbox','Check the first, then clear the second'];
  for(const goal of goals)assert.deepEqual(discoverActions(observation,{},goal).filter(a=>a.role==='checkbox'),[
    {ref:'@e1',role:'checkbox',name:'',op:'check'},
    {ref:'@e2',role:'checkbox',name:'',op:'uncheck'}]);
});

test('observed menu labels, icons and submenu affordances remain available across tasks',()=>{
  const observation={snapshot:'- menu [ref=e1]\n  - menuitem "Save" [ref=e2]\n  - menuitem "Playback" [ref=e3]',
    refs:{e1:{role:'menu',name:''},e2:{role:'menuitem',name:'Save',menuIcon:'ui-icon-disk'},
      e3:{role:'menuitem',name:'Playback',menuParent:true}}};
  const goals=['Select Playback>Next','Click the item labeled "Next"','Find the disk icon','Save the document'];
  const expected=discoverActions(observation,{},goals[0]);
  for(const goal of goals)assert.deepEqual(discoverActions(observation,{},goal),expected);
  assert.deepEqual(expected.filter(a=>a.op==='hover').map(a=>a.name),['Save','Playback']);
  assert.deepEqual(expected.filter(a=>a.op==='hover').map(a=>a.hasSubmenu),[undefined,true]);
  assert.deepEqual(expected.filter(a=>a.op==='click'),[
    {ref:'@e2',role:'menuitem',name:'Save',op:'click',icon:'ui-icon-disk'},
    {ref:'@e3',role:'menuitem',name:'Playback',op:'click',hasSubmenu:true}]);
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

test('long textarea scrolling is grounded in one observed control across goal wording',()=>{
  const body='Agreement text. '.repeat(25);
  const observation={snapshot:`- textbox [disabled, ref=e1]: ${body}\n- textbox "Name" [disabled, ref=e2]`,
    refs:{e1:{role:'textbox',name:''},e2:{role:'textbox',name:'Name'}}};
  const goal='Scroll to the bottom of the textarea, enter the name "Truman" then press "Cancel"';
  assert.deepEqual(discoverActions(observation,{},goal).filter(a=>a.purpose==='textarea_end'),
    [{op:'scroll',ref:'@e1',role:'textbox',direction:'down',amount:1_000_000,purpose:'textarea_end'}]);
  assert.deepEqual(discoverActions(observation,{},'Read the agreement to its end'),discoverActions(observation,{},goal));
  const ambiguous={...observation,snapshot:`${observation.snapshot}\n- textbox [disabled, ref=e3]: ${body}`,
    refs:{...observation.refs,e3:{role:'textbox',name:''}}};
  assert.equal(discoverActions(ambiguous,{},goal).some(a=>a.purpose==='textarea_end'),false);
});

test('checkbox choices set the opposite observed state instead of blindly toggling',()=>{
  const actions=discoverActions({snapshot:'- checkbox "On" [checked=true, ref=e1]\n- checkbox "Off" [checked=false, ref=e2]',
    refs:{e1:{role:'checkbox',name:'On'},e2:{role:'checkbox',name:'Off'}}});
  assert.deepEqual(actions.filter(a=>a.ref).map(a=>a.op),['uncheck','check']);
});

test('named readonly long text remains scrollable but editable text is not treated as a reading area',()=>{
  const body='Read this long passage. '.repeat(20);
  const observation={snapshot:`- textbox "Reading passage" [readonly, ref=e1]: ${body}`,
    refs:{e1:{role:'textbox',name:'Reading passage'}}};
  assert.equal(discoverActions(observation).find(a=>a.purpose==='textarea_end')?.ref,'@e1');
  const editable={...observation,snapshot:observation.snapshot.replace('readonly, ','')};
  assert.equal(discoverActions(editable).some(a=>a.purpose==='textarea_end'),false);
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

test('large action sets can reach late controls without dispatching a paging gesture',async()=>{
  const refs=Object.fromEntries(Array.from({length:460},(_,i)=>['e'+i,{role:'button',name:'Item '+i}]));
  const b=browser([{snapshot:'large catalog',refs},{snapshot:'Selected item 459',refs:{}}]);
  const windows=[];
  const result=await run(b,async r=>{
    windows.push(r.candidateWindow);
    assert.ok(Object.keys(r.candidates).length<=205);
    const target=Object.entries(r.candidates).find(([,a])=>a.name==='Item 459');
    return {binding:r.binding,choice:r.history.length?'step_complete':target?.[0]??'next_controls'};
  });
  assert.equal(result.returnReason,'reported_complete');
  assert.deepEqual(windows.map(w=>w.page),[1,2,3,1]);
  assert.equal(b.calls.length,1);
  assert.equal(b.calls[0].ref,'@e459');
});

test('candidate paging preserves authorization, observation binding and decision limits',async()=>{
  const refs=Object.fromEntries(Array.from({length:450},(_,i)=>['e'+i,{role:'button',name:'Item '+i}]));
  const b=browser([{snapshot:'large catalog',refs}]);
  const visited=[];
  const result=await run(b,async r=>{
    assert.ok(Object.values(r.candidates).every(a=>a.ref!=='@e240'));
    const previews=Object.values(r.candidates).filter(a=>a.op==='candidate_page');
    assert.ok(previews.every(a=>!a.controlNames.includes('Item 240')));
    assert.ok(previews.every(a=>a.controlNames.length<=40));
    visited.push(r.candidateWindow.page);
    return {binding:r.binding,choice:r.candidates.previous_controls?'previous_controls':'next_controls'};
  },{authorize:a=>a.ref!=='@e240',budget:{maxDecisions:4}});
  assert.equal(result.returnReason,'decision_budget');
  assert.deepEqual(visited,[1,2,1,2]);
  assert.equal(b.calls.length,0);
});

test('verbose candidate names are size-paged without losing late authorized controls',async()=>{
  const refs=Object.fromEntries(Array.from({length:90},(_,i)=>['e'+i,{role:'button',name:`Item ${i} ${'description '.repeat(35)}`}])) ;
  const b=browser([{snapshot:'catalog',refs},{snapshot:'Done',refs:{}}]);let pages=0;
  const result=await run(b,async r=>{
    if(r.history.length)return {binding:r.binding,choice:'step_complete'};
    pages++;const controls=Object.entries(r.candidates).filter(([,a])=>a.ref);
    assert.ok(JSON.stringify(Object.fromEntries(controls)).length<=12000);
    for(const a of Object.values(r.candidates).filter(a=>a.op==='candidate_page'))assert.ok(a.controlNames.every(name=>name.length<=160));
    return {binding:r.binding,choice:controls.find(([,a])=>a.ref==='@e89')?.[0]??'next_controls'};
  });
  assert.equal(result.returnReason,'reported_complete');assert.ok(pages>1);
  assert.equal(b.calls.length,1);assert.equal(b.calls[0].ref,'@e89');
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

test('text entry observes debounced options without an autocomplete intent template',async()=>{
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
  {intentOrSteps:'Choose Norway from available tags using the supplied query.',suppliedValues:{prefix:'Norw'}});
  assert.equal(result.returnReason,'reported_complete');
  assert.deepEqual(calls.map(a=>a.op),['fill','click']);
  assert.equal(calls[1].name,'Norway');
  assert.ok(reads>=3);
});

test('supplied query choices and missing-input handoff remain available across paraphrases',()=>{
  const observation={snapshot:'- textbox "Tags" [ref=e1]',refs:{e1:{role:'textbox',name:'Tags'}}};
  const goals=['Enter an item that starts with "Cro" and ends with "tia".',
    'Choose Croatia using the supplied query.','Look up the requested tag.'];
  const expected=discoverActions(observation,{query:'Cro'},goals[0]);
  for(const goal of goals)assert.deepEqual(discoverActions(observation,{query:'Cro'},goal),expected);
  assert.deepEqual(expected.filter(a=>a.op==='fill').map(a=>a.value),['Cro']);
  assert.ok(expected.some(a=>a.op==='request_input'));
  assert.equal(discoverActions(observation,{},goals[0]).some(a=>a.op==='fill'),false);
});

test('native multiple selections preserve observed selections without parsing the goal',()=>{
  const observation={snapshot:'- listbox "Regions" [ref=e1]\n  - option "North" [selected, ref=e2]\n  - option "South" [ref=e3]\n  - option "West" [ref=e4]',refs:{e1:{role:'listbox',name:'Regions',multiple:true},e2:{role:'option',name:'North'},e3:{role:'option',name:'South'},e4:{role:'option',name:'West'}}};
  const actions=discoverActions(observation,{},'Add South while preserving North');
  assert.ok(actions.some(a=>a.op==='select'&&a.selection==='add'&&a.changedOption==='South'&&JSON.stringify(a.options)==='["North","South"]'));
  assert.equal(actions.some(a=>a.op==='click'&&['@e2','@e3','@e4'].includes(a.ref)),false);
  const duplicated=structuredClone(observation);duplicated.refs.e4.name='South';
  assert.equal(discoverActions(duplicated).some(a=>a.op==='select'),false);
  assert.equal(discoverActions({...observation,limited:true}).some(a=>a.op==='select'),false);
});

test('ineffective scrolling is withheld while alternative observed routes remain available',async()=>{
  const observation={snapshot:'- button "Next page" [ref=e1]',refs:{e1:{role:'button',name:'Next page'}}};
  const b=browser([observation]);let decisions=0;
  const result=await run(b,async request=>{
    const entries=Object.entries(request.candidates);
    if(decisions<4){const direction=['down','up','down','up'][decisions++];return {binding:request.binding,choice:entries.find(([,a])=>a.op==='scroll'&&a.direction===direction)[0]};}
    assert.equal(entries.some(([,a])=>a.op==='scroll'),false);
    assert.ok(entries.some(([,a])=>a.op==='click'&&a.name==='Next page'));
    return {binding:request.binding,choice:'handoff'};
  });
  assert.equal(result.actions.length,4);assert.equal(result.returnReason,'handoff');
});


test('opaque reference key order cannot page an early form behind later controls',async()=>{
  const refs={e100:{role:'button',name:'Later'},e20:{role:'textbox',name:'Note'},e2:{role:'button',name:'Save'}};
  const observation={snapshot:'- textbox "Note" [ref=e20]\n- button "Save" [ref=e2]\n- button "Later" [ref=e100]',refs};
  const actions=discoverActions(observation,{note:'Ready'}).filter(a=>['fill','click'].includes(a.op));
  assert.deepEqual(actions.map(a=>a.ref),['@e20','@e2','@e100']);
  const repeated={...observation,snapshot:observation.snapshot+'\n- textbox "Note" [ref=e20]'};
  assert.deepEqual(discoverActions(repeated,{note:'Ready'}).filter(a=>['fill','click'].includes(a.op)).map(a=>a.ref),['@e20','@e2','@e100']);
});
