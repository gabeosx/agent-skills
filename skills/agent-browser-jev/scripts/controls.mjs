// Parse agent-browser's accessibility serialization, not a site's DOM or business rules.
// The indentation belongs to the snapshot format; refs are always supplied by the browser.
export function controlState(observation) {
  const states = new Map(), stack = [];
  for (const line of (observation.snapshot ?? '').split('\n')) {
    const match = line.match(/^(\s*)- .*?\[.*?\bref=(e\d+)\b/);
    const indent = line.match(/^\s*/)[0].length;
    if (!line.trimStart().startsWith('- ')) continue;
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    // Chromium exposes a native select popup as MenuListPopup. An ARIA
    // listbox/combobox alone does not establish a native HTML select.
    if (/^- MenuListPopup(?:\s|$)/.test(line.trimStart())) {
      const owner = [...stack].reverse().find(s => s.role === 'combobox');
      if (owner) stack.push({indent, id:owner.id, role:'native-options'});
    }
    if (!match) continue;
    const id = match[2], control = observation.refs?.[id];
    if (!control) continue;
    const parent = [...stack].reverse().find(s => s.role === 'native-options');
    const flags = [...line.matchAll(/\[([^\]]*)\]/g)].map(m => m[1]).join(',');
    const state = { disabled: /\bdisabled(?:=true)?(?:,|$)/.test(flags),
      checked: /\bchecked(?:=true)?(?:,|$)/.test(flags),
      selected: /\bselected(?:=true)?(?:,|$)/.test(flags),
      readonly: /\breadonly(?:=true)?(?:,|$)/.test(flags),
      clickable: /\bclickable\b/.test(line),
      file: control.role === 'button' && /:\s*(?:No file chosen|\d+ files? selected)\s*$/i.test(line),
      ...(control.role === 'option' && parent ? { selectRef: parent.id } : {}) };
    // Some snapshots repeat native options at the root after their popup tree.
    // Keep the structural parent from the first occurrence so they remain
    // native select choices rather than becoming misleading click targets.
    if (!states.get(id)?.selectRef) states.set(id, state);
    stack.push({ indent, id, role: control.role });
  }
  return states;
}

const clickRoles = new Set(['button','link','tab','menuitem','menuitemcheckbox','menuitemradio','radio','switch','option','treeitem']);
const inputRoles = new Set(['textbox','searchbox','combobox','spinbutton']);
const validIsoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;

function clickableLabels(snapshot) {
  const labels=new Map(),stack=[];
  for(const line of (snapshot??'').split('\n')){
    const indent=line.match(/^\s*/)[0].length;
    while(stack.length&&stack.at(-1).indent>=indent)stack.pop();
    const text=line.trimStart().match(/^- StaticText "([^"]+)"/);
    if(text&&stack.length&&!labels.has(stack.at(-1).ref))labels.set(stack.at(-1).ref,text[1]);
    const match=line.trimStart().match(/^- (?:generic|listitem) \[[^\]]*\bref=(e\d+)\b[^\]]*\] clickable\b/);
    if(match)stack.push({indent,ref:match[1]});
  }
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

function requestedTextareaScroll(observation, intent) {
  if (typeof intent !== 'string' || !/\bscroll\s+to\s+the\s+bottom\s+of\s+(?:the|a)\s+textarea\b/i.test(intent)) return null;
  const matches = [];
  for (const line of (observation.snapshot ?? '').split('\n')) {
    const match = line.trimStart().match(/^- textbox \[disabled, ref=(e\d+)\]:\s*(.{300,})$/);
    if (match && observation.refs?.[match[1]]?.role === 'textbox') matches.push(match[1]);
  }
  return matches.length === 1 ? `@${matches[0]}` : null;
}

function requestedTreeTarget(observation, intent) {
  const name = typeof intent === 'string' ? intent.match(/\b(?:folder|file) named "([^"\r\n]{1,80})"/i)?.[1] : null;
  if (!name || !/(?:^|\n)\s*- list(?:\s|$)/.test(observation.snapshot ?? '')) return null;
  const lines = (observation.snapshot ?? '').split('\n');
  const exactText = lines.filter(line => line.trimStart() === `- StaticText ${JSON.stringify(name)}`);
  if (exactText.length !== 1) return { name, textVisible: false };
  const textIndex = lines.indexOf(exactText[0]);
  const textIndent = lines[textIndex].match(/^\s*/)[0].length;
  for (let index = textIndex - 1; index >= 0; index--) {
    const indent = lines[index].match(/^\s*/)[0].length;
    if (indent >= textIndent) continue;
    const parent = lines[index].trimStart();
    if (/^- listitem \[level=\d+[^\]]*\]/.test(parent))
      return { name, textVisible: true, unreferenced: !/\bref=e\d+\b/.test(parent) };
    break;
  }
  return { name, textVisible: false };
}

