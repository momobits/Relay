# Relay: Exercise — File Findings

**Sequence**: `/relay-exercise` → `/relay-exercise-run` → **`/relay-exercise-file`** → *findings flow into /relay-new-issue and /relay-brainstorm* → standard code pipeline

Walk the findings from a completed exercise file with the user. For each
finding, the user decides: file as an issue, seed as a brainstorm, keep as
a note, or skip. Each decision is persisted to disk immediately, so
sessions can be abandoned and resumed without losing work.

The filer does NOT archive exercise files when downstream work exists
(issues or brainstorms were filed). Those exercise files stay in
`.relay/exercise/` until `/relay-resolve` archives them. When no
downstream work exists (all notes/skipped or zero findings), the filer
archives the exercise file directly in Phase 4.

## Phase 1 — Arg resolution + exercise file load

Parse the user's argument to determine what to walk:

| Invocation | Behavior |
|---|---|
| `/relay-exercise-file <capability>` | Walk all `draft` findings in that exercise file, sequentially |
| `/relay-exercise-file <capability> <N>` | Walk finding number `N` only |
| `/relay-exercise-file <capability> issues` | Walk only `would-be-issue` findings still in `draft` |
| `/relay-exercise-file <capability> brainstorms` | Walk only `would-be-brainstorm` findings still in `draft` |
| `/relay-exercise-file <capability> notes` | Walk only `note` findings still in `draft` |
| `/relay-exercise-file <capability> high` | Walk only `high`-severity findings still in `draft` |
| `/relay-exercise-file <capability> medium` | Walk only `medium`-severity findings still in `draft` |
| `/relay-exercise-file <capability> low` | Walk only `low`-severity findings still in `draft` |
| `/relay-exercise-file` (no args) | Find the next capability in the hub with status `exercised` and draft findings; walk it |

**Resolve active session** (same rules as `/relay-exercise-run` Phase 1
session resolution — `--session <name>` flag, single active session,
multi-active prompt, or no-active error). Store the resolved `<session>`.

**No-args resolution** — mode-aware (read `*Mode:*` header from
`_control.md`):

**Default mode** (same as pre-6-2 behavior):
1. First, look for a capability with status `exercised` whose exercise
   file at `exercise/<session>/<capability>.md` (or dated variant) has
   at least one `draft` finding. If found, use that capability and
   proceed to the walk.
2. If none found, look for a capability with status `exercised` whose
   exercise file has zero TOTAL findings (no `### Finding N:` blocks)
   or whose exercise file has findings but all are non-draft (all
   `filed:`, `kept:`, or `skipped`). If found, use that capability —
   the zero-draft handling in the walk list section below will route
   to Phase 4.
3. If neither found, report: *"No exercised capabilities with pending
   work in session `<session>`. Run `/relay-exercise-run --session
   <session>` first."*

**Goal mode** (step-order walk across all exercise files in the session):
1. Enumerate files matching `exercise/<session>/step-<N>-*.md` AND
   dated re-run variants `exercise/<session>/step-<N>-<cap>-<YYYY-MM-DD>.md`
   (with optional same-day collision suffix `-2`, `-3`).
2. Parse each file's `## Findings` section. Filter to files with at
   least one `**Status:** draft` finding.
3. Sort by `<N>` ascending. For a step with MULTIPLE matching files
   (e.g., both `step-2-cap.md` and `step-2-cap-2026-04-16.md` exist
   because the user re-exercised that step): walk ONLY the most-recent
   file. Dated variant wins over undated; within the same date, highest
   collision suffix wins (`-3` > `-2` > no suffix). Older variants keep
   their findings on disk as historical record but are not re-walked
   by the no-args walk. Explicit targeting (`/relay-exercise-file <N>`
   or a direct filename) bypasses the most-recent rule.
