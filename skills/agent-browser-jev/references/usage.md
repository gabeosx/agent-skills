> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# Agent invocation contract

The installed skill tells the agent when and how to invoke `scripts/run.mjs`. The helper is a non-interactive, one-shot process: arguments describe one bounded browser goal, and stdout contains one JSON result. It does not accept or create task, policy, result or evidence files.

The caller supplies the goal, not a required click sequence or end-to-end plan. Jev should discover ordinary navigation, target identity, sort/filter settings and prerequisites from the site. For “Subscribe to the top forum,” an observed ranking may resolve the target; absent or conflicting ranking evidence remains an explicit ambiguity. Caller recovery after delegation is assistance even when it provides only reasoning and Jev performs every gesture.

## New task

```sh
node /path/to/skill/scripts/run.mjs --session reports \
  --url https://example.com/reports \
  --intent "Create the requested report and leave it saved as a draft" \
  --value 'name=Weekly operations'
```

`--url` is optional and accepts only a caller-supplied HTTP or HTTPS starting address. Omit it to use the current page. Authentication remains an ordinary agent-browser operation. Repeat `--value name=text` for every exact non-secret value; everything after the first equals sign is preserved literally.

For upload, pass the user-authorized absolute path as a value. The helper offers it only to an observed file control and never opens a native chooser or invents a path. The path is sent to Jev with the other supplied values, so do not use uploads or task values for secrets.

| Argument | Default / behavior |
| --- | --- |
| `--intent` | Complete plain-language goal for a new task |
| `--session` | `default`; use an existing agent-browser session |
| `--binary` | Environment, saved setup binary, then `agent-browser` on `PATH` |
| `--url` | Optional starting page for a new task |
| `--value name=text` | Exact non-secret value; repeatable |
| `--allow operation` | Permit one operation on any matching control; repeatable |
| `--allow 'operation:Exact name'` | Permit one operation only on that accessible control name |
| `--max-actions` | 30; the decision budget is twice this value |
| `--timeout` | 120000 milliseconds |
| `--context` | Trusted context from the calling agent |
| `--resume-token` | Continue an incomplete call; mutually exclusive with `--intent` |

Supported allowlist operations are `click`, `hover`, `fill`, `upload`, `select`, `set_date`, `check`, `uncheck`, `scroll`, `press` and `back`. A caller-supplied starting URL remains allowed. When no `--allow` rule is present, all supported operations are available. When at least one rule is present, unmatched gestures are not offered. A matching `fill` rule also permits the helper to request a missing value for that field.

## Result

Every valid invocation exits normally and prints one JSON object. A browser handoff is a valid tool result, not a process failure.

- `returnReason`: `reported_complete`, `input_required`, or a bounded handoff reason.
- `observation`: up to 16,000 characters of the final accessibility snapshot, plus `fresh` and `truncated` flags. When available, `objectContext` preserves bounded structural ownership/text and `observationWindow` identifies the current captured window. A window is partial evidence, not a complete page. The additional caller tokens are not yet measured.
- `actions`: a compact trace with operation, target and outcome; it does not repeat page snapshots or entered values.
- `inputRequired`: the observed field name and role when an exact value is missing.
- `progressAssessment`: intent steps Jev judged complete.
- `executionContract`: optional fixed target set, selection basis, coverage assessment and per-target progress for repeated effects. `modelAssessed:true` and `independentlyVerified:false` apply to membership and effect satisfaction. An uncertain target requires verification before repeating its effect.
- `timing`: total, helper, navigation, observation, decision, action and settling time.
- `jev.calls` and `jev.costUsd`: attempted provider calls and reported charge when available. Failed requests count as calls; any unknown charge makes the total `null`.
- `failure`: optional sanitized decision-failure kind, HTTP status or timeout indicator; it contains no raw provider response or credential.
- `handoff`: for incomplete runs, the current and remaining intent steps, model-reported completed steps, last action outcome, observation freshness, navigation-attempt facts and a suggested caller action. It does not invent a model rationale or claim that a visible state change proves success.
- `resumable` and `resumeToken`: whether another invocation can continue the same task.

The general controller pages action sets at 200 authorized gestures or about 12,000 serialized action characters, whichever comes first. Individual actions are not split. `candidate_page` exposes another set of controls from the same observation without a browser gesture; it consumes decisions and model calls. Jev routes coherent repeated-effect goals to a specialized controller when structural evidence permits. Before binding, discovery can withhold a uniquely identified route already attempted without changing the page. After binding, only authorized effect controls owned by the pending target are offered. No permission is added by either judgment.