function requestedSliderStep(observation, intent) {
  const targetText = typeof intent === 'string' ? intent.match(/\bSelect (-?\d{1,3}) with the slider\b/i)?.[1] : null;
  if (targetText === null || targetText === undefined) return null;
  const target = Number(targetText), lines = (observation.snapshot ?? '').split('\n'), matches = [];
  for (let index = 0; index < lines.length - 1; index++) {
    const line = lines[index], match = line.trimStart().match(/^- generic \[ref=(e\d+)\] focusable \[tabindex\]/);
    if (!match || observation.refs?.[match[1]]?.sliderHandle !== true) continue;
    const indent = line.match(/^\s*/)[0].length;
    const next = lines[index + 1], nextIndent = next.match(/^\s*/)[0].length;
    const readout = next.trimStart().match(/^- StaticText "(-?\d{1,3})"$/);
    if (nextIndent !== indent || !readout) continue;
    matches.push({ ref:`@${match[1]}`, current:Number(readout[1]) });
  }
  if (matches.length !== 1 || Math.abs(target - matches[0].current) > 40 || target === matches[0].current) return null;
  return { op:'press', ref:matches[0].ref, role:'generic', name:'slider',
    key:target < matches[0].current ? 'ArrowLeft' : 'ArrowRight',
    currentValue:matches[0].current, targetValue:target, purpose:'adjust_slider' };
}

