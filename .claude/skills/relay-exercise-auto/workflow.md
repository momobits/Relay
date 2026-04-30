# Relay: Exercise — Auto Sweep

**Sequence**: `/relay-exercise` → **`/relay-exercise-auto`** *(orchestrates `/relay-exercise-run` + `/relay-exercise-file`)* → *findings flow into /relay-new-issue and /relay-brainstorm* → standard code pipeline

Walk an entire active exercise session end-to-end without per-item prompting. The orchestrator builds a work queue from `_control.md`, then for each item spawns a single isolated agent that runs `/relay-exercise-run` followed by `/relay-exercise-file` and returns a compact summary. The main session never absorbs scenario stdout, finding bodies, or filer decision dialogs — only summaries.

This skill does not run real commands itself. The spawned agents do. The trust gate fires once per `/relay-exercise-auto` invocation, then propagates auto-confirm into every spawned agent.

## Phase 1 — Arg + session resolution

Parse the user's argument:

| Invocation                                  | Behavior                                     |
|---------------------------------------------|----------------------------------------------|
| `/relay-exercise-auto`                      | Walk all non-terminal items in active session |
| `/relay-exercise-auto --session <name>`     | Walk all non-terminal items in named session  |
| `/relay-exercise-auto <group>`              | Default mode only: walk one group's capabilities |
| `/relay-exercise-auto <N>-<M>`              | Goal mode only: walk steps N..M inclusive     |

**Session resolution** — same rules as `/relay-exercise-run` Phase 1:

1. Explicit `--session <name>` flag → use verbatim. Error cleanly with available active sessions if not found / not active.
2. Exactly one active session → use silently.
3. Multiple active → prompt to pick.
4. Zero active → stop with: *"No active session. Run `/relay-exercise` first to create one."*

**Preflight:** if `.relay/relay-exercise.md` does not exist, stop with the same first-run message used by `/relay-exercise-run`.

## Phase 2 — Mode detection + queue construction

Read the resolved session's `_control.md`. Pull `*Mode:*` from the header. If missing, self-heal exactly as `/relay-exercise-run` Phase 1b does (infer from presence of `## Journey` vs `## Context Chains`; corrupt-when-both errors loudly).

### 2a. Default-mode queue

Parse `## Session Capabilities` tables. The queue is the ordered list of `(group, capability)` rows where Status ∈ `mapped | stale`, in `_control.md` order (groups top-to-bottom, capabilities within group top-to-bottom). If a group argument was given, restrict to rows in that group.

If a context-chain ordering is documented (`## Context Chains` section), capabilities in the same chain MUST keep their relative order (chain head before chain body). Capabilities not in any chain take their `_control.md` order.

If the queue is empty, report: *"All capabilities in session `<session>` are already exercised or filed. Nothing to auto-sweep."* and exit cleanly.

### 2b. Goal-mode queue

Parse the `## Journey` table. The queue is the ordered list of `(step_number, journey_row)` tuples with Status ∈ `exists | gap`, ascending Step order. If a `<N>-<M>` range was given, restrict to rows in that range. Capability-name and group args are NOT supported in goal mode for auto-sweep — use `/relay-exercise-run <capability>` for surgical re-walks.

If the queue is empty, report: *"All journey steps in session `<session>` are already terminal. Nothing to auto-sweep."* and exit cleanly.

## Phase 3 — Plan presentation + trust gate

Show the user the planned sweep BEFORE spawning any agents. Prompt text depends on mode.

**Default mode:**

> *"Auto-sweep plan for session `<session>` (default mode):*
>
> *<N> capabilities queued, in this order:*
> *  1. <group>/<capability-1>*
> *  2. <group>/<capability-2>*
> *  ...*
>
> *Each capability runs in its own isolated agent (run + file in one agent context). The main session only sees per-item summaries. Default policy: sequential across capabilities (project-state races make parallel runs unsafe by default).*
>
> *Per-agent decisions:*
> *  - Trust gate: auto-confirm (y)*
> *  - Filer: would-be-issue → file, would-be-brainstorm → seed, note → keep*
> *  - Symbol verification on miss: accept `use <closest>` if offered, else `file as-is`*
> *  - Destructive command detected mid-run: agent ABORTS and reports; orchestrator pauses for your decision*
>
> *Continue? [y/n]"*

**Goal mode:**

