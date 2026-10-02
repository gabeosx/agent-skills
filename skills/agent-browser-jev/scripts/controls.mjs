// Parse agent-browser's accessibility serialization, not a site's DOM or business rules.
// The indentation belongs to the snapshot format; refs are always supplied by the browser.
import {iconReferences} from './icon-evidence.mjs';
import {appendAction} from './text-edit.mjs';

function observedRow(line) {
  // Parse browser metadata only. Words such as "clickable" or "[ref=e1]"
  // inside an accessible name or a field value are ordinary page text.
  const match=line.match(/^(\s*)- ([A-Za-z][A-Za-z0-9_-]*)(?:\s+("(?:\\.|[^"\\])*"))?\s+((?:\[[^\]\r\n]*\]|(?:clickable|focusable)\b)(?:\s+(?:\[[^\]\r\n]*\]|(?:clickable|focusable)\b))*)/);
  if(!match)return null;
  const metadata=match[4],ref=metadata.match(/\bref=(e\d+)\b/)?.[1];
  if(!ref)return null;
  let name='';
  if(match[3])try{name=JSON.parse(match[3]);}catch{/* Invalid serialized names do not supply labels. */}
  return {indent:match[1].length,role:match[2],ref,metadata,
    name,
    clickable:/\bclickable\b/.test(metadata.replace(/\[[^\]]*\]/g,''))};
}

export function controlState(observation) {
  const states = new Map(), stack = [];
  for (const line of (observation.snapshot ?? '').split('\n')) {
    const row = observedRow(line);
    const indent = line.match(/^\s*/)[0].length;
    if (!line.trimStart().startsWith('- ')) continue;
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    // Chromium exposes a native select popup as MenuListPopup. An ARIA
    // listbox/combobox alone does not establish a native HTML select.
    if (/^- MenuListPopup(?:\s|$)/.test(line.trimStart())) {
      const owner = [...stack].reverse().find(s => s.role === 'combobox');
      if (owner) {
        if(states.has(owner.id))states.get(owner.id).nativeSelect=true;
        stack.push({indent, id:owner.id, role:'native-options'});
      }
    }
    if (!row) continue;
    const id = row.ref, control = observation.refs?.[id];
    if (!control || control.role !== row.role) continue;
    // A compound combobox can expose a display textbox or a separate editable
    // child. The wrapper is a picker trigger, not another text destination.
    if(['textbox','searchbox'].includes(control.role)){
      const owner=[...stack].reverse().find(s=>s.role==='combobox');
      if(owner&&states.has(owner.id))states.get(owner.id).hasTextChild=true;
    }
    const parent = [...stack].reverse().find(s => s.role === 'native-options');
    const flags = [...row.metadata.matchAll(/\[([^\]]*)\]/g)].map(m => m[1]).join(',');
    const state = { disabled: /\bdisabled(?:=true)?(?:,|$)/.test(flags),
      checked: /\bchecked(?:=true)?(?:,|$)/.test(flags),
      selected: /\bselected(?:=true)?(?:,|$)/.test(flags),
      readonly: control.readonly===true || /\breadonly(?:=true)?(?:,|$)/.test(flags),
      clickable: row.clickable,
      file: control.role === 'button' && /:\s*(?:No file chosen|\d+ files? selected)\s*$/i.test(line),
      ...(control.role === 'option' && parent ? { selectRef: parent.id } : {}) };
    // Some snapshots repeat native options at the root after their popup tree.
    // Keep the structural parent from the first occurrence so they remain
    // native select choices rather than becoming misleading click targets.
    if (!states.get(id)?.selectRef) states.set(id, state);
    stack.push({ indent, id, role:control.role==='listbox'&&control.multiple===true?'native-options':control.role });
  }
  return states;
}

const clickRoles = new Set(['button','link','tab','menuitem','menuitemcheckbox','menuitemradio','radio','switch','option','treeitem']);
const inputRoles = new Set(['textbox','searchbox','combobox','spinbutton']);
const validIsoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;

