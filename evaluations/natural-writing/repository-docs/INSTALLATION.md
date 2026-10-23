# Published installation check

Natural Writing 1.0.0 was installed from GitHub commit
[`ac8173c`](https://github.com/gabeosx/agent-skills/commit/ac8173c), after pushing the
skill and README rewrites to `main`.

The README command was exercised in a disposable project with the agent and prompt
answers supplied explicitly:

```bash
npx skills add gabeosx/agent-skills --skill natural-writing -a codex -y
```

Skills CLI 1.7.4 on Node.js 26.12.1 exited successfully and copied the skill into
`.agents/skills/natural-writing`. Installed-file enumeration and SHA-256 readback
match every Git-tracked file in the published skill. The installed listing identifies Codex,
project scope, and `gabeosx/agent-skills` as the source. This exercises installation;
it does not prove automatic host triggering.

Full-depth discovery from GitHub finds all seven active skills, includes Natural
Writing, and excludes archived Jev. One discovery command attempted the unsupported
combination `--list --json` and exited 1. That error is retained; the supported
`--list --full-depth` command then passed. The first installation succeeded. Its subsequent file comparison incorrectly included an ignored `.DS_Store` from the working copy, and cleanup removed that test project before verification completed. A second disposable installation qualified the corrected Git-tracked-file comparison; both runs and the incomplete first verification are retained.

See [the hash/readback record](installation.json) and
[CLI readbacks](installation-readbacks.json), [verification failure](installation-check-failure.json), and [corrected install readback](corrected-install-readback.json). The separate
[coverage review](coverage-review.md) records source fidelity and repaired README
errors. Public READMEs were revised; frozen research, raw study evidence, and
historical release entries were preserved. Runtime code was unchanged.

Only the task-owned temporary install project, public export, archive-validation
copy, Python validation environment, npm cache, and helper files were removed.
Pre-existing installed workspace skills and `skills-lock.json` were left untouched.
The follow-up publication adds evidence and changelog records; it does not change
the installed skill fingerprint.
