# MacWhisper Skill

Read transcription sessions from [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper)'s local SQLite database and return JSON for summaries, meeting notes, or other tools. The skill leaves the database unchanged. Marking a session as processed writes a separate local state file.

## Requirements and installation

You need macOS with MacWhisper installed, Node.js, and the `sqlite3` CLI supplied with macOS. The script uses Node.js built-ins; there are no npm dependencies to install.

```bash
npx skills add gabeosx/agent-skills --skill macwhisper
```

Choose your agent when prompted. See the [repository installation guide](../../README.md#install-a-skill) for the skills CLI's requirements and installation scope.

A standard MacWhisper installation needs no configuration. To override the database path, state-file path, or microphone label, copy [.env.example](.env.example) to `.env` in the installed skill directory and uncomment the settings you need. The default database is `~/Library/Application Support/MacWhisper/Database/main.sqlite`.

Add `macwhisper-state.json` to your project's `.gitignore`. Its default location is the working directory where you invoke the script. To keep state with your project, run commands from that project using the script's installed path; running from the skill directory stores state there instead. `MACWHISPER_STATE_FILE` overrides that location.

## Commands

Replace `/path/to/macwhisper` below with the installed skill directory. Run `list` to get session IDs, then use an ID with `fetch` or `mark-processed`.

```bash
node /path/to/macwhisper/macwhisper.js list
node /path/to/macwhisper/macwhisper.js list --since 2026-07-01
node /path/to/macwhisper/macwhisper.js fetch <session-id>
node /path/to/macwhisper/macwhisper.js search "keyword"
node /path/to/macwhisper/macwhisper.js status
```

`list` returns sessions not yet marked as processed; add `--all` to include handled sessions. `fetch` returns speaker-grouped text with transcript filtering. `search` uses SQL substring matching over titles and stored transcript text. `status` returns session counts and the last sync time.

Each command emits one JSON line. Read its `status`: `ok` indicates success; `error` means the operation failed. On an error, use `error.message` to identify the cause before continuing. The [skill instructions](SKILL.md) document response fields and error codes.

## File a meeting note

1. Run `list` and `fetch` for the recording you want.
2. Use `start_time_utc` and `end_time_utc` with a calendar tool to find the matching event. Its title, organiser, and attendees can help interpret generic speaker labels.
3. Draft and save the note with your writing or notes tool. This skill does not write to Obsidian or another notes system.
4. After saving, record the session as handled:

```bash
node /path/to/macwhisper/macwhisper.js mark-processed <session-id> \
  --note "2026-07-13 Meeting.md" \
  --account acme-corp
```

The state file stores the processed ID and optional note and account metadata, keeping the session out of later default `list` results. It is local state and should not be committed.

## Transcript filtering

The script drops whole lines containing characters outside U+0000–U+024F, as well as lines matching its all-caps and other filters. This can remove legitimate speech, including non-Latin languages and English lines containing curly punctuation or em dashes. Use the original recording or MacWhisper transcript when checking completeness or accuracy.