function clickableLabels(snapshot,refs) {
  const labels=new Map(),pieces=new Map(),stack=[];
  for(const line of (snapshot??'').split('\n')){
    if(!line.trimStart().startsWith('- '))continue;
    const indent=line.match(/^\s*/)[0].length;
    while(stack.length&&stack.at(-1).indent>=indent)stack.pop();
    const row=observedRow(line),valid=row&&refs?.[row.ref]?.role===row.role;
    if(valid&&row.clickable&&row.name)labels.set(row.ref,row.name.slice(0,240));
    const text=line.trimStart().match(/^- StaticText ("(?:\\.|[^"\\])*")(?=\s|$)/);
    // A separately referenced child control owns its own text. Unreferenced
    // layout wrappers do not prevent collecting the clickable node's label.
    const owner=[...stack].reverse().find(node=>node.ref);
    if(text&&owner?.clickable&&(!valid||row.role==='StaticText'&&!row.clickable)){
      try{
        const parts=pieces.get(owner.ref)??[];
        if(parts.length<16){parts.push(JSON.parse(text[1]));pieces.set(owner.ref,parts);}
      }catch{/* Invalid serialized text is not a label. */}
    }
    stack.push({indent,...(valid?{ref:row.ref,clickable:row.clickable}:{})});
  }
  for(const [ref,parts] of pieces)if(!labels.has(ref))labels.set(ref,parts.join(' ').replace(/\s+/g,' ').trim().slice(0,240));
  return labels;
}

function nativeDateGroups(observation) {
  const groups = [];
  let group;
  for (const line of (observation.snapshot ?? '').split('\n')) {
    const indent = line.match(/^\s*/)[0].length, content = line.trimStart();
    if (group && indent <= group.indent) {
      if (Object.keys(group.refs).length === 3) groups.push(group);
      group = undefined;
    }
    const date = content.match(/^- Date "([^"]+)"/);
    if (date) { group = { indent, name:date[1], refs:{} }; continue; }
    if (!group) continue;
    const spin = content.match(/^- spinbutton "([^"]+)" \[ref=(e\d+)\]/);
    if (!spin || observation.refs?.[spin[2]]?.role !== 'spinbutton') continue;
    const unit = ['month','day','year'].find(x=>new RegExp(`\\b${x}\\b`,'i').test(spin[1]));
    if (unit) group.refs[unit] = `@${spin[2]}`;
  }
  if (group && Object.keys(group.refs).length === 3) groups.push(group);
  return groups;
}

export function requestedTableValue(observation, intent) {
  if (typeof intent !== 'string') return null;
  const valueGoal = intent.match(/\bvalue of\s+(?:"([^"]{1,80})"|([a-z][a-z0-9 _-]{0,79}?))\s+(?:into|in)\s+(?:the|a)\b/i);
  const columnGoal = intent.match(/\bcopy\s+the\s+([a-z][a-z0-9 _-]{0,39}?)\s+for\s+([a-z][a-z0-9 _-]{0,79}?)\s+into\s+(?:the|a)\b/i);
  if (!valueGoal && !columnGoal) return null;
  const label=(valueGoal?.[1] ?? valueGoal?.[2] ?? columnGoal?.[2]).trim();
  const wanted = label.replace(/\s+/g, ' ').toLowerCase();
  const wantedColumn=columnGoal?.[1]?.trim().replace(/\s+/g, ' ').toLowerCase();
  let tableIndent = -1, row = null, headers=[];
  const matches = [];
  const finishRow = () => {
    if (row?.length === 2 && row[0].name.trim().replace(/\s+/g, ' ').toLowerCase() === wanted &&
        (!wantedColumn || headers[1]?.toLowerCase()===wantedColumn) &&
        row[1].name && row[1].name.length <= 256) matches.push(row[1].name);
    row = null;
  };
  for (const line of (observation.snapshot ?? '').split('\n')) {
    const indent = line.match(/^\s*/)[0].length, content = line.trimStart();
    if (row && indent <= row.indent) finishRow();
    if (tableIndent >= 0 && indent <= tableIndent) tableIndent = -1;
    if (/^- table(?:\s|$)/.test(content)) { tableIndent = indent; headers=[]; continue; }
    if (tableIndent < 0) continue;
    const header=content.match(/^- columnheader "([^"]+)" \[ref=e\d+\]/);
    if (header) { headers.push(header[1].trim().replace(/\s+/g,' ')); continue; }
    if (/^- row(?:\s|$)/.test(content)) { row = []; row.indent = indent; continue; }
    const cell = content.match(/^- gridcell\b.*\[ref=(e\d+)\]/);
    if (row && cell && indent > row.indent && observation.refs?.[cell[1]]?.role === 'gridcell')
      row.push(observation.refs[cell[1]]);
  }
  finishRow();
  return matches.length === 1 ? { label, value:matches[0] } : null;
}

