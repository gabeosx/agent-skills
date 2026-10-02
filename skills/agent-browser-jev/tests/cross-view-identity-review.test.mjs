import test from 'node:test';
import assert from 'node:assert/strict';
import {objectObservations} from '../scripts/object-context.mjs';
import {createCrossViewIdentity,validateCrossViewIdentity} from '../scripts/cross-view-identity.mjs';
import {numericIdentityAnchors} from '../scripts/numeric-ledger.mjs';

const intent='Increase the selected record Charge by 20%.';
function observedWitness(){
 const before=objectObservations({snapshot:'- table\n  - row\n    - columnheader "Registry code"\n    - columnheader "Action"\n  - row\n    - cell "A17"\n    - cell "Open"\n      - link "Open" [ref=e1]',refs:{e1:{role:'link',name:'Open'}}})[0];
 const state=createCrossViewIdentity();
 state.record({action:{op:'click',role:'link',name:'Open',ref:'@e1'},before,after:{snapshot:'Detail',refs:{}},outcome:'tool_succeeded'},
  {stepIndex:0,intent,verdict:'navigation'});
 return state;
}
function detailRequest({identityOwner='record',identityVisible=true}={}){
 return {stepIndex:0,intent,crossViewWitness:observedWitness().forRequest({stepIndex:0,intent}),observation:{
  snapshot:(identityVisible?'- textbox "External code" [ref=e4]: A17\n':'')+'- textbox "Charge" [ref=e5]: 15.00',
  refs:{e4:{role:'textbox',name:'External code',inputType:'text',exactValue:'A17'},e5:{role:'textbox',name:'Charge',inputType:'text',exactValue:'15.00'}},
  objectContext:{basis:'one_observed_accessibility_tree',objects:[{id:'root',role:'document'},{id:'record',role:'form',parentId:'root'},{id:'other',role:'form',parentId:'root'}],owners:{e4:identityOwner,e5:'record'}}}};
}
const field={op:'request_input',ref:'@e5',role:'textbox',name:'Charge'};

test('review: matching identifier in a sibling form or omitted capture cannot identify the edited record',()=>{
 assert.equal(Object.values(numericIdentityAnchors(detailRequest(),field)).some(a=>a.text==='A17'),true);
 assert.deepEqual(numericIdentityAnchors(detailRequest({identityOwner:'other'}),field),{});
 assert.deepEqual(numericIdentityAnchors(detailRequest({identityVisible:false}),field),{});
});

test('review: the identity control itself cannot be a relative-edit destination',()=>{
 const request=detailRequest();
 assert.deepEqual(numericIdentityAnchors(request,{op:'request_input',ref:'@e4',role:'textbox',name:'External code'}),{});
 const action={ref:'@e4',valueOrigin:{ledger:{witness:{anchor:{text:'A17'},detail:{ref:'@e4',value:'A17'}}}}};
 assert.throws(()=>validateCrossViewIdentity(action,'A17'),e=>e.code==='JEV_NOT_DISPATCHED');
});

test('review: unknown keyboard navigation clears retained identity before resume',()=>{
 const state=observedWitness();assert.ok(state.snapshot());
 state.record({action:{op:'press',key:'Enter'},before:{},after:null,outcome:'unknown'},{stepIndex:0,intent});
 assert.equal(state.snapshot(),null);
 assert.equal(createCrossViewIdentity(state.snapshot()).forRequest({stepIndex:0,intent}),null);
});