> *"Auto-sweep plan for session `<session>` (goal mode):*
> *Goal: <first 120 chars of narrative>*
>
> *<Q> steps queued (<E> exists, <G> gaps):*
> *  step 1: <required-cap> [<status>]*
> *  step 2: <required-cap> [<status>]*
> *  ...*
>
> *Each step runs in its own isolated agent. Steps are walked strictly sequentially (the journey concept requires it).*
>
> *Gap-handling policy for this sweep — pick one:*
> *  1. `auto-adapt`     — substitute alternative if confidence ≥ medium; else file as brainstorm seed (default)*
> *  2. `auto-file`      — file every gap as brainstorm seed; never adapt*
> *  3. `auto-skip`      — skip every gap (no file, no adapt)*
>
> *Per-agent decisions for `exists` steps and `gap → adapted` runs:*
> *  - Trust gate: auto-confirm (y)*
> *  - Filer: would-be-issue → file, would-be-brainstorm → seed, note → keep*
> *  - Symbol verification on miss: accept `use <closest>` if offered, else `file as-is`*
> *  - Destructive command detected mid-run: agent ABORTS and reports*
>
> *Pick policy [1/2/3] then confirm continuation [y/n]:"*

The trust gate fires **once** per `/relay-exercise-auto` invocation. Aborting here ends the orchestrator cleanly — no agents are spawned, no exercise files written, no hub changes.

Stash the resolved `(session, queue, gap_policy)` tuple for Phase 4. `gap_policy` is `n/a` for default-mode sweeps.

## Phase 4 — Per-item agent dispatch

For each item in the queue, in order:

### 4a. Build the agent prompt

The agent has no memory of this orchestration. Brief it with a self-contained prompt.

**Default-mode agent prompt template:**

```
You are walking ONE capability of an exercise session in non-interactive
auto-sweep mode.

Session: <session>
Capability: <capability-name>
Group: <group-name>
Mode: default

Step 1 — Run /relay-exercise-run for this capability ONLY:
  - Invoke the relay-exercise-run skill with arg `<capability-name>`
    and `--session <session>`.
  - When the Phase 3 trust gate fires, answer `y` automatically.
  - If a destructive command is detected mid-run (Phase 3
    destructive heuristics: delete/drop/rm -rf/reset/purge/truncate/
    wipe/clean --all/--force), do NOT answer y. Abort the run and
    return a summary with status `aborted-destructive` and the
    command in question. Leave any partial exercise file intact.
  - Otherwise, complete all phases (prerequisites, scenarios,
    findings, exercise file write, _control.md + master hub update).

Step 2 — Run /relay-exercise-file for the same capability:
  - Invoke the relay-exercise-file skill with arg `<capability-name>`
    and `--session <session>`.
  - When asked to confirm walking the matched findings, answer `y`.
  - For each finding, accept the default action by classification:
      would-be-issue       → file
      would-be-brainstorm  → seed
      note                 → keep
  - Do NOT use `edit` — accept fields as-is.
  - On symbol-verification miss: prefer `use <closest>` when offered;
    otherwise `file as-is` (the drift will be recorded in the new
    file's `## Drift Warnings` section). Never `edit manually`.
  - Complete Phase 4 (hub update, direct archival when applicable).

Step 3 — Return a JSON-shaped summary as your final output:
{
  "capability": "<capability-name>",
  "group": "<group-name>",
  "run": {
    "status": "exercised" | "prerequisite-failed" | "aborted-destructive",
    "scenarios": <int>,
    "findings_total": <int>,
    "findings_high_severity": <int>,
    "exercise_file": "<path-relative-to-.relay>"
  },
  "file": {
    "status": "filed" | "skipped" | "incomplete" | "not-run",
    "issues_filed": <int>,
    "brainstorms_seeded": <int>,
    "notes_kept": <int>,
    "skipped": <int>,
    "drafts_remaining": <int>,
    "paths": ["issues/<slug>.md", "features/<slug>_brainstorm.md", ...]
  },
  "errors": ["<error string>", ...]
}

Rules:
- Do NOT delegate to further sub-agents.
- Do NOT modify code outside the exercise/issue/feature filer paths.
- Do NOT prompt the user — every prompt has an auto-decision rule above.
- If you hit any state that no auto-rule covers, set the relevant
  status to "incomplete", record the prompt + your halt reason in
  `errors`, and return.
```

**Goal-mode agent prompt template:**

```
You are walking ONE journey step of an exercise session in
non-interactive auto-sweep mode.

Session: <session>
Step: <N>
Required Capability: <required-slug>
Project Match: <project-match-or-em-dash>
Status on entry: <exists|gap>
Mode: goal
Gap policy for this sweep: <auto-adapt|auto-file|auto-skip>

