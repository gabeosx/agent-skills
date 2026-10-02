import test from 'node:test';
import assert from 'node:assert/strict';
import {jevDecider} from '../scripts/agent-browser-jev.mjs';
import {createNumericLedger} from '../scripts/numeric-ledger.mjs';
import {groundedValueAction} from '../scripts/value-binding.mjs';
function request(overrides={}){
 const field={op:'request_input',ref:'@e2',role:'textbox',name:'Charge'};
 return {binding:'probe',sessionId:'probe',stepIndex:0,intent:'Increase Charge by 12% on Cove. Leave Allowance unchanged.',scope:'Only requested edits',context:'',suppliedValues:{},history:[],numericLedger:createNumericLedger().snapshot(),
 observation:{snapshot:'- heading "Cove record"\n- textbox "Record code" [ref=e1]: L81\n- textbox "Charge" [ref=e2]: 25.00',refs:{e1:{role:'textbox',name:'Record code',readonly:true,inputType:'text',exactValue:'L81'},e2:{role:'textbox',name:'Charge',inputType:'text',exactValue:'25.00'}}},candidates:{field,handoff:{op:'handoff'}},...overrides};
}
function mock({unknown=false}={}){const payloads=[];return {payloads,api:{alpha:{decisions:{create:async({decisionsRequest:p})=>{payloads.push(p);let answers;
 if(p.questions.source)answers={source:{type:'choice',choice:'unconstrained'},evidence:{type:'choice',choice:'unknown'},phase:{type:'choice',choice:'none'}};
 else if(p.questions.valueSource){if(unknown)answers={valueSource:{type:'choice',choice:'unknown'}};else {const [anchor]=Object.entries(p.state.numericIdentityEvidence.anchors).find(([,a])=>a.kind==='readonly');answers=Object.fromEntries(Object.entries({valueSource:'derived:0:percent_add',numericIdentity:anchor,numericTarget:'new_target'}).map(([id,choice])=>[id,{type:'choice',choice}]));}}
 else if(p.questions.action)answers={action:{type:'choice',choice:'handoff'}};
 else throw Error('Unexpected '+Object.keys(p.questions));
 return {answers,usage:{cost:.001}};
 }}}}};}
test('supported existing numeric field gets a full advisory binding before action ranking, without dispatch',async()=>{const m=mock(),d=jevDecider(m.api),r=request();let b;for(let i=0;i<6&&!b;i++){const x=await d(r);assert.equal(x.assessment,true);b=x.valueBinding;}assert.ok(b);assert.equal(groundedValueAction(r,r.candidates,b).value,'28.00');assert.equal(m.payloads.some(p=>p.questions.action),false);assert.deepEqual(r.numericLedger.entries,[]);assert.ok(m.payloads.find(p=>p.questions.valueSource).questions.numericTarget);});
test('unknown advisory computation does not force input_required or suppress the normal action choice',async()=>{const m=mock({unknown:true}),d=jevDecider(m.api),r=request();await d(r);const proposed=await d(r);assert.equal(proposed.interpretations[0].kind,'numeric_value_probe_proposal');const unknown=await d(r);assert.equal(unknown.assessment,true);assert.equal(unknown.choice,undefined);assert.equal(unknown.valueBinding,undefined);await d(r);assert.equal(m.payloads.at(-1).questions.action.type,'choice');assert.equal(m.payloads.filter(p=>p.questions.valueSource).length,1);});
test('readonly, sensitive, unsupported numeric sources and nonnumeric goals get no arithmetic probe',async()=>{for(const patch of [{readonly:true},{disabled:true},{inputType:'password'},{exactValue:'1e3'}]){const r=request();Object.assign(r.observation.refs.e2,patch);const m=mock(),d=jevDecider(m.api);await d(r);await d(r);assert.equal(m.payloads.some(p=>p.questions.valueSource),false);assert.ok(m.payloads.at(-1).questions.action);}const r=request({intent:'Open this record and leave its values unchanged.'}),m=mock(),d=jevDecider(m.api);await d(r);await d(r);assert.equal(m.payloads.some(p=>p.questions.valueSource),false);});
test('a pending advisory field proof cannot survive changed permissions or source capture',async()=>{for(const mode of ['permission','source']){const r=request(),m=mock(),d=jevDecider(m.api);await d(r);await d(r);const next=structuredClone(r);if(mode==='permission')next.candidates={handoff:{op:'handoff'}};else{next.observation.refs.e2.exactValue='invalid';next.observation.snapshot+='\n- StaticText "changed"';}await d(next);assert.equal(m.payloads.some(p=>p.questions.valueSource),false);}});