4. Walk the resulting queue file-by-file. For each file, run Phases
   2–4 as today (the per-finding walk is mode-agnostic; only Phase 1
   and Phase 4's back-reference rewriting are goal-mode-aware).
5. If the walk produces no files with drafts, report: *"No goal-session
   exercise files with pending findings in session `<session>`. Run
   `/relay-exercise-run --session <session>` to exercise more steps."*

**Locate the exercise file** (explicit capability arg) — mode-aware:

**Default mode**:
- Look for `.relay/exercise/<session>/<capability>.md`
- If not found, check for dated re-run variants:
  `.relay/exercise/<session>/<capability>-YYYY-MM-DD.md` — use the
  most recent
- If the exercise file doesn't exist at all, error:
  *"No exercise file found for `<capability>` in session `<session>`.
  Run `/relay-exercise-run <capability> --session <session>` first."*
- If the exercise file exists only in `.relay/archive/exercise/<session>/`,
  error: *"This exercise has already been archived by `/relay-resolve`.
  To re-exercise, run `/relay-exercise-run <capability>` (creates a
  fresh exercise file in the active session)."*

**Goal mode**:
- If arg is numeric `<N>`, look for
  `.relay/exercise/<session>/step-<N>-*.md`. If multiple files match
  (shouldn't happen by contract but guard anyway), pick the most-recent
  per the step 3 tie-break rule above and list the others as
  historical.
- If arg is a capability name, look for
  `.relay/exercise/<session>/step-*-<capability>.md`. On multi-match
  (two Journey steps exercised the same capability), prompt:
  *"Exercise files at step <A> and step <B>. Which? [A/B/both]"*.
- If not found via step-prefixed form, fall back to
  `.relay/exercise/<session>/<capability>.md` (robustness for hybrid
  sessions, if any arise).
- Dated re-run variants applied to both forms per the same most-
  recent rule.
- Error path unchanged.

**Parse the exercise file:**
Read the `## Findings` section. Each finding is a `### Finding N: <title>`
subsection with eight bold-labeled fields:
`**Classification:**`, `**Severity:**`, `**Scenario:**`,
`**Observed:**`, `**Expected:**`, `**Reproduction:**`,
`**Suggested direction:**`, `**Status:**`

Build the walk list by filtering findings:
- Include only findings with `**Status:** draft`
- Apply any classification or severity filter from the args
- If a specific finding number `<N>` was given, include only that finding
- If the filter matches zero draft findings:
  - If the exercise file has zero TOTAL findings (no `### Finding N:`
    blocks in the `## Findings` section):
    Read the hub row for this capability. If hub Status is `exercised`,
    this exercise produced no findings to file. Prompt the user:
    *"Exercise `<capability>` has no findings. Mark as complete and
    archive? [y/n]"*
    On `y`: skip Phases 2–3, proceed directly to Phase 4. Phase 4
    will detect zero drafts and run the completion path, including
    direct archival (step 7).
    On `n`: exit cleanly.
  - If the exercise file HAS findings (at least one `### Finding N:`
    block) but all have non-draft statuses (`filed:`, `kept:`, or
    `skipped`), AND the hub row Status is `exercised`:
    The walk was completed in a prior session but Phase 4 never ran
    (session interruption). Proceed directly to Phase 4 — no user
    prompt needed since all decisions were already made.
    Log: *"All findings already processed. Completing hub update..."*
  - Otherwise (hub Status is not `exercised`, or the filter was a
    specific subset that produced no matches): report:
    *"No draft findings matching `<filter>`. Nothing to walk."*
    and exit cleanly.

**Confirm the walk:**
Show the user what's about to happen:

> *"Exercise: `<capability>`
> Matched N draft findings (filtered by: <filter or 'all'>):
>   1. <finding title> (<classification>, <severity>)
>   5. <finding title> (<classification>, <severity>)
>   ...
>
> Walk these now? [y/n]"*

On `n`, exit cleanly. On `y`, proceed to Phase 2.

## Phase 2 — Read external skill formats

Before writing any new files, read the current format specifications from
sibling skills so the filer stays in sync automatically when those skills
evolve:

1. Read `.claude/skills/relay-new-issue/workflow.md` — find the section
   that specifies the issue file format (step 5 of that workflow:
   `*Created:*` date, severity, problem statement, current state, impact,
   proposed fix, affected files). This is the format you will use to
   create issue files in Phase 3.

   If running in a non-Claude-Code environment (Codex, Gemini CLI),
   check `.agents/skills/relay-new-issue/workflow.md` as a fallback path.

2. Read `.claude/skills/relay-brainstorm/workflow.md` — find the section
   that specifies the brainstorm file format (step 5 of that workflow:
   title, `*Created:*`, `*Status: BRAINSTORMING*`, Goal, Context,
   Approaches Considered, Decisions Made, Feature Breakdown). This is
   the format you will use to create brainstorm seed files in Phase 3.

   Same `.agents/skills/` fallback applies.

**If either workflow.md cannot be read** (file missing, path not found),
fail loudly: *"Cannot read `/relay-new-issue` (or `/relay-brainstorm`)
workflow.md — the filer needs these to know the current file format.
Ensure the skill is installed and retry."* Do NOT proceed without
knowing the target formats.

## Phase 3 — Walk findings sequentially

For each finding in the walk list, in order:

### 3a. Display the finding

Present the full finding to the user: title, classification, severity,
scenario reference, observed, expected, reproduction, suggested direction.

### 3b. Prompt for decision

Based on classification:
- `would-be-issue` → prompt: `[file / edit / skip]`
- `would-be-brainstorm` → prompt: `[seed / edit / skip]`
- `note` → prompt: `[keep / skip]`

### 3c. Handle `edit`

On `edit`, allow the user to refine before filing:

**For issues (`would-be-issue`):**
- Title — can be reworded
- Description body (observed + expected) — can be rewritten
- Severity — can be changed
- Suggested direction — can be revised

**For brainstorm seeds (`would-be-brainstorm`):**
- Title — can be reworded
- Goal (synthesized from observed + suggested direction) — can be rewritten
- Context wording — can be revised

**NOT editable** (preserved as historical record):
- Classification (the runner's judgment)
- Scenario reference (historical fact)
- Original observed/expected in the exercise file (the runner's record)

Edits apply only to the file being created, NOT to the exercise file's
original finding.

After editing, re-display the edited version and return to the prompt
(`[file / skip]` for issues, `[seed / skip]` for brainstorms).

### 3d. Persist the decision

**`would-be-issue` → `file`:**

1. **Slugify the title:** lowercase, replace non-alphanumeric with
   underscores, collapse consecutive underscores, strip leading/trailing
   underscores. Example: `"API Silently Truncates Input"` →
   `api_silently_truncates_input`.

2. **Check for slug collisions** across four directories:
   - `.relay/issues/`
   - `.relay/archive/issues/`
   - `.relay/features/`
   - `.relay/archive/features/`
   If `<slug>.md` exists in any of these, append `_2`, `_3`, etc.

3. **Create `.relay/issues/<slug>.md`** using the format read from
   `/relay-new-issue`'s workflow.md in Phase 2. The file MUST include:

   ```markdown
   # Issue: <finding title>

   *Created: YYYY-MM-DD by /relay-exercise-file*
   *Source: exercise/<session>/<capability>.md finding <N>*
   *Severity: <severity>*

   ## Problem Statement
   [Populated from finding's Observed and Expected fields]

   ## Current State
   [Populated from finding's Reproduction field]

   ## Impact
   [Synthesized from finding's Observed + severity]

   ## Proposed Fix
   [Populated from finding's Suggested direction field]

   ## Affected Files
   [Inferred from finding context, or "To be determined during analysis"]
   ```

   The `*Source:*` header line is the critical back-reference. It uses the
   **active** exercise file path (`exercise/<session>/<capability>.md`).
   `/relay-resolve` will rewrite this to
   `archive/exercise/<session>/<capability>.md` when it later archives
   the exercise file.

4. **Update the exercise file** at
   `.relay/exercise/<session>/<capability>.md` — change the finding's
   Status field: `**Status:** draft` → `**Status:** filed: issues/<slug>.md`

5. **Update the exercise file's summary header** — recount all finding
   Status fields and update the `*Findings:*` line at the top of the file:
   `*Findings:* <draft count> draft / <filed count> filed / <kept count> kept / <skipped count> skipped`
   Count each status type separately. `filed:` counts findings routed to
   issues or brainstorms (with a path to .relay/issues/ or .relay/features/).
   `kept:` counts notes retained in the exercise file.

6. **Write the exercise file to disk immediately.**
   Do NOT wait for the walk to finish. This ensures the decision
   survives session cancellation.

---

**`would-be-brainstorm` → `seed`:**

1. **Slugify the title** to `<slug>_brainstorm.md` — same slugification
   rules as issues, but with `_brainstorm` suffix before `.md`.

2. **Check for slug collisions** across the same four directories.

3. **Create `.relay/features/<slug>_brainstorm.md`** using the format
   read from `/relay-brainstorm`'s workflow.md in Phase 2. The file
   MUST include:

   ```markdown
   # Feature Brainstorm: <finding title>

   *Created: YYYY-MM-DD by /relay-exercise-file (seeded from exercise)*
   *Source: exercise/<session>/<capability>.md finding <N>*
   *Status: BRAINSTORMING*

   (Lifecycle: BRAINSTORMING → READY FOR DESIGN → DESIGN COMPLETE → COMPLETE)

   ## Goal
   [Synthesized from finding's Observed + Suggested direction —
   the seed of the idea.]

   ## Context
   *Seeded from exercise session `<session>` for capability `<capability>`.*
   *For full context — the scenarios that produced this finding, the
   state at the time, and related observations — read
   [exercise/<session>/<capability>.md](../exercise/<session>/<capability>.md).*

   [Finding's context as the seed of the problem statement.]

   ## Approaches Considered
   *(to be filled in by /relay-brainstorm when this seed is developed)*

   ## Decisions Made
   *(to be filled in by /relay-brainstorm when this seed is developed)*

   ## Feature Breakdown
   *(to be filled in by /relay-brainstorm when this seed is developed)*
   ```

   The markdown link to the exercise file uses the **active** path
   (relative depth `../exercise/<session>/<capability>.md` resolves
   from `.relay/features/`). `/relay-resolve` rewrites it when archiving
   the exercise file.

4. **Update the exercise file** at
   `.relay/exercise/<session>/<capability>.md` — change the finding's
   Status field: `**Status:** draft` →
   `**Status:** filed: features/<slug>_brainstorm.md`

5. **Update the exercise file's summary header** — recount and update the
   `*Findings:*` line (same logic as issue filing step 5).

6. **Write the exercise file to disk immediately.**

---

**`note` → `keep`:**

No new file is created. Notes are observations kept for future context,
not tracked work items.

1. **Update the exercise file** at
   `.relay/exercise/<session>/<capability>.md` — change the finding's
   Status field: `**Status:** draft` →
   `**Status:** kept: exercise/<session>/<capability>.md`

   The `kept:` path is the **active** exercise file location.
   `/relay-resolve` will rewrite this to
   `archive/exercise/<session>/<capability>.md` when the exercise
   file is archived.

2. **Update the exercise file's summary header** — recount and update the
   `*Findings:*` line (same logic as issue filing step 5).

3. **Write the exercise file to disk immediately.**

---

**Any classification → `skip`:**

1. **Update the exercise file** — change the finding's Status field:
   `**Status:** draft` → `**Status:** skipped`

2. **Update the exercise file's summary header** — recount and update the
   `*Findings:*` line (same logic as issue filing step 5).

3. **Write the exercise file to disk immediately.**

---

### 3e. Move to the next finding

After persisting the decision, move to the next finding in the walk list.
If the user exits the session (Ctrl+C, closing the terminal) between
findings, everything processed so far is already on disk. The exercise
file contains a mix of `filed:`, `skipped`, `kept:`, and `draft` Status
values. Re-running the filer later picks up wherever the walk stopped.

### 3f. Concurrent modification detection

Before writing each Status update to the exercise file, re-read the
file from disk. If the content has changed since your last read (another
session or manual edit), abort with:
*"Exercise file was modified externally since this session started;
re-run `/relay-exercise-file <capability>` to continue with the
current state."*

After the last finding in the walk list, proceed to Phase 4.

## Phase 4 — Check for completion and update hub

After the walk completes, re-read the exercise file and count findings
by Status:

**If ANY findings still have `Status: draft`** — the walk is incomplete.
Report what was processed this session, tell the user how many drafts
remain, and recommend:
*"Run `/relay-exercise-file <capability>` again to continue, or target a
specific subset (e.g., `/relay-exercise-file <capability> notes`)."*
Exit cleanly. The hub row stays at `exercised`.

**If NO findings have `Status: draft`** — all findings have been
processed (every finding is `filed:`, `kept:`, or `skipped`).

First, update the exercise file's `*Session Status:*` header:
`*Session Status:* draft` → `*Session Status:* filed`
Write the exercise file to disk.

Then update the **session `_control.md` row** at
`.relay/exercise/<session>/_control.md` (incremental, mtime-checked):

1. **Status** → `filed`
2. **Last Updated** → today (YYYY-MM-DD)
3. **Exercise File** → `exercise/<session>/<capability>.md` (unchanged
   for now — may be updated to archive path in step 7 below)
4. **Findings Filed** → comma-separated list of the new issue/brainstorm
   paths created during this and any prior filing sessions for this
   exercise. Format: `issues/<slug>.md, features/<slug>_brainstorm.md`
   Collect these by scanning the exercise file's Status fields for all
   `filed:` entries. If zero `filed:` entries exist (all findings were
   kept as notes or skipped), write `—` in the Findings Filed column.
5. **Session Coverage** — recompute counts: decrement `exercised` by 1,
   increment `filed` by 1.
6. **Last activity** header → today.
7. **Session Log** — append:
   `**YYYY-MM-DD** — /relay-exercise-file: filed \`<capability>\`.
   N issues / M brainstorm seeds / K notes kept.`

Then update the **master hub Aggregate Capabilities row** at
`.relay/relay-exercise.md`:

a. **Status** → `filed`
b. **Last Updated** → today
c. **Latest Session** unchanged (same session)
d. **Latest Exercise File** unchanged (or, if direct archival ran in
   step 7 below, update to `archive/exercise/<session>/<capability>.md`)
e. **Latest Findings Filed** → same comma-separated list as the
   `_control.md` row, or `—` for zero filed entries.
f. Recompute Aggregate Coverage: decrement `exercised` by 1, increment
   `filed` by 1.

7. **Direct archival (zero downstream items)** — if the Findings Filed
   column is `—` (zero `filed:` entries — all findings were kept as
   notes, skipped, or the exercise had zero findings), there are no
   downstream issues or brainstorms for `/relay-resolve` to trigger on.
   Archive the exercise file directly:

   i.   Move the exercise file:
        `.relay/exercise/<session>/<capability>.md` →
        `.relay/archive/exercise/<session>/<capability>.md`

        Create `.relay/archive/exercise/<session>/` on demand if it
        doesn't yet exist.

        If the exercise file has a timestamped re-run filename
        (e.g., `<capability>-YYYY-MM-DD.md`), preserve the timestamp
        in the archive filename.

        Log: "Archived exercise: exercise/<session>/<capability>.md →
              archive/exercise/<session>/<capability>.md"

   ii.  In the newly-archived exercise file, rewrite any
        `**Status:** kept: exercise/<session>/<capability>.md` lines to
        `**Status:** kept: archive/exercise/<session>/<capability>.md`.

   iii. Update the session `_control.md` row:
        - `Exercise File` column: `exercise/<session>/<capability>.md` →
          `archive/exercise/<session>/<capability>.md`

   iv.  Update the master hub Aggregate Capabilities row:
        - `Latest Exercise File` column: `exercise/<session>/<capability>.md` →
          `archive/exercise/<session>/<capability>.md`
        - `Last Updated`: today; Status stays `filed`.

   v.   Append a Session Log entry to `_control.md`:
        `**YYYY-MM-DD** — /relay-exercise-file: archived exercise
         \`<capability>\` directly. No downstream items to track.`

   vi.  Session close-out check: re-scan
        `.relay/exercise/<session>/`. If only `_control.md` remains
        (every other exercise file has been archived) AND every Session
        Capabilities row in `_control.md` has its `Exercise File` column
        pointing at an archive path, close out the session here (the
        filer's direct-archival path is the only route in zero-downstream
        sessions, so `/relay-resolve` will never fire to do it):

        1. Update `_control.md`:
           - `*Status:* active` → `*Status:* archived`
           - `*Last activity:* YYYY-MM-DD by /relay-exercise-file`
        2. Move `_control.md`:
           `.relay/exercise/<session>/_control.md` →
           `.relay/archive/exercise/<session>/_control.md`
        3. Remove the now-empty active session subfolder
           `.relay/exercise/<session>/`.
        4. Update the master hub Sessions table row:
           - `Status` column: `active` → `archived`
           - `Control File` column:
             `exercise/<session>/_control.md` →
             `archive/exercise/<session>/_control.md`
        5. Append to the master hub Refresh Log:
           `**YYYY-MM-DD** — /relay-exercise-file: session
            \`<session>\` archived. All exercises had zero downstream
            items.`

        If other active exercise files remain in this session, skip the
        close-out — `/relay-resolve` step 5f will run when the last
        downstream-bearing exercise migrates, OR a future `/relay-exercise-file`
        invocation in this same session will trigger close-out from
        here when it archives the last remaining direct-archive
        candidate.

   If Findings Filed is NOT `—` (at least one `filed:` entry exists),
   skip this step. The exercise file stays active for `/relay-resolve`'s
   single-archival sweep. Append to step 7's Session Log:
   `Exercise file remains active pending downstream resolution.`

The filer does NOT archive exercise files **unless there is no
downstream work to track** (zero `filed:` entries after completion,
or zero findings). In that case, `/relay-resolve` has no trigger to
act, so the filer archives directly. When at least one finding was
filed as an issue or brainstorm, all archival remains
`/relay-resolve`'s responsibility.

## Phase 5 — Summary + navigation

Report what was filed this session:
- **Issues created:** list paths (e.g., `.relay/issues/<slug>.md`)
- **Brainstorm seeds created:** list paths
  (e.g., `.relay/features/<slug>_brainstorm.md`)
- **Notes kept:** count
- **Skipped findings:** count
- **Drafts remaining:** count (if any)

Recommend next step:

- **If all findings are processed** (no drafts left):
  - **If at least one finding was filed** (issues or brainstorms
    created):
    *"`<capability>` is fully filed. Run `/relay-scan` and `/relay-order`
    to integrate the new issues and brainstorms into the backlog.
    For brainstorm seeds, run `/relay-brainstorm` when you're ready to
    develop them into full features. The exercise file will be archived
    automatically by `/relay-resolve` once all downstream items from
    this exercise have been resolved."*
  - **If zero findings were filed** (all notes/skipped or zero
    findings):
    *"`<capability>` is complete and archived — no downstream items to
    track. Run `/relay-scan` and `/relay-order` to refresh project
    status."*

- **If drafts remain:**
  *"Session saved. Run `/relay-exercise-file <capability>` again to
  continue, or target a phase (e.g., `<capability> notes`). Current
  state is persisted in the exercise file."*

## Navigation

When finished, tell the user:
- If all findings processed: "Next: run **/relay-scan** and
  **/relay-order** to integrate the new items into the backlog."
- If drafts remain: "Run **/relay-exercise-file** again to continue."

## Notes

- Each decision is persisted to disk immediately — session interruptions
  lose no work
- The filer reads `/relay-new-issue` and `/relay-brainstorm` workflow.md
  at runtime, so it automatically tracks format changes in those skills
- The filer archives exercise files directly ONLY when there are no
  downstream items to track (zero `filed:` entries — all notes/skipped
  or zero findings). When at least one finding was filed as an issue
  or brainstorm, all archival remains `/relay-resolve`'s responsibility
  (see Feature 1D)
- Slug collision detection spans both active and archived directories
  (`.relay/issues/`, `.relay/archive/issues/`, `.relay/features/`,
  `.relay/archive/features/`) to prevent confusion during later archival
- Un-filing a finding is NOT supported in v1. To undo: manually delete
  the created file and edit the exercise file's Status field back to
  `draft`
- If the exercise file was modified externally between filing decisions,
  the filer detects the change and aborts safely
- This skill is project-agnostic — it adapts to whatever exercise files
  exist, regardless of the target project's nature
