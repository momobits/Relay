# Relay: Exercise — Map Capabilities

**Sequence**: **`/relay-exercise`** → `/relay-exercise-run` → `/relay-exercise-file` → *findings flow into /relay-new-issue and /relay-brainstorm* → standard code pipeline

Map the project's user-facing capabilities and produce `.relay/relay-exercise.md` — the living hub file that downstream exercise skills consume. On refresh, existing data is preserved and new discoveries are appended.

## Phase 1 — Preflight

Detect mode:

- If `.relay/relay-exercise.md` does **not** exist → **first-run mode**
- If `.relay/relay-exercise.md` exists and is parseable (has the expected
  `## Sessions` heading and at least one row, or `## Aggregate Capabilities`
  if Sessions is empty) → **refresh mode**
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
  On yes → first-run mode. On no → stop.

**Both first-run and refresh modes create a new session.** Refresh mode
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

## Phase 5 — Write the master hub + session control file

### Phase 5a — Master hub upsert

Write or update `.relay/relay-exercise.md` using the project-wide master
registry format (see sibling feature `exercise_master_hub.md`). The hub's
job is to give `/relay-scan`, `/relay-help`, and humans a single place
to answer "what can this project do, what's the latest status of each
capability, and what sessions exist."

**First-run mode** writes the skeleton:

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
    | <session>                     | default | YYYY-MM-DD | active | exercise/<session>/_control.md                        | N mapped                           |

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
      Mapped N capabilities across M groups.

**Refresh mode** appends to the existing master hub:

- Append a new row to the Sessions table with Status `active`, Control
  File `exercise/<session>/_control.md`, Summary `N mapped`.
- For each capability discovered this run:
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
  scan did NOT detect → set Status = `stale`, Last Updated = today.
  Leave Latest Session / Latest Exercise File untouched so history
  remains findable.
- Recompute Aggregate Coverage counts.
- Append to Refresh Log:
  `**YYYY-MM-DD** — /relay-exercise: session \`<session>\` created.
   Mapped N capabilities. A new, B updated, C marked stale.`
- Update `*Last updated:*` header.

Nothing is ever deleted. The master hub grows monotonically.

### Phase 5b — Session control file (`_control.md`)

Write `.relay/exercise/<session>/_control.md` using this template:

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

**Write strategy:** subsequent mutations by `/relay-exercise-run`
Phase 7 and `/relay-exercise-file` Phase 4 perform incremental row
updates with mtime checks (matches today's hub semantics). Session
scope is **fixed at creation** — runners and filers do not add or
remove capability rows after Phase 5b.

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
`## Aggregate Coverage`, `## Refresh Log`. In `_control.md`:
`## Session Scope`, `## Context Chains`, `## Session Coverage`,
`## Session Capabilities`, `### Group:`, `### Ungrouped`, `## Session Log`.

**Group stability:** once a capability exists under a group, it stays
there unless the user manually moves it. New capabilities get the
current-run grouping.

**State model:** consumed internally in Phase 4, NOT rendered in the
master hub or `_control.md`. State info lives in `relay-config.md`
only (single source of truth).

## Phase 6 — Summary + navigation

Report:

- Total counts by status (mapped / exercised / filed / stale)
- What changed this run (capabilities added, capabilities marked stale,
  config updates applied)

Next step:
*"Run `/relay-exercise-run` with no args to begin exercising one capability
at a time, or `/relay-exercise-run <group-name>` to sweep a whole group."*

## Navigation

When finished, tell the user:
- "Next: run **/relay-exercise-run** to start exercising capabilities."

## Notes

- The hub grows monotonically — never deletes rows
- Refresh mode preserves existing rows, appending new discoveries
- The mapper does NOT create exercise files — that's the runner's job
- The mapper does NOT file issues or brainstorms — that's the filer's job
- State model info belongs in relay-config.md, not the hub
- Hub parsing may fail after manual edits — fail loudly and offer to
  rebuild rather than silently corrupting
- This skill is project-agnostic — adapts to whatever project it's invoked in