Step 1 — Run /relay-exercise-run for THIS step only:
  - Invoke the relay-exercise-run skill with arg `<N>` (the step
    number) and `--session <session>`.
  - When the Phase 3 trust gate fires, answer `y` automatically.
  - On destructive-command detection: ABORT, return
    status `aborted-destructive`, leave partial state intact.
  - For an `exists` step, complete the 3b exercise sub-flow normally.
  - For a `gap` step, apply the gap policy:
      auto-adapt → if 3c.1 produces a candidate with confidence ≥
                   medium, pick `alternative` and confirm the
                   runner's proposal. If confidence is `low` or
                   `none`, fall back to `file`.
      auto-file  → always pick `file` (seed brainstorm, status →
                   skipped).
      auto-skip  → always pick `skip` (status → skipped, no file).
  - Do NOT pause for the 3e continuation prompt — answer `continue`
    every time. If a high-severity finding or adaptation mismatch
    surfaces, record it in the summary; the orchestrator decides
    whether to halt the sweep, not you.
  - Do NOT enter the replan flow. If the runner offers replan,
    answer `continue` (or `abort` only if the step itself failed
    catastrophically — see error handling below).

Step 2 — Run /relay-exercise-file for THIS step only:
  - Invoke the relay-exercise-file skill with arg `<N>` and
    `--session <session>` (goal-mode resolves to
    `step-<N>-<capability>.md`).
  - Skip Step 2 entirely if the step ended `skipped` (gap → skipped
    via auto-file or auto-skip) — there is no exercise file to walk.
  - Otherwise, walk findings with the same default actions as
    default-mode: file/seed/keep by classification; symbol
    verification: `use <closest>` else `file as-is`.

Step 3 — Return a JSON-shaped summary:
{
  "step": <N>,
  "required_capability": "<required-slug>",
  "project_match": "<slug-or-em-dash>",
  "entry_status": "exists" | "gap",
  "exit_status": "exercised" | "failed" | "adapted" | "skipped"
                 | "aborted-destructive" | "prerequisite-failed",
  "alternative_used": "<slug-or-null>",
  "run": { ...same shape as default-mode... },
  "file": { ...same shape as default-mode (or null if skipped)... },
  "errors": [...]
}

Rules:
- Do NOT delegate to further sub-agents.
- Do NOT prompt the user.
- The orchestrator uses your `exit_status` and `errors` to decide
  whether to continue the sweep.
```

### 4b. Spawn the agent

Use the `Agent` tool with `subagent_type: general-purpose` (it has access to `Skill` and all file tools). Pass the prompt above. Foreground execution — the orchestrator needs the summary before queuing the next item.

Sub-agent dispatch is sequential by default. Goal mode is **always** sequential (the journey requires it). Default mode is sequential by default but accepts `--parallel-chains` to run capabilities from different context chains concurrently. The flag is OFF by default because:

- Two simultaneous launches against the same project process race on shared state (DB locks, output dirs, singleton ports).
- Master hub `relay-exercise.md` and `_control.md` use mtime-checked atomic writes; concurrent agents trigger external-modification aborts.

When `--parallel-chains` is set in default mode, the orchestrator partitions the queue by chain and spawns one agent per chain in parallel using a single message with multiple `Agent` tool calls. Within each chain, capabilities still run sequentially (the agent's prompt walks them in order via a follow-up message to the same agent — see "Chain-mode prompt" addendum below). Capabilities not in any chain are dispatched serially after the parallel batch completes (they may share state with anything).

**Chain-mode prompt addendum** (only when `--parallel-chains` is active and the chain has > 1 capability):

```
You will walk MULTIPLE capabilities sequentially within this single
chain. After each capability's run+file pair, return an array entry
for it and continue to the next. The chain ordering is:
  1. <cap-A>
  2. <cap-B>
  ...
Final output: a JSON array, one summary object per capability,
in chain order.
```

### 4c. Receive + interpret the summary

The agent returns a textual summary (the JSON shape above embedded in its message). Parse it:

- `run.status == "exercised"` AND `file.status ∈ {"filed", "incomplete"}` → success; continue to next item.
- `run.status == "prerequisite-failed"` → record, prompt user:
  *"Step/capability `<x>` failed at prerequisite setup. Continue with next item, or abort the sweep? [continue/abort]"*
- `run.status == "aborted-destructive"` → ALWAYS pause:
  *"Agent for `<x>` aborted on destructive command: `<cmd>`. Inspect the launch recipe / the capability's scenarios. Options: [investigate (orchestrator stops; you take over manually) / continue-skipping-this / abort-sweep]"*
- `errors` non-empty → pause and surface:
  *"Agent for `<x>` reported errors: <errors>. Continue, or abort? [continue/abort]"*
- High-severity findings (`run.findings_high_severity > 0`): NEVER auto-pause in auto-sweep mode (the user opted into a sweep). Record for the final summary; surface in Phase 5. (If the user wanted to halt on high-severity findings, they should use `/relay-exercise-run` with its built-in pause behavior.)

**External modification guard:** if `_control.md`'s mtime advanced unexpectedly between two consecutive agent dispatches (we read it fresh at the start of each dispatch), abort: *"Session control file changed externally during sweep. Re-run `/relay-exercise-auto` to resume from current state."*

### 4d. Progress reporting

Between items, emit ONE concise line to the main session output:

`[<i>/<N>] <item-id> → <run.status>, <findings_total> findings (<file.issues_filed> issues / <file.brainstorms_seeded> seeds / <file.notes_kept> notes)`

This is for the user watching the sweep. Do NOT dump full agent summaries to the main context — they're already on disk in the exercise files.

## Phase 5 — Aggregate summary + navigation

Once the queue is exhausted (or the user aborted), report:

**Default mode:**
- Capabilities walked: `<successful>/<total>` (`<aborted>` aborted, `<prerequisite-failed>` prerequisite-failed)
- Findings filed: `<issues>` issues, `<brainstorms>` seeds, `<notes>` kept, `<skipped>` skipped
- High-severity findings (across all walked items): `<count>` (list capability-name + finding title for each)
- Drafts remaining (any agent returned `incomplete` or `drafts_remaining > 0`): list them with the recommended re-invocation
- State changes NOT cleaned up: refer the user to each exercise file's `## State Changes` section

