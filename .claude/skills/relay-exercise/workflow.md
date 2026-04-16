# Relay: Exercise — Map Capabilities

**Sequence**: **`/relay-exercise`** → `/relay-exercise-run` → `/relay-exercise-file` → *findings flow into /relay-new-issue and /relay-brainstorm* → standard code pipeline

Map the project's user-facing capabilities and produce `.relay/relay-exercise.md` — the living hub file that downstream exercise skills consume. On refresh, existing data is preserved and new discoveries are appended.

## Phase 1 — Preflight + mode detection

### 1a. Parse invocation argument

Read the first positional argument passed to `/relay-exercise`. Trim
leading/trailing whitespace before evaluating.

- Empty (no argument, or whitespace-only after trim) OR starts with `-`
  (reserved for flags like `--session`) → **default mode**. Skip 1b
  and go to 1c.
- Non-empty, non-flag string (quoted narrative, typical shell usage) →
  **goal mode**. Continue with 1b.

### 1b. Validate goal length (goal mode only)

If the goal narrative is shorter than 10 characters (post-trim), stop
with: *"Goal is too short to map meaningfully (<10 chars). Rephrase
with at least one sentence describing what you want the project to do."*
Abort cleanly — no session is created.

Multi-positional-argument invocation (`/relay-exercise use this memory
engine to write a book` without quotes): join the positional args with
single spaces and treat the result as the goal narrative. SKILL.md
documents that quoting is preferred.

Store the goal narrative as `<goal>` for downstream phases.

### 1c. Detect hub shape (default-mode logic — unchanged structurally from 5-1)

- If `.relay/relay-exercise.md` does **not** exist → **first-run state**
- If `.relay/relay-exercise.md` exists and is parseable (has the expected
  `## Sessions` heading and at least one row, or `## Aggregate Capabilities`
  if Sessions is empty) → **refresh state**
- If `.relay/relay-exercise.md` exists with a `## Capabilities` heading
  AND no `## Sessions` heading → **legacy 3.1.0 layout detected**;
  stop with: *"This project's exercise hub is in the 3.1.0 flat
  layout. The 3.2.x exercise pipeline expects session subfolders.
  See .relay/version.md changelog (3.2.0 entry) for the upgrade path
  before re-running /relay-exercise. Refusing to operate to prevent
  data loss."*
  Do NOT offer a rebuild on this branch — the legacy hub is preserved
  intact for the upgrade path. (Per the 3.2.0 release boundary, this
  message intentionally does not name the migration skill; users
  discover it via the changelog.)
- If `.relay/relay-exercise.md` exists, lacks `## Sessions`, AND lacks
  `## Capabilities` → **truly unparseable**; ask: *"I couldn't parse the
  existing master hub. Rebuild from scratch? This will lose the Sessions
  index and Aggregate Capabilities history. Existing session subfolders
  under `.relay/exercise/` are not affected. [y/n]"*
  On yes → first-run state. On no → stop.

**Goal mode against a legacy 3.1.0 hub**: treat as the legacy-refusal
branch above. Do not create a goal session against an unmigrated hub —
Phase 8's master hub upsert would fail, and we don't want to bypass
the refusal that 5-1 installed to prevent data loss.

**Both first-run and refresh states create a new session.** Refresh state
does NOT mutate prior sessions' subfolders or `_control.md` files — it
adds a new session to the master hub's Sessions table and creates a new
`.relay/exercise/<session>/` subfolder. Capability rows that survive
across sessions are tracked in the master hub's Aggregate Capabilities
(see the master hub format in `relay-exercise.md` — sibling design).

Create directories if they don't exist (fallback — `/relay-setup` handles
primary creation after the integration audit):

- `.relay/exercise/`
- `.relay/archive/exercise/`

(Session subfolders under these top-level dirs are created on demand by
Phase 4.5 and by `/relay-exercise-file` / `/relay-resolve` when they
need archive subfolders.)

If the project has no readable content at all (no README, no docs directory,
no source code files, no manifest files), stop with:
*"No project content found — nothing to map. Populate the project first
and re-run `/relay-exercise`."*

## Phase 2 — Inference pass

Read sources in this order — all contribute, later sources are not fallbacks:

1. `README.md` or `README.*` at the project root
2. `docs/` directory (recursive, markdown files)
3. `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` if present
4. Manifest files: `pyproject.toml`, `package.json`, `Cargo.toml`, `go.mod`,
   `pom.xml`, or similar (names, descriptions, entrypoints, dependencies)
5. Source code — entrypoints, CLI definitions (argparse, click, typer),
   route decorators (FastAPI, Flask, Express), exported functions, module
   docstrings, top-level class names

From these, build a mental model covering:

- **Project identity**: what the project is, who uses it, what for
- **Capabilities**: discrete user-facing actions, operations, or behaviors
- **Groups**: natural clusters of related capabilities
- **Context chains**: named linear sequences where later capabilities
  assume earlier ones have been exercised or their prerequisites established
- **State model**: what the project persists between runs — databases, files,
  caches, external services (consumed internally in Phase 4; NOT rendered
  in the hub)

Adapt the abstraction level to the project:

- User-facing actions for tools and CLIs
- Typical usage patterns for libraries
- Stages for pipelines
- Endpoints or routes for web services

No hardcoded rules — use judgment based on the project's nature.

**Scanning depth:** Module docstrings, top-level class/function signatures,
CLI definitions, and route decorators. Avoid reading full function bodies
unless docstrings are insufficient. Keep the scan proportional to project
size.

**No-docs fallback:** If the project has no README or docs directory but has
source code, proceed with source-only inference and include a note in the
draft: *"No documentation found — drafting identity from source code alone.
Please verify carefully."*

## Phase 3 — Draft identity + confirm (blocking)

Present a draft identity statement to the user:

> *"This project appears to be **[one-line description]**, used by **[who]**,
> for **[what purpose]**. I detected **[N]** capabilities, grouped as:*
>
> *  - **[Group 1]**: capability-a, capability-b, capability-c*
> *  - **[Group 2]**: capability-d, capability-e*
>
> *Context chains:*
> *  1. **[Chain name]**: a → b → c*
>
> *Does this match your understanding? Any corrections or missing pieces?"*

**This is a hard gate.** Do NOT proceed to write anything until the user
confirms. If the user provides corrections, re-draft with the corrections
and present again. Iterate until confirmed.

## Phase 4 — Config drift check

Read `.relay/relay-config.md`. Compare the state model discovered in Phase 2
(databases, files, caches, external services the project persists) against
what's documented in the config.

For each gap found (code persists state that config doesn't mention, or
references services/DBs not covered), present a specific recommended update
and ask the user to approve individually:

> *"The code writes to `~/.myapp/db.sqlite` but `relay-config.md` doesn't
> mention this. Recommend adding to the **Data Boundaries** section.
> Approve? [y/n]"*

Rules:

- Only approved updates are written to `relay-config.md`
- Rejected updates are noted in the Refresh Log but not applied
- If `relay-config.md` has only placeholder content (HTML comments like
  `<!-- Populated by Phase 2 scan -->`), recommend a fresh population and
  offer to write the scan results directly

## Phase 4.5 — Derive session name + create subfolder

Build the session name:

    <mode-slug>-<YYYY-MM-DDTHHMM>

- Default mode: `<mode-slug>` is the literal `default`.
- Goal mode: `<mode-slug>` is the goal narrative slugified (lowercase,
  non-alphanumerics → hyphen, collapse repeats, strip non-ASCII; cap
  slug body at **48 characters**, truncated at the last `-` boundary
  ≤ 48). Goal-mode dispatch is owned by the goal-driven mapping
  feature; this skill, in its current scope, only writes `default`.

Same-minute collision: append `-2`, `-3` to the timestamp segment (NOT
to the slug body) until the subfolder name is unique against both
`.relay/exercise/` and `.relay/archive/exercise/`.

Create `.relay/exercise/<session>/`. The matching archive subfolder
(`.relay/archive/exercise/<session>/`) is created on demand by
`/relay-exercise-file` Phase 4 or `/relay-resolve` step 5e — not
pre-created here.

## Phase 5 — Journey construction (goal-mode only, NEW)

**Default mode**: skip to Phase 7.

**Draft the journey.** Using Phase 2's capability inventory + the goal
narrative `<goal>`, produce an ordered list of steps. Each step has
five fields:

- `Step`: 1-based integer
- `Required Capability`: kebab-case slug for what the step needs —
  project capability slug if a match exists, or proposed capability
  slug if not
