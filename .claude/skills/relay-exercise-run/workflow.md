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

Store the resolved `(session, capability, run_mode)` tuple set (where
`run_mode` ∈ `first / re-run`) for Phase 3 onward. This tuple set is
populated ONLY for default-mode sessions; goal-mode sessions proceed via
Phase 1b below.

### 1b. Mode detection + goal-mode walk-queue resolution

Read the `*Mode:*` header from `.relay/exercise/<session>/_control.md`.

- **`*Mode:* default`** — the tuple set built above is the walk target.
  Skip to Phase 2.

- **`*Mode:* goal`** — the capability/group lookup above is inapplicable
  (goal sessions' Session Capabilities rows track `exists` steps' Project
  Match slugs; the Journey table is the source of truth for per-step
  state). Discard any tuple set produced above. Parse the `## Journey`
  table from `_control.md` and build an ordered walk queue of
  `(session, step_number, journey_row)` tuples per the user's argument:

  | User argument            | Walk queue                                         |
  |--------------------------|----------------------------------------------------|
  | None (no positional arg) | All rows with Status ∈ `exists | gap`, ascending Step order |
  | `<N>` (integer)          | Just row with Step=N                               |
  | `<N>-<M>` (range)        | Rows Step=N..M inclusive, ascending                |
  | `<capability-name>`      | Rows where `Project Match` == name (exists/exercised/adapted) OR `Required Capability` == name (gap). On multi-match, prompt *"Steps <A> and <B> match. Target which? [<A>/<B>/both]"* |
  | `<group-name>`           | Rows where Project Match is in that group AND Status ∈ `exists | gap` (gap rows in the group skipped silently — group is meaningful only for exists rows) |

  Terminal rows (Status ∈ `exercised | failed | adapted | skipped`) are
  skipped UNLESS the user targeted them explicitly by step number or
  capability name. In explicit-target mode, treat as re-exercise
  (Phase 3.5 3b writes a dated variant filename).

- **Missing `*Mode:*` header** — self-heal per `/relay-exercise/workflow.md`
  Contracts "Mode" entry. Infer goal mode if `## Journey` section present;
  infer default mode if `## Context Chains` section present. Rewrite the
  header to match, log the correction, and continue with the inferred
  mode. If BOTH sections are present (corrupt), error loudly and refuse:
  *"Session `<session>` has both Journey and Context Chains sections —
  ambiguous mode. Inspect `_control.md` manually and remove the unused
  section before re-running."*

**Walk-queue validation:** if the resolved queue is empty (all targeted
steps already terminal, or capability/group name matched no non-terminal
rows), report:
*"All targeted journey steps in session `<session>` are already
terminal. Use `/relay-exercise-run <N>` to re-walk a specific step."*
Exit cleanly.

At the end of Phase 1, the skill has either
`(session, tuple_set, run_mode)` for default mode or
`(session, walk_queue, goal_narrative)` for goal mode. Phase 2 (launch
recipe) and Phase 3 (trust gate) are shared across both modes. Phase 3.5
handles goal-mode walks; Phases 4–7 handle default-mode per-capability
walks.

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

Before any command runs, show the user what's about to happen. Prompt
text depends on session mode:

**Default mode** (from Phase 1):

> *"I'm about to exercise `<capability-name>` against this project. This
> will run real commands (see launch recipe above) and may modify state
> (DBs, files, caches). A `## State Changes` section in the exercise file
> will document everything modified.*
>
> *Continue? [y/n]"*

**Goal mode** (walk queue from Phase 1b):

> *"I'm about to walk the journey for session `<session-slug>`
> (goal: `<first-120-chars-of-narrative>`). <Q> steps queued
> (<E> exists, <G> gaps). Existing-capability steps will run real
> commands per the launch recipe (may modify state: DBs, files,
> caches). Gaps will prompt per-step for alternative/file/skip; no
> commands run until you pick `alternative`. Per-step exercise files
> will be named `step-<N>-<capability>.md`.*
>
> *Continue? [y/n]"*

The trust gate fires **once per `/relay-exercise-run` invocation** (not
per session or per capability). In a default-mode group sweep or a
goal-mode walk, users confirm once at the start.

**Destructive command re-prompts:** within the session, subsequent commands
run silently UNLESS a command looks destructive. Re-prompt with the
specific command shown:

> *"Next command looks destructive: `<command>`. Run it? [y/n]"*

Destructive heuristics (case-insensitive match): command contains any of
`delete`, `drop`, `rm -rf`, `reset`, `purge`, `truncate`, `wipe`,
`clean --all`, or `--force` combined with any of the above.

Aborting at the trust gate ends the session cleanly. No exercise file is
written and no hub changes are made.

**Post-trust-gate dispatch:** if session mode is `goal` (from Phase 1b),
proceed to Phase 3.5 (goal-mode walk). If mode is `default`, continue to
Phase 4 as today.

## Phase 3.5 — Goal-mode walk (goal sessions only)

For each step in the walk queue (from Phase 1b), in order, execute the
sub-flows below. After the queue is exhausted — or the user aborts or
replans — jump to Phase 8 for the summary. Default-mode sessions skip
this entire phase.

### 3a. Branch on current Journey row Status

| Status on entry                                  | Action                                              |
|--------------------------------------------------|-----------------------------------------------------|
| `exists`                                         | Run 3b (exercise)                                   |
| `gap`                                            | Run 3c (adaptive handling)                          |
| `exercised` / `failed` / `adapted` / `skipped`   | Terminal row. If the user targeted this step explicitly (step number or capability name), treat as re-exercise: `exercised/failed` → 3b; `adapted` → 3b against the current Project Match (alternative slug); `skipped` → 3c (user may now want to file or substitute). If the step is in the walk queue from a no-arg walk (implicit targeting), skip silently and continue. |

### 3b. Exercise existing capability sub-flow

Runs for `exists` steps (first-time walk) or explicit re-exercise of
`exercised/failed/adapted` steps.

1. **Establish prerequisites** — run Phase 4 logic, but derive the
   prerequisite list from **earlier Journey steps** instead of
   `_control.md` Context Chains (goal mode has no Context Chains
   section). Prerequisite list: `[earlier Journey row's Project Match
   for each row with Step < current AND Status ∈ {exists, exercised,
   adapted}, in ascending Step order]`. Skip `gap` and `skipped`
   earlier steps — nothing to run. Fresh prereqs per spec Phase 4
   contract (no state reuse from prior step in this walk).

2. **Execute scenarios** — run Phase 5 logic, with **step-scoped
   scenario design**. The scenario-design prompt MUST include:
   - the goal narrative (from `_control.md` Session Scope)
   - the current Journey row's `Required Capability`
   - the row's `Notes` column
   - the Required Capabilities and Project Matches of the immediate
     previous and next Journey steps
   The model uses these to bias scenarios toward what the step means
   INSIDE this journey (e.g., for step 2 `outline-chapter` in a
   book-writing goal, test outlines that could feed a later chapter-
   expansion step, not generic outline edge cases). Scenario count
   and structure follow Phase 5's existing contract.

3. **Write the exercise file** at
   `.relay/exercise/<session>/step-<N>-<capability>.md` where `<N>`
   is the Journey Step number (bare integer, no zero-padding) and
   `<capability>` is the row's Project Match (for `exists`) or the
   alternative slug (for `adapted` re-exercise). Re-run within the
   session: `step-<N>-<capability>-<YYYY-MM-DD>.md`; same-day
   collision suffix `-2`, `-3`. Findings format contract (8 bold-
   labeled fields) unchanged from Phase 6.