**Goal mode:**
- Steps walked: `<terminal>/<total>` (`<exercised>` exercised, `<failed>` failed, `<adapted>` adapted, `<skipped>` skipped, `<aborted>` aborted)
- Adaptations: per-step list of `step <N>: <required> → <alt>`
- Gaps filed (auto-file): per-step list of brainstorm seed paths
- Gaps skipped (auto-skip): step numbers
- Findings filed: same breakdown as default mode
- Un-walked steps (if user aborted mid-sweep): step numbers + current Status

**Next-step recommendation:**
- If any `incomplete` agents: *"Run `/relay-exercise-auto --session <session>` again to resume — completed items are persisted."*
- If everything terminal and findings exist: *"Run `/relay-scan` and `/relay-order` to integrate the new issues and brainstorms into the backlog."*
- If everything terminal and no findings: *"Sweep complete. No findings filed. Run `/relay-scan` to refresh status."*

## Contracts

**Single trust gate**: fires once at Phase 3 of the orchestrator. Spawned agents inherit auto-confirm and never re-prompt the user. Destructive-command detection inside an agent does NOT auto-confirm — the agent aborts and reports, and the orchestrator pauses for the user.

**One agent per work item**: each (capability OR step) maps to exactly one agent invocation (chain-mode is the only exception, where one agent walks an ordered chain). Run + file always live in the same agent context — the filer needs the runner's exercise file fresh.

**Strict sequential by default**: items advance one-at-a-time. Goal mode is *always* sequential. Default mode opts into chain-level parallelism via `--parallel-chains`, with the same project-state caveats spelled out in Phase 4b.

**Auto-sweep gap policy (goal mode)**: chosen once at Phase 3, applied uniformly to every gap step. The orchestrator does not let the agent deviate. To handle gaps case-by-case, use `/relay-exercise-run` directly.

**Auto-sweep filer policy**: file/seed/keep per classification, no `edit`, symbol verification picks `use` if available else `file as-is`. To get richer filer interactions (editing titles, picking notes vs. keeping, manual symbol revision), use `/relay-exercise-file` directly.

**Pause-and-prompt triggers** (orchestrator-level, not agent-level): `prerequisite-failed`, `aborted-destructive`, agent-reported `errors`, external mtime modification on `_control.md`. High-severity findings do NOT pause the sweep — they're recorded and surfaced in Phase 5.

**Resumability**: every agent persists state per the run/file workflows' own contracts (atomic `_control.md` writes, immediate exercise-file persistence per finding). Aborting the sweep at any point leaves a coherent on-disk state; re-running `/relay-exercise-auto` picks up the next non-terminal item.

**Context-window protection**: agents return only structured summaries. The orchestrator reads `_control.md` and `relay-exercise.md` between dispatches but never the full exercise files. Per-item progress reporting is one line each.

## Navigation

When finished, tell the user:
- "Next: run **/relay-scan** and **/relay-order** to integrate the new issues and brainstorms into the backlog."

## Notes

- This skill never executes project commands itself. Spawned agents do, with the same trust contract as `/relay-exercise-run` (just auto-confirmed at the gate).
- The skill is a thin orchestrator on top of `/relay-exercise-run` and `/relay-exercise-file`. If those skills evolve, the agents pick up the new behavior automatically — no changes needed here unless their CLI args change.
- For surgical re-walks (single capability, manual gap decisions, finding-by-finding filing with edits), use `/relay-exercise-run` and `/relay-exercise-file` directly. Auto-sweep is for blanket coverage, not nuance.
- Mid-sweep, the user can interrupt (Ctrl+C) — the in-flight agent finishes its current persist step (per its own atomicity contracts) and the next item simply isn't dispatched. Re-running `/relay-exercise-auto` resumes.
- The orchestrator does NOT mutate `_control.md` or `relay-exercise.md` directly. All state writes happen inside spawned agents through the existing run/file workflows.
