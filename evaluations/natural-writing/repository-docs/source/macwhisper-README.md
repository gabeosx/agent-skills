# MacWhisper Skill

Read-only access to [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) transcription sessions stored in its local SQLite database. Outputs structured JSON so other skills or Claude itself can process, summarize, and file meeting notes.

It complies with the [Agent Skills specification](https://agentskills.io/specification).

## Features

- **List unprocessed sessions** — returns new recordings not yet marked as handled, with UTC start/end times for calendar enrichment
- **Fetch full transcripts** — diarized, speaker-grouped, with Whisper hallucination filtering (Cyrillic watermarks, all-caps screen artifacts, non-Latin confabulation)
- **Search** — keyword search across session titles and full transcript text
- **State tracking** — marks sessions as processed so they don't re-appear in future `list` runs; state file lives in your project root, not the skill directory
- **Zero configuration** — works out of the box with a standard MacWhisper installation; all paths default to MacWhisper's standard locations

## Requirements

- macOS with [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) installed
- Node.js (built-ins only — no `npm install` required)
- `sqlite3` CLI (ships with macOS)

## Setup

1. Drop the `macwhisper/` directory into your agent's skills folder.
2. No `.env` needed for a standard MacWhisper install. If you need to override any path, copy `.env.example` to `.env` and uncomment the relevant line.
3. Add `macwhisper-state.json` to your project's `.gitignore`.

## Usage

Run from the skill directory:

```bash
node macwhisper.js list                          # new, unprocessed sessions
node macwhisper.js list --since 2026-07-01       # sessions from a date onwards
node macwhisper.js fetch <session-id>            # full transcript for one session
node macwhisper.js search "keyword"              # search titles + transcript text
node macwhisper.js mark-processed <id> \
  --note "2026-07-13 Meeting.md" \
  --account acme-corp                            # mark session as filed
node macwhisper.js status                        # counts: total / processed / unprocessed
```

All subcommands emit a single JSON line to stdout. See `SKILL.md` for the full response schema.

## Calendar Enrichment

Each session includes `start_time_utc` and `end_time_utc`. Pass these to a calendar skill to look up the formal meeting title, attendee names, and organiser — useful for replacing generic "Speaker 1" labels in the diarized transcript.

## Workflow Example (with Obsidian)

```
1. node macwhisper.js list                 # find new sessions
2. node macwhisper.js fetch <id>           # get transcript + time window
3. [calendar skill] lookup start_time_utc  # get attendees, meeting title
4. [Claude] generate meeting note markdown
5. [obsidian skill] tag to client account
6. node macwhisper.js mark-processed <id> --note <file> --account <tag>
```

## Hallucination Filtering

Whisper sometimes confabulates non-speech content: Cyrillic subtitle watermarks, Icelandic/Nordic text fragments, and all-caps UI elements it "reads" off the screen. The skill silently drops these lines before returning the transcript, so downstream note generation isn't polluted by noise.

## State File

Processed session IDs are tracked in `macwhisper-state.json` in the **current working directory** when the skill is invoked (typically your project root). Override with `MACWHISPER_STATE_FILE` in `.env`. The file is listed in `.gitignore` — it is machine-local and should not be committed.