4. **Determine Journey row transition**:
   - All scenarios completed AND no finding is classified as
     `would-be-issue` severity `high` with an observed behavior that
     blocks the step's core function → `exists/exercised/adapted →
     exercised` (or `failed → exercised` on a successful re-run).
   - At least one `would-be-issue` severity `high` finding with
     observed behavior that prevents the step from producing its
     intended output → `exists/exercised/adapted → failed` (or
     `failed → failed` on a confirming re-run).
   - Non-blocking findings (severity < high, OR high-severity but the
     step still produced usable output) → `exercised` with a
     rationale appended to the Journey row's Notes. "Exercised-with-
     findings" is a judgment call; the runner records the reasoning
     in Notes.

5. **Update Journey row**:
   - `Status` → new value per step 4
   - `Project Match` → unchanged (always the slug of the capability
     actually exercised; for `adapted` re-exercise, already the
     alternative's slug)
   - `Notes` append (append-only, chronological):
     `YYYY-MM-DD: exercised → step-<N>-<cap>.md; <short rationale>`
     or `YYYY-MM-DD: failed — <short rationale>`.

6. **Prerequisite-failure case**: if step 1 fails (command errors,
   service unavailable), Journey row Status stays `exists` (no
   transition — prereq failures are environmental, not capability
   defects). Notes append: `YYYY-MM-DD: prerequisite-failed —
   <what failed>`. Prompt: *"Prerequisite for step <N> failed
   (`<what>`). Options: [skip-to-next / abort / retry-after-fix]"*.

### 3c. Handle gap adaptively sub-flow

Runs for `gap` steps (first-time walk) or explicit re-visit of
`skipped` steps.

1. **Propose alternative.** Scan master hub Aggregate Capabilities for
   semantic-overlap candidates against the Required Capability + the
   row's Notes + the goal narrative. Pick the best match; label
   confidence `high / medium / low / none`:
   - `high` — capability name closely matches or is a documented
     synonym (e.g., `append-message` proposed; existing `log-message`
     in project with matching signature)
   - `medium` — capability covers a superset or subset of the
     required behavior (e.g., generic `summarize` for
     `summarize-session`)
   - `low` — capability has tangential overlap; workable with
     adaptation
   - `none` — no viable candidate in Aggregate Capabilities

2. **Prompt the user — no default; force explicit choice**:

   > *"Step <N>: `<required-slug>` is a gap. Options:*
   >
   > *  `alternative` — substitute an existing capability; runs the
   >     exercise sub-flow → Status becomes `adapted`*
   > *  `file`        — seed a feature brainstorm at
   >     `.relay/features/<required-slug>_brainstorm.md` → Status
   >     becomes `skipped`*
   > *  `skip`        — move on without filing → Status becomes
   >     `skipped`*
   >
   > *Suggested alternative: `<best-alt-slug>` (confidence: <level>).
   >  Reason: <one-line>. If confidence is `none`, you may propose a
   >  different capability of your own.*
   >
   > *Pick [alternative/file/skip]: "*

   Empty input or unrecognized input → re-prompt (does NOT auto-
   select).

3. **On `alternative`**:
   a. User confirms the runner's proposal OR names a different
      capability. Validate the user's choice against master hub
      Aggregate Capabilities. If the named capability isn't in
      Aggregate Capabilities, re-prompt with the candidate list or
      `file / skip`.
   b. Run sub-flow 3b against the alternative. Exercise file named
      `step-<N>-<alternative-cap>.md`.
   c. Journey row update (applied in 3d after 3b completes):
      - `Status` → `adapted`
      - `Project Match` → alternative slug (was `—` for the gap)
      - `Notes` append: `YYYY-MM-DD: adapted — substituted <alt>
        for gap <required-slug>: <rationale>`.

4. **On `file`**:
   a. Seed brainstorm at
      `.relay/features/<required-slug>_brainstorm.md` using the
      goal-mode seed template from Feature 6-1 (see
      `/relay-exercise/workflow.md` Phase 6 file-now block).
      `*Source:*` line: `*Source: exercise/<session>/_control.md
      journey step <N>*`. Slug-collision suffix `_2`, `_3`, ...
      applied against all four filer-tracked directories
      (`.relay/issues/`, `.relay/archive/issues/`,
      `.relay/features/`, `.relay/archive/features/`).
   b. Journey row update (applied in 3d after brainstorm write):
      - `Status` → `skipped`
      - `Notes` append: `YYYY-MM-DD: gap filed →
        features/<required-slug>_brainstorm.md`
   c. **Orphan-recovery contract** (mirrors Feature 6-1 Phase 6):
      the brainstorm file is written BEFORE 3d's atomic `_control.md`
      rewrite. If 3d aborts (mtime mismatch, disk full, Ctrl+C), the
      brainstorm exists on disk but the Journey row still shows `gap`
      (no `skipped` transition, no `gap filed →` marker). The runner
      MUST print to stderr at abort time:
      *"[relay-exercise-run] Orphan brainstorm(s) from aborted walk
      — delete or move before retry: features/<slug>_brainstorm.md
      [... one path per file-decision that succeeded this run ...]"*
      Do NOT auto-delete — the user may have invested reading time
      in the seeded Goal paragraph. `/relay-scan`'s next run flags
      the dangling `*Source:*` header as a warning.

5. **On `skip`**:
   a. No file created.
   b. Journey row update (applied in 3d):
      - `Status` → `skipped`
      - `Notes` append: `YYYY-MM-DD: skipped by user`.

### 3d. Persist after each step

After every step (3b or 3c):

1. **Read `_control.md` mtime** before mutation (matches the existing
   Phase 7a concurrent-modification guard). Abort with
   *"Session control file was modified externally since this step
   began; rerun `/relay-exercise-run` to continue from current
   state."* on mtime change. See 3c.4.c for orphan-recovery on abort.

2. **Mutate Journey row** (per 3b step 5 or 3c step 3c/4b/5b).

3. **Mutate Session Capabilities row** (lockstep with Journey —
   plan-level Decision #1). Session Capabilities Status vocabulary
   remains `mapped / exercised / filed / stale` per Feature 5-1 —
   the Journey row's `failed / adapted / skipped` are per-step
   Journey outcomes, not per-capability Session Capabilities
   outcomes:
   - On `exists → exercised` transition: find the row by Project
     Match slug. Update `Status` → `exercised`, `Last Updated` →
     today, `Exercise File` →
     `exercise/<session>/step-<N>-<cap>.md`, `Findings Filed` →
     `—`. Latest-wins applies on multi-step: two Journey steps
     sharing a Project Match leave one row with the most-recently-
     written exercise file.
   - On `exists → failed` transition: same row mutation as
     `exercised` above — the capability WAS exercised (just with
     negative outcome). Session Capabilities `Status` → `exercised`.
     The `failed` outcome lives in the Journey row's Status column
     and Notes, not here.
   - On `gap → adapted` transition: the alternative's Project Match
     slug becomes the row key. Look up the slug in Session
     Capabilities:
     - If an existing row matches: UPDATE it per the
       `exists → exercised` rule above (Status → `exercised`).
     - If NOT found (alternative wasn't in the original journey's
       `exists` steps): INSERT a new row. Look up the alternative's
       group from master hub Aggregate Capabilities (the same hub
       `### Group:` sub-heading where 3c.1 found the candidate).
       Use that group for the new row. If Aggregate Capabilities
       places the alternative under `### Ungrouped`, insert under
       the session's Ungrouped group (create the `### Ungrouped`
       sub-heading in the session's Session Capabilities table if
       one doesn't yet exist). New row fields: `Status` =
       `exercised`, `Last Updated` = today, `Exercise File` =
       step-prefixed path, `Findings Filed` = `—`.
   - On `gap → skipped` transition (file or skip): NO Session
     Capabilities update. The gap's Required Capability was never
     a project capability; Session Capabilities tracks project
     capabilities only.

