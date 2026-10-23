# ✍️ Natural Writing

Help an agent draft and edit prose with fewer generic AI writing habits while preserving the writer's meaning, facts, voice, and useful detail. Use it for emails, essays, announcements, documentation, reports, and product copy.

## Install

From your project, run:

```bash
npx skills add gabeosx/agent-skills --skill natural-writing
```

Choose your agent when prompted. See the [repository installation guide](../../README.md#install-a-skill) for CLI requirements and installation scope. This skill requires no runtime tools or external services.

## Use it

Give the agent the draft or source material, the intended audience, and the change you want. A voice sample helps when you want the result to sound like a particular writer.

For example:

> Rewrite this announcement for our customers. Keep the dates and limits, use the attached email as a voice sample, and remove generic promotional phrasing.

> Review this README for AI-sounding prose. Explain the consequential edits and keep the installation steps and warnings intact.

> Proofread this passage only. Leave sentences that already work unchanged.

The skill follows the scope you request: proofreading calls for a lighter touch than rewriting. For a draft or rewrite, it returns the prose; for a review, it explains the consequential edits.

## What it checks

- Whether the content serves the reader and the document's purpose, including when rationale or history belongs.
- Repeated rhetorical templates, vague praise, unnecessary contrasts, stock openings, and redundant summaries.
- Facts, attribution, uncertainty, protected wording, and details that should survive an edit.
- Procedural checks the reader can actually perform, the distinction between routine setup and recovery, and coverage after substantial rewrites.

It preserves useful headings, lists, technical vocabulary, and distinctive voice. Its examples are contextual guidance, not a list of banned words or punctuation. It does not judge authorship, invent human experience, optimize detector scores, or promise undetectable writing.

For technical or procedural documents, combine it with the relevant domain and documentation workflow. A prose review does not verify live UI behavior, screenshots, or runtime effects.

## Guidance and evidence

Read the [agent instructions](SKILL.md), [pattern examples](references/pattern-catalog.md), [editorial judgment guide](references/editorial-judgment.md), and [procedural-writing guide](references/procedural-writing.md) for the full approach. The [research notes](references/research-notes.md) distinguish design inputs from verified claims.

Local studies retain source snapshots, failed candidates, matched drafts, and blind agent reviews. The final procedural comparison passed 30/30 assertions in each of the updated-skill, previous-skill, and no-skill conditions; all final preferences tied. Those results support usable outputs in the tested cases, without establishing a measured advantage or human preference. See the [evaluation report](https://github.com/gabeosx/agent-skills/blob/main/evaluations/natural-writing/procedural-writing/REPORT.md) and [evaluation rubric](evals/rubric.md).
