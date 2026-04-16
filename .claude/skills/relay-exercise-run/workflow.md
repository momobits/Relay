# Relay: Exercise — Run Scenarios

**Sequence**: `/relay-exercise` → **`/relay-exercise-run`** → `/relay-exercise-file` → *findings flow into /relay-new-issue and /relay-brainstorm* → standard code pipeline

Pick a capability (or a group of capabilities) from `.relay/relay-exercise.md`, execute realistic scenarios against the real project, capture observations as structured findings, and write them to a per-capability exercise file.

**This skill runs real commands against the real project.** Unlike other Relay skills that reason about code, this one drives the application. It may create data, modify state, start services, or hit external dependencies. The trust gate in Phase 3 and the destructive-command re-prompts exist to keep the user in control.

## Phase 1 — Arg resolution + session resolution

**Preflight:** if `.relay/relay-exercise.md` does not exist, stop with:
*"No exercise master hub found. Run `/relay-exercise` first to create
a session."*

**Session resolution:** scan `.relay/exercise/*/` for subfolders
containing `_control.md` with `*Status:* active`. Apply this order:

1. **Explicit `--session <name>`** flag (or trailing positional `<session>`
   when the capability/group arg is already consumed) → use that session
   verbatim. Error cleanly with available active sessions listed if the
   named subfolder does not exist or is not active.
2. **Exactly one active session** → use it silently.
3. **Multiple active sessions** → prompt:
   *"Multiple active sessions found. Select one:*
   *  1. <session-1> (<X> exercised, <Y> draft)*
   *  2. <session-2> (<X> exercised, <Y> draft)*
   *Pick [1/2/...], or rerun with `--session <name>`."*
4. **No active sessions** → stop with: *"No active session. Run
   `/relay-exercise` first to create one."*

**Capability lookup:** read the resolved session's `_control.md`.
If the file does not exist or is unparseable (no `## Session Capabilities`
heading), stop with: *"Session `<session>` is missing or has a corrupt
control file. Inspect `.relay/exercise/<session>/` manually and either
restore `_control.md` from version control / backup, or run
`/relay-exercise` to create a fresh session."*

Parse the `## Session Capabilities` tables by group. Resolve the user's
argument against the **session-scoped** table (NOT the master hub's
Aggregate Capabilities — sessions have fixed scope at creation):

- **No argument** → pick the first capability with status `mapped` in
  `_control.md` order (top to bottom, groups in order). If none are
  `mapped`, tell the user: *"All capabilities in session `<session>`
  are already exercised or filed. Run `/relay-exercise` to create a
  new session, or name a specific capability to re-exercise within
  this session."*

- **`<capability-name>`** → look it up by exact match (case-insensitive,
  kebab-case) against the session's Session Capabilities. Error cleanly
  if not in this session — suggest closest matches by edit distance,
  and recommend running `/relay-exercise` to create a new session that
  includes this capability. If found with status `mapped` or `stale`,
  proceed normally. If found with status `exercised` or `filed`, prompt:
  *"This capability was last exercised on YYYY-MM-DD with N findings
  in this session. Re-exercise anyway? [y/n]"*
  On yes, proceed in **re-run mode** (see Phase 6 filename logic).

- **`<group-name>`** → look up the group by exact match against the
  session's `### Group: <name>` headers. Error cleanly if not found.
  Collect all capabilities in that group with status `mapped` or `stale`.
  For any that are `exercised` or `filed`, offer to include them (re-run
  mode applies per capability).

Store the resolved `(session, capability, mode)` tuple set for Phase 3
onward.

## Phase 2 — Launch recipe resolution

Read `.relay/relay-config.md` and look for a `## Launch Recipe` section.

**If present**, read:
- Launch command (the shell command to invoke the project)
- Per-command timeout (default: 300s if not specified)
- Required env vars or setup steps
- Project-specific notes for exercising safely

**If missing** (first-run situation), infer a launch recipe from the project:
- `pyproject.toml` → `python -m <package>` or the `[project.scripts]` entrypoint
- `package.json` → the `bin` entry, `npm run <script>`, or `node <main>`
- `Cargo.toml` → `cargo run`
- `go.mod` → `go run .`
- Other → ask the user

Present the inferred recipe for confirmation:

> *"I don't see a Launch Recipe in relay-config.md. Based on this project,
> I'd launch it with:*
>
> *    `<command>`*
> *    Timeout: 300s per command*
> *    Env: <required env vars, or "none detected">*
>
> *Confirm and save to relay-config.md? [y/n]"*