- `Project Match`: exact project slug for `exists` steps; `—` for gaps
- `Status`: `exists` (project has a matching capability) or `gap` (no
  project match)
- `Notes`: free-form annotation (mapping rationale, rename notes, etc.)

**Whole-draft-then-edit.** Draft the complete journey first, then
present as a single confirmation prompt (do NOT ask step-by-step):

> *"For the goal `<goal>`, I'd break it into this journey:*
>
> *  1. [exists]  `<cap-a>` — <short purpose>*
> *  2. [gap]     `<cap-b>` — not present; would need <description>*
> *  3. [exists]  `<cap-c>` — <short purpose>*
>
> *Does this journey match what you had in mind? Corrections,
> reorderings, or additions?"*

**Hard gate — iterate until confirmed.** Accept any of: rename a step,
reorder, add, remove, re-classify (`exists` ↔ `gap`), change the
Project Match mapping. After every edit, renumber steps contiguously
(1..N) and redisplay the full journey. Continue until the user gives
a clear affirmative response ("yes", "confirm", "ok", "ship it",
"lgtm", "looks good", etc.). If the response is ambiguous, re-prompt:
*"Did you mean 'confirm the journey as shown' or 'another change'?"*

**Empty-journey abort.** If the goal produces no meaningful journey
(gibberish goal, or user deletes every step during iteration), stop
with: *"Journey is empty. Rerun `/relay-exercise \"<revised goal>\"`
with a different phrasing."* No session is created.

**Duplicate Required Capability.** If the same Required Capability
slug appears twice with different Project Matches, the iterative
prompt surfaces the duplication before accepting confirmation; user
must disambiguate (rename one of them, or merge the steps).

At confirmation, pass the final journey to Phase 6.

## Phase 6 — Gap triage (goal-mode only, NEW)

**Default mode**: skip to Phase 7.

For each step in the confirmed journey whose `Status` is `gap`, in
ascending step order, prompt the user individually:

> *"Step <N>: `<proposed-slug>` is a gap. Choose:*
> *  `record` (default) — keep in journey; `/relay-exercise-run` will
>     decide how to handle it at execution time*
> *  `file-now` — seed a feature brainstorm immediately at
>     `.relay/features/<proposed-slug>_brainstorm.md`*
> *  `drop` — remove the step from the journey entirely*
> *Pick [record/file-now/drop]: "*

Empty input or unrecognized input → treat as `record` (the explicit
default).

### On `record`

The Journey row survives into Phase 7 unchanged (Status stays `gap`).
Log the decision in the Session Log (Phase 7) as
`YYYY-MM-DD — /relay-exercise: step <N> gap recorded for runner.`

### On `file-now`

1. **Derive brainstorm slug.** Take `<proposed-slug>` from the
   Required Capability column. Slugify (already kebab-case by Phase 5
   contract, so slugify is an idempotent re-normalize).
2. **Collision check.** If `<proposed-slug>_brainstorm.md` exists in
   ANY of `.relay/features/`, `.relay/archive/features/`,
   `.relay/issues/`, `.relay/archive/issues/`, append `_2`, `_3`, ...
   until unique. Record the collision in the Session Log.
3. **Write the seed.** Create
   `.relay/features/<proposed-slug>_brainstorm.md` with this template
   (goal-mode brainstorm seed):

   ```markdown
   # Feature Brainstorm: <proposed-slug>

   *Created: YYYY-MM-DD by /relay-exercise (seeded from goal mode)*
   *Source: exercise/<session-slug>/_control.md journey step <N>*
   *Status: BRAINSTORMING*

   (Lifecycle: BRAINSTORMING → READY FOR DESIGN → DESIGN COMPLETE → COMPLETE)

   ## Goal

   The project goal *"<goal-narrative-verbatim>"* requires a
   `<proposed-slug>` capability that does not currently exist. This
   brainstorm explores what that capability should look like.

   ## Context

   *Seeded from exercise session `<session-slug>` (goal mode) at
   journey step <N>.*
   *For the full goal, journey, and any runner observations tied to
   this gap, read [exercise/<session-slug>/_control.md](../exercise/<session-slug>/_control.md).*

   Journey step <N> expected a capability that could: <one-line
   synthesized from Required Capability + Notes>. No existing project
   capability fits.

   ## Approaches Considered
   *(to be filled in by /relay-brainstorm when this seed is developed)*

   ## Decisions Made
   *(to be filled in by /relay-brainstorm when this seed is developed)*

   ## Feature Breakdown
   *(to be filled in by /relay-brainstorm when this seed is developed)*
   ```

