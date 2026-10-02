import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {callerDateAnchors,calculateCivilDate,dateValueOptions,groundedDateAction} from '../scripts/date-value.mjs';
import {valueBindingRequest,acceptValueBinding,groundedValueAction,valueBindingFrame} from '../scripts/value-binding.mjs';
import {act} from '../scripts/jev-browser.mjs';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';
const field={op:'request_input',ref:'@e1',role:'textbox',name:'Start'};
const fixture=(intent='Prepare a report for the previous calendar month. Today is April 5, 2024.',inputType='text')=>({binding:randomUUID(),intent,scope:'Only the requested date',history:[],suppliedValues:{},observation:{snapshot:'- textbox "Start" [ref=e1]',refs:{e1:{role:'textbox',name:'Start',inputType,exactValue:''}}}});
const bindingFor=(r,operation)=>{const p=valueBindingRequest(r,field),id=Object.keys(p.state.computedDates).find(id=>p.state.computedDates[id].date.operation===operation);const b=acceptValueBinding({answers:{valueSource:{type:'choice',choice:id}}},r,field,p);return {...b,ref:field.ref,frame:valueBindingFrame(r.observation)};};
test('date anchors preserve exact caller spans and reject invalid or ambiguous numeric dates',()=>{
 const goal='From 2024-02-29, compare March 5, 2024 and 6 April 2024.';
 const a=callerDateAnchors(goal);assert.deepEqual(a.map(x=>x.iso),['2024-02-29','2024-03-05','2024-04-06']);assert.ok(a.every(x=>goal.slice(x.start,x.end)===x.text));
 for(const text of ['February 29, 2023','2024-02-30','04/05/2024','today','Monday'])assert.deepEqual(callerDateAnchors(text),[]);
});
test('civil offsets handle leap days, year boundaries and explicit month-end clamping',()=>{
 assert.equal(calculateCivilDate('2024-03-01','days_before',1),'2024-02-29');
 assert.equal(calculateCivilDate('2024-01-03','weeks_before',1),'2023-12-27');
 assert.equal(calculateCivilDate('2024-01-31','months_after',1),'2024-02-29');
 assert.equal(calculateCivilDate('2024-02-29','years_after',1),'2025-02-28');
 for(const n of [0,-1,1.5,Infinity,10001])assert.equal(calculateCivilDate('2024-02-29','days_before',n),null);
 assert.equal(calculateCivilDate('2024-02-30','days_before',1),null);
 assert.equal(calculateCivilDate('1000-01-01','years_before',1000),null);
 assert.equal(calculateCivilDate('9000-01-01','years_after',1000),null);
});
test('calendar boundaries distinguish rolling periods and Monday/Sunday weeks',()=>{
 const day='2024-03-13';
 assert.equal(calculateCivilDate(day,'previous_month_start'),'2024-02-01');
 assert.equal(calculateCivilDate(day,'previous_month_end'),'2024-02-29');
 assert.equal(calculateCivilDate(day,'months_before',1),'2024-02-13');
 assert.equal(calculateCivilDate(day,'previous_year_start'),'2023-01-01');
 assert.equal(calculateCivilDate(day,'previous_year_end'),'2023-12-31');
 assert.equal(calculateCivilDate(day,'previous_week_monday_start'),'2024-03-04');
 assert.equal(calculateCivilDate(day,'previous_week_monday_end'),'2024-03-10');
 assert.equal(calculateCivilDate(day,'previous_week_sunday_start'),'2024-03-03');
 assert.equal(calculateCivilDate(day,'previous_week_sunday_end'),'2024-03-09');
});
test('calendar quarter boundaries cross years and differ from rolling quarter offsets',()=>{
 const expected=[
  ['2024-01-01','2023-10-01','2023-12-31','2024-01-01','2024-03-31'],
  ['2024-03-31','2023-10-01','2023-12-31','2024-01-01','2024-03-31'],
  ['2024-04-01','2024-01-01','2024-03-31','2024-04-01','2024-06-30'],
  ['2024-08-19','2024-04-01','2024-06-30','2024-07-01','2024-09-30'],
  ['2024-12-31','2024-07-01','2024-09-30','2024-10-01','2024-12-31']
 ];
 for(const[anchor,...dates]of expected)assert.deepEqual(['previous_quarter_start','previous_quarter_end','current_quarter_start','current_quarter_end'].map(op=>calculateCivilDate(anchor,op)),dates);
 assert.equal(calculateCivilDate('2024-08-31','quarters_before',2),'2024-02-29');
 assert.equal(calculateCivilDate('2024-08-19','quarters_before',1),'2024-05-19');
 assert.equal(calculateCivilDate('1000-01-01','previous_quarter_start'),null);
 assert.equal(calculateCivilDate('2024-08-19','fiscal_quarter_start'),null);
});
test('year-to-date offers the explicit anchor rather than a future calendar year end',()=>{
 const r=fixture('Set the end of the year-to-date period. Today is 2024-08-19.','date');
 assert.equal(calculateCivilDate('2024-08-19','anchor_date'),'2024-08-19');
 assert.equal(calculateCivilDate('2024-08-19','current_year_end'),'2024-12-31');
 const b=bindingFor(r,'anchor_date');
 assert.equal(groundedDateAction(r,{c0:field},b).value,'2024-08-19');
 assert.equal(b.date.anchor.text,'2024-08-19');
 assert.equal(groundedDateAction(r,{c0:field},{...b,value:'2024-12-31'}),null);
});
test('quarter bindings retain explicit anchor, arithmetic provenance and normal freshness checks',()=>{
 const r=fixture('Set Start to the beginning of the previous calendar quarter. Today is August 19, 2024.');
 const b=bindingFor(r,'previous_quarter_start');
 assert.equal(groundedDateAction(r,{c0:field},b).value,'April 1, 2024');
 assert.equal(b.date.operation,'previous_quarter_start');
 assert.equal(groundedDateAction({...r,intent:r.intent.replace('2024','2025')},{c0:field},b),null);
 assert.deepEqual(dateValueOptions(fixture('Use the previous calendar quarter.'),field),{});
});
test('date alternatives require an explicit anchor and an editable observed date-compatible field',()=>{
 assert.deepEqual(dateValueOptions(fixture('Use last month.'),field),{});
 assert.deepEqual(dateValueOptions(fixture('Today is04/05/2024; use last month.'),field),{});
 for(const change of [{readonly:true},{disabled:true},{inputType:'password'},{inputType:'number'},{inputType:'datetime-local'}]){const r=fixture();Object.assign(r.observation.refs.e1,change);assert.deepEqual(dateValueOptions(r,field),{});}
 const r=fixture();r.observation.snapshot='No field observed';assert.deepEqual(dateValueOptions(r,field),{});
});
test('relative-date operands exclude dates and percentage values',()=>{
 const r=fixture('Show the previous 17 days. Today is April 5, 2024; discount is 20%.');const values=Object.values(dateValueOptions(r,field));
 assert.deepEqual([...new Set(values.filter(x=>x.date.amount).map(x=>x.date.amount))],[17]);
 assert.equal(values.find(x=>x.date.operation==='days_before').value,'March 19, 2024');
});
test('date binding uses code results and rejects fabricated, stale or mismatched provenance',()=>{
 const r=fixture(),b=bindingFor(r,'previous_month_start');
 const action=groundedValueAction(r,{c0:field},b);assert.equal(action.value,'March 1, 2024');assert.equal(action.source,'date_value_binding');assert.equal(action.valueOrigin.kind,'computed_date');
 for(const change of [{value:'January 1, 2024'},{date:{...b.date,operation:'previous_year_start'}},{date:{...b.date,anchor:{...b.date.anchor,text:'invented'}}},{ref:'@e9'},{frame:'stale'}])assert.equal(groundedDateAction(r,{c0:field},{...b,...change}),null);
 assert.equal(groundedDateAction({...r,intent:r.intent.replace('2024','2025')},{c0:field},b),null);
 const changed=structuredClone(r);changed.observation.refs.e1.exactValue='Changed';assert.equal(groundedDateAction(changed,{c0:field},b),null);
});
test('native date input receives ISO while an ordinary text input receives an explicit English date',()=>{
 const r=fixture(undefined,'date'),b=bindingFor(r,'previous_month_end');assert.equal(groundedValueAction(r,{c0:field},b).value,'2024-03-31');
});
test('a selected computed date passes normal action review and a rejected input cannot be submitted',async()=>{
 for(const reject of[false,true]){
  let value='',done=false;const actions=[],browser={sessionId:randomUUID(),observe:async()=>done?{snapshot:'Saved requested date.',refs:{}}:{snapshot:`- textbox "Start" [ref=e1]: ${value}\n- button "Apply" [ref=e2]`,refs:{e1:{role:'textbox',name:'Start',exactValue:value},e2:{role:'button',name:'Apply'}}},execute:async a=>{actions.push(a);if(a.op==='fill')value=reject?'':a.value;else done=true;}};
  const api={alpha:{decisions:{create:async({decisionsRequest:r})=>{
   let answers;
   if(r.questions.source)answers={source:{type:'choice',choice:'unconstrained'},phase:{type:'choice',choice:'none'},evidence:{type:'choice',choice:'unknown'}};
   else if(Object.keys(r.questions).every(k=>/^q\d+$/.test(k)))answers=Object.fromEntries(Object.entries(r.questions).map(([id,q])=>[id,{type:'choice',choice:['none','unrelated','unknown'].find(c=>Object.hasOwn(q.criteria,c))}]));
   else if(r.questions.valueSource){const id=Object.keys(r.state.computedDates??{}).find(k=>r.state.computedDates[k].date.operation==='previous_month_start');answers={valueSource:{type:'choice',choice:id??'unknown'}};}
   else if(r.questions.actionCheck)answers={actionCheck:{type:'choice',choice:'preparation'},suggestedNext:{type:'choice',choice:'none'}};
   else if(r.questions.completion)answers={completion:{type:'choice',choice:'complete'},destinationRequirement:{type:'choice',choice:'none'},destinationState:{type:'choice',choice:'other'}};
   else{const entries=Object.entries(r.questions.action.criteria);const id=done?'step_complete':value?entries.find(([,v])=>v.includes('"name":"Apply"')&&v.includes('"op":"click"'))?.[0]:entries.find(([,v])=>v.includes('"source":"date_value_binding"'))?.[0]??entries.find(([,v])=>v.startsWith('Ask for an exact missing value'))?.[0];answers={action:{type:'choice',choice:id}};}
   return{answers,usage:{cost:.001}};
  }}}};
  const r=await act({browser,decide:jevDecider(api),intentOrSteps:'Set Start to the first day of the previous calendar month and apply. Today is April 5, 2024.',scope:'Only Start',authorize:()=>true});
  assert.ok(actions.length,JSON.stringify({reason:r.returnReason,handoff:r.handoff,decisions:r.decisions}));assert.equal(actions[0].value,'March 1, 2024');assert.equal(r.returnReason,reject?'input_not_accepted':'reported_complete');assert.equal(actions.length,reject?1:2);
 }
});