4. **Recompute Session Coverage**. Count Session Capabilities rows
   by Status (`mapped`, `exercised`, `filed`, `stale`). Derive the
   two gap-bucket rows from the Journey table:
   - `gaps-filed` = count of Journey rows whose Notes column contains
     the literal marker `gap filed →` (Feature 6-1's Phase 6 writes
     this on `file-now`; 6-2's 3c.4 `file` branch writes it too).
     Includes rows currently Status=`skipped` as well as rows still
     at `gap`.
   - `gaps-recorded` = count of Journey rows currently Status=`gap`
     WITHOUT the `gap filed →` marker in Notes. Shrinks as the walk
     transitions gaps to `adapted` / `skipped`.
   The original 6-1 invariant `R + F = G` holds AT SESSION CREATION.
   During the walk, R shrinks (as gaps leave `gap` status); F may
   grow (if the walk files more brainstorms); R + F may be less than
   G (original gap count) as adapted / user-skipped rows leave both
   buckets. Session Log is the chronological record of every
   transition; these two counters are the current-state summary.

5. **Append Session Log entry**:
   `**YYYY-MM-DD** — /relay-exercise-run: step <N> <action>.
   <short summary>.`
   Actions: `exercised`, `failed`, `adapted (<alt>)`,
   `filed (<path>)`, `skipped`, `prerequisite-failed`, `replanned`,
   `aborted`.

6. **Update `*Last activity:*` header** to today.

7. **Write `_control.md` atomically** (single write; mtime check from
   step 1 already performed).

8. **Master hub Aggregate Capabilities update** (for Journey
   transitions `exists → exercised`, `exists → failed`,
   `gap → adapted` — same upsert rules as Feature 5-1's Phase 7b):
   - `Status` → `exercised` for all three transition types. The hub
     vocabulary stays `mapped / exercised / filed / stale`; Journey
     `failed` / `adapted` are per-step outcomes, not per-capability
     hub state. For `failed` transitions, record the failure
     rationale in the Journey row's Notes; the hub row stays at
     `exercised` (capability WAS invoked).
   - `Last Updated` → today
   - `Latest Session` → current session
   - `Latest Exercise File` → `exercise/<session>/step-<N>-<cap>.md`
     (for `adapted`, `<cap>` is the alternative's slug)
   - `Latest Findings Filed` → `—` (reset for fresh exercise)
   - Recompute Aggregate Coverage from Aggregate Capabilities counts.
   For `gap → skipped` (file or skip): NO Aggregate Capabilities
   update. The gap's Required Capability is not a project
   capability.

### 3e. Continuation decision between steps

Default: continue silently to the next step in the walk queue.
**Pause and prompt** when:

- The just-completed step produced ≥ 1 `high`-severity
  `would-be-issue` finding (same as current Phase 7 sweep pause
  rule).
- The just-completed step was `adapted` AND the runner detects an
  output/input mismatch with the next step's Required Capability
  (heuristic: compare the alternative's documented output shape
  against the next step's Required Capability + Notes; if
  incompatible, surface the concern).
- The just-completed step was `failed`.

Prompt:

> *"Step <N> completed with <event: high-severity finding |
> adapted-with-mismatch | failed>. Options:*
>
> *  `continue` — proceed to step <N+1>*
> *  `replan`   — halt to revise the remaining journey (see replan
>     flow below)*
> *  `abort`    — stop the walk; session stays `active` for later
>     resume*
>
> *Pick:"*

**Replan sub-flow** (scope: remaining steps only):

1. Display the current Journey table with `[locked]` prefix on
   terminal rows. Locked rows cannot be edited (Status, Required
   Capability, and Project Match are frozen; Notes are frozen).
2. User may: reorder remaining (non-locked) steps; add new steps;
   drop remaining steps; re-mark Status on non-locked rows (e.g.,
   `gap → exists` when a newly-noticed capability fits); adjust
   Notes on non-locked rows.
3. Attempts to edit a locked row trigger:
   *"Step <N> is terminal — use `/relay-exercise-run <N>` to
   re-walk it explicitly."* Edit rejected; replan UI stays open.
4. New steps added during replan get step numbers starting from
   `max(existing step numbers) + 1` — terminal step numbers are
   never reused. This guarantees `step-<N>-<cap>.md` filename
   uniqueness across re-walks.
5. Persist `_control.md` (atomic mtime-checked rewrite).
6. Append Session Log:
   `**YYYY-MM-DD** — /relay-exercise-run: replanned.
   <changes summary>.`
7. Resume walking at the first non-terminal step in the updated
   Journey.

**Abort sub-flow**:

1. All state is already persisted per-step (3d); abort is a
   filesystem no-op beyond logging.
2. Exit cleanly; session `*Status:*` stays `active`.
3. Jump to Phase 8 (summary covers only steps walked this
   invocation).

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

Report — mode-aware:

**Default mode**:
- Capabilities exercised this session
- Total findings by classification (issue / brainstorm / note) and
  severity
- State changes NOT cleaned up (refer user to `## State Changes` in
  each exercise file)
- Any prerequisite failures that aborted specific capabilities

**Goal mode**:
- Journey progress: `<terminal>/<total>` (breakdown: `<E>` exercised,
  `<F>` failed, `<A>` adapted, `<S>` skipped)
- Findings: total + breakdown by classification and severity (same
  structure as default mode)
- Gaps handled this session: adapted count, filed count, skipped count
- Adaptations list: `step <N>: <required-slug> → <alt-slug>
  (<rationale>)` for each `adapted` step this invocation
- Un-walked steps (if user aborted): list step numbers + current
  Statuses remaining in the walk queue
- State changes NOT cleaned up (refer user to `## State Changes` in
  each step-prefixed exercise file)

Next step — mode-aware:

**Default mode**:
- If findings exist: *"Run `/relay-exercise-file <capability-name>` to
  walk the findings and file issues or brainstorms."*
- If no findings: *"No findings this session. Run `/relay-exercise-run`
  again with another capability or group."*

**Goal mode**:
- If any exercise files produced findings: *"Run `/relay-exercise-file
  --session <session>` to walk findings across all exercise files in
  this session in step order."*
- If all queued steps are terminal and no findings: *"Journey complete.
  Run `/relay-scan` and `/relay-order` to integrate any seeded
  brainstorms into the backlog."*
- If un-walked steps remain (user aborted): *"Run `/relay-exercise-run`
  again to resume from step <first-non-terminal>."*

## Contracts

**Mode dispatch**: `*Mode:*` header in `_control.md` is canonical; Phase
1b reads it and branches. Self-heal permitted when the header is missing
but exactly one of `## Journey` / `## Context Chains` is present; must
rewrite the header to match the inferred mode and log the correction.
Corrupt case (both sections present) errors loudly.

**Step-prefixed exercise filenames** (goal mode):
`exercise/<session>/step-<N>-<capability>.md` where `<N>` is the Journey
Step (bare integer, no zero-padding) and `<capability>` is the Project
Match slug. Re-runs within the session use dated variant
`step-<N>-<capability>-<YYYY-MM-DD>.md`; same-day collisions append
`-2`, `-3`. Default-mode filenames stay `<capability>.md` (unchanged).

**Journey state machine** (goal mode only):
- Phase-5-emitted:   `exists | gap`
- Runner-terminal:   `exercised | failed | adapted | skipped`
- Allowed transitions: `exists → exercised | failed`;
                     `gap → adapted | skipped`
- Explicit re-exercise (user targets a terminal step by number or
  capability): `exercised/failed/adapted → exercised/failed`;
  `skipped → adapted/skipped`
- `gap → exercised` is PROHIBITED directly. A gap that turns out to
  map to an existing capability must be reclassified via `/replan` to
  `exists` first, then exercised on resume.

**Session Capabilities lockstep** (goal mode): each
`exists → exercised / failed` and `gap → adapted` transition also
mutates the Session Capabilities row for the exercised/alternative
capability (latest-wins on Exercise File when multiple Journey steps
share a Project Match). `gap → skipped` does NOT touch Session
Capabilities (the gap's Required Capability is not a project
capability).

**Capability-level status vocabulary unchanged** (both master hub
Aggregate Capabilities AND per-session `_control.md` Session
Capabilities): `mapped / exercised / filed / stale`. The Journey
table's `failed / adapted / skipped` values are per-step outcomes, not
per-capability outcomes. Mapping for goal-mode Journey transitions:
- `exists → exercised` and `exists → failed` both set capability
  Status to `exercised` (capability was successfully invoked; failure
  rationale lives in the Journey row's Notes).
- `gap → adapted` sets the alternative capability's Status to
  `exercised` (may INSERT a new Session Capabilities row if the
  alternative wasn't in the original journey's `exists` steps; group
  sourced from master hub Aggregate Capabilities, Ungrouped fallback).
- `gap → skipped` does not update Session Capabilities or Aggregate
  Capabilities (the gap's Required Capability is not a project
  capability).

**Prerequisite derivation** (goal mode): for step N, prereqs = earlier
Journey rows (Step < N) with Status ∈ `{exists, exercised, adapted}` in
ascending Step order. Skip `gap` and `skipped` — nothing to run. Fresh
prereqs per step (no state reuse from prior step in the same walk).

**Trust gate scope**: fires once per `/relay-exercise-run` invocation
(not per session or per capability). Destructive-command re-prompts
fire per command as today.

**Gap prompt default**: no default — force explicit
`alternative / file / skip` choice. Empty input re-prompts; does not
auto-select.

**Replan scope**: remaining (non-terminal) steps only. Terminal rows
are locked; attempted edits error with *"use /relay-exercise-run <N>
to re-walk it explicitly"*. New steps added during replan get fresh
step numbers `max(existing) + 1` to preserve `step-<N>-<cap>.md`
filename uniqueness across re-walks.

**Atomic `_control.md` writes**: read mtime → mutate in-memory → single
write. If mtime differs at write time, abort with the concurrent-
modification error (matches existing Phase 7a contract). Orphan-
recovery: brainstorms written by 3c.4 `file` before a failed
`_control.md` write are reported to stderr; not auto-deleted.

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