4. **Journey row annotation.** Append to the step's Notes column:
   `YYYY-MM-DD: gap filed → features/<proposed-slug>_brainstorm.md`
   Status stays `gap` — the brainstorm exists but the capability
   itself is still missing. Runner (6-2) may later flip it to
   `skipped` when the user chooses `file` in 6-2's gap-handling
   prompt; Phase 6 here only SEEDS the brainstorm, it does not make
   the step terminal.

5. **Orphan-recovery contract.** The brainstorm file is written
   BEFORE Phase 7 writes `_control.md`. If Phase 7 aborts (concurrent
   modification, disk full, user Ctrl+C), the brainstorm file's
   `*Source:*` points at a `_control.md` that was never written.
   Phase 7's failure handler MUST print the full list of paths
   written by file-now decisions this run, prefixed with:
   `[relay-exercise] Orphan brainstorm(s) from aborted session —
   delete or move before retry:` so the operator can clean up by
   hand. Each brainstorm file remains valid markdown; the only damage
   is a dangling `*Source:*` header that `/relay-scan` will flag on
   its next run. Do NOT attempt to auto-delete — the user may have
   already invested time reading the brainstorm's Goal paragraph.

### On `drop`

Remove the step from the journey list entirely. Renumber remaining
steps contiguously. Surviving steps keep their Status.

### Zero-step-after-drops abort

If every step is dropped, stop with: *"Journey is empty after drops —
rerun `/relay-exercise \"<new goal>\"` with a different goal."*
No session is created.

## Phase 7 — Write session control file (`_control.md`)

Write `.relay/exercise/<session>/_control.md`. The template branches
on mode (from Phase 1).

### 7a. Default-mode template

Use this template verbatim:

    # Exercise Session: <session>

    *Mode:* default
    *Created:* YYYY-MM-DD by /relay-exercise
    *Status:* active
    *Last activity:* YYYY-MM-DD by /relay-exercise

    ---

    ## Session Scope

    Bottom-up scan of the project covering all discovered capabilities
    as of YYYY-MM-DD.

    ---

    ## Context Chains

    Named linear sequences where later capabilities assume earlier ones
    have been exercised (or at least their prerequisites have run).

    ### Chain: [Chain Name]
    1. capability-a
    2. capability-b
    3. capability-c

    ---

    ## Session Coverage

    | Status    | Count |
    |-----------|-------|
    | mapped    | N     |
    | exercised | 0     |
    | filed     | 0     |
    | stale     | 0     |

    ---

    ## Session Capabilities

    ### Group: [Group Name]

    | Capability       | Status | Last Updated | Exercise File                    | Findings Filed |
    |------------------|--------|--------------|----------------------------------|----------------|
    | capability-name  | mapped | YYYY-MM-DD   | —                                | —              |

    ### Ungrouped

    | Capability | Status | Last Updated | Exercise File | Findings Filed |
    |------------|--------|--------------|---------------|----------------|

    ---

    ## Session Log

    - **YYYY-MM-DD** — /relay-exercise: session created (default mode).
      Mapped N capabilities across M groups.

### 7b. Goal-mode template (NEW)

