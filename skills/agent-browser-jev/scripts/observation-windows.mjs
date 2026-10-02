// Lossless line windows for a large accessibility capture that cannot be split
// by object ownership. Keep ancestor lines, prose and control refs together.
// This never selects content by goal text, site identity or success vocabulary.
import {objectContextForWindows} from './object-context.mjs';

function withoutNativeOptionEchoes(data) {
  const lines=String(data.snapshot??'').split('\n'),stack=[],owned=new Set();
  for(const line of lines){
    const indent=line.match(/^\s*/)[0].length;
    while(stack.length&&stack.at(-1).indent>=indent)stack.pop();
    if(/^\s*- option\b/.test(line)&&/\bref=e\d+\b/.test(line)&&
      /^\s*- MenuListPopup(?:\s|$)/.test(stack.at(-1)?.line??'')&&
      /^\s*- combobox\b/.test(stack.at(-2)?.line??''))owned.add(line.trimStart());
    if(line.trimStart().startsWith('- '))stack.push({line,indent});
  }
  // Chromium can repeat native options at the root. Slicing such echoes into
  // another window loses their select owner and incorrectly offers a click.
  // Remove only exact echoes; distinct state/text and custom options stay.
  return {...data,snapshot:lines.filter(line=>!(/^\- option\b/.test(line)&&owned.has(line))).join('\n')};
}

function lineWindows(data,{maxChars=24000,objectContext}={}) {
  const lines=String(data.snapshot??'').split('\n');
  if(lines.length<2)return null;
  const refFor=line=>line.match(/^\s*- \S+(?:\s+"(?:\\.|[^"\\])*")?\s+((?:\[[^\]]*\]\s*)+)/)?.[1]?.match(/\bref=(e\d+)\b/)?.[1];
  const render=indices=>{
    const refs={};
    for(const i of indices){const ref=refFor(lines[i]);if(ref&&data.refs?.[ref])refs[ref]=data.refs[ref];}
    return {snapshot:indices.map(i=>lines[i]).join('\n'),refs,limited:true,
      ...(objectContext?{objectContext:objectContext(refs)}:{})};
  };
  const pages=[],stack=[];let indices=[];
  const budget=maxChars-1800;
  for(let i=0;i<lines.length;i++){
    const indent=lines[i].match(/^\s*/)[0].length;
    while(stack.length&&stack.at(-1).indent>=indent)stack.pop();
    const next=[...indices,i];
    if(JSON.stringify(render(next)).length>budget){
      if(!indices.length)return null;
      pages.push(render(indices));
      indices=[...stack.map(n=>n.index),i];
      if(JSON.stringify(render(indices)).length>budget)return null;
    }else indices=next;
    if(lines[i].trimStart().startsWith('- '))stack.push({indent,index:i});
  }
  if(indices.length)pages.push(render(indices));
  if(!pages.length)return null;
  const previews=pages.map((p,page)=>({page,description:Object.values(p.refs)
    .filter(c=>c.name).slice(0,4).map(c=>c.name).join(' | ').slice(0,200)}));
  return pages.map((p,page)=>({...p,observationWindow:{kind:'accessibility_lines',page,pages:pages.length,
    sourceLimited:data.limited===true,coverage:'Contiguous lines with repeated ancestors; one captured page, not website coverage.',
    previous:previews[page-1]??null,next:previews[page+1]??null}}));
}

// A closed native select exposes its whole option inventory in Chromium's tree.
// Keep the form and selected values together, and expose the exact inventories
// in separate inspection windows. Expanded or custom pickers stay in tree order.
function nativeSelectSections(data) {
  const lines=String(data.snapshot??'').split('\n'), stack=[], inventories=[];
  const moved=new Set();
  for(let i=0;i<lines.length;i++){
    const line=lines[i],indent=line.match(/^\s*/)[0].length;
    while(stack.length&&stack.at(-1).indent>=indent)stack.pop();
    if(/^\s*- MenuListPopup(?:\s|$)/.test(line)){
      const owner=stack.at(-1);
      if(owner&&/^\s*- combobox\b/.test(lines[owner.index])&&/\bexpanded=false\b/.test(lines[owner.index])){
        let end=i+1;while(end<lines.length&&lines[end].match(/^\s*/)[0].length>indent)end++;
        const options=lines.slice(i+1,end).filter(x=>/^\s*- option\b/.test(x));
        if(options.length>=50){
          const parent=stack.at(-2), labelStart=parent&&/^\s*- generic(?:\s|$)/.test(lines[parent.index])&&owner.index-parent.index<12?parent.index+1:owner.index;
          const ancestors=stack.map(x=>x.index).filter(n=>n<labelStart);
          inventories.push({indices:[...ancestors,...Array.from({length:i-labelStart+1},(_,n)=>labelStart+n),...Array.from({length:end-i-1},(_,n)=>i+1+n)],
            label:lines[owner.index].trim().slice(0,180)});
          for(let j=i+1;j<end;j++){
            if(!/\bselected(?:=true)?(?:,|\])/.test(lines[j]))moved.add(j);
          }
        }
      }
    }
    if(line.trimStart().startsWith('- '))stack.push({index:i,indent});
  }
  if(!inventories.length)return null;
  const sections=[{indices:lines.map((_,i)=>i).filter(i=>!moved.has(i)),label:'Form and current selections'},...inventories];
  return sections.map(s=>({...data,snapshot:s.indices.map(i=>lines[i]).join('\n'),section:s.label}));
}

export function observationWindows(data,options={}) {
  data=withoutNativeOptionEchoes(data);
  options={...options,objectContext:objectContextForWindows(data)};
  const sections=nativeSelectSections(data);
  if(!sections){const pages=lineWindows(data,options);return pages?.length>1?pages:null;}
  const pages=[];
  for(const section of sections){
    const windows=lineWindows(section,options);
    if(!windows)return null;
    pages.push(...windows.map(w=>({...w,section:section.section})));
  }
  const preview=(w,page)=>({page,description:w.section});
  return pages.map(({section,...w},page)=>({...w,observationWindow:{...w.observationWindow,
    kind:'form_and_native_options',page,pages:pages.length,section,
    coverage:'Form with current selections; closed native option inventories in separate windows of the same capture. All other text retained. This is not website coverage.',
    previous:page?preview(pages[page-1],page-1):null,
    next:page+1<pages.length?preview(pages[page+1],page+1):null}}));
}
