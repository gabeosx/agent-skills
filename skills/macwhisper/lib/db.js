'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

function getDbPath() {
  return process.env.MACWHISPER_DB_PATH ||
    path.join(os.homedir(), 'Library', 'Application Support', 'MacWhisper', 'Database', 'main.sqlite');
}

function sqliteJson(sql) {
  const dbPath = getDbPath();
  const result = spawnSync('sqlite3', ['-json', dbPath], {
    input: sql,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.error) throw new Error(`sqlite3 spawn failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`SQLite query failed: ${(result.stderr || '').trim()}`);
  }
  const out = result.stdout.trim();
  return out ? JSON.parse(out) : [];
}

/**
 * List transcription sessions.
 * @param {Set<string>} [excludeIds] - hex session IDs to omit (already processed)
 * @param {object} [opts]
 * @param {Date}   [opts.since]  - only return sessions after this date
 * @param {number} [opts.limit]  - max results
 * @param {boolean}[opts.includeDeleted] - include soft-deleted sessions
 */
function getSessions({ excludeIds = new Set(), since, limit, includeDeleted = false } = {}) {
  const whereDeleted = includeDeleted ? '' : 'AND s.dateDeleted IS NULL';
  const rows = sqliteJson(`
    SELECT
      hex(s.id)            AS id,
      s.dateCreated        AS created_at,
      s.userChosenTitle    AS user_title,
      s.aiTitle            AS ai_title,
      s.originalFilename   AS original_filename,
      s.hasBeenDiarized    AS has_diarization,
      s.playbackDuration   AS playback_duration,
      r.date               AS meeting_start,
      r.appName            AS platform,
      r.bundleIdentifier   AS bundle_id,
      r.duration           AS meeting_duration
    FROM session s
    LEFT JOIN recordedmeeting r ON hex(s.recordedMeetingID) = hex(r.id)
    WHERE s.isTransient = 0
      AND s.transcriptionDidSucceed = 1
      ${whereDeleted}
    ORDER BY COALESCE(r.date, s.dateCreated) ASC
  `);

  let results = rows.filter(r => !excludeIds.has(r.id));
  if (since) results = results.filter(r => new Date(toUtcStr(r.meeting_start || r.created_at)) >= since);
  if (limit) results = results.slice(0, limit);
  return results;
}

/**
 * Get diarized transcript lines for a session, ordered by position.
 */
function getTranscriptLines(sessionId) {
  return sqliteJson(`
    SELECT
      tl.text        AS text,
      tl.start       AS start_ms,
      tl.end         AS end_ms,
      tl.orderIndex  AS order_index,
      sp.name        AS speaker
    FROM transcriptline tl
    LEFT JOIN speaker sp ON hex(tl.speakerID) = hex(sp.id)
    WHERE hex(tl.sessionId) = '${sessionId}'
    ORDER BY tl.orderIndex ASC
  `);
}

/**
 * Get all speaker names for a session.
 */
function getSpeakers(sessionId) {
  const rows = sqliteJson(`
    SELECT DISTINCT sp.name AS name
    FROM session_speaker ss
    JOIN speaker sp ON hex(ss.speakerID) = hex(sp.id)
    WHERE hex(ss.sessionID) = '${sessionId}'
  `);
  return rows.map(r => r.name);
}

/**
 * Search sessions by keyword — checks title and full transcript text.
 */
function searchSessions(query) {
  const escaped = query.replace(/'/g, "''");
  return sqliteJson(`
    SELECT
      hex(s.id)            AS id,
      s.dateCreated        AS created_at,
      s.userChosenTitle    AS user_title,
      s.aiTitle            AS ai_title,
      s.originalFilename   AS original_filename,
      s.hasBeenDiarized    AS has_diarization,
      s.playbackDuration   AS playback_duration,
      r.date               AS meeting_start,
      r.appName            AS platform,
      r.bundleIdentifier   AS bundle_id,
      r.duration           AS meeting_duration
    FROM session s
    LEFT JOIN recordedmeeting r ON hex(s.recordedMeetingID) = hex(r.id)
    WHERE (
      s.userChosenTitle LIKE '%${escaped}%'
      OR s.aiTitle       LIKE '%${escaped}%'
      OR s.fullText      LIKE '%${escaped}%'
    )
      AND s.isTransient = 0
      AND s.transcriptionDidSucceed = 1
      AND s.dateDeleted IS NULL
    ORDER BY COALESCE(r.date, s.dateCreated) DESC
  `);
}

/** Ensure a datetime string is treated as UTC for Date parsing. */
function toUtcStr(s) {
  if (!s) return s;
  return s.includes('Z') || s.includes('+') ? s : s + 'Z';
}

module.exports = { getSessions, getTranscriptLines, getSpeakers, searchSessions, toUtcStr };
