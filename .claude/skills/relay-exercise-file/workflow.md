# Relay: Exercise — File Findings

**Sequence**: `/relay-exercise` → `/relay-exercise-run` → **`/relay-exercise-file`** → *findings flow into /relay-new-issue and /relay-brainstorm* → standard code pipeline

Walk the findings from a completed exercise file with the user. For each
finding, the user decides: file as an issue, seed as a brainstorm, keep as
a note, or skip. Each decision is persisted to disk immediately, so
sessions can be abandoned and resumed without losing work.

The filer does NOT archive exercise files. Exercise files stay in
`.relay/exercise/` until `/relay-resolve` archives them as part of the
single-archival sweep.

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

**No-args resolution:** if no argument is given, read
`.relay/relay-exercise.md`, find the first capability with status
`exercised` (top to bottom, groups in order), verify the exercise file
has at least one `draft` finding, and use that. If no capability has
status `exercised`, report: *"No exercised capabilities with draft
findings. Run `/relay-exercise-run` first."*

**Locate the exercise file:**
- Look for `.relay/exercise/<capability>.md`
- If not found, check for dated variants:
  `.relay/exercise/<capability>-YYYY-MM-DD.md` — use the most recent
- If the exercise file doesn't exist at all, error:
  *"No exercise file found for `<capability>`. Run
  `/relay-exercise-run <capability>` first."*
- If the exercise file exists but is in `.relay/archive/exercise/`,
  error: *"This exercise has already been archived by `/relay-resolve`.
  To re-exercise, run `/relay-exercise-run <capability>` again."*

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
- If the filter matches zero draft findings, report:
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
   *Source: exercise/<capability>.md finding <N>*
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
   **active** exercise file path (`exercise/<cap>.md`). `/relay-resolve`
   will rewrite this to `archive/exercise/<cap>.md` when it later archives
   the exercise file.

4. **Update the exercise file** — change the finding's Status field:
   `**Status:** draft` → `**Status:** filed: issues/<slug>.md`

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
   *Source: exercise/<capability>.md finding <N>*
   *Status: BRAINSTORMING*

   (Lifecycle: BRAINSTORMING → READY FOR DESIGN → DESIGN COMPLETE → COMPLETE)

   ## Goal
   [Synthesized from finding's Observed + Suggested direction —
   the seed of the idea.]

   ## Context
   *Seeded from exercise session for capability `<capability>`.*
   *For full context — the scenarios that produced this finding, the
   state at the time, and related observations — read
   [exercise/<capability>.md](../exercise/<capability>.md).*

   [Finding's context as the seed of the problem statement.]

   ## Approaches Considered
   *(to be filled in by /relay-brainstorm when this seed is developed)*

   ## Decisions Made
   *(to be filled in by /relay-brainstorm when this seed is developed)*

   ## Feature Breakdown
   *(to be filled in by /relay-brainstorm when this seed is developed)*
   ```

   The markdown link to the exercise file uses the **active** path.
   `/relay-resolve` rewrites it when archiving the exercise file.

4. **Update the exercise file** — change the finding's Status field:
   `**Status:** draft` →
   `**Status:** filed: features/<slug>_brainstorm.md`

5. **Update the exercise file's summary header** — recount and update the
   `*Findings:*` line (same logic as issue filing step 5).

6. **Write the exercise file to disk immediately.**

---

**`note` → `keep`:**

No new file is created. Notes are observations kept for future context,
not tracked work items.

1. **Update the exercise file** — change the finding's Status field:
   `**Status:** draft` →
   `**Status:** kept: exercise/<capability>.md`

   The `kept:` path is the **active** exercise file location.
   `/relay-resolve` will rewrite this to `archive/exercise/<cap>.md`
   when the exercise file is archived.

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

Then update the hub row in `.relay/relay-exercise.md`:

1. **Status** → `filed`
2. **Last Updated** → today (YYYY-MM-DD)
3. **Exercise File** → `exercise/<capability>.md` (unchanged — file is
   still active, awaiting `/relay-resolve`'s archival)
4. **Findings Filed** → comma-separated list of the new issue/brainstorm
   paths created during this and any prior filing sessions for this
   exercise. Format: `issues/<slug>.md, features/<slug>_brainstorm.md`
   Collect these by scanning the exercise file's Status fields for all
   `filed:` entries. If zero `filed:` entries exist (all findings were
   kept as notes or skipped), write `—` in the Findings Filed column.
5. **Coverage Summary** — recompute counts: decrement `exercised` by 1,
   increment `filed` by 1.
6. **Refresh Log** — append:
   `**YYYY-MM-DD** — /relay-exercise-file: filed \`<capability>\`.
   N issues / M brainstorm seeds / K notes kept.
   Exercise file remains active pending downstream resolution.`

The filer NEVER moves the exercise file between directories. All file
movement is owned by `/relay-resolve`.

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
  *"`<capability>` is fully filed. Run `/relay-scan` and `/relay-order`
  to integrate the new issues and brainstorms into the backlog.
  For brainstorm seeds, run `/relay-brainstorm` when you're ready to
  develop them into full features. The exercise file will be archived
  automatically by `/relay-resolve` once all downstream items from
  this exercise have been resolved."*

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
- The filer does NOT archive exercise files or rewrite paths — that is
  entirely `/relay-resolve`'s responsibility (see Feature 1D)
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
