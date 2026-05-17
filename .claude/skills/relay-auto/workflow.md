# Relay: Code — Auto Pipeline

**Sequence**: `/relay-scan` → `/relay-order` → **`/relay-auto`** *(orchestrates `/relay-analyze` → `/relay-plan` or `/relay-superplan` → `/relay-review` → implement → `/relay-verify` → `/relay-resolve` per item)*

Drive Relay items end-to-end through the full code pipeline without per-skill prompting. The orchestrator picks items from `.relay/relay-ordering.md`, then for each one spawns a single isolated agent that runs the entire pipeline (analyze → plan/superplan → review → implement → verify → resolve) and returns a compact JSON summary. The main session never absorbs analyze landscape scans, plan code blocks, verify diffs, or resolve back-update walks — only summaries.

This skill does not execute the pipeline itself. Spawned agents do, with the same trust contract as the underlying skills (auto-confirmed at canonical gates per the auto-decision policy below). The trust gate fires once per `/relay-auto` invocation, then propagates auto-confirm into every spawned agent.

The orchestrator is resumable across context compaction and session resets — every state mutation is persisted to `.relay/.auto-session/<session>/state.json` immediately so `/relay-auto --resume` can pick up cleanly from a fresh conversation.

## Phase 1 — Arg + session resolution

Parse the user's argument:

| Invocation                                  | Behavior                                              |
|---------------------------------------------|-------------------------------------------------------|
| `/relay-auto`                               | Single-item mode: pick next item per priority rules, run end-to-end, pause |
| `/relay-auto <id>`                          | Drive a specific item (e.g., `12-3`, `store_communities_n_plus_1`) |
| `/relay-auto --sweep [N]`                   | Sweep mode: walk N items from priority order without per-item pause |
| `/relay-auto --sweep all`                   | Sweep the entire outstanding backlog                  |
| `/relay-auto --resume`                      | Resume the most-recently-active auto-session          |
| `/relay-auto --session <name>`              | Operate on a named session (resume if it exists, otherwise create) |
| `/relay-auto --list`                        | List active auto-sessions and exit                    |

**Session resolution** — runs after arg parsing:

1. `--list` → enumerate sessions under `.relay/.auto-session/` showing status (`active | paused | complete | aborted`), queue position, last activity. Exit cleanly.
2. `--resume` with no `--session` → find the most-recent session with status `active | paused` (mtime on `state.json`); if none, stop with: *"No active auto-session to resume. Run `/relay-auto` (no args) to start a new one."*
3. `--session <name>` → use verbatim. If the session does not exist and the invocation also names a new item or sweep, create it; otherwise error with available sessions.
4. No `--session` and not `--resume` → mint a fresh session name `<YYYY-MM-DD-HHmmss>` and create the directory.

**Preflight checks** (run for every non-`--list` invocation):

