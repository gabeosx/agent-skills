import {createHash} from 'node:crypto';
import {objectPath} from './object-context.mjs';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const validAnchor=a=>a?.kind==='readonly'&&typeof a.label==='string'&&a.label.length>0&&a.label.length<=160&&typeof a.text==='string'&&a.text.length>0&&a.text.length<=400;

// A witness records an actual row-owned navigation. It is not a collection
// registry, proof of membership, route allowlist, or inferred object identity.
export function createCrossViewIdentity(saved){
 let state=saved?structuredClone(saved):null;
 if(state&&(state.schema!==1||!Number.isSafeInteger(state.stepIndex)||state.stepIndex<0||typeof state.goalKey!=='string'||typeof state.sourceId!=='string'||!Array.isArray(state.anchors)||!state.anchors.length||state.anchors.length>24||state.anchors.some(a=>!validAnchor(a))))throw new TypeError('Invalid cross-view identity continuation');
 const snapshot=()=>state?structuredClone(state):null;
 function record(entry,{stepIndex,intent,context,verdict}){
  const locationChanged=entry.before?.location&&entry.after?.location&&digest(entry.before.location)!==digest(entry.after.location);
  if(!['click','back','open'].includes(entry.action.op)){
   if(locationChanged||verdict==='navigation'||entry.outcome!=='tool_succeeded'&&['press','select'].includes(entry.action.op))state=null;
   return;
  }
  if(entry.outcome!=='tool_succeeded'||!entry.after){state=null;return;}
  if(['back','open'].includes(entry.action.op)){state=null;return;}
  if(verdict!=='navigation'){
   if(locationChanged)state=null;
   return;
  }
  state=null;
  if(entry.action.op!=='click')return;
  const row=objectPath(entry.before,entry.action)?.path?.[0];
  if(row?.role!=='row'||row.cellsOmitted||!row.tableId||!row.cells?.length)return;
  const peers=(entry.before.objectContext?.objects??[]).filter(o=>o.role==='row'&&o.tableId===row.tableId&&o.id!==row.id);
  // A shared amount/status/color cannot become an identifier merely because
  // it is also present on a wrong detail page. Missing/truncated peer evidence
  // is kept conservative; this checks only the captured rows, not the website.
  if(peers.some(o=>o.cellsOmitted))return;
  const anchors=row.cells.filter(c=>c.readonly&&c.label&&c.text&&row.cells.filter(other=>other.text===c.text).length===1&&
    !peers.some(o=>o.cells?.some(other=>other.label===c.label&&other.text===c.text)))
    .map(c=>({kind:'readonly',label:c.label,text:c.text})).filter(validAnchor).slice(0,24);
  if(!anchors.length)return;
  const source={rowHeadings:row.headings??[],readonlyCells:row.cells.filter(c=>c.readonly).slice(0,24),
    clickedControl:{role:entry.action.role,name:String(entry.action.name??'').slice(0,160)},
    observedPeerRows:peers.length,uniqueness:'Different from same-column values in observed peer rows only; website-wide uniqueness is unassessed.',
    navigationReview:'model_assessed_navigation',transport:'successful_row_owned_click_and_fresh_readback'};
  state={schema:1,stepIndex,goalKey:digest([intent,context??'']),sourceId:digest([stepIndex,source]),anchors,source};
 }
 function forRequest({stepIndex,intent,context}){
  return state&&state.stepIndex===stepIndex&&state.goalKey===digest([intent,context??''])?snapshot():null;
 }
 return {snapshot,record,forRequest};
}

export function validateCrossViewIdentity(action,value){
 const witness=action.valueOrigin?.ledger?.witness;
 if(!witness)return;
 if(!/^@e\d+$/.test(witness.detail?.ref??'')||witness.detail.ref===action.ref||typeof value!=='string'||value!==witness.detail.value||value!==witness.anchor?.text){
  const error=new Error('Observed record identity changed before dispatch');error.code='JEV_NOT_DISPATCHED';throw error;
 }
}
