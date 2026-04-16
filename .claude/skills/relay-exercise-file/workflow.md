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
   2–4 as today. The per-finding walk is mode-agnostic;
   Phase 1 resolves `<exercise_filename>` (step-prefixed in goal
   mode); Phase 3d templates and Phase 4 archival both reference
   `<exercise_filename>.md`, so goal-mode and default-mode flows
   use the same code path with the filename as the only variant.
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

**Capture the resolved filename:**

Once one of the above branches resolves to a concrete file,
capture the basename (without `.md`) as `<exercise_filename>`.
Its shape is one of:

- `<capability>` — default mode, canonical form
- `<capability>-<YYYY-MM-DD>[-<N>]` — default mode, dated re-run
- `step-<step>-<capability>` — goal mode, canonical form
- `step-<step>-<capability>-<YYYY-MM-DD>[-<N>]` — goal mode, dated re-run

Every downstream reference to the exercise file (Phase 3d
templates, Phase 4 archival and row updates) uses
`<exercise_filename>.md` — not the bare `<capability>.md` form.
Default mode without a dated re-run collapses to `<capability>`
as before, so existing behavior is preserved. In the goal-mode
no-args walk (queue of step-prefixed files), `<exercise_filename>`
is re-bound per walk iteration to the current file's basename.

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

**Pre-step (file and seed only): Verify symbol fidelity**

Before writing a new issue or brainstorm file, verify that any
symbol names referenced in the finding's Title, Observed,
Reproduction, and Suggested direction fields appear in the
project source. This catches drift where the runner paraphrased
a function/column name instead of copying the literal symbol.
The pre-step does NOT run for `keep` or `skip` decisions —
nothing is written outward; the exercise finding preserves the
original wording.

1. **Extract candidate symbols** from Title, Observed,
   Reproduction, and Suggested direction. Candidates:
   - Backtick-wrapped identifiers (`` `name` ``)
   - Fenced code block contents (interior tokens)
   - Bare snake_case tokens ≥ 4 chars (must contain `_`)
   - Bare camelCase tokens ≥ 4 chars (lowercase→uppercase
     transition)
   - Dotted method references (`module.method`) — record the
     trailing component
   Skip:
   - Stopword list: `error`, `errors`, `value`, `values`,
     `result`, `results`, `none`, `null`, `true`, `false`,
     `status`, `empty`, `data`, `input`, `output`, `return`,
     `response`, `request`, `success`, `failure`, `missing`,
     `invalid`, `valid`, `function`, `method`, `class`,
     `object`
   - Pure English words (< 4 chars or all-lowercase without
     underscores or camelCase)
   - Path-like tokens (contain `/` or `\`) — they resolve via
     filesystem, not source grep

   **Skip rules apply AFTER extraction**, including extraction
   from backticks and code fences. A backtick-wrapped path-like
   token (e.g., `` `path/to/file.py` ``) is extracted then
   skipped by the path-like rule.

   **De-duplicate candidates by exact string match** (case-
   sensitive — `create_memory` and `Create_Memory` are different
   identifiers in most languages). Record which fields each
   surviving candidate appeared in (used by the prompt's
   "(in <fields>)" preview — list all fields, comma-separated).

   **Cap at 10 candidates** AFTER de-duplication (first 10 by
   first-appearance order). When the cap fires, log
   `"[relay-exercise-file] Candidate cap reached (10/<N>
   extracted); remaining candidates not verified for finding
   <title>."` so the user knows verification was incomplete.

2. **Grep project source** for each candidate. Exclude:
   `.relay/`, `.claude/`, `.agents/`, `.git/`, `node_modules/`,
   `dist/`, `build/`, `.venv/`, `venv/`, `__pycache__/`,
   `target/`, `.next/`, `.pytest_cache/`. Match as a standalone
   identifier (word-boundary; identifier characters are
   `[A-Za-z0-9_]`). Case-sensitive.

