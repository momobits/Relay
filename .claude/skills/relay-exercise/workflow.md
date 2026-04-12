# Relay: Exercise — Map Capabilities

**Sequence**: **`/relay-exercise`** → `/relay-exercise-run` → `/relay-exercise-file` → *findings flow into /relay-new-issue and /relay-brainstorm* → standard code pipeline

Map the project's user-facing capabilities and produce `.relay/relay-exercise.md` — the living hub file that downstream exercise skills consume. On refresh, existing data is preserved and new discoveries are appended.

## Phase 1 — Preflight

Detect mode:

- If `.relay/relay-exercise.md` does **not** exist → **first-run mode**
- If `.relay/relay-exercise.md` exists and is parseable (has the expected
  `## Capabilities` heading and at least one group table) → **refresh mode**
- If `.relay/relay-exercise.md` exists but is **not** parseable → ask the
  user: *"I couldn't parse the existing hub. Rebuild from scratch? This
  will lose coverage history. [y/n]"*
  On yes → first-run mode. On no → stop.

Create directories if they don't exist (fallback — `/relay-setup` handles
primary creation after the integration audit):

- `.relay/exercise/`
- `.relay/archive/exercise/`

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

## Phase 5 — Write or refresh the hub

### First-run mode

Write `.relay/relay-exercise.md` using this structure, populated with the
confirmed identity, discovered capabilities, and the initial Refresh Log
entry:

    # Project Exercise Map

    *Last mapped: YYYY-MM-DD by /relay-exercise*

    > Generated and maintained by /relay-exercise. /relay-exercise-run and
    > /relay-exercise-file update individual rows as capabilities move through
    > their lifecycle. This file is additive — stale rows are marked, not
    > removed.

    ---

    ## Project Identity

    [One paragraph confirmed with the user in Phase 3]

    ---

    ## Context Chains

    Named linear sequences where later capabilities assume earlier ones
    have been exercised (or at least their prerequisites have run).

    ### Chain: [Chain Name]
    1. capability-a
    2. capability-b
    3. capability-c

    ---

    ## Coverage Summary

    | Status    | Count |
    |-----------|-------|
    | mapped    | N     |
    | exercised | 0     |
    | filed     | 0     |
    | stale     | 0     |

    ---

    ## Capabilities

    ### Group: [Group Name]

    | Capability       | Status | Last Updated | Exercise File | Findings Filed |
    |------------------|--------|--------------|---------------|----------------|
    | capability-name  | mapped | YYYY-MM-DD   | —             | —              |

    ### Ungrouped

    | Capability | Status | Last Updated | Exercise File | Findings Filed |
    |------------|--------|--------------|---------------|----------------|

    ---

    ## Refresh Log

    - **YYYY-MM-DD** — Initial mapping. Added N capabilities across M groups.

### Refresh mode

Parse the existing hub, run the new scan (Phase 2 results), and reconcile:

- **Capability still present** → leave the row completely untouched
  (Status, Last Updated, Exercise File, Findings Filed all preserved)
- **New capability discovered** → append a row to the appropriate group
  section (or Ungrouped) with Status = `mapped`, Last Updated = today
- **Previously-mapped capability no longer detected** → change Status to
  `stale`, update Last Updated to today, leave all other columns intact
- **Context chains** → add new chains, mark missing chains as stale,
  never rewrite existing chain content
- **Coverage Summary** → recompute counts from the updated tables
- **Refresh Log** → append a new dated entry summarizing changes
- **Last mapped date** → update to today

Nothing is ever deleted. The hub grows monotonically.

### Contracts

**Capability names:** kebab-case (lowercase letters, digits, hyphens).
Slugify by lowercasing, replacing non-alphanumerics with hyphens,
collapsing consecutive hyphens, stripping non-ASCII to base forms (é→e,
ñ→n). Collisions resolved by appending `-2`, `-3`; noted in Refresh Log.

**Status vocabulary:** exactly four values — `mapped`, `exercised`,
`filed`, `stale`.

**Dates:** ISO `YYYY-MM-DD`. Single date per row for the most recent
transition.

**Paths:** relative to `.relay/` — e.g., `exercise/foo.md`, not
`./exercise/foo.md` or absolute paths.

**Group stability:** once a capability exists under a group, it stays
there unless the user manually moves it. New capabilities get the
current-run grouping.

**State model:** consumed internally in Phase 4, NOT rendered in the hub.
State info lives in `relay-config.md` only (single source of truth).

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
