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
      ...(control.role === 'option' && parent ? { selectRef: parent.id } : {}) };
    states.set(id, state);
    stack.push({ indent, id, role: control.role });
  }
  return states;
}

const clickRoles = new Set(['button','link','tab','menuitem','radio','switch','option','treeitem']);
const inputRoles = new Set(['textbox','searchbox','combobox','spinbutton']);
export function discoverActions(observation, suppliedValues = {}) {
  const actions = [], states = controlState(observation), selects = new Set();
  for (const state of states.values()) if (state.selectRef) selects.add(state.selectRef);
  for (const [ref, control] of Object.entries(observation.refs ?? {})) {
    const state = states.get(ref) ?? {};
    if (!/^e\d+$/.test(ref) || control.disabled === true || state.disabled) continue;
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
    if (clickRoles.has(control.role) || (control.role === 'combobox' && !selects.has(ref))) actions.push({ ...base, op:'click' });
    if (control.role === 'checkbox') actions.push({ ...base, op:state.checked ? 'uncheck' : 'check' });
    if (inputRoles.has(control.role) && !selects.has(ref) && !state.readonly) {
      for (const [valueId,value] of Object.entries(suppliedValues)) {
        if (typeof value !== 'string') throw new TypeError('Supplied values must be strings');
        actions.push({ ...base, op:'fill', valueId, value });
      }
      actions.push({ ...base, op:'request_input' });
    }
    if (inputRoles.has(control.role) && !selects.has(ref)) {
      for (const key of ['Enter','ArrowDown','ArrowUp']) actions.push({ ...base, op:'press', key });
    }
  }
  actions.push({op:'scroll',direction:'down',amount:600}, {op:'scroll',direction:'up',amount:600},
    {op:'press',key:'Escape'}, {op:'back'});
  return actions;
}