- `.relay/relay-ordering.md` must exist. If not, stop with: *"No ordering file. Run `/relay-scan` then `/relay-order` first."*
- If the file exists but has zero outstanding items (current backlog empty per the file's top-of-file summary), stop with: *"Outstanding backlog is empty. Run `/relay-discover` to surface new items, `/relay-brainstorm` to start a feature, or `/relay-order` to refresh."*
- `.relay/issues/` and `.relay/features/` must exist (created by `/relay-setup`). If missing, stop pointing at `/relay-setup`.

## Phase 2 — Queue construction

Read `.relay/relay-ordering.md` and build the work queue.

### 2a. Parse outstanding items

Walk every phase section (`## Phase N — ...`) that is NOT marked `— COMPLETE` or `— CLOSED`. Within each open phase:

1. Parse the items table (typically titled `### Phase N items` or similar). Each row is `| ID | Title | File | Complexity | Recommended Planner | Dependencies |`.
2. Skip rows whose ID or title is struck through (`~~ID~~`) — those are resolved or deferred per Relay convention.
3. Build a tuple per remaining row:
   - `id` — the ID column (e.g., `12-3`)
   - `title` — plain title
   - `file_path` — resolve the link target relative to `.relay/` (e.g., `.relay/features/related_work_discovery_scope_promotion.md`)
   - `complexity` — `S | M | L` (also accept synonyms: `Low | Medium | High`, `Small | Medium | Large`, `Medium-High | High` → `L`)
   - `recommended_planner` — `plan | superplan | null` (derive from the column; if empty, fall back to default by complexity)
   - `dependencies` — list of IDs cited in the column (e.g., `12-1, 12-2`)
   - `phase` — the parent phase number/name (for grouping)

If the table parse fails for any reason (column missing, malformed row), do NOT silently skip — log: `[relay-auto] could not parse row N in phase X — surface to user before proceeding` and abort the session creation. Ordering-file format drift should be loud.

### 2b. Apply priority rules

Order items by these rules (in priority order — first matching tier wins):

1. **Sibling-pair / triplet leaders that unblock dependents** — an item is a "leader" if other open items in the same phase cite it in their Dependencies column. Leaders sort before their dependents.
2. **Triplet leaders** — heads of linear dev-order chains within a phase (per the phase's "Build order rationale" or dependency graph). When multiple chains exist, take chains in phase order (smallest phase number first).
3. **Single features by complexity tier** — items with no in-phase dependents go S → M → L. Within a tier, preserve `relay-ordering.md` order.

If `--sweep N` is given, take the first N items from the ordered queue. If `--sweep all` is given, take the entire queue. Otherwise (single-item mode), the queue is the first item only.

If `<id>` was given as the argument, the queue is exactly that one item — bypass priority rules. Verify the ID exists in an open phase; error if it's struck through or absent.

### 2c. Resume path

If `--resume` (or `--session <existing>`), do NOT rebuild the queue from scratch. Load `state.json`:

```json
{
  "session": "2026-05-17-103045",
  "mode": "single | sweep",
  "sweep_target": "N | all | null",
  "created": "2026-05-17T10:30:45Z",
  "last_activity": "2026-05-17T11:42:13Z",
  "queue": [
    {"id": "12-3", "file_path": "...", "complexity": "L", "recommended_planner": "superplan", "dependencies": ["12-1", "12-2"], "phase": "12"},
    ...
  ],
  "completed": [
    {"id": "12-3", "exit_status": "resolved", "summary_path": ".relay/.auto-session/2026-05-17-103045/12-3.json"}
  ],
  "current_index": 1,
  "status": "active | paused | complete | aborted",
  "pause_reason": "review-rejected | scope-undecided | blocker | external-modification | end-of-item | null",
  "ordering_mtime_at_dispatch": "<unix-ts>"
}
```

Resume by reading `current_index` and dispatching from the queue position onward. If `status: paused`, surface the pause reason and prompt the user how to proceed (continue, abort, override).

If the resumed `state.json` is corrupt (JSON parse failure, missing keys), do NOT auto-recover. Log the corruption, list the per-item summary files that DO exist on disk, and tell the user: *"Session state corrupt. Inspect `.relay/.auto-session/<session>/` manually. To restart this work, run `/relay-auto --session <new-name>`."*

## Phase 3 — Plan presentation + trust gate

Before spawning any agents, show the user the planned sweep.

> *"Auto-pipeline plan for session `<session>` (`<single | sweep N | sweep all | resume>` mode):*
>
> *<N> items queued, in this order:*
> *  1. `<id>` — `<title>` (`<complexity>`, planner: `<plan | superplan>`)*
> *  2. ...*
>
> *Each item runs end-to-end in its own isolated agent (analyze → plan/superplan → review → implement → verify → resolve). The main session only sees per-item summaries.*
>
> *Auto-decision policy applied inside each agent:*
> *  - Trust gate at item start: auto-confirm (y)*
> *  - Skill-to-skill transitions (analyze → plan, plan → review, etc.): auto-continue*
> *  - Implementation deviations: apply inline, document in spec file*
> *  - Verification fixes: apply inline (up to 3 iterations; escalate via subagent at iteration 4)*
> *  - Resolve commit: auto-commit at end of pipeline*
>
> *Inner-agent dispatch policy (mandated for context protection):*
> *  - `/relay-analyze` landscape scan → Explore subagent*
> *  - `/relay-superplan` (for L items) → 5 parallel Plan subagents*
> *  - `/relay-verify` fix loop > 3 iterations → general-purpose subagent (final diff + verdict only)*
>
> *Pause-and-prompt triggers (orchestrator-level — agent reports back, orchestrator decides):*
> *  - Adversarial review verdict: REJECTED or APPROVED-WITH-CHANGES requiring user judgment*
> *  - Analysis surfaces unfiled-candidate scope decision the rubric cannot auto-resolve*
> *  - Implementation hits a genuine blocker (missing test infra, contradictory spec, schema unclear)*
> *  - Verify fix loop exhausted even with subagent escalation*
> *  - In single-item mode: pause after each item before picking the next*
> *  - External modification: `.relay/relay-ordering.md` mtime advanced between dispatches*
>
> *Continue? [y/n]"*

The trust gate fires **once** per `/relay-auto` invocation. Aborting here ends the orchestrator cleanly — no agents are spawned, no item files are mutated, no session directory is left behind for fresh-start invocations (resume invocations preserve their existing directory regardless of abort).

On confirmation, stash the `(session, queue, mode, sweep_target)` tuple, record `.relay/relay-ordering.md` mtime as `ordering_mtime_at_dispatch`, and persist the initial `state.json` (status: `active`, current_index: 0).

## Phase 4 — Per-item agent dispatch

Iterate the queue starting at `current_index`. For each item:

### 4a. Pre-dispatch checks

1. **External modification guard** — re-read `.relay/relay-ordering.md` mtime. If it advanced beyond `ordering_mtime_at_dispatch`, abort: *"Ordering file changed externally during sweep. Status persisted; re-run `/relay-auto --resume --session <session>` after reviewing the changes."* Set `status: aborted`, `pause_reason: external-modification`, persist, exit.
2. **Item-file existence** — verify the item's `file_path` still exists in `.relay/issues/` or `.relay/features/`. If the file has moved to `archive/` (resolved out-of-band), record it in `completed` with `exit_status: already-resolved`, advance `current_index`, persist, continue to next item without dispatching.
3. **Stale-analysis check** — if the item file already carries an `## Analysis` section with `*Analyzed:*` date older than 7 days, the spawned agent will re-analyze (per `/relay-analyze` freshness check). No orchestrator action needed; just note `stale_analysis: true` in the per-item summary for visibility.

### 4b. Pick planner

- Item's `recommended_planner` column wins if present.
- Otherwise: `S | M` → `plan`; `L` (or `Medium-High | High`) → `superplan`.
- Override: if the user typed `/relay-auto <id> --planner plan` or `--planner superplan`, use that.

### 4c. Build the agent prompt

The agent has no memory of this orchestration. Brief it with a self-contained prompt:

````
You are driving ONE Relay item end-to-end through the full code pipeline in
non-interactive auto-mode.

Session: <session>
Item: <id> — <title>
Item file: <file_path>
Complexity: <S|M|L>
Planner: <plan|superplan>
Phase: <phase>

Pipeline (execute in order, do NOT skip):
  1. /relay-analyze
  2. /relay-plan  OR  /relay-superplan   (per Planner above)
  3. /relay-review
  4. Implement the approved plan
  5. /relay-verify
  6. /relay-resolve

CONTEXT PROTECTION (mandatory inner-agent dispatch):

  /relay-analyze:
    - For step 2's broad landscape scan (read EVERY file in .relay/issues/,
      .relay/features/, .relay/archive/, .relay/implemented/), dispatch
      Agent(subagent_type=Explore) with the brief: "Survey the four .relay/
      directories listed above. For each, return: (a) directly-related items
      to <id> with file:line citations, (b) historical patterns/caveats that
      affect <id>, (c) regression-risk flags. Keep the report under 1000
      words. Cite paths verbatim — the main agent will read the cited files
      in full." In the main agent context, read only:
        * the target spec file in full,
        * its parent brainstorm (if linked via *Brainstorm:* metadata),
        * the source files cited in the Analysis blast radius (up to ~5),
        * any Explore-citation file the report flags as critical.
      DO NOT read every backlog file in the main agent.

  /relay-superplan (only when Planner = superplan, typically L items):
    - Per the skill's Step 2, dispatch the 5 strategy agents as PARALLEL
      Agent(subagent_type=Plan) calls in a SINGLE message. Each agent
      receives the context block from Step 1; do not delegate Step 1 itself.
    - For Step 4 synthesis, read in full only the candidate plan you select
      as the base. For the other 4, parse only the Strategy Summary
      (top 2-3 sentences) plus any cherry-picked sections you reference.
      DO NOT load all 5 plans verbatim into the main agent context.

  /relay-plan (S/M items):
    - Single-pass is fine. No subagent dispatch.

  /relay-review:
    - Single-pass. The verdict determines the orchestrator's next action;
      record the verdict literally.

  Implement:
    - Apply the approved plan step by step.
    - If a step cannot be implemented as planned, apply the deviation inline
      AND APPEND an ## Implementation Deviations section to the spec file
      (per /relay-review Implementation Guidelines). Do NOT pause for
      permission to deviate.

  /relay-verify:
    - Pipe verbose test output through `2>&1 | tail -50` (or platform
      equivalent) when capturing into the conversation.
    - If verdict is HAS-ISSUES or INCOMPLETE, apply the Verification Fix
      inline (per the skill's Verification Fixes section).
    - If the fix loop runs more than 3 iterations, dispatch
      Agent(subagent_type=general-purpose) with the brief: "Continue
      iterating /relay-verify and applying Verification Fixes until COMPLETE
      or you identify a genuine blocker (missing test infra, contradictory
      spec, root-cause regression in unrelated code). Return ONLY:
      (a) the final diff (file list + +/- counts per file),
      (b) the final verdict, (c) any blocker description."
      The main agent absorbs only the subagent's return — not the iteration
      logs.

  /relay-resolve:
    - Single-pass. Auto-commit at completion per the skill's standard
      navigation. Commit message format: per project convention (check
      recent git log for shape).

AUTO-DECISION POLICY (do these inline; do NOT pause for permission):

  - Canonical "Next: run /relay-X" transitions between skills → auto-continue.
  - Dispatching any subagent listed in CONTEXT PROTECTION → no permission ask.
  - Scope Decision rubric auto-resolutions (per /relay-analyze step 9's
    rubric table): if the rubric picks unambiguously (e.g., "no findings →
    keep narrow", "medium/strong same-root-cause findings → grouped run"),
    apply it without prompting. The orchestrator only wants to know about
    the ambiguous cases.
  - Implementation Deviations: apply inline, document in spec file.
  - Verification Fixes: apply inline, document in spec file.
  - /relay-resolve commit: auto-commit, capture the SHA in the summary.

ORCHESTRATOR-PAUSE TRIGGERS (do NOT auto-decide — return early with the
trigger in your summary and let the orchestrator handle the user
interaction):

  1. Adversarial Review verdict is REJECTED — return with
     pipeline.review.verdict = "REJECTED" and exit_status =
     "paused-for-user". Do not re-plan automatically; the orchestrator
     decides whether to ask the user to revise scope, retry, or abort.
  2. Adversarial Review verdict is APPROVED-WITH-CHANGES AND the changes
     are non-trivial (more than a one-line edit, or affect the rollback
     plan / risk register) — return with verdict + exit_status =
     "paused-for-user". Trivial APPROVED-WITH-CHANGES (typos, comment
     wording) → apply the change inline and continue.
  3. Adversarial Review verdict is DEFERRED — apply the deferral per the
     skill's Navigation block (update relay-ordering.md), return with
     exit_status = "deferred-by-review" and the new phase target.
  4. /relay-analyze step 9 Scope Decision: if the rubric does NOT auto-
     resolve (e.g., "strong findings spanning multiple root causes —
     consider promotion" vs grouped run, with no clear winner), return
     with exit_status = "paused-for-user" and pause_reason =
     "scope-undecided" plus a one-paragraph summary of the choice the
     user needs to make.
  5. Genuine blocker during implementation: missing test infrastructure,
     contradictory spec/code, schema is unclear, an Affected File cited
     in Analysis no longer exists. Return with exit_status =
     "paused-for-user" and pause_reason = "blocker" + a description.
  6. /relay-verify even after general-purpose subagent escalation
     returns INCOMPLETE or HAS-ISSUES with a stable failure (same root
     cause across iterations). Return with exit_status =
     "paused-for-user" and pause_reason = "verify-stuck".

DO NOT delegate to further sub-agents beyond those mandated above. DO
NOT prompt the user — every prompt either has an auto-decision rule or
maps to an orchestrator-pause trigger. If you hit a state no rule
covers, return with exit_status = "incomplete" and pause_reason
= "uncovered-state: <description>".

DO NOT modify code outside the spec file's per-step targets. Drive-by
refactors are forbidden in auto-mode.

Final output (your last message to the orchestrator MUST be this JSON
inside a fenced code block):

```json
{
  "item": "<id>",
  "file_path": "<spec file path>",
  "complexity": "<S|M|L>",
  "planner_used": "plan | superplan",
  "stale_analysis": <bool>,
  "pipeline": {
    "analyze": {
      "status": "complete | stale-skipped | blocker",
      "scope_decision_mode": "keep narrow | grouped run | linked companion | promote | n/a",
      "related_work_findings": <int>
    },
    "plan": {
      "skill": "plan | superplan",
      "status": "complete | blocker",
      "step_count": <int>,
      "files_touched_in_plan": <int>
    },
    "review": {
      "verdict": "APPROVED | APPROVED-WITH-CHANGES | REJECTED | DEFERRED",
      "iterations": <int>,
      "trivial_changes_applied": <int>
    },
    "implement": {
      "status": "complete | deviated | blocker",
      "deviations_count": <int>,
      "commits_during_impl": <int>
    },
    "verify": {
      "verdict": "COMPLETE | HAS-ISSUES | INCOMPLETE",
      "iterations": <int>,
      "fixes_applied": <int>,
      "subagent_escalation_used": <bool>
    },
    "resolve": {
      "status": "complete | skipped | blocker",
      "commit_sha": "<sha or null>",
      "implementation_doc": ".relay/implemented/<slug>.md",
      "archived_to": ".relay/archive/{issues|features}/<slug>.md"
    }
  },
  "exit_status": "resolved | paused-for-user | deferred-by-review | aborted-blocker | incomplete | already-resolved",
  "pause_reason": "review-rejected | review-needs-judgment | scope-undecided | blocker | verify-stuck | end-of-item | null",
  "pause_detail": "<one-paragraph context for orchestrator to surface to user; null if not paused>",
  "errors": ["<error string>", ...]
}
```

Return only the JSON in the final message. No preamble, no meta-commentary.
````

### 4d. Spawn the agent

Use the `Agent` tool with `subagent_type: general-purpose` (it has access to `Skill` and all file tools, which the pipeline requires). Pass the prompt above. **Foreground execution** — the orchestrator needs the summary before dispatching the next item and before the user can decide whether to continue a sweep.

Sub-agent dispatch is **strictly sequential**. Unlike `/relay-exercise-auto`'s `--parallel-chains` option, the code pipeline mutates shared project state (commits to git, edits to spec files, mutations to `relay-ordering.md` via /relay-resolve). Two simultaneous pipelines would race on these surfaces. No `--parallel-items` flag.

### 4e. Receive + interpret the summary

The agent returns a JSON-shaped summary in its final message. Parse it.

**Persist immediately**: write the full summary to `.relay/.auto-session/<session>/<id>.json`. Then update `state.json`:

- Append a `completed[]` entry with `{id, exit_status, summary_path}`.
- Advance `current_index` IF `exit_status ∈ {resolved, already-resolved, deferred-by-review}`. Leave `current_index` where it is for pause/abort/incomplete states (so resume re-dispatches the same item).
- Update `last_activity` and re-record `ordering_mtime_at_dispatch` (since /relay-resolve mutates the ordering file, the new mtime is expected).
- Update `status` based on the exit:
  - `resolved | already-resolved | deferred-by-review` → keep `active` if more queue remains, else `complete`.
  - `paused-for-user` → `paused`, `pause_reason` from the summary.
  - `aborted-blocker | incomplete` → `paused`, surface to user.

**Branch on exit_status**:

- `resolved` — success path. Continue to next item if mode is sweep and queue has more; otherwise pause for direction (single-item mode, or end-of-sweep).
- `already-resolved` — log to user, advance, continue.
- `deferred-by-review` — log the new phase target, advance, continue.
- `paused-for-user` — STOP the sweep. Surface the `pause_detail` to the user with options tailored to `pause_reason`:
  - `review-rejected` → *"Item `<id>` review verdict: REJECTED. <pause_detail>. Options: [retry-with-revised-scope (re-run /relay-auto <id> after scope adjustment) / abort-sweep / mark-blocker-and-skip]"*
  - `review-needs-judgment` → *"Item `<id>` review verdict: APPROVED-WITH-CHANGES with substantive edits. <pause_detail>. Options: [accept (continue from current state) / re-review / abort-sweep]"*
  - `scope-undecided` → *"Item `<id>` analysis surfaced an ambiguous Scope Decision. <pause_detail>. Options: [pick-mode (keep narrow / grouped run / linked companion / promote) / skip-item / abort-sweep]"*
  - `blocker` → *"Item `<id>` hit a blocker: <pause_detail>. Options: [investigate (orchestrator stops, you take over manually) / mark-blocker-and-skip / abort-sweep]"*
  - `verify-stuck` → *"Item `<id>` verification stalled even after subagent escalation: <pause_detail>. Options: [investigate / mark-blocker-and-skip / abort-sweep]"*
  - `end-of-item` (single-item mode only) → *"Item `<id>` resolved. Next item per priority: `<next-id>` (`<next-title>`, `<next-complexity>`). Options: [continue / pause / switch-to-sweep]"*
- `aborted-blocker | incomplete` — same handling as `paused-for-user`, but the summary's `errors` array gets surfaced too.

### 4f. Progress reporting

For each dispatched item, emit ONE concise line to the main session output BEFORE the agent dispatch:

`[<i>/<N>] starting <id> — <title> (<complexity>, <planner>)`

And ONE concise line AFTER the agent returns:

`[<i>/<N>] <id> → <exit_status> | review: <verdict> (<iters>) | verify: <verdict> (<iters>) | <commit_sha or "no-commit"> | doc: <implementation_doc or "none">`

Do NOT dump the full agent summary to the main context — it's already on disk in `.relay/.auto-session/<session>/<id>.json`.

## Phase 5 — Aggregate summary + navigation

When the queue is exhausted or the user aborts/pauses, report:

- **Items walked**: `<resolved>/<total>` (`<deferred>` deferred, `<paused>` paused, `<aborted>` aborted, `<already-resolved>` skipped)
- **Pipeline stage tallies**: review verdicts (`APPROVED | APPROVED-WITH-CHANGES | REJECTED | DEFERRED`), verify verdicts (`COMPLETE | HAS-ISSUES | INCOMPLETE`)
- **Commits produced**: list of SHAs from `/relay-resolve` per item
- **Implementation docs**: list of `.relay/implemented/<slug>.md` paths created
- **Items paused for review**: per-item `<id> → <pause_reason>` with one-line `<pause_detail>`
- **State changes NOT cleaned up**: any item whose summary has `errors[]` non-empty
- **Session directory**: `.relay/.auto-session/<session>/` (persists for resume)

**Next-step recommendation**:

- If queue exhausted and zero pauses → *"All items resolved. Run `/relay-scan` to refresh status, then `/relay-order` to reprioritize before the next sweep."*
- If queue exhausted with pauses → *"Sweep complete with `<N>` paused items. Resolve each paused item per its options above, then re-run `/relay-auto --resume --session <session>` to pick them up."*
- If user aborted mid-sweep → *"Aborted at item `<id>` (`<i>/<N>`). Re-run `/relay-auto --resume --session <session>` to continue, or `/relay-auto --session <session>` with no other args to start fresh."*
- If single-item mode finished → *"Item `<id>` complete. Run `/relay-auto` (no args) for the next item, or `/relay-auto --sweep <N>` to walk multiple items unattended."*

## Phase 6 — Resume contract

`/relay-auto --resume` reads `state.json` and re-enters Phase 4 at the persisted `current_index`. Before resuming:

1. **PreCompact snapshot reconciliation** *(only when the optional PreCompact hook is installed — see Phase 7 below)*. Check `.relay/.auto-session/<session>/snapshots/` for `precompact-<ts>-state.json` files. If the most-recent snapshot's mtime is NEWER than `state.json` itself, mid-item compaction fired AFTER the orchestrator's last write. Prefer the snapshot's view:
   - Read the snapshot's `state.json` contents and use them as the authoritative cursor for this resume.
   - Look for a corresponding `precompact-<ts>-latest-<id>.json` from the same fire. If present, the orchestrator was mid-dispatch when compaction fired; treat `<id>` as the in-flight item and re-dispatch it (the per-item agent is idempotent across the pipeline's atomic-write contracts — see Phase 6 last paragraph).
   - Log to the user: *"Recovered in-flight state from PreCompact snapshot `<ts>` — re-dispatching item `<id>`."*
   - If no snapshot exists, or all snapshots are OLDER than `state.json` (normal happy path — no mid-item compact), use `state.json` directly. Skip this reconciliation silently.
2. **Skip-validation guard** — re-read `relay-ordering.md` mtime. If it advanced beyond the last-persisted `ordering_mtime_at_dispatch`, WARN the user: *"Ordering file changed since last activity (mtime: <old> → <new>). The queue may be stale. Options: [rebuild-queue / continue-anyway / abort-resume]"* Rebuild-queue re-runs Phase 2 against the current ordering, preserves `completed[]`, recomputes `queue[]` starting at the first non-completed item.
3. **Per-item-file existence** — re-verify each remaining queue item's file still exists in `.relay/issues/` or `.relay/features/`. Items that moved to archive (resolved between sessions) get `already-resolved` and are recorded in `completed[]` without dispatch.
4. **Phase 3 re-display** — show the remaining queue with the same trust-gate format (but note "RESUMING from item X of Y" at the top). The trust gate fires once per `/relay-auto --resume` invocation just as for fresh starts.

Resume is intentionally lossless for COMPLETED items but RESTARTS the in-flight item (the one at `current_index` when the previous session paused/aborted). The per-item agent is idempotent across the pipeline's atomic-write contracts (analyze appends to spec, plan replaces in-place, verify appends with iteration history, resolve checks idempotency on every step). Restarting an in-flight item produces a coherent spec-file history; it does not double-append plans or double-archive.

## Phase 7 — Optional hooks

Four hooks complement (but are not required by) this skill. They live in `.claude/hooks/relay-*.{sh,ps1}` and are installed opt-in via `npx relay-workflow install-hooks`:

| Hook | Event | Effect |
|------|-------|--------|
| `relay-session-start` | `SessionStart` | Scans `.relay/.auto-session/` for active sessions; emits markers (`[relay-auto:active]` block + prose line) so Claude knows on cold start without being asked. Removes the "did I leave something running?" friction. |
| `relay-pre-compact` | `PreCompact` | Snapshots each active session's `state.json` plus its most-recent per-item summary to `.relay/.auto-session/<session>/snapshots/precompact-<ts>-*.json` before context compaction. Closes the narrow mid-item window where an agent has returned but the orchestrator hasn't written the summary to disk yet. Retention: last 10 fires per session. |
| `relay-subagent-stop` | `SubagentStop` | Appends one JSONL line per subagent stop to `.relay/.auto-session/_subagent-log.jsonl` (redundant audit copy of per-item agent activity). |
| `relay-stop` | `Stop` | Appends one JSONL line per Claude turn to `.relay/.auto-session/_turn-log.jsonl` (per-turn timestamp + queue position; useful for debugging long sweeps). |

**Coexistence with other hook frameworks**: Claude Code's `settings.json` accepts multiple handlers per event. `install-hooks` merges Relay's entries alongside any existing entries (e.g., from [Control](https://www.npmjs.com/package/control-workflow)'s STATE.md hooks) — it does not overwrite. `uninstall-hooks` removes only Relay's entries via script-basename match; other frameworks' entries are preserved.

**The orchestrator works WITHOUT the hooks** — Phase 6's resume contract is fully functional from `state.json` alone. The hooks add (a) cold-start awareness, (b) snapshot recovery for the mid-item compaction edge case, (c) an audit trail. Recommended when you plan to leave `/relay-auto --sweep all` running unattended for long stretches. Optional otherwise.

## Contracts

**Single trust gate**: fires once at Phase 3 of each `/relay-auto` invocation (including `--resume`). Spawned agents inherit auto-confirm and never re-prompt the user. Inner-agent dispatch (Explore for analyze, Plan for superplan, general-purpose for verify-fix) does NOT re-prompt — the auto-decision policy is propagated by the per-item agent's prompt template.

**One agent per item**: each item maps to exactly one outer agent invocation. The full pipeline (analyze → resolve) lives inside that agent's context. The orchestrator never holds a second outer-item agent context concurrently.

**Strict sequential across items**: no `--parallel-items` flag. The code pipeline mutates git, spec files, ordering.md, and the implementation/archive tree. Two pipelines in flight would race.

**Auto-decision policy** (applied inside each per-item agent):
- Canonical inter-skill "Next:" gates → auto-continue.
- Scope Decision rubric: unambiguous → apply; ambiguous → pause.
- Adversarial Review: APPROVED → continue; APPROVED-WITH-CHANGES (trivial) → apply + continue; APPROVED-WITH-CHANGES (substantive) → pause; REJECTED → pause; DEFERRED → apply deferral + record.
- Implementation Deviations: apply inline + document in spec.
- Verification Fixes: apply inline + document in spec; subagent escalation at iteration 4; pause if still stuck post-subagent.
- /relay-resolve commit: auto-commit, capture SHA.

**Inner-agent dispatch** (mandated for context protection):
- /relay-analyze backlog scan → Explore subagent (structured ≤1000-word report).
- /relay-superplan strategies → 5 parallel Plan subagents (one message); base plan read in full, others as Strategy Summary only.
- /relay-verify iteration loop > 3 → general-purpose subagent (final diff + verdict).

**Pause-and-prompt triggers** (orchestrator-level, surfaced after agent return):
- Review REJECTED or APPROVED-WITH-CHANGES with substantive changes.
- Scope Decision rubric ambiguity.
- Implementation blocker (missing test infra, contradictory spec, schema unclear, missing Affected File).
- /relay-verify stuck after subagent escalation.
- External `relay-ordering.md` modification between dispatches.
- In single-item mode: end-of-item pause for direction.

**Resumability**: every state mutation persists to `.relay/.auto-session/<session>/state.json` atomically (`write → fsync → rename` pattern, or platform equivalent — on Windows the orchestrator should use temp-write + rename). The per-item agent's pipeline writes are persisted by the underlying skills' own atomicity contracts. Re-running `/relay-auto --resume` re-enters cleanly.

**Context-window protection**:
- Orchestrator reads `relay-ordering.md` once per Phase 2 / Phase 6 resume.
- Per-item summaries land on disk; orchestrator absorbs ONE progress line per item.
- The full per-item JSON summary is parsed for control flow but NOT echoed verbatim back to the user.
- No hook is required: Claude Code's built-in auto-compaction (and the optional `PreCompact` hook if installed via a framework like Control) handles context bloat. The orchestrator is fully resumable from disk after compaction or `/clear`.

**Idempotency**:
- Re-running `/relay-auto <id>` on an already-resolved item exits cleanly via the Phase 4a item-file-existence check (`already-resolved`).
- Resuming a session whose in-flight item was partially completed re-enters the item's pipeline; underlying skills' atomicity contracts ensure no double-writes.
- `state.json` writes are atomic per the rename pattern.

**Failure-mode degradation**:
- Per-item agent crash or runaway → orchestrator surfaces the error from the dispatched agent and pauses. State.json reflects `current_index` unchanged (so resume re-dispatches the same item).
- Spec-file write failure inside the agent → bubbles up through the per-skill error handling (analyze/plan/review/verify/resolve each have their own stop conditions). The agent returns an `incomplete` exit_status with the error in `errors[]`.
- Git commit failure at /relay-resolve → the per-item agent returns with `resolve.status: blocker` and the orchestrator pauses.

## Navigation

When finished, tell the user:

- If everything resolved cleanly: *"Sweep complete. Run **/relay-scan** to refresh status, then **/relay-order** to reprioritize before the next sweep."*
- If items remain paused: *"`<N>` items paused for your decision. Resolve each per the prompts above, then run **/relay-auto --resume --session `<session>`** to continue."*
- If aborted mid-sweep: *"Aborted at `<id>`. Run **/relay-auto --resume --session `<session>`** to continue."*
- If single-item mode finished: *"Item `<id>` complete. Run **/relay-auto** for the next item, or **/relay-auto --sweep `<N>`** to walk multiple unattended."*

## Notes

- This skill never executes the pipeline itself. Spawned agents do, with the same trust contract as `/relay-analyze` / `/relay-plan` / `/relay-superplan` / `/relay-review` / `/relay-verify` / `/relay-resolve` (auto-confirmed at canonical gates per the auto-decision policy).
- The skill is a thin orchestrator on top of the code pipeline. If those skills evolve, the per-item agents pick up the new behavior automatically — no changes needed here unless their CLI args change or new pause-worthy verdicts get introduced.
- For surgical one-off runs (single item, manual scope decisions, finger-tip control over each verdict), use the individual skills directly. `/relay-auto` is for blanket throughput, not nuance.
- Mid-sweep, the user can interrupt (Ctrl+C) — the in-flight agent finishes its current persist step (per the underlying skills' atomicity contracts) and the next item simply isn't dispatched. The orchestrator's most-recent `state.json` reflects the pre-interrupt state, so `--resume` picks up at the in-flight item.
- The orchestrator does NOT mutate spec files, `relay-ordering.md`, or `.relay/implemented/` directly. All state writes happen inside spawned per-item agents through the existing pipeline skills.
- Context-window concerns: the orchestrator was designed under the assumption that Claude Code may auto-compact during a long sweep. Resume semantics (Phase 6) are the answer — the orchestrator does NOT depend on conversation history surviving compaction. After a `/clear` or auto-compact, `/relay-auto --resume` produces a clean continuation from disk state.
- For projects that also use the [Control](https://www.npmjs.com/package/control-workflow) phased-session framework, both frameworks' hooks coexist cleanly: Claude Code's `settings.json` accepts multiple handlers per event, and Relay's `install-hooks` does an idempotent merge that preserves Control's existing entries. Relay does not require Control; the auto-session resume contract stands on its own with or without the optional hooks (see Phase 7).
- The `.relay/.auto-session/` directory is intentionally NOT auto-pruned. Completed sessions persist as a history of what was driven through and when. Periodically prune with `rm -rf .relay/.auto-session/<old-session>` if disk pressure matters. Many Relay-using projects gitignore the entire `.relay/` directory (it is project-state, not source); if your project does NOT and you want to keep session bookkeeping out of git, add `.relay/.auto-session/` to your root `.gitignore` after the first `/relay-auto` invocation.