Use this template:

    # Exercise Session: <session>

    *Mode:* goal
    *Created:* YYYY-MM-DD by /relay-exercise
    *Status:* active
    *Last activity:* YYYY-MM-DD by /relay-exercise

    ---

    ## Session Scope

    **Goal:** <goal-narrative-verbatim>

    ---

    ## Journey

    *Goal:* <goal-narrative, first 120 chars of single-line form>

    | Step | Required Capability | Project Match | Status | Notes |
    |------|---------------------|---------------|--------|-------|
    | 1    | <required-slug-1>   | <project-slug>| exists |       |
    | 2    | <required-slug-2>   | —             | gap    | <notes-from-Phase-6-if-filed> |
    | ...  | ...                 | ...           | ...    | ...   |

    ---

    ## Session Coverage

    | Status          | Count |
    |-----------------|-------|
    | mapped          | E     |
    | exercised       | 0     |
    | filed           | 0     |
    | stale           | 0     |
    | gaps-recorded   | R     |
    | gaps-filed      | F     |

    `gaps-recorded` and `gaps-filed` are MUTUALLY EXCLUSIVE buckets:
    `gaps-recorded` counts gaps triaged as `record` in Phase 6 (deferred
    to the runner); `gaps-filed` counts gaps triaged as `file-now`
    (brainstorm seeded now). Invariant: `R + F = G`, where G is the
    `<G> gaps` count in the master hub Sessions Summary.

    (`gaps-dropped` is not persisted — it is derivable from the Session
    Log entries below.)

    ---

    ## Session Capabilities

    Populated with the `exists` steps' **Project Match** slugs (not
    Required Capability slugs). Example: a Journey step with
    `Required Capability: outline-chapter` / `Project Match: outline`
    emits an `outline` row below. The Journey table preserves both
    slugs; Session Capabilities + master hub Aggregate rows carry only
    the project slug.

    ### Group: [Group Name]

    | Capability       | Status | Last Updated | Exercise File | Findings Filed |
    |------------------|--------|--------------|---------------|----------------|
    | <project-slug>   | mapped | YYYY-MM-DD   | —             | —              |

    ### Ungrouped

    | Capability | Status | Last Updated | Exercise File | Findings Filed |
    |------------|--------|--------------|---------------|----------------|

    `gap` steps do NOT appear in Session Capabilities — they are
    proposed-not-present and tracked only in the Journey table. This
    means the existing runner can still operate on the `exists` rows
    even before 6-2 ships.

    ---

    ## Session Log

    - **YYYY-MM-DD** — /relay-exercise: session created (goal mode).
      Goal: "<goal-narrative-first-80-chars>". <N>-step journey,
      <G> gaps (<F> filed now, <D> dropped).
    - **YYYY-MM-DD** — /relay-exercise: step <N> gap recorded for runner.
    - **YYYY-MM-DD** — /relay-exercise: step <N> gap filed →
      features/<proposed-slug>_brainstorm.md.
    - **YYYY-MM-DD** — /relay-exercise: step <N> gap dropped.

**Write strategy** (shared 7a + 7b): subsequent mutations by
`/relay-exercise-run` Phase 7 and `/relay-exercise-file` Phase 4
perform incremental row updates with mtime checks. Session scope is
**fixed at creation** — no phase from this skill mutates the Journey
or Context Chains after Phase 7 completes.

### Contracts

**Capability names:** kebab-case (lowercase letters, digits, hyphens).
Slugify by lowercasing, replacing non-alphanumerics with hyphens,
collapsing consecutive hyphens, stripping non-ASCII to base forms (é→e,
ñ→n). Collisions resolved by appending `-2`, `-3`; noted in Session Log.

**Session names:** `<mode-slug>-<YYYY-MM-DDTHHMM>` per Phase 4.5.
Timestamp segment uses `THHMM` (no colons — Windows filesystem safe).

**Status vocabulary:** exactly four values — `mapped`, `exercised`,
`filed`, `stale`. Applies to both per-session `_control.md` capability
rows and the master hub's Aggregate Capabilities rows.

**Journey status vocabulary** (goal-mode `_control.md` Journey table
only): `exists | gap | exercised | failed | adapted | skipped`.
Phase 5 emits only `exists` and `gap`. Terminal transitions
(`exercised / failed / adapted / skipped`) are written by
`/relay-exercise-run` in its goal-mode walk (Feature 6-2). The
Journey vocabulary is a strict superset of the per-capability Status
vocabulary above.

**Mode** (`*Mode:*` header in `_control.md`): `default` or `goal`.
`default` uses `## Context Chains`; `goal` uses `## Journey` in place
of Context Chains. The header is the CANONICAL dispatch signal —
downstream skills (runner, filer, resolver, cleanup) MUST read it
first. Self-healing heuristics (e.g., inferring `goal` from
`## Journey` section presence when the header is missing or
contradicts the body) are permitted as fallbacks; any self-heal
MUST log the correction AND rewrite the header to match the observed
body so the next read hits the canonical path.

