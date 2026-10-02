// A bounded directory of one already-captured accessibility tree. Descriptions
// contain observed structure, not task relevance, target identities or answers.
export function captureIndex(windows) {
  const common=new Set();
  if (windows.length>1) for (const [ref,control] of Object.entries(windows[0].refs??{}))
    if (windows.every(w=>w.refs?.[ref]?.name===control.name)) common.add(ref);
  return windows.slice(0,64).map((window,page)=>{
    const section=window.observationWindow?.section?.replace(/\s*\[[^\]]*\bref=e\d+\b[^\]]*\]/g,'');
    const names=Object.entries(window.refs??{}).filter(([ref,c])=>!common.has(ref)&&c.name&&c.role!=='option')
      .slice(0,5).map(([,c])=>c.name);
    const objects=(window.objectContext?.objects??[]).filter(o=>o.id!=='root')
      .slice(0,2).map(o=>o.headings?.[0]||o.text||o.role);
    const options=Object.values(window.refs??{}).filter(c=>c.role==='option'&&c.name);
    const optionRange=section&&section!=='Form and current selections'&&options.length
      ?[`Options: ${options[0].name} … ${options.at(-1).name}`]:[];
    const description=[section,...(optionRange.length?optionRange:objects.length?objects:names)].filter(Boolean).join(' | ').slice(0,140)
      ||window.observationWindow?.previous?.description||'Captured text and controls';
    return {page,description:String(description).slice(0,140)};
  });
}

export function captureChoices(view) {
  if (typeof view?.captureId!=='string'||!Number.isSafeInteger(view.pages)) return {};
  const choices={};
  for (const item of (view.index??[]).slice(0,64)) {
    if (!Number.isSafeInteger(item.page)||item.page<0||item.page>=view.pages||item.page===view.page) continue;
    choices[`inspect_window_${item.page}`]={op:'inspect_context',captureId:view.captureId,page:item.page,
      description:String(item.description??'').slice(0,140),alreadyInspected:view.inspectedPages?.includes(item.page)===true};
  }
  return choices;
}
