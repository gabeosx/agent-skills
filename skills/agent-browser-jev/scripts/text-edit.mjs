// Literal composition, not a classifier: the model chooses whether the caller
// requested preservation. Never trim, summarize or reconstruct existing text.
export const MAX_EDIT_TEXT = 8192;
export function appendLine(existing, addition) {
  if (typeof existing !== 'string' || typeof addition !== 'string' || !addition ||
      existing.length + addition.length + 1 > MAX_EDIT_TEXT) return null;
  return existing + (existing && !existing.endsWith('\n') ? '\n' : '') + addition;
}
export function appendAction(base, control, valueId, addition) {
  if (control.role !== 'textbox' || typeof control.exactValue !== 'string' || !control.exactValue) return null;
  // Numeric scalars need replacement or arithmetic, not line composition.
  // This does not infer the requested calculation or manufacture its result.
  if (/^\s*[-+]?\d+(?:\.\d+)?\s*$/.test(control.exactValue) &&
      /^\s*[-+]?\d+(?:\.\d+)?\s*$/.test(addition)) return null;
  const value = appendLine(control.exactValue, addition);
  return value === null ? null : {...base, op:'fill', source:'observed_append_line',
    valueId, value, addition, expectedValue:control.exactValue};
}
export function validateAppend(action, currentValue) {
  if (action.source !== 'observed_append_line' || typeof action.expectedValue !== 'string' ||
      action.value !== appendLine(action.expectedValue, action.addition))
    throw new Error('Invalid append composition');
  if (currentValue !== action.expectedValue) {
    const error = new Error('Observed field changed before append');
    error.code = 'JEV_NOT_DISPATCHED';
    throw error;
  }
}
