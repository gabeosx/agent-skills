'use strict';

const fs = require('fs');
const path = require('path');

function getStatePath() {
  return process.env.MACWHISPER_STATE_FILE ||
    path.join(process.cwd(), 'macwhisper-state.json');
}

function loadState() {
  const p = getStatePath();
  if (!fs.existsSync(p)) return { processed: {}, last_sync: null };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { processed: {}, last_sync: null };
  }
}

function saveState(state) {
  fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function getProcessedIds(state) {
  return new Set(Object.keys(state.processed || {}));
}

function markProcessed(state, sessionId, metadata = {}) {
  state.processed[sessionId] = {
    processed_at: new Date().toISOString(),
    ...metadata,
  };
  state.last_sync = new Date().toISOString();
}

module.exports = { loadState, saveState, getProcessedIds, markProcessed };