The specialized controller gathers bounded structural windows from one capture, then restores the original window. Those inspections consume decisions but add no model calls or browser gestures. A complete capture does not establish complete website coverage. Ranked prefixes require Jev to establish the requested ranking and interval; all-member sets require complete captured membership. Multi-page all-member requests fall back to the general controller before specialized effects. See [tested scope and failures](execution-contract-experiments.md).

`reported_complete` is Jev's assessment, not independent proof. The calling agent evaluates the final observation against the requested outcome. Verify all parts of the goal, including record identity and any requested new effect. Existing matching content and unrelated successful actions are insufficient; preserve a state that already satisfies the goal instead of undoing it. A fresh, untruncated observation is usable evidence when nothing changed afterward. Re-observe when it is stale, truncated, missing, or the task needs an authoritative readback.

`handoff`, `observation_too_large`, `no_progress`, action or decision budgets, and deadlines mean completion was not established. `action_outcome_unknown` means a gesture may already have happened; observe before doing anything else and never blindly repeat it.

`helper_error` can indicate a failed decision request after earlier browser actions succeeded. Inspect the returned observation and preserve the failed attempt. There are no automatic provider retries or model fallbacks. For budgeted evaluations, stop and reconcile `jev.costUsd:null` before scheduling more paid work; it is not a zero-cost result.

Invalid invocation, configuration, or token errors exit with status 1 and a small JSON error. Valid task outcomes, including handoffs, use status 0 so an agent can parse the result without treating an expected boundary as a crashed command.

## Resume

```sh
node /path/to/skill/scripts/run.mjs --resume-token "$RESUME_TOKEN" \
  --value 'Report name=Weekly operations' \
  --context "The caller dismissed the account notice"
```

Resume always observes the current page and builds new action candidates. Old element references are history only and are never dispatched. The token preserves the browser, session, goal, operation allowlist, completed intents, supplied values and recent actions. Do not pass `--url`, `--session`, `--binary` or `--allow` while resuming.

When present, the token also preserves the chosen controller, original target identities and pending dispatch. Resume reconciles that dispatch with recorded action history and fresh effect evidence; it does not reselect targets from changed scores. Changed caller context or an unmappable target stops the saved contract for review. A budget renewal is a caller intervention even when it supplies no plan or browser action.

Resume tokens are compressed, encrypted and authenticated with a key derived from the configured OpenRouter credential. They expire after 30 minutes and fail closed if altered, expired or opened under another key. A token contains task state and exact non-secret values; treat it as private and do not publish it.

### Delegate, take over, resume

The caller can inspect the returned page, resolve the specific boundary with its own reasoning or browser tools, and return the remaining work to Jev. Keep the original task and authorization; pass exact new values with `--value` and describe the intervention with `--context`. Verify an uncertain action before intervening. A handoff is useful information, not an instruction to retry the same invocation unchanged.

Check whether the goal is already satisfied before taking over or resuming. Jev can return control after reaching the correct state without recognizing completion. If the returned evidence establishes the outcome, the caller can verify completion without another browser gesture; retain Jev's original handoff in the evaluation record.

`handoff.reason` preserves the actual return reason. `currentIntent` and `remainingIntents` are caller-provided intent steps, not a generated decomposition. `completedIntents` are explicitly marked as model-reported. `lastAction.observationChanged` describes a readback change, not a verified business outcome; `null` means no readback. `suggestedCallerAction` is a deterministic routing hint derived from the return reason, not another model judgment.

The `exploration` object tracks authorized observed tabs, known submenu hover routes and expandable branches. It records attempts, unchanged readbacks and whether a tab was observed selected. Counts match role, name and structural context rather than browser refs. Duplicate or nameless routes have unknown (`null`) attempt counts. Tracking is bounded to the current step and invocation, resets on resume, and is advisory: controls may change meaning, and selected tabs do not prove all their content was inspected. Pagination remains covered by the separate goal-position layer.

`navigationCoverage: "not_collected"` means no current authorized frontier was available at the stopping point; it must not be interpreted as no routes remaining. `navigationTruncated` reports the 24-route output bound. The last eight actions and up to 64 observed states are retained for progress facts. These fields add no model call and never suppress handoff, force navigation or authorize an action. Only current observations and the caller's goal establish what to do next.