// These affordances depend on observed widget structure, never task templates.
function observedTextareaScroll(observation) {
  const matches = [], states = controlState(observation);
  for (const line of (observation.snapshot ?? '').split('\n')) {
    const match = line.trimStart().match(/^- textbox(?: "[^"\r\n]*")? \[[^\]]*\bref=(e\d+)\b[^\]]*\]:\s*(.{300,})$/);
    const state = match && states.get(match[1]);
    if (match && observation.refs?.[match[1]]?.role === 'textbox' &&
        (state?.disabled || state?.readonly)) matches.push(match[1]);
  }
  return matches.length === 1 ? `@${matches[0]}` : null;
}

function unreferencedTextItems(observation) {
  // A truncated tree cannot establish uniqueness for a global exact-text click.
  if (observation.limited) return [];
  const lines = (observation.snapshot ?? '').split('\n'), items = [];
  const counts = new Map(), stack = [];
  for (const line of lines) {
    const text = line.trimStart().match(/^- StaticText "([^"\r\n]{1,80})"$/)?.[1];
    if (text) counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  for (const line of lines) {
    const indent = line.match(/^\s*/)[0].length, content = line.trimStart();
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    const text = content.match(/^- StaticText "([^"\r\n]{1,80})"$/)?.[1];
    const tree=stack.at(-1)?.unreferencedItem;
    const graphic=stack.some(parent=>parent.graphicRoot)&&!stack.some(parent=>parent.referenced);
    if (text && counts.get(text) === 1 && (tree||graphic) &&
        !Object.values(observation.refs ?? {}).some(control=>control.name===text))
      items.push({op:'click',role:tree?'listitem':'text',name:text,text,
        purpose:tree?'observed_tree_text':'observed_graphic_text'});
    stack.push({indent, unreferencedItem:/^- listitem \[level=\d+[^\]]*\]/.test(content) && !/\bref=e\d+\b/.test(content),
      graphicRoot:/^- SvgRoot(?:\s|$)/.test(content),referenced:/\bref=e\d+\b/.test(content)});
  }
  return items;
}

function observedSliderSteps(observation) {
  const lines = (observation.snapshot ?? '').split('\n'), actions = [];
  for (let index = 0; index < lines.length - 1; index++) {
    const line = lines[index], match = line.trimStart().match(/^- generic \[ref=(e\d+)\] focusable \[tabindex\]/);
    if (!match || observation.refs?.[match[1]]?.sliderHandle !== true ||
        observation.refs[match[1]].disabled === true) continue;
    const next = lines[index + 1];
    if (next.match(/^\s*/)[0].length !== line.match(/^\s*/)[0].length) continue;
    const readout = next.trimStart().match(/^- StaticText "(-?\d{1,9}(?:\.\d{1,6})?)"$/);
    if (!readout) continue;
    for (const key of ['ArrowLeft','ArrowRight']) actions.push({op:'press',ref:`@${match[1]}`,
      role:'generic',name:'slider',key,currentValue:Number(readout[1]),purpose:'adjust_slider'});
  }
  return actions;
}