function requestedOrdinalCheckbox(observation, intent) {
  const match = typeof intent === 'string' ? intent.match(/\bclick the (\d{1,2})(st|nd|rd|th) checkbox\b/i) : null;
  if (!match) return null;
  const refs = [...(observation.snapshot ?? '').matchAll(/^\s*- checkbox(?: "[^"]*")? \[[^\]\n]*\bref=(e\d+)\b[^\]\n]*\]/gm)]
    .map(found=>found[1]).filter(ref=>observation.refs?.[ref]?.role==='checkbox');
  const ordinal = Number(match[1]);
  return {ref:ordinal>0 && refs.length<=20 && new Set(refs).size===refs.length ? refs[ordinal-1] : null,
    name:`${match[1]}${match[2]} checkbox`};
}

export function discoverActions(observation, suppliedValues = {}, intent = '', priorTableValue = null) {
  const actions = [], states = controlState(observation), selects = new Set();
  const labels=clickableLabels(observation.snapshot);
  const tableValue=requestedTableValue(observation,intent) ?? priorTableValue;
  const requestedPrefix=typeof intent==='string' ? intent.match(/\bstarts? with\s+"([^"]{1,80})"/i)?.[1] : null;
  const prefixValue=requestedPrefix && Object.values(suppliedValues).includes(requestedPrefix) ? requestedPrefix : null;
  const editableTextRefs=Object.entries(observation.refs ?? {}).filter(([ref,control])=>
    ['textbox','searchbox'].includes(control.role) && !control.disabled && !states.get(ref)?.disabled);
  const prefixFieldRef=prefixValue && editableTextRefs.length===1 ? editableTextRefs[0][0] : null;
  const textareaScrollRef=requestedTextareaScroll(observation,intent);
  const sliderStep=requestedSliderStep(observation,intent);
  if (sliderStep) actions.push(sliderStep);
  const ordinalCheckbox=requestedOrdinalCheckbox(observation,intent);
  const treeTarget=requestedTreeTarget(observation,intent);
  if (treeTarget?.textVisible && treeTarget.unreferenced)
    actions.push({op:'click',role:'listitem',name:treeTarget.name,text:treeTarget.name,purpose:'observed_tree_text'});
  if (textareaScrollRef) actions.push({op:'scroll',ref:textareaScrollRef,role:'textbox',
    direction:'down',amount:2000,purpose:'textarea_end'});
  const menuPath=typeof intent==='string'&&/\bselect\s+[^\n]+>[^\n]+/i.test(intent)
    ?intent.match(/\bselect\s+([^\n]+)/i)[1].split('>').map(part=>part.trim()) : [];
  const intermediateMenuNames=new Set(menuPath.slice(0,-1));
  const requestedMenuLabel=typeof intent==='string' ? intent.match(/\bitem labeled "([^"]{1,80})"/i)?.[1] : null;
  const requestedMenuIcon=typeof intent==='string' ? intent.match(/\bitem with the "(ui-icon-[a-z0-9-]{1,60})" icon\b/i)?.[1] : null;
  const menuVisible=Object.values(observation.refs ?? {}).some(control=>control.role==='menu');
  const menuTargetVisible=requestedMenuLabel && Object.values(observation.refs ?? {}).some(control=>
    control.role==='menuitem' && control.name===requestedMenuLabel);
  const exploreMenu=Boolean(menuVisible && requestedMenuLabel && !menuTargetVisible);
  const iconTargetVisible=requestedMenuIcon && Object.values(observation.refs ?? {}).some(control=>
    control.role==='menuitem' && control.menuIcon===requestedMenuIcon);
  const exploreIconMenu=Boolean(menuVisible && requestedMenuIcon && !iconTargetVisible);
  const hoverRelevant = /\bhover\b/i.test(observation.snapshot ?? '');
  const dates = Object.entries(suppliedValues).filter(([,value])=>validIsoDate(value));
  const groups = dates.length ? nativeDateGroups(observation) : [];
  const dateParts = new Set(groups.flatMap(group=>Object.values(group.refs).map(ref=>ref.slice(1))));
  for (const group of groups) for (const [valueId,value] of dates) {
    actions.push({op:'set_date',role:'date',name:group.name,refs:group.refs,valueId,value});
  }
  for (const state of states.values()) if (state.selectRef) selects.add(state.selectRef);
  const customOptionsPresent = Object.entries(observation.refs ?? {}).some(([ref,control]) =>
    control.role === 'option' && !states.get(ref)?.selectRef);
  for (const [ref, control] of Object.entries(observation.refs ?? {})) {
    const state = states.get(ref) ?? {};
    if (!/^e\d+$/.test(ref) || control.disabled === true || state.disabled) continue;
    // Chromium exposes native date input segments as spinbuttons. Generic fill
    // reports success on those virtual nodes without changing the input value.
    if (dateParts.has(ref)) continue;
    const base = { ref:`@${ref}`, role:control.role, name:control.name || labels.get(ref) || '' };
    if (state.selectRef) {
      const parent = observation.refs[state.selectRef], parentState = states.get(state.selectRef) ?? {};
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
        (state.clickable && ['generic','listitem'].includes(control.role))) {
      const treeBranch = treeTarget && control.role === 'listitem';
      if ((!treeBranch || (treeTarget.textVisible ? base.name === treeTarget.name : control.expandable === true)) &&
          (control.role!=='menuitem' || ((!requestedMenuLabel || base.name===requestedMenuLabel) &&
            (!requestedMenuIcon || control.menuIcon===requestedMenuIcon))))
        actions.push({ ...base, op:'click',
          ...(treeBranch && !treeTarget.textVisible ? {purpose:'expand_tree_branch'} : {}),
          ...(control.role==='menuitem' && requestedMenuIcon ? {purpose:'matching_menu_icon'} : {}) });
      if (hoverRelevant || (control.role==='menuitem'&&intermediateMenuNames.has(base.name)) ||
          (control.role==='menuitem'&&exploreMenu) ||
          (control.role==='menuitem'&&exploreIconMenu&&control.menuParent===true))
        actions.push({ ...base, op:'hover',
          ...(intermediateMenuNames.has(base.name)?{purpose:'reveal_submenu'}:
            exploreMenu&&control.role==='menuitem'?{purpose:'explore_submenu'}:
            exploreIconMenu&&control.role==='menuitem'&&control.menuParent===true?{purpose:'reveal_icon_submenu'}:{}) });
    }
    if (control.role === 'checkbox' && (!ordinalCheckbox || ref===ordinalCheckbox.ref) &&
        !(ordinalCheckbox && state.checked))
      actions.push({ ...base, name:ordinalCheckbox?.name ?? base.name,
        op:state.checked ? 'uncheck' : 'check',
        ...(ordinalCheckbox ? {purpose:'ordinal_checkbox'} : {}) });
    if (inputRoles.has(control.role) && !selects.has(ref) && !state.readonly) {
      for (const [valueId,value] of Object.entries(suppliedValues)) {
        if (typeof value !== 'string') throw new TypeError('Supplied values must be strings');
        actions.push({ ...base, op:'fill', valueId, value,
          ...(ref===prefixFieldRef && value===prefixValue ? {purpose:'autocomplete_prefix'} : {}) });
      }
      if (tableValue && ['textbox','searchbox'].includes(control.role))
        actions.push({ ...base, op:'fill', valueId:`observed table: ${tableValue.label}`,
          value:tableValue.value, source:tableValue.source??'observed_table' });
      const currentLine=(observation.snapshot ?? '').split('\n').find(line=>line.includes(`ref=${ref}]`));
      const fieldEmpty=!currentLine?.match(/\]:\s*(\S.*)$/);
      if (!(ref===prefixFieldRef && fieldEmpty)) actions.push({ ...base, op:'request_input' });
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