`handoff.recentEvidence` retains at most two executed transitions from the current step in this invocation. Each before/after snapshot uses the existing 2,400-character historical readback bound, complete lines and explicit omission flags; missing readback stays `null`. Prior containing objects and literal icon metadata help identify what was attempted. These are historical observations, not current references or proof of business success. Ordinary calls still write no evidence files. The additional output increases caller context: one offline replay sample added 0–2,762 JSON characters per handoff; the marginal caller cost and recovery effect of those added characters remain unmeasured. A later [three-case planner experiment](goal-discovery-experiments.md#independent-planner-recovery) measures complete recovery calls separately, including a verified assisted goal and a wrong-effect failure.

`handoff.earlierEvidence` supplements those two recent transitions with up to eight earlier after-action readbacks from the current step and invocation, bounded to 12,000 serialized transition characters. Each readback uses the same 2,400-character limit. `actionIndex` is its zero-based position in this invocation's action list; `earlierActionCount` counts eligible earlier dispatched actions, and `omittedActions` reports those excluded by the bounds. Unknown outcomes remain unknown and missing snapshots remain `null`. These observations can be superseded by later actions; they do not assert coverage, current state or goal completion. Assess the evidence and any omissions before accepting the result or revisiting a page. This caller-only field adds no Jev calls and does not enter continuation tokens. The [handoff history study](handoff-history-study.md) reports the initial null result, the guided verification improvement and actual caller takeover separately.

Evaluate Jev-only completion, correct handoff, and caller-assisted completion separately. Scripted takeover fixtures validate the interface but do not establish how an independent calling LLM will perform.

## Searchable dropdowns

Typing into a combobox filters suggestions; it does not establish the selected contact, account or other record. The helper can click an accessible matching option. It does not offer arrow/Enter selection on autocomplete fields because similar options can commit the wrong record. The caller must use direct agent-browser control for a keyboard-only picker and verify the committed selection, not merely the input text.

For compound comboboxes, a text descendant receives text input; the outer wrapper remains available for clicking. Observed native `readonly` and `aria-readonly="true"` prevent typing, and the helper checks both again immediately before filling. A readonly display may still be clicked to inspect its options. This prevents a reproduced transport error that typed into the previously focused field; it does not establish that every apparently editable custom widget accepts the intended value. [Control-affordance evidence](control-affordance-study.md)

## Credentials and browser selection

Browser precedence is explicit `--binary`, `AGENT_BROWSER_BINARY`, the binary saved by setup, then `agent-browser` on `PATH`. The OpenRouter key comes from `OPENROUTER_API_KEY` or the owner-readable setup configuration. Neither the key nor raw provider output appears in the task result or resume token.

Setup can install pinned agent-browser 0.38.1 when no compatible executable is available. Fresh installation needs Node.js 24 or newer; the helper itself supports Node.js 20.3 or newer with an existing compatible browser.

## Maintainer API

`runTask(task, { apiKey })` is available for the bundled tests and integrations inside this package. The public skill contract is the executable above. The lower-level `act()` API remains deny-by-default and accepts explicit browser, decision and authorization functions for focused unit tests.

## Assessment cost and evidence boundaries

Source-page interpretation and narrow form-completion review use the same Jev model and the existing decision budget. A proposed completion can require another decision before the helper returns; budget exhaustion during review remains an incomplete result. Interpretations, control-name previews and sanitized observed link destinations are navigation evidence, not independent outcome verification. The caller still checks the exact target, required path and extra effects.

Requirement interpretations include caller source spans, model-assessment labels and timing. Page-bound bindings expire on changed observations. Semantic interpretations do not prune the browser's authorized gesture set; exact comparisons remain conditional on their interpreted targets and relations. Whole compound numeric expressions either normalize completely or remain unrepresented, with no partial target substituted. Source-page visits, source context at an effect and required final screens are tracked separately. The caller goal stays intact. The selector receives up to four bounded executed transitions. A separate completion review checks explicit page requirements, edited forms and proposed handoffs using raw observations and readbacks without prior model verdicts. The review remains the same Jev model, not an independent verifier. These internal assessments consume the normal budgets; see the current capability scorecard for measured gains, regressions and caller returns.

The current runtime separately reviews proposed effects, literal assignments and unfinished handoffs. A certain explicit source prerequisite needs positive context before an effect; navigation and preparation remain possible. `handoff.withheldActions`, when present, describes up to three unexecuted proposals and fallible model concerns. It does not claim an independently verified risk or action outcome.

Action review also receives the existing code-computed numeric comparisons and accumulated content positions, explicitly conditional on Jev's semantic bindings. It must distinguish observed branch expansion from final target selection and avoid recounting an ordinal from the start of each content page. Earlier source and completion verdicts are not supplied as independent evidence.

Exact supplied-value aliases are code facts. The assignment check directly compares the caller’s use of the proposed text with the observed field and containing object, considering all aliases. It does not compare broad primary-content and response-content types in code. For a supplied-value fill, the direct assignment answer stays advisory to the immediate-action judgment. An auxiliary mismatch must not reject a legitimate query prefix merely because it is not the final selected item. The ordinary action review can still reject a wrong target or unsupported value. Goal-derived discovery queries and observed table copies retain their own provenance checks and ordinary action review, without being reclassified as assignments among supplied final-content values. These are semantic model assessments and can still be wrong.

Structural object windows are built from one full accessibility capture, without goal or site-specific extraction. They bind controls to articles, rows, forms, dialogs and supported collection containers, separating direct text from descendant objects. Each serialized window is bounded at 28,000 characters before reference enrichment; direct text is bounded at 2,400 characters per object and 800 for the document. Omissions are marked. `inspect_context` selects an adjacent window or a directly indexed section of the current capture without a browser gesture and consumes the decision/time budget. The index describes up to 64 sections using observed structure; it does not establish target eligibility or website coverage. A gesture invalidates that capture and resets its window position. Up to three containing objects accompany an executed control in historical evidence, with shorter text bounds. These are structural facts, not semantic target verification.

Navigation evidence records the observed origin, an opaque location identity and recent executed transitions with observed headings. The identity distinguishes routes within the process without exposing raw path, query, fragment or URL credentials in this navigation evidence. It is not an executable URL or permission. Jev can review an observed detour and choose an authorized browser Back action, including when ordinary controls span multiple candidate pages. A different origin alone does not imply a detour. The same model assesses this recovery; it does not independently prove that the destination is wrong or that returning will complete the task.

Unstructured and individually oversized trees retain the marked compact/edge fallback. Limited observations may still omit evidence needed to identify a recipient or object. The older article-excerpt experiment remains frozen with its failures and inconclusive ablation; the structural-window experiment is evaluated separately.

For discovery, Jev may bind a whole-word, contiguous caller-goal span of at most 160 characters to an observed search field. Code copies the exact span, rechecks the operation allowlist, and offers a new fill candidate for that current observation. There are at most two derivation attempts per step, each with a start classification followed by a conditional complete-span choice. Proactive derivation skips nonempty searchboxes; no generated query or missing final content is accepted through this path. Links with an observed href use focus/Enter activation to avoid wrapped-text pointer misses. Link-role controls without href use a pointer click: focusing a scripted, non-focusable link can leave Enter targeting another field. These assessments and choice-page changes consume existing decision/time limits; a larger benchmark allowance is not the product default.


## Native numbers and clickable images

The browser's explicit clickability marker can expose controls whose accessibility role is text, a heading or another non-input role. The helper uses the current reference and up to 16 owned text fragments, bounded to 240 characters, when an unnamed control needs a label. It does not infer clickability from words inside an accessible name or field value, nor infer the control's effect from its role. Normal authorization and action review still apply. Native input, checkbox and selection gestures remain specialized.

For observed native numeric spinbuttons, the helper offers ArrowUp/ArrowDown steps and reads the value again after each action. It does not infer a step size, min/max bound or exact fill value from an unbound numeral. Date segments retain their supplied-ISO-date path. Readonly or disabled controls are excluded from numeric adjustment.

Clickable image references enter the ordinary authorized action set. For up to 16 observed references, the adapter reads alt, title, aria-label, class and source attributes. Each hint is bounded to 160 characters; the source becomes a filename without credentials, path, query or fragment. All physically supported image controls remain available even beyond the metadata budget. Jev interprets descriptive hints, and an additional narrow question inside the existing action review distinguishes established from unestablished control meaning. No class-to-operation mapping is embedded in code. Opaque identifiers and a clickable affordance alone do not establish an operation. This remains fallible model assessment, not verification.

The returned observation may include `controlHints`, at most 16 `{ref, role, observedIcon}` entries. These are current observed strings to help caller inspection; they are not instructions or authority to replay a reference after the page changes. Metadata is included in candidate actions without adding an independent classifier call.

## Selection phase and shared review evidence

A completion review can receive exact current field values, visible choices and literal string-equality matches. Narrow questions separately assess whether the goal calls for an existing item and whether the field is still a pending query. A definite contradiction reopens selection; unknown answers remain advisory. Equality is not proof that an item was selected or a form submitted. Explicit typing-only or unsaved-preparation goals remain valid.

The existing goal classifier distinguishes a particular single item from permission to choose any one matching item. That interpretation annotates conditional matches and never prunes the action set. Source, action and completion reviews share applicable computed arithmetic and accumulated positions without treating earlier semantic verdicts as evidence.


## Exact text in graphics

A complete accessibility snapshot can expose SVG text without control references. If that exact text occurs only once in the complete observation, has no referenced ancestor and does not duplicate a named control, the helper can offer an exact-text click. Text inside limited observation windows, duplicate labels and ordinary prose do not gain this fallback. The target is at most 80 characters, is passed as a literal browser argument, and is re-observed after every gesture. This makes the target available without claiming that it has a click handler or that its effect is appropriate. Jev must assess that relationship from the full goal. Unlabeled shapes, coordinates, dragging and visual interpretation remain caller boundaries.

## Exact source values

The helper may resolve a missing non-search field value from the caller goal or a currently observed plaintext textbox. Jev selects the source and destination relationship; code carries the exact value with source offsets and a hash. It does not infer missing personal facts, compose prose or normalize dates. For a numeric current value, the bounded relative-change path below lets Jev select a code-computed value. Whole source fields are bounded to 8,192 characters; excerpt spans to 1,024. Speculative lookahead is limited to six field/observation pairs per step; an explicitly selected field can still receive one fresh binding attempt within the normal decision and time budget. Longer or ambiguous content returns control. Password, hidden, file and unobserved sources are excluded. Readonly source text is allowed; readonly destinations are never offered typing.

Observed empty fields without an offered fill receive proactive source questions before action selection. Multiple independent destinations share one request; a single destination keeps the original focused field/source state. Dependent excerpt choices run later when needed. This avoids requiring the action selector to request missing input before it can discover text already present. Unknown answers still preserve the caller boundary; no binding executes a gesture itself.

Bindings are local to the current step and complete observation, and do not survive resume. Before a source-field copy, the adapter rechecks its type and exact value. After filling, a fresh readable destination must equal the attempted bytes; otherwise `input_not_accepted` returns a fresh handoff with `suggestedCallerAction: "inspect_control_and_value"`. This detects rejected or transformed input, including multiline text in a single-line field, before another commit. It is not an atomic browser transaction or a guarantee for unreadable controls. All bound fills still pass authorization and action review.

Development `onEvent` traces now retain bounded numeric Jev answer distributions, question counts and request sizes for policy evaluation. Ordinary CLI invocations still emit one result and create no evidence files. An experimental library-only operation/target factorization is available to the test harness; the default selector remains flat. See the [official-pattern comparison](published-evidence.md#using-jevs-decision-primitives) before changing decision composition or adding confidence thresholds.

## Relative numeric values

For an observed editable plaintext numeric field, Jev may bind an amount increase/decrease or percentage increase/decrease to a numeric span in the original goal. Code supplies exact decimal alternatives; it does not recognize task sentences or decide which operation the user means. Literal final values retain their existing path. A percentage change **by** an operand differs from setting the field **to** that number; unrelated numbers may identify objects or constraints.

The arithmetic source must be a plain signed decimal with at most six fractional digits. Unsupported fractions, formulas, cross-field calculations and required rounding remain caller boundaries. Code checks the original goal span, current field value and source hash, then rechecks the native source immediately before typing. Changed sources return `stale_observation`; transformed observed values return `input_not_accepted` before a later commit. A ledger retains the original value, computed result and dispatch status in the authenticated resume token even after recent action history is truncated.

Jev binds each edit to its containing record and logical field. Multiple edits require comparable stable identifiers selected from observed readonly fields, labeled static details or table cells; headings alone support only the first isolated calculation. Reopening a record, renumbered references, changed input types and trivial field-label differences do not permit reapplying its relative change. An uncertain dispatch remains consumed; only a proven nondispatch releases the edit. Older continuation tokens retain their conservative step-wide restriction.

The ledger records attempted field writes, not saved outcomes or complete collection coverage. Jev must still discover all requested targets, save prepared values and establish completion. Semantic identity and scope remain model assessments. Browser transfer of the expanded ledger is under evaluation; the [earlier numeric study](public-transfer-study.md#relative-numeric-binding) describes the preceding single-edit implementation.