3. **For each candidate with zero matches**, compute the
   closest match via Levenshtein distance over the set of
   identifiers discovered in the included source (build the
   identifier set once per verification pass and reuse it for
   every missing candidate). Pick top-1 within distance ≤ 3.
   On Levenshtein ties, prefer the alphabetically-first
   identifier.
   **Capture the suggestion's source location**: file path +
   first matching line number + the line content (truncated to
   100 chars). Record this during the identifier-set scan
   (free at scan time; lookup only on miss).
   If no identifier is within distance ≤ 3, report
   "no close match" (no source location to capture).

4. **Prompt the user — one prompt per missing candidate, in
   extraction order:**

   > *"Finding references `<name>` (in <fields>), but it wasn't
   > found in the project source.*
   >
   > *Closest match: `<closest>` (distance: <N>).*
   > *Defined at `<file>:<line>` — `<one-line context>`*
   >
   > *Options:*
   > *  `use <closest>` — rewrite this symbol in the new
   >    issue/brainstorm file (exercise finding preserved).*
   > *  `edit manually` — revise fields via the 3c edit flow.*
   > *  `file as-is` — write unchanged; record in
   >    `## Drift Warnings` section of the new file.*
   >
   > *Pick [use / edit / as-is]: "*

   If no close match exists (step 3 returned "no close match"),
   omit the `use` option from the menu — only `edit manually`
   and `file as-is` are offered.

5. **On `use`:** replace `<name>` with `<closest>` in the
   in-memory copies of Title, Observed, Reproduction, and
   Suggested direction (literal string replacement). Leave the
   exercise file's original finding untouched (consistent with
   3c's "edits apply only to the file being created" rule).
   After all missing candidates are processed, the slugification
   in the persist step below uses the (possibly corrected)
   title.

