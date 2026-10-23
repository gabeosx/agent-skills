# Audience and artifact boundaries

Use this when the source includes development conversations, working notes, mixed
drafts, or material written for a different audience. First decide what belongs in
the artifact; then decide how to say it. Accurate material can still be irrelevant.

## Establish the reader's job

Identify the artifact, its readers, what they already know, and what they need to
learn, decide, understand, or do. Someone new to a project may understand its domain
without knowing the team's nicknames, abandoned designs, or previous chat messages.
Explain necessary unfamiliar references; remove references whose only purpose is to
recall a discussion. Do not explain every domain term to an expert audience.

Ask of a passage: would removing it cost this reader useful understanding, an action,
a decision, necessary context, or evidence the artifact is meant to preserve? If so,
keep or clarify it. If its only value is showing the agent's effort, omit it.
This test concerns relevance, not a target length. Keep depth when the reader needs it.

Removing an irrelevant claim does not require documenting its rejection. If a
product reference's source contains unsupported praise, omit the praise and the
debate about whether it is justified. Keep an evidence assessment when the document
actually asks for readiness, risk, or evaluation. A reminder of absent evidence can
be important in a release decision and distracting in an unrelated configuration entry.

## Match the information to the document

| Artifact | Usually needs | Common contamination | Keep history when |
| --- | --- | --- | --- |
| README or getting-started guide | Purpose, supported setup, use, requirements, meaningful limits | Implementation diary, failed prototypes, explanations of routine cleanup | Compatibility, adoption, support status, or an important constraint affects the reader. |
| Technical reference | Current contract, values, semantics, errors, uncertainty where unresolved | Refactoring story, test-session narrative, tutorial or promotion in every entry | Version-specific behavior changes the contract being consulted. |
| Explanation or architecture decision record | Mechanism, rationale, alternatives, tradeoffs, conditions | Unselected meeting chatter or a usage guide substituted for the decision | The rationale and considered alternatives are part of the requested record. |
| Migration guide or changelog | Relevant old-to-new differences, affected users, required actions, consequences | Every development iteration or unsupported claims about the old version | The change itself is what the reader needs to understand. |
| Incident or evaluation report | Observations, sequence, failed attempts, uncertainty, valid and invalid evidence | Sales language, unsupported root cause, an artificially clean success story | Chronology and unsuccessful results establish causality, scope, or auditability. |
| Customer email or proposal | The recipient's problem, decision, obligations, status, next step | Internal debate, review notes, assurances about writing the message | A past event explains a commitment, impact, accountability, or decision the recipient needs. |
| Code comment | Relevant intent, invariant, constraint, non-obvious consequence | A transcript of implementation or a tutorial repeating the code | A historical reason still constrains safe maintenance or explains a regression guard. |

These are relevance guides, not mandatory section templates. Follow the user's
actual purpose and scope. A README can include useful rationale; an explanation
can include a necessary history. Do not remove text merely because it says “before”
or “originally.” Link to an existing appropriate record when helpful; don't create
extra documents or move required content out of scope just to shorten the artifact.

## Correct recurring failures

- **Process leakage:** replace a development narrative with supported current
  behavior when that is what readers need. Don't recite tests, retries, or refactors
  just to demonstrate that work was done.
- **Metacommentary:** omit notes about the author's research, editing, structure, or
  intended persuasiveness from finished copy. Keep methods when methodology is part
  of the document's evidence or reproducibility.
- **False contrasts:** don't frame a capability against a discarded design the
  reader never encountered. Preserve real alternatives, misconceptions, and changes
  affecting users.
- **Unnecessary justification:** explain a choice when its reason helps the reader
  assess a tradeoff or avoid a mistake. Ordinary implementation choices need no
  ceremonial defense.
- **Audience assumptions:** replace “the second option we discussed” with the actual
  option and the information this audience needs. Do not invent the missing referent.
- **Genre confusion:** keep an incident report evidential, a proposal persuasive
  within its evidence, and a reference usable as a reference. Do not apply one
  neutral business voice to every document.
- **Performative thoroughness:** remove accurate digressions that do not advance this
  reader's purpose. Retain material qualifications, operating limits, and necessary
  background even when they make the piece longer.

## Reframe without inventing

If notes say “we added automatic retries,” a supported rewrite is “Failed requests
are retried automatically.” The notes do not establish a retry count, interval,
error policy, or delivery guarantee. Look for current evidence if the task needs
those specifications; don't fill them from convention.

“We refactored authentication” does not imply OAuth, passwords, or any other
protocol. “We removed Redis” does not prove there are no external dependencies or
that no other cache remains. Do not convert an implementation change into a broad
absence claim. If notes disagree or distinguish shipped work from proposals,
preserve that distinction rather than making the most recent discussion a fact.

Missing source information is not necessarily a missing real-world fact. If a brief
does not supply a tracking link, that does not establish that the sender has not
received one. State the supported status, look up the missing detail when the task
calls for it and tools permit, or use an appropriate placeholder. Do not turn the
writer's limited notes into an unsupported assertion about a person's knowledge.

An architecture record may appropriately say “The service stores its queue locally
because deployments must work without a network connection,” when those facts are
supplied. A usage guide may need the resulting offline constraint and storage path;
it need not recount the meeting that selected them.

## Final artifact read

Read it as its intended recipient, without mentally supplying the development chat.
Check unresolved references, unexplained team terminology, unnecessary backstory,
and process notes. Check the reverse too: has selecting for relevance removed a
limitation, rationale, failure, attribution, or historical distinction this document
exists to communicate? Repair selection errors before adjusting cadence.
