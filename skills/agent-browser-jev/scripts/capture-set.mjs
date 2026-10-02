// Reconstruct only the structural evidence from one browser snapshot capture.
// This says nothing about website pagination or semantic task coverage.
export function createCaptureSet(){
 let identity=null,anchor=0,restored=false;const pages=new Map();
 function observe(r){
  const ob=r.observation,w=ob.observationWindow;
  if(!w?.captureId||!(w.pages>1)){identity=null;pages.clear();return {observation:ob};}
  const id=JSON.stringify([r.sessionId,r.stepIndex,r.intent,w.captureId]);if(id!==identity){identity=id;anchor=w.page;restored=false;pages.clear();}
  if(!Number.isSafeInteger(w.pages)||w.pages>8||w.sourceLimited!==false||!Number.isSafeInteger(w.totalObjects))return {observation:ob};
  pages.set(w.page,ob);
  if(pages.size<w.pages){
   const unseen=Array.from({length:w.pages},(_,i)=>i).filter(i=>!pages.has(i));const target=unseen.sort((a,b)=>Math.abs(a-w.page)-Math.abs(b-w.page))[0];
   const direction=target>w.page?'next':'previous',choice=`inspect_${direction}`;
   return r.candidates[choice]?.op==='inspect_context'?{choice,modelCalled:false,reason:'Inspect each section of this capture once before binding a complete target set.'}:{observation:ob};
  }
  // Gathering evidence must not silently move the legacy selector to the last
  // section. Return to the original section once before semantic decisions.
  if(!restored){
   if(w.page!==anchor){const choice=anchor>w.page?'inspect_next':'inspect_previous';if(r.candidates[choice]?.op==='inspect_context')return {choice,modelCalled:false,reason:'Restore original section after evidence collection.'};return {observation:ob};}
   restored=true;
  }
  const objects=new Map(),owners={},refs={};const snapshots=[];
  for(const [index,p] of [...pages].sort(([a],[b])=>a-b)){
   if(p.observationWindow.pages!==w.pages||p.observationWindow.totalObjects!==w.totalObjects||p.observationWindow.sourceLimited!==false)return {observation:ob};
   for(const o of p.objectContext.objects){if(objects.has(o.id)&&JSON.stringify(objects.get(o.id))!==JSON.stringify(o))return {observation:ob};objects.set(o.id,o);}
   for(const [ref,owner] of Object.entries(p.objectContext.owners)){if(owners[ref]&&owners[ref]!==owner)return {observation:ob};owners[ref]=owner;refs[ref]=p.refs[ref];}
   snapshots.push(`Captured section ${index+1}/${w.pages}\n${p.snapshot}`);
  }
  if(objects.size-1!==w.totalObjects||objects.size>200)return {observation:ob};
  const snapshot=snapshots.join('\n');if(snapshot.length>220000)return {observation:ob};
  return {observation:{snapshot,refs,limited:false,objectContext:{basis:'complete_structural_windows_of_one_capture',objects:[...objects.values()],owners},captureCoverage:{captureId:w.captureId,sections:w.pages,complete:true,websiteCoverage:'unassessed'}}};
 }
 function route(r,objectId){
  const current=r.observation.observationWindow;if(!current)return null;
  const target=[...pages].find(([,ob])=>ob.objectContext.objects.some(o=>o.id===objectId))?.[0];if(target===undefined||target===current.page)return null;
  const choice=target>current.page?'inspect_next':'inspect_previous';return r.candidates[choice]?.op==='inspect_context'?choice:null;
 }
 return {observe,route};
}
