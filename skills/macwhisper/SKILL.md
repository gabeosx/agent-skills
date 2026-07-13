---
name: macwhisper
description: >
  Read and enumerate transcriptions from MacWhisper. Use when asked to check
  for new meeting transcriptions, fetch a transcript, search past recordings,
  or mark a session as processed. Does not write to Obsidian or any other
  system — use the obsidian skill for that.
allowed-tools: Bash(node macwhisper.js:*)
---

# MacWhisper Skill

Read-only access to [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) transcription sessions stored in its local SQLite database. Outputs structured JSON for downstream processing by other skills or Claude itself.

## Setup

1. Copy `.env.example` to `.env` and adjust any paths if needed (defaults work for a standard MacWhisper installation).
2. No npm install required — uses only Node.js built-ins and the system `sqlite3` CLI.

## Response Envelope

All subcommands emit a single JSON line to stdout:

```json
{ "operation": "list", "status": "ok", "results": {}, "error": null }
```

`status` is `"ok"` or `"error"`. Always check `status`.

## Subcommands

### list

```bash
node macwhisper.js list [--all] [--since <ISO-date>] [--limit <n>]
```

List sessions not yet marked as processed. Use `--all` to include already-processed sessions. Use `--since 2026-07-01` to filter by recording date.

```json
{
  "operation": "list",
  "status": "ok",
  "results": {
    "sessions": [
      {
        "id": "A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6",
        "title": "Q3 Strategy Review",
        "platform": "Zoom",
        "has_diarization": true,
        "duration": "30m",
        "duration_seconds": 1801,
        "start_time_utc": "2026-03-14T18:00:00.000Z",
        "end_time_utc": "2026-03-14T18:30:00.000Z",
        "original_filename": null,
        "processed": false
      }
    ],
    "total": 1
  }
}
```

---

### fetch

```bash
node macwhisper.js fetch <session-id>
```

Fetch a single session with its full diarized transcript. The `transcript_segments` array groups consecutive lines by speaker. The `transcript_text` field is a pre-rendered version suitable for pasting into a prompt.

The `start_time_utc` / `end_time_utc` window can be used to look up the matching calendar event (e.g. via an Outlook or Google Calendar skill) to retrieve attendee names and the meeting title.

```json
{
  "operation": "fetch",
  "status": "ok",
  "results": {
    "session": {
      "id": "A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6",
      "title": "Q3 Strategy Review",
      "platform": "Zoom",
      "has_diarization": true,
      "duration": "30m",
      "duration_seconds": 1801,
      "start_time_utc": "2026-03-14T18:00:00.000Z",
      "end_time_utc": "2026-03-14T18:30:00.000Z",
      "speakers": ["Me", "Speaker 1", "Speaker 2", "Speaker 3"],
      "transcript_segments": [
        {
          "speaker": "Speaker 1",
          "lines": [
            { "text": "Hello, let me kick things off.", "start_ms": 40, "end_ms": 5200 }
          ]
        },
        {
          "speaker": "Me",
          "lines": [
            { "text": "Thanks. I wanted to discuss...", "start_ms": 6000, "end_ms": 12400 }
          ]
        }
      ],
      "transcript_text": "**Speaker 1:** Hello, let me kick things off.\n\n**Me:** Thanks. I wanted to discuss..."
    }
  }
}
```

---

### mark-processed

```bash
node macwhisper.js mark-processed <session-id> [--note <filename>] [--account <name>]
```

Record that a session has been handled (e.g. filed in Obsidian). Updates the local state file. Use `--note` and `--account` to attach metadata for the state record.

```json
{
  "operation": "mark-processed",
  "status": "ok",
  "results": {
    "session_id": "A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6",
    "note_file": "2026-03-14 Q3 Strategy Review.md",
    "account": "acme-corp"
  }
}
```

---

### search

```bash
node macwhisper.js search "<query>"
```

Full-text search across session titles and transcript content. Falls back to a title-only substring match if the FTS index is unavailable.

---

### status

```bash
node macwhisper.js status
```

Show total / processed / unprocessed session counts and last sync time.

---

## Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_ARGS` | Missing required argument or unknown subcommand |
| `NOT_FOUND` | Session ID not found in the database |
| `OPERATION_FAILED` | Unexpected error — check `error.message` |

## State File

Processed session IDs are tracked in `macwhisper-state.json` in the **current working directory** when the skill is invoked — typically your project root. This keeps machine-local state out of the skill directory itself.

Override the path with `MACWHISPER_STATE_FILE` in `.env`. Add the state file to your project's `.gitignore`.

## Calendar Enrichment

MacWhisper stores the recording's start time and duration. Use the `start_time_utc` / `end_time_utc` from `fetch` or `list` to cross-reference your calendar and retrieve:

- The formal meeting title
- Attendee names and organisations (to replace generic "Speaker 1", "Speaker 2" labels)
- The organiser

Pass both the transcript and the matched calendar event to Claude to generate a structured meeting note.

## Workflow Example (with Obsidian)

```
1. node macwhisper.js list                 # find new sessions
2. node macwhisper.js fetch <id>           # get transcript + time window
3. [calendar skill] lookup start_time_utc  # get attendees, meeting title
4. [Claude] generate meeting note markdown
5. [obsidian skill] process <file>         # tag to client account
6. node macwhisper.js mark-processed <id> --note <file> --account <tag>
```
