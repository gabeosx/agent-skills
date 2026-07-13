#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

// Load .env from skill root
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
}

const { outputOk, outputError } = require('./lib/output');
const { getSessions, getTranscriptLines, getSpeakers, searchSessions } = require('./lib/db');
const { loadState, saveState, getProcessedIds, markProcessed } = require('./lib/state');
const { summariseSession, groupTranscript, renderTranscript } = require('./lib/format');

const subcommand = process.argv[2];

try {
  switch (subcommand) {

    // ── list ─────────────────────────────────────────────────────────────────
    // List sessions not yet marked as processed.
    // Flags: --all (include already-processed), --since <ISO date>, --limit <n>
    case 'list': {
      const all = process.argv.includes('--all');
      const sinceIdx = process.argv.indexOf('--since');
      const since = sinceIdx !== -1 ? new Date(process.argv[sinceIdx + 1]) : null;
      const limitIdx = process.argv.indexOf('--limit');
      const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : undefined;

      const state = loadState();
      const processedIds = getProcessedIds(state);
      const rows = getSessions({
        excludeIds: all ? new Set() : processedIds,
        since,
        limit,
      });

      outputOk('list', {
        sessions: rows.map(r => ({
          ...summariseSession(r),
          processed: processedIds.has(r.id),
        })),
        total: rows.length,
      });
      break;
    }

    // ── fetch ─────────────────────────────────────────────────────────────────
    // Fetch a single session with full diarized transcript.
    // Usage: macwhisper.js fetch <session-id>
    case 'fetch': {
      const id = process.argv[3];
      if (!id) return outputError('fetch', 'INVALID_ARGS', 'Usage: macwhisper.js fetch <session-id>');

      const rows = getSessions({ includeDeleted: true });
      const row = rows.find(r => r.id.toUpperCase() === id.toUpperCase());
      if (!row) return outputError('fetch', 'NOT_FOUND', `Session not found: ${id}`);

      const lines = getTranscriptLines(row.id);
      const speakers = getSpeakers(row.id);
      const segments = groupTranscript(lines);

      outputOk('fetch', {
        session: {
          ...summariseSession(row),
          speakers,
          transcript_segments: segments,
          transcript_text: renderTranscript(segments),
        },
      });
      break;
    }

    // ── mark-processed ────────────────────────────────────────────────────────
    // Record that a session has been processed (e.g. filed in Obsidian).
    // Usage: macwhisper.js mark-processed <session-id> [--note <filename>] [--account <name>]
    case 'mark-processed': {
      const id = process.argv[3];
      if (!id) return outputError('mark-processed', 'INVALID_ARGS', 'Usage: macwhisper.js mark-processed <session-id>');

      const noteIdx = process.argv.indexOf('--note');
      const accountIdx = process.argv.indexOf('--account');
      const meta = {};
      if (noteIdx !== -1) meta.note_file = process.argv[noteIdx + 1];
      if (accountIdx !== -1) meta.account = process.argv[accountIdx + 1];

      const state = loadState();
      markProcessed(state, id.toUpperCase(), meta);
      saveState(state);

      outputOk('mark-processed', { session_id: id.toUpperCase(), ...meta });
      break;
    }

    // ── search ────────────────────────────────────────────────────────────────
    // Full-text search across session titles and transcripts.
    // Usage: macwhisper.js search "<query>"
    case 'search': {
      const query = process.argv[3];
      if (!query) return outputError('search', 'INVALID_ARGS', 'Usage: macwhisper.js search "<query>"');

      const state = loadState();
      const processedIds = getProcessedIds(state);

      const rows = searchSessions(query);

      outputOk('search', {
        query,
        sessions: rows.map(r => ({
          ...summariseSession(r),
          processed: processedIds.has(r.id),
        })),
        total: rows.length,
      });
      break;
    }

    // ── status ────────────────────────────────────────────────────────────────
    // Show counts: total sessions, processed, unprocessed.
    case 'status': {
      const state = loadState();
      const processedIds = getProcessedIds(state);
      const allRows = getSessions({ includeDeleted: false });
      const unprocessed = allRows.filter(r => !processedIds.has(r.id));

      outputOk('status', {
        total_sessions: allRows.length,
        processed: processedIds.size,
        unprocessed: unprocessed.length,
        last_sync: state.last_sync || null,
      });
      break;
    }

    default:
      outputError('startup', 'INVALID_ARGS',
        `Unknown subcommand: ${subcommand || '(none)'}. Valid: list, fetch, mark-processed, search, status`);
  }
} catch (err) {
  process.stderr.write(`[macwhisper] unexpected error: ${err.stack || err.message}\n`);
  outputError(subcommand || 'startup', 'OPERATION_FAILED', err.message);
}
