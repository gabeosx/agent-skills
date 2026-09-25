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
      file: control.role === 'button' && /:\s*(?:No file chosen|\d+ files? selected)\s*$/i.test(line),
      ...(control.role === 'option' && parent ? { selectRef: parent.id } : {}) };
    states.set(id, state);
    stack.push({ indent, id, role: control.role });
  }
  return states;
}

const clickRoles = new Set(['button','link','tab','menuitem','menuitemcheckbox','menuitemradio','radio','switch','option','treeitem']);
const inputRoles = new Set(['textbox','searchbox','combobox','spinbutton']);
const validIsoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;

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

export function discoverActions(observation, suppliedValues = {}) {
  const actions = [], states = controlState(observation), selects = new Set();
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
    const base = { ref:`@${ref}`, role:control.role, name:control.name ?? '' };
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
    if (clickRoles.has(control.role) || (control.role === 'combobox' && !selects.has(ref))) {
      actions.push({ ...base, op:'click' });
      if (hoverRelevant) actions.push({ ...base, op:'hover' });
    }
    if (control.role === 'checkbox') actions.push({ ...base, op:state.checked ? 'uncheck' : 'check' });
    if (inputRoles.has(control.role) && !selects.has(ref) && !state.readonly) {
      for (const [valueId,value] of Object.entries(suppliedValues)) {
        if (typeof value !== 'string') throw new TypeError('Supplied values must be strings');
        actions.push({ ...base, op:'fill', valueId, value });
      }
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