6. **On `edit manually`:** route to 3c (Handle `edit`). On
   return, re-run steps 1–4 against the edited fields
   (idempotent — a correct edit produces zero misses and the
   prompt doesn't fire). The verification block runs at most
   **4 times total per finding** (1 initial + up to 3
   re-verifications after `edit manually`). On the 4th run
   (or whenever the cap is reached), log
   `"[relay-exercise-file] Symbol verification iteration
   cap reached (4 runs); proceeding with current fields."`
   and proceed to the persist step regardless of remaining
   misses.

7. **On `file as-is`:** leave fields unchanged. Record the
   entry in an in-memory `drift_warnings` list for this
   finding (one entry per `as-is` decision). **At persist
   time** (after all candidates are processed and the user has
   moved into the file/seed branch below), if `drift_warnings`
   is non-empty, append a `## Drift Warnings` section to the
   new file IMMEDIATELY AFTER the final required section
   (`## Affected Files` for issues, `## Feature Breakdown` for
   brainstorms), with one bullet per recorded warning:
   ```
   - `<name>` — referenced in <fields>, not found in project
     source (filed without correction).
   ```
   If `drift_warnings` is empty (zero `file as-is` decisions
   this finding), the persist step does NOT write the
   `## Drift Warnings` section header at all. The section is
   never present in files with zero unverified symbols.

8. When all candidates are processed (verified, corrected, or
   marked as drift), proceed to the persist branch for the
   chosen classification (file or seed) below. The persist step
   is responsible for emitting the `## Drift Warnings` section
   per step 7's rule.

---

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
   *Source: exercise/<session>/<exercise_filename>.md finding <N>*
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

   <!-- The persist step appends a `## Drift Warnings`
        section after `## Affected Files` ONLY when the
        pre-step recorded ≥1 `file as-is` decision for this
        finding. Format and append rule live in Phase 3d
        Pre-step step 7. Section omitted entirely when zero
        unverified symbols. -->
   ```

   The `*Source:*` header line is the critical back-reference. It uses the
   **active** exercise file path
   (`exercise/<session>/<exercise_filename>.md`).
   `/relay-resolve` will rewrite this to
   `archive/exercise/<session>/<exercise_filename>.md` when it later
   archives the exercise file.

4. **Update the exercise file** at
   `.relay/exercise/<session>/<exercise_filename>.md` — change the
   finding's Status field: `**Status:** draft` →
   `**Status:** filed: issues/<slug>.md`

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
   *Source: exercise/<session>/<exercise_filename>.md finding <N>*
   *Status: BRAINSTORMING*

   (Lifecycle: BRAINSTORMING → READY FOR DESIGN → DESIGN COMPLETE → COMPLETE)

   ## Goal
   [Synthesized from finding's Observed + Suggested direction —
   the seed of the idea.]

   ## Context
   *Seeded from exercise session `<session>` for capability `<capability>`.*
   *For full context — the scenarios that produced this finding, the
   state at the time, and related observations — read
   [exercise/<session>/<exercise_filename>.md](../exercise/<session>/<exercise_filename>.md).*

   [Finding's context as the seed of the problem statement.]

   ## Approaches Considered
   *(to be filled in by /relay-brainstorm when this seed is developed)*

   ## Decisions Made
   *(to be filled in by /relay-brainstorm when this seed is developed)*

   ## Feature Breakdown
   *(to be filled in by /relay-brainstorm when this seed is developed)*

   <!-- The persist step appends a `## Drift Warnings`
        section after `## Feature Breakdown` ONLY when the
        pre-step recorded ≥1 `file as-is` decision for this
        finding. Format and append rule live in Phase 3d
        Pre-step step 7. Section omitted entirely when zero
        unverified symbols. -->
   ```

   The markdown link to the exercise file uses the **active** path
   (relative depth `../exercise/<session>/<exercise_filename>.md`
   resolves from `.relay/features/`). `/relay-resolve` rewrites it
   when archiving the exercise file.

4. **Update the exercise file** at
   `.relay/exercise/<session>/<exercise_filename>.md` — change the
   finding's Status field: `**Status:** draft` →
   `**Status:** filed: features/<slug>_brainstorm.md`

5. **Update the exercise file's summary header** — recount and update the
   `*Findings:*` line (same logic as issue filing step 5).

6. **Write the exercise file to disk immediately.**

---

**`note` → `keep`:**

No new file is created. Notes are observations kept for future context,
not tracked work items.

1. **Update the exercise file** at
   `.relay/exercise/<session>/<exercise_filename>.md` — change the
   finding's Status field: `**Status:** draft` →
   `**Status:** kept: exercise/<session>/<exercise_filename>.md`

   The `kept:` path is the **active** exercise file location.
   `/relay-resolve` will rewrite this to
   `archive/exercise/<session>/<exercise_filename>.md` when the
   exercise file is archived.

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
3. **Exercise File** → `exercise/<session>/<exercise_filename>.md`
   (unchanged for now — may be updated to archive path in step 7 below)
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
   step 7 below, update to
   `archive/exercise/<session>/<exercise_filename>.md`)
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
        `.relay/exercise/<session>/<exercise_filename>.md` →
        `.relay/archive/exercise/<session>/<exercise_filename>.md`

        Create `.relay/archive/exercise/<session>/` on demand if it
        doesn't yet exist.

        (Timestamp and step-prefix are both carried by
        `<exercise_filename>` — no separate handling needed.)

        Log: "Archived exercise:
              exercise/<session>/<exercise_filename>.md →
              archive/exercise/<session>/<exercise_filename>.md"

   ii.  In the newly-archived exercise file, rewrite any
        `**Status:** kept: exercise/<session>/<exercise_filename>.md`
        lines to
        `**Status:** kept: archive/exercise/<session>/<exercise_filename>.md`.

   iii. Update the session `_control.md` row:
        - `Exercise File` column:
          `exercise/<session>/<exercise_filename>.md` →
          `archive/exercise/<session>/<exercise_filename>.md`

   iv.  Update the master hub Aggregate Capabilities row:
        - `Latest Exercise File` column:
          `exercise/<session>/<exercise_filename>.md` →
          `archive/exercise/<session>/<exercise_filename>.md`
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
- Phase 3d's symbol-verification pre-step (file/seed only)
  greps the project source for symbol names referenced in
  finding fields. On miss, prompts `use <closest> / edit
  manually / file as-is`. The `use` and `edit manually`
  options correct the new file in place; `file as-is`
  preserves the finding and records the unverified symbol in
  a `## Drift Warnings` section appended to the new file.
  Exercise findings are never modified by the pre-step
  (consistent with 3c's edit semantics).
- This skill is project-agnostic — it adapts to whatever exercise files
  exist, regardless of the target project's nature