export function discoverActions(observation, suppliedValues = {}, intent = '', priorTableValue = null) {
  const actions = [], states = controlState(observation), selects = new Set();
  const clickableImages=new Set(iconReferences(observation.snapshot,observation.refs));
  const labels=clickableLabels(observation.snapshot,observation.refs);
  const tableValue=requestedTableValue(observation,intent) ?? priorTableValue;
  const textareaScrollRef=observedTextareaScroll(observation);
  actions.push(...observedSliderSteps(observation), ...unreferencedTextItems(observation));
  if (textareaScrollRef) actions.push({op:'scroll',ref:textareaScrollRef,role:'textbox',
    direction:'down',amount:1_000_000,purpose:'textarea_end'});
  const hoverRelevant = /\bhover\b/i.test(observation.snapshot ?? '');
  const dates = Object.entries(suppliedValues).filter(([,value])=>validIsoDate(value));
  const groups = nativeDateGroups(observation);
  const dateParts = new Set(groups.flatMap(group=>Object.values(group.refs).map(ref=>ref.slice(1))));
  for (const group of groups) for (const [valueId,value] of dates) {
    actions.push({op:'set_date',role:'date',name:group.name,refs:group.refs,valueId,value});
  }
  for (const [ref,state] of states) {
    if (state.selectRef) selects.add(state.selectRef);
    if (state.nativeSelect) selects.add(ref);
  }
  const customOptionsPresent = Object.entries(observation.refs ?? {}).some(([ref,control]) =>
    control.role === 'option' && !states.get(ref)?.selectRef);
  // Accessibility refs are opaque identifiers; JSON key order can be lexical.
  // Preserve the observed page sequence so paging does not separate an early
  // form from its controls just because e100 sorts before e20. Unlisted refs
  // remain available after observed refs, without inventing their position.
  const positions = new Map();
  for (const match of (observation.snapshot ?? '').matchAll(/\bref=(e\d+)\b/g))
    if (!positions.has(match[1])) positions.set(match[1], positions.size);
  const orderedControls = Object.entries(observation.refs ?? {}).sort(([a], [b]) =>
    (positions.get(a) ?? Infinity) - (positions.get(b) ?? Infinity));
  for (const [ref, control] of orderedControls) {
    const state = states.get(ref) ?? {};
    if (!/^e\d+$/.test(ref) || control.disabled === true || state.disabled) continue;
    // Chromium exposes native date input segments as spinbuttons. Generic fill
    // reports success on those virtual nodes without changing the input value.
    if (dateParts.has(ref)) continue;
    const base = { ref:`@${ref}`, role:control.role, name:control.name || labels.get(ref) || '',
      ...(control.role==='link'&&control.destination?{destination:control.destination}:{}),
      ...(control.role==='image'&&control.iconEvidence?{observedIcon:control.iconEvidence}:{}),
      ...(control.role==='textbox'&&control.textHints?{observedTextHints:control.textHints}:{}) };
    if(control.role==='spinbutton'&&!state.readonly){
      const line=(observation.snapshot??'').split('\n').find(line=>
        new RegExp(`^\\s*- spinbutton(?:\\s+"(?:\\\\.|[^"\\\\])*")?\\s+\\[[^\\]]*\\bref=${ref}\\b`).test(line));
      const value=line?.match(/\]:\s*(-?\d{1,9}(?:\.\d{1,6})?)\s*$/)?.[1];
      if(value!==undefined)for(const key of ['ArrowUp','ArrowDown'])
        actions.push({...base,op:'press',key,currentValue:Number(value),purpose:'adjust_numeric'});
    }
    if (state.selectRef) {
      const parent = observation.refs[state.selectRef], parentState = states.get(state.selectRef) ?? {};
      if(parent.multiple===true){
        const options=Object.entries(observation.refs).filter(([id,c])=>c.role==='option'&&states.get(id)?.selectRef===state.selectRef);
        const names=options.map(([,c])=>c.name);
        if(!observation.limited&&!parentState.disabled&&names.every(Boolean)&&new Set(names).size===names.length){
          const selected=options.filter(([id])=>states.get(id)?.selected).map(([,c])=>c.name);
          const next=state.selected?selected.filter(name=>name!==control.name):[...selected,control.name];
          if(next.length)actions.push({op:'select',ref:`@${state.selectRef}`,role:parent.role,name:parent.name??'',
            options:next,changedOption:control.name,selection:state.selected?'remove':'add',currentSelection:selected});
        }
        continue;
      }
      // Duplicate labels cannot safely identify a native option by label.
      const duplicates = Object.entries(observation.refs).filter(([id,c]) => states.get(id)?.selectRef === state.selectRef && c.name === control.name);
      if (!state.selected && !parentState.disabled && duplicates.length === 1 && control.name) {
        actions.push({ op:'select', ref:`@${state.selectRef}`, role:parent.role, name:parent.name ?? '', option:control.name });
      }
      continue;
    }
    if (state.file) {
      for (const [valueId,value] of Object.entries(suppliedValues)) {
        if (typeof value !== 'string') throw new TypeError('Supplied values must be strings');
        if (/^(?:\/|[A-Za-z]:[\\/])/.test(value)) actions.push({ ...base, op:'upload', valueId, path:value });
      }
      continue;
    }
    if (clickRoles.has(control.role) || (control.role === 'combobox' && !selects.has(ref)) ||
        (state.clickable && !inputRoles.has(control.role) && !['checkbox','LabelText'].includes(control.role))||clickableImages.has(ref)) {
      actions.push({ ...base, op:'click',
        ...(control.expandable === true ? {purpose:'expand_tree_branch'} : {}),
        ...(control.menuIcon ? {icon:control.menuIcon} : {}),
        ...(control.menuParent === true ? {hasSubmenu:true} : {}) });
      if (hoverRelevant || control.role === 'menuitem')
        actions.push({ ...base, op:'hover',
          ...(control.role === 'menuitem' ? {purpose:'reveal_submenu'} : {}),
          ...(control.menuParent === true ? {hasSubmenu:true} : {}) });
    }
    if (control.role === 'checkbox')
      actions.push({ ...base, op:state.checked ? 'uncheck' : 'check' });
    // Readonly prevents typing, not interaction. A current readonly text field
    // may reveal a picker when clicked; its effect remains for Jev to inspect.
    if(control.role==='textbox'&&state.readonly)
      actions.push({...base,op:'click',purpose:'inspect_readonly_field'});
    if (inputRoles.has(control.role) && !selects.has(ref) && !state.readonly && !state.hasTextChild) {
      for (const [valueId,value] of Object.entries(suppliedValues)) {
        if (typeof value !== 'string') throw new TypeError('Supplied values must be strings');
        actions.push({ ...base, op:'fill', valueId, value });
        const append=appendAction(base,control,valueId,value);
        if(append)actions.push(append);
      }
      if (tableValue && ['textbox','searchbox'].includes(control.role))
        actions.push({ ...base, op:'fill', valueId:`observed table: ${tableValue.label}`,
          value:tableValue.value, source:tableValue.source??'observed_table' });
      actions.push({ ...base, op:'request_input' });
    }
    // Autocomplete arrow navigation can commit a visually similar but wrong
    // record. Click grounded options; leave keyboard-only pickers to the caller.
    // Enter remains useful for ordinary text/search form submission.
    if (['textbox','searchbox'].includes(control.role) && !selects.has(ref) && !customOptionsPresent) {
      actions.push({ ...base, op:'press', key:'Enter' });
    }
  }
  actions.push({op:'scroll',direction:'down',amount:600}, {op:'scroll',direction:'up',amount:600},
    {op:'press',key:'Escape'}, {op:'back'});
  return actions;
}
