// Narrow DOM metadata for browser-referenced clickable images. Jev interprets
// these strings; code never assigns a semantic meaning to a CSS class or file.
export const iconAttributes=['alt','title','aria-label','class','src'];
export function iconReferences(snapshot,refs){
 const found=[];
 for(const line of String(snapshot??'').split('\n')){
  const match=line.match(/^\s*- image(?:\s+"(?:\\.|[^"\\])*")?\s+((?:\[[^\]]*\]\s*)+)clickable\b/);
  const ref=match?.[1].match(/\bref=(e\d+)\b/)?.[1];
  if(ref&&refs?.[ref]?.role==='image'&&!found.includes(ref))found.push(ref);
 }
 return found;
}
export function iconEvidence(attributes){
 const result={};
 for(const key of iconAttributes){
  const value=attributes[key];if(typeof value!=='string'||!value.trim())continue;
  if(key==='src'){
   try{
    const url=new URL(value,'https://relative.invalid/');if(!['http:','https:'].includes(url.protocol))continue;
    const name=url.pathname.split('/').at(-1);if(name)result.sourceFile=name.slice(0,160);
   }catch{/* No source hint when the observed value is not a normal URL. */}
  }else result[key]=value.trim().replace(/\s+/g,' ').slice(0,160);
 }
 return Object.keys(result).length?result:null;
}