On confirmation, **append** a `## Launch Recipe` section to
`.relay/relay-config.md` using this structure:

    ## Launch Recipe

    *Used by: /relay-exercise-run — defines how to invoke the project
    for exercise sessions*

    ### Launch Command

    ```
    <confirmed command>
    ```

    ### Per-Command Timeout

    `300s` (default; kill scenarios that exceed this)

    ### Required Environment

    - <env var 1>
    - <env var 2>
    (or "None required" if no env vars are needed)

    ### Setup Steps

    1. <step 1>
    2. <step 2>
    (or "None — project runs directly" if no setup is needed)

    ### Notes for Exercising Safely

    - <project-specific safety notes inferred from context>

The runner owns this section. No other skill creates it.

**Launch recipe failure handling:** if the launch command fails on first
use (non-zero exit, connection refused, command not found), do NOT press
on. Prompt:
*"Launch command failed (exit <N>: <stderr summary>). Update the recipe
in relay-config.md and retry? [y/n]"*
On yes, re-enter Phase 2. On no, abort the session cleanly.

## Phase 3 — Trust gate

Before any command runs, show the user what's about to happen:

> *"I'm about to exercise `<capability-name>` against this project. This
> will run real commands (see launch recipe above) and may modify state
> (DBs, files, caches). A `## State Changes` section in the exercise file
> will document everything modified.*
>
> *Continue? [y/n]"*

The trust gate fires **once per `/relay-exercise-run` session**, not per
capability. In a group sweep, users confirm once at the start.

**Destructive command re-prompts:** within the session, subsequent commands
run silently UNLESS a command looks destructive. Re-prompt with the
specific command shown:

> *"Next command looks destructive: `<command>`. Run it? [y/n]"*

Destructive heuristics (case-insensitive match): command contains any of
`delete`, `drop`, `rm -rf`, `reset`, `purge`, `truncate`, `wipe`,
`clean --all`, or `--force` combined with any of the above.

Aborting at the trust gate ends the session cleanly. No exercise file is
written and no hub changes are made.

## Phase 4 — Establish prerequisite state

For the current capability, check the session's `_control.md` Context
Chains section. If the capability appears in any chain at position N > 1,
establish the state that capabilities 1 through N-1 would have produced.

**Key distinction:** prerequisites are setup, not exercises. Do NOT produce
exercise files for prerequisite capabilities. Do NOT append prerequisite
observations to the current exercise file's Findings section. Prerequisites
are minimal, functional, and fast — just enough to make the target
capability runnable.

Record prerequisite steps in the exercise file's `## Prerequisites
Established` section.

Each capability in a sweep gets **fresh prerequisites** — do not reuse
state from a prior capability's prerequisites, even if they overlap. This
keeps findings independent and easier to debug.

**On prerequisite failure** (command errors, service unavailable, etc.):
- Write the exercise file with the failure documented as a special finding:
  Classification `would-be-issue`, Severity `high`,
  Scenario `0 (prerequisite setup)`, Title describing the failure
- Update the hub row's `Last Updated` to today but leave `Status` unchanged
- If in group-sweep mode, ask:
  *"Prerequisite setup failed for `<capability>`. Skip to next capability,
  or abort the session? [skip/abort]"*

## Phase 5 — Execute scenarios

Design and execute realistic scenarios for the current capability.

Design scenarios that cover, at minimum: the happy path, reasonable edge
cases (boundary conditions, unusual but valid inputs, unexpected states),
and error paths (invalid inputs, missing prerequisites, resource limits).
Add stress cases or capability-specific scenarios where they make sense
for this project. The exact scenario set is your judgment call — match it
to the capability's purpose and the project's nature. Aim for coverage
over quantity.

For each scenario:

1. **Name** the scenario (e.g., *"Happy path — short input"*, *"Edge case —
   input at 50k word boundary"*).
2. **Echo** each shell command before running it (so the user can see what's
   happening if observing the session).
3. **Run** the command subject to the per-command timeout from the launch
   recipe.
4. **Capture** stdout, stderr, exit code, and any observable state changes
   (new/modified files, DB rows via the project's own CLI/query commands,
   services started).
5. **Compare** observed vs. expected behavior (where "expected" comes from
   the capability's purpose as documented in the hub).
6. **Decide** whether the observation is a finding. If yes, format per the
   Findings format contract in Phase 6.

**Timeout handling:** if a command exceeds its per-command timeout, kill it
and produce an automatic finding: Classification `would-be-issue`, Severity
`high`, Title `<command> exceeded timeout (<N>s)`, including captured output
up to the kill point.

**Output volume:** if a command produces more than 200 lines of combined
stdout+stderr, truncate to first 100 and last 100 lines with a
`[... N lines truncated ...]` marker in the exercise file. Save the full
output to `.relay/exercise/<session>/<capability>.outputs/scenario_<N>.log`
only if truncation occurred. Create the `.outputs/` directory on demand.

**State tracking:** track every state change the session makes (rows
created, files written, services started) in a running list for the
`## State Changes` section.