**Session lifecycle vocabulary** (master hub Sessions table + `_control.md`
`*Status:*` header): `active`, `complete`, `archived`.

**Dates:** ISO `YYYY-MM-DD`. Single date per row for the most recent
transition.

**Paths:** relative to `.relay/`, with session subfolder segment —
`exercise/<session>/foo.md` (active) or `archive/exercise/<session>/foo.md`
(archived). Not `./exercise/<session>/foo.md`, not absolute paths. Always
forward slashes (matches existing skill convention; cross-platform safe).

**Required grep anchors** in the master hub: `## Project Identity`,
`## Sessions`, `## Aggregate Capabilities`, `### Group:`, `### Ungrouped`,
`## Aggregate Coverage`, `## Refresh Log`. In `_control.md` (default
mode): `## Session Scope`, `## Context Chains`, `## Session Coverage`,
`## Session Capabilities`, `### Group:`, `### Ungrouped`, `## Session Log`.
In `_control.md` (goal mode): `## Session Scope`, `## Journey`,
`## Session Coverage`, `## Session Capabilities`, `### Group:`,
`### Ungrouped`, `## Session Log`. The `*Mode:*` header line is the
canonical dispatch marker and MUST be present in both templates.

**Group stability:** once a capability exists under a group, it stays
there unless the user manually moves it. New capabilities get the
current-run grouping.

**State model:** consumed internally in Phase 4, NOT rendered in the
master hub or `_control.md`. State info lives in `relay-config.md`
only (single source of truth).

## Phase 8 — Write/update the master hub

Write or update `.relay/relay-exercise.md` using the project-wide master
registry format (see sibling feature `exercise_master_hub.md`). The hub's
job is to give `/relay-scan`, `/relay-help`, and humans a single place
to answer "what can this project do, what's the latest status of each
capability, and what sessions exist."

### First-run state

Write the skeleton:

    # Project Exercise Map

    *Last updated: YYYY-MM-DD by /relay-exercise*

    > Master registry. Per-session detail lives in
    > `.relay/exercise/<session>/_control.md`.
    > This file is additive — stale rows are marked, not removed.
    > Generated and maintained by /relay-exercise. /relay-exercise-run,
    > /relay-exercise-file, and /relay-resolve update individual rows.
    > Run /relay-scan to refresh lazy summaries.

    ---

    ## Project Identity

    [One paragraph confirmed with the user in Phase 3]

    ---

    ## Sessions

    | Session                       | Mode    | Created    | Status | Control File                                          | Summary                            |
    |-------------------------------|---------|------------|--------|--------------------------------------------------------|------------------------------------|
    | <session>                     | <default|goal> | YYYY-MM-DD | active | exercise/<session>/_control.md                        | <mode-aware — see Refresh state>   |

    ---

    ## Aggregate Capabilities

    Latest known status per capability, rolled up from all sessions.

    ### Group: [Group Name]

    | Capability    | Status | Last Updated | Latest Session | Latest Exercise File | Latest Findings Filed |
    |---------------|--------|--------------|----------------|----------------------|-----------------------|
    | capability-a  | mapped | YYYY-MM-DD   | <session>      | —                    | —                     |

    ### Ungrouped

    | Capability | Status | Last Updated | Latest Session | Latest Exercise File | Latest Findings Filed |
    |------------|--------|--------------|----------------|----------------------|-----------------------|

    ---

    ## Aggregate Coverage

    | Status    | Count |
    |-----------|-------|
    | mapped    | N     |
    | exercised | 0     |
    | filed     | 0     |
    | stale     | 0     |

    ---

    ## Refresh Log

    - **YYYY-MM-DD** — /relay-exercise: session `<session>` created.
      <mode-aware entry — see Refresh state bullet below>

### Refresh state (mode-aware)

Append to the existing master hub:

- Append a new row to the Sessions table with Mode = `default` or
  `goal` (from Phase 1), Status `active`, Control File
  `exercise/<session>/_control.md`, **Summary**:
  - Default mode: `N mapped`
  - Goal mode: `<N>-step journey, <G> gaps`, where N = total Journey
    rows (including gaps) and G = count of Journey rows with Status
    `gap` after Phase 6 triage. Summary is set at write time; becomes
    lazy-recomputable by `/relay-scan` (see `/relay-scan` step 6
    Sessions Summary recompute sub-step).

- For each capability in this run's scope:
  - **Default mode**: every discovered capability is upserted
    (existing 5-1 rules, unchanged).
  - **Goal mode**: ONLY `exists` steps' project capabilities get
    upserted. `gap` steps never appear in Aggregate Capabilities —
    they are proposed slugs, not project capabilities.

  Aggregate Capabilities upsert sub-rules (both modes):
  - Already in Aggregate Capabilities → update Last Updated = today,
    Latest Session = new session, Latest Exercise File = `—` (reset —
    earlier sessions' files remain accessible through their own
    `_control.md`); if prior status was `stale`, flip to `mapped`
    (re-detected). Other status values are NOT clobbered (a `filed`
    capability keeps `filed` until the new session re-exercises it).
  - Not in Aggregate Capabilities → insert a new row under its group
    with Status = `mapped`, Last Updated = today, Latest Session = new
    session, Latest Exercise File = `—`, Latest Findings Filed = `—`.
- For each capability previously in Aggregate Capabilities that this
  scan did NOT detect (default mode only — goal mode does not sweep
  for staleness because its scope is the Journey, not the full project)
  → set Status = `stale`, Last Updated = today. Leave Latest Session /
  Latest Exercise File untouched so history remains findable.
- Recompute Aggregate Coverage counts.
- Append to Refresh Log — mode-aware:
  - Default mode: `**YYYY-MM-DD** — /relay-exercise: session
    \`<session>\` created. Mapped N capabilities. A new, B updated,
    C marked stale.`
  - Goal mode: `**YYYY-MM-DD** — /relay-exercise: session
    \`<session>\` created (goal mode). <N>-step journey, <G> gaps
    (<F> filed now, <D> dropped).`
- Update `*Last updated:*` header.

Nothing is ever deleted. The master hub grows monotonically.

## Phase 9 — Summary + navigation

Report — mode-aware:

- **Default mode**:
  - Total counts by status (mapped / exercised / filed / stale)
  - What changed this run (capabilities added, capabilities marked
    stale, config updates applied)

- **Goal mode**:
  - Journey length (`<N>` steps) and gap decomposition
    (`<E>` exists, `<R>` recorded, `<F>` filed-now, `<D>` dropped)
  - Paths of brainstorm seeds created this run (from file-now decisions)
  - Goal narrative (first 80 chars, for confirmation readback)

Next step — mode-aware:

- **Default mode**:
  *"Run `/relay-exercise-run` with no args to begin exercising one
  capability at a time, or `/relay-exercise-run <group-name>` to sweep
  a whole group."*

- **Goal mode**:
  *"Run `/relay-exercise-run` (no args) to walk the journey end-to-end,
  or `/relay-exercise-run <N>` to target a specific step. The runner
  will exercise `exists` steps with real scenarios, handle `gap` steps
  adaptively (substitute / file / skip), and record progress back in
  `_control.md`."* (Feature 6-2 owns run-side; until 6-2 ships, users
  can exercise individual `exists` steps' capabilities using the
  existing per-capability runner: `/relay-exercise-run <capability-slug>`.)

## Navigation

When finished, tell the user (Phase 9 emits the mode-specific wording;
this is the short summary):
- Default mode: "Next: run **/relay-exercise-run** to start exercising
  capabilities."
- Goal mode: "Next: run **/relay-exercise-run** to walk the journey
  end-to-end."

## Notes

- The hub grows monotonically — never deletes rows
- Refresh state (hub exists) preserves existing rows, appending new
  discoveries; first-run state writes the skeleton
- Default mode (no goal argument) and goal mode (`/relay-exercise
  "<goal>"`) share Phases 2–4 and 7–9 but diverge at Phases 5–6:
  default skips straight to Phase 7 with Context Chains; goal runs
  Journey construction (Phase 5) + Gap triage (Phase 6) before
  writing a Journey-bearing `_control.md`
- The mapper does NOT create exercise files — that's the runner's job
- The mapper does NOT file issues or brainstorms — that's the filer's job
- State model info belongs in relay-config.md, not the hub
- Hub parsing may fail after manual edits — fail loudly and offer to
  rebuild rather than silently corrupting
- This skill is project-agnostic — adapts to whatever project it's invoked in