**DB state observation:** rely on the project's observable state — CLI
commands, query endpoints, file inspection. If the project has no
observable state affordance for a particular change, note in State Changes:
*"DB/state changes made but not enumerable — inspect manually."*

## Phase 6 — Write the exercise file

Determine the file path (always nested under the resolved session):
- **First exercise of this capability in this session** →
  `.relay/exercise/<session>/<capability-name>.md` (no suffix)
- **Re-run within the session** (capability already has an exercise
  file in this session) →
  `.relay/exercise/<session>/<capability-name>-<YYYY-MM-DD>.md`
  If a re-run file with that date already exists, append `-2`, `-3`, etc.

(Re-running a capability across sessions writes a fresh
`<session>/<capability-name>.md` in each session; the older session's
file is never touched. The master hub Aggregate Capabilities row points
at the latest session — see sibling master-hub design.)

Write the file using this structure:

    # Exercise: <capability-name>

    *Capability:* `<capability-name>`
    *Group:* [Group Name or Ungrouped]
    *Exercised:* YYYY-MM-DD by /relay-exercise-run
    *Session Status:* draft
    *Findings:* N draft / 0 filed / 0 kept / 0 skipped

    ## Context

    [Brief description of what this capability does, drawn from the hub's
    Project Identity and the capability's name. Used by the filer and by
    future readers to understand what was being tested.]

    ## Prerequisites Established

    [Exact steps the runner took to put the system into a runnable state.
    Include commands run, resources created, env vars set. If the
    capability has no prerequisites, write: "None — capability has no
    prerequisite chain."]

    ## Scenarios Executed

    ### Scenario 1: <name>

    **Commands run:**
    ```
    <command>
    ```

    **Observed:** <stdout summary, exit code, observable state changes>

    **Assessment:** <Behaves as expected. No finding. | Surprising — see Finding N.>

    ---

    [Repeat for each scenario, separated by ---]

    ## State Changes

    *The runner did not clean up. The following changes were made to the
    project and are still present. Inspect or clean up manually as needed.*

    - Database: <changes or "none">
    - Filesystem: <changes or "none">
    - Services: <changes or "none">

    ---

    ## Findings

    ### Finding 1: <title>

    **Classification:** <would-be-issue | would-be-brainstorm | note>
    **Severity:** <low | medium | high | —>
    **Scenario:** <N>
    **Observed:** <what happened>
    **Expected:** <what should have happened>
    **Reproduction:** <exact command(s) to reproduce>
    **Suggested direction:** <recommended fix or exploration direction>
    **Status:** draft

    ---

    [Repeat for each finding, separated by ---]

**Findings format contract (strict — consumed by /relay-exercise-file):**
- Each finding is `### Finding N: <title>` under a top-level `## Findings`
- Fields are **bold-labeled lines** in this exact order:
  `**Classification:**`, `**Severity:**`, `**Scenario:**`,
  `**Observed:**`, `**Expected:**`, `**Reproduction:**`,
  `**Suggested direction:**`, `**Status:**`
- Classification ∈ `would-be-issue` / `would-be-brainstorm` / `note`
- Severity ∈ `low` / `medium` / `high` / `—` (dash for notes and
  brainstorms where severity doesn't apply)
- Scenario is a numeric reference to a `### Scenario N` entry, or
  `0 (prerequisite setup)` for prerequisite failures
- Status starts at `draft` — the filer transitions it to `filed: <path>`,
  `skipped`, or `kept: <path>`
- Findings are separated by `---`

Previous exercise files (if re-run) are left untouched on disk — the hub
just stops pointing to them.

## Phase 7 — Update session control file + master hub aggregate

### 7a. Session `_control.md` row update (incremental, mtime-checked)

Read `.relay/exercise/<session>/_control.md` from disk. Capture its
mtime. For the `## Session Capabilities` row matching the current
capability:
- `Status` → `exercised`
- `Last Updated` → today (YYYY-MM-DD)
- `Exercise File` → `exercise/<session>/<capability-name>.md`
- `Findings Filed` → clear to `—` on re-run. On first run, already `—`.

Update the `## Session Coverage` table counts: if the capability's
previous status was `mapped`, decrement `mapped` by 1 and increment
`exercised` by 1. If the previous status was `stale`, decrement `stale`
by 1 and increment `exercised` by 1. If the previous status was `filed`
(re-run mode), decrement `filed` by 1 and increment `exercised` by 1.
If the previous status was `exercised` (re-run mode), no net change to
counts.

Update the `*Last activity:*` header to today.

Append a Session Log entry:
- First run: `**YYYY-MM-DD** — /relay-exercise-run: exercised
  \`<capability>\`. N scenarios, M findings (A issue / B brainstorm /
  C note).`
- Re-run: `**YYYY-MM-DD** — /relay-exercise-run: re-exercised
  \`<capability>\` (previous at \`exercise/<session>/<previous-filename>\`).
  N scenarios, M findings.`

**Atomic write:** before persisting, re-read `_control.md` and verify
mtime matches the read at the start of Phase 7. If mtime differs,
abort with: *"Session control file was modified externally since this
exercise began; rerun `/relay-exercise-run` to continue from current
state."*

### 7b. Master hub Aggregate Capabilities row update

Open `.relay/relay-exercise.md`. For the Aggregate Capabilities row
matching the current capability:
- `Status` → `exercised` (unless re-running an already-`filed` cap;
  then still flip to `exercised` — the row reflects the latest action)
- `Last Updated` → today (YYYY-MM-DD)
- `Latest Session` → current session
- `Latest Exercise File` → `exercise/<session>/<capability-name>.md`
- `Latest Findings Filed` → `—` (reset; any prior Findings Filed live
  in older sessions' `_control.md` and in those filed items themselves)

Recompute Aggregate Coverage using the same transition rules as the
session-coverage update above (mapped→exercised, stale→exercised,
filed→exercised on re-run, exercised→exercised no-op).

Update the master hub `*Last updated:*` header to today.

No Refresh Log entry on the master hub for per-capability events —
detail lives in the session `_control.md` Session Log. Master hub
Refresh Log entries only fire on session lifecycle events (creation
in `/relay-exercise` Phase 8, archival in `/relay-resolve` step 5f).

**Sweep continuation** (group-sweep mode with more capabilities queued):
- If the current exercise produced no `high`-severity `would-be-issue`
  findings → continue silently to the next capability. Re-run Phases 4–7
  for the next capability. The trust gate from Phase 3 does NOT re-fire;
  destructive-command re-prompts still do.
- If the current exercise produced at least one `high`-severity
  `would-be-issue` finding → pause:
  *"Found N high-severity issues in `<capability>`. Continue to next
  capability in group, or stop for review? [c/s]"*

When the sweep is complete (or the user bails out), move to Phase 8.

## Phase 8 — Summary + navigation

Report:
- Capabilities exercised this session
- Total findings by classification (issue / brainstorm / note) and severity
- State changes NOT cleaned up (refer user to `## State Changes` in each
  exercise file)
- Any prerequisite failures that aborted specific capabilities

Next step:
- If findings exist: *"Run `/relay-exercise-file <capability-name>` to
  walk the findings and file issues or brainstorms."*
- If no findings: *"No findings this session. Run `/relay-exercise-run`
  again with another capability or group."*

## Navigation

When finished, tell the user:
- "Next: run **/relay-exercise-file** to walk and file the findings from
  this session."

## Notes

- This skill runs REAL commands — it is the only Relay skill that executes
  the target project directly
- The trust gate fires once per session; destructive re-prompts fire per
  command
- Prerequisites are setup, not exercises — no findings from prerequisite
  steps (except prerequisite failures, which are documented as special
  findings with scenario 0)
- Each capability in a sweep gets fresh prerequisites (no state reuse in
  v1) — keeps findings independent and debuggable
- Exercise files are human-readable reports first, filer-parseable second
- The Findings format contract is strict — /relay-exercise-file depends
  on it for parsing. Do not deviate from the field order or value sets.
- Launch recipe drift: if the first command fails, prompt the user to
  update relay-config.md rather than pressing on with bad commands
- Two runs of the same capability may produce different scenarios — this is
  intentional (LLM-driven variety catches different bugs). A
  fix-confirmation workflow is a separate future feature.
- On session abort (Ctrl+C or user bail-out): if any scenarios have been
  executed, write a partial exercise file containing findings so far,
  update the hub row's Last Updated, and exit cleanly. If no scenarios
  have run, no exercise file is written and no hub changes are made.
- This skill is project-agnostic — it adapts scenario design to whatever
  project it's invoked in based on the hub's Project Identity and the
  capability's documented purpose
