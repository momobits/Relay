# Relay: Exercise Migration — 3.1.0 → 3.2.x

**Sequence**: standalone one-time utility — invoke exactly once per 3.1.0 project

Upgrade a project from the 3.1.0 flat `.relay/exercise/` layout to the 3.2.x
session-subfolder layout. Produces synthetic sessions named
`default-migrated-<T>` (and `default-migrated-archive-<T>` if the project has
archived exercises). Rewrites the master hub `.relay/relay-exercise.md` into
the 3.2.x registry shape (Sessions + Aggregate Capabilities + Aggregate
Coverage + Refresh Log). Rewrites every `*Source:*` back-reference across
issues/features. Validates. Offers rollback on validation failure.

**This skill is self-contained.** No other Relay skill references it.
Removal in a future release requires deleting this directory and reverting
two edits in `tools/cli.js` (`RELAY_SKILLS` entry, `generateRelaySection()`
row). Users discover this skill via the `.relay/version.md` changelog only.

## Phase 1 — Preflight

**1a. Detect 3.1.0 shape.** Read `.relay/relay-exercise.md`. Branch:

- File does not exist → exit cleanly: *"No exercise hub found. Nothing to
  migrate."*
- File contains `## Sessions` heading → exit cleanly: *"Already on 3.2.x
  layout. Nothing to migrate."*
- File contains `## Capabilities` heading AND no `## Sessions` → proceed
  (3.1.0 layout confirmed).
- File has neither `## Capabilities` nor `## Sessions`, OR has both → exit
  with: *"Exercise pipeline is in a partial state — manual inspection
  recommended. Migration refuses to run on unclear state."* Do NOT attempt
  repair.

**1b. Detect previous aborted migration.** If `.relay/MIGRATION_INCOMPLETE.md`
exists → exit with: *"Previous migration aborted mid-run. See
`.relay/MIGRATION_INCOMPLETE.md` for the planned moves. Reverse them manually,
delete the sentinel, and re-run `/relay-exercise-migrate`."* Do NOT proceed.

**1c. Inventory.** Collect:

- Active flat files: every `*.md` directly in `.relay/exercise/`. If any
  `_control.md` is found at the top level (it belongs one directory deeper in
  the 3.2.x shape), abort immediately with the same partial-state message from
  Phase 1a: *"Exercise pipeline is in a partial state — manual inspection
  recommended. Migration refuses to run on unclear state."*
- Archived flat files: every `*.md` directly in `.relay/archive/exercise/`.
- `.outputs/` directories at each top level (active + archive).
- Back-references: count `*Source: exercise/<cap>.md finding <N>*` and
  `*Source: archive/exercise/<cap>.md finding <N>*` lines across
  `.relay/issues/*.md`, `.relay/archive/issues/*.md`, `.relay/features/*.md`,
  `.relay/archive/features/*.md`.
- Timestamp `T = <YYYY-MM-DDTHHMM>` captured once at this point for both
  synthetic session slugs.

**1d. Back up the hub.** Copy `.relay/relay-exercise.md` → `.relay/relay-exercise.md.pre-3.2-backup`. Fail loudly if the copy fails (permission, disk
full); do NOT proceed.

Do NOT back up `.relay/exercise/` or `.relay/archive/exercise/` — the in-memory move log (Phase 3) and reverse-rewrite map (Phase 5) are the rollback
mechanism for those. Full-tree backup is rejected for I/O cost.

**1e. Hard-gate confirmation.** Present:

> *"Migrating 3.1.0 flat exercise layout to 3.2.x session-subfolder layout:*
>
> *  - `<N>` active exercise files → `exercise/default-migrated-<T>/`*
> *  - `<M>` archived exercise files → `archive/exercise/default-migrated-archive-<T>/`*
> *  - Master hub will be rewritten to registry format*
> *  - `<K>` back-references in issues/features will be rewritten*
>
> *Backup: `relay-exercise.md.pre-3.2-backup`. Continue? [y/n]"*

If the user answers `n`, exit cleanly. Backup file stays in place harmlessly
(user can delete it manually).

**1f. Write sentinel.** Immediately before Phase 2, write
`.relay/MIGRATION_INCOMPLETE.md` containing the timestamp `T`, the two
synthetic session slugs, the inventory from 1c, and an empty `## Moves
Completed` section. Phase 3 will append to the Moves Completed section after
each successful move. Phase 9 deletes this sentinel on clean completion.

## Phase 2 — Create synthetic session subfolders

Define slugs using timestamp `T` from Phase 1:

- Active synthetic session slug: `default-migrated-<T>`
- Archived synthetic session slug: `default-migrated-archive-<T>`

Create subfolders conditionally (a side is created only if it has content):

- `.relay/exercise/default-migrated-<T>/` if Phase 1 inventory found active
  flat files.
- `.relay/archive/exercise/default-migrated-archive-<T>/` if Phase 1 inventory
  found archived flat files.

## Phase 3 — Move flat files

For each active flat file, move into the active synthetic subfolder:

- `.relay/exercise/<cap>.md` → `.relay/exercise/default-migrated-<T>/<cap>.md`
- `.relay/exercise/<cap>-YYYY-MM-DD.md` → `.relay/exercise/default-migrated-<T>/<cap>-YYYY-MM-DD.md` (dated re-run variants)
- `.relay/exercise/<cap>.outputs/` (directory) → `.relay/exercise/default-migrated-<T>/<cap>.outputs/` (directory)

Same pattern for archived flat files into `archive/exercise/default-migrated-archive-<T>/`.

**Per-move logging.** For each move:

1. Log to user output: `"Moved exercise/<cap>.md → exercise/default-migrated-<T>/<cap>.md"` (show first 5 moves verbatim; cap remaining at
   `"... and K more moves"` to avoid log flood for large projects).
2. Append the move to `.relay/MIGRATION_INCOMPLETE.md` under `## Moves
   Completed` with the full source-path → dest-path pair on a single line.
3. Append to the in-memory move log (for Phase 8 rollback).

**Atomic move via rename.** Each move uses OS-level rename (`fs.renameSync`
behavior) so a single move either fully succeeds or fully fails. On `EXDEV`
(cross-filesystem, rare because `.relay/` lives inside the user's project
tree and is usually on the same device), abort Phase 3 cleanly with a
specific message: *"Cross-filesystem migration is not supported. Ensure
`.relay/` lives on the same device as its parent project directory and
retry."* Do NOT attempt copy-then-delete fallback — a half-failed copy that
leaves files on both sides is worse than a clean abort.

**On move failure mid-run (non-EXDEV).** Abort Phase 3 immediately. Do NOT
continue with subsequent moves. Run auto-rollback: reverse every move in the
in-memory log, delete `.relay/MIGRATION_INCOMPLETE.md`, restore
`.relay/relay-exercise.md` from `.pre-3.2-backup`. Report the failure + what
was reversed.

## Phase 4 — Rewrite `kept:` paths inside migrated exercise files

For each **active** exercise file now at `exercise/default-migrated-<T>/<cap>.md`, rewrite any line matching `**Status:** kept: exercise/<cap>.md` to:

- `**Status:** kept: exercise/default-migrated-<T>/<cap>.md`

For each **archived** exercise file now at `archive/exercise/default-migrated-archive-<T>/<cap>.md`, rewrite **both** of these forms:

- `**Status:** kept: exercise/<cap>.md` → `**Status:** kept: archive/exercise/default-migrated-archive-<T>/<cap>.md`
- `**Status:** kept: archive/exercise/<cap>.md` → `**Status:** kept: archive/exercise/default-migrated-archive-<T>/<cap>.md`

**`filed:` lines are NOT rewritten** — those paths (`issues/<slug>.md`,
`features/<slug>_brainstorm.md`, `archive/issues/...`, `archive/features/...`)
don't change shape in 3.2.x.

**Narrative prose is NOT rewritten** — mentions of `exercise/<cap>.md` inside
scenario descriptions or finding bodies are historical record, not parsed
references. Left intact.

**Idempotency.** Lines already containing `default-migrated-` are skipped.

## Phase 5 — Rewrite `*Source:*` back-references

Walk these directories for `*.md` files:

- `.relay/issues/`
- `.relay/archive/issues/`
- `.relay/features/`
- `.relay/archive/features/`

For each file, rewrite the first `*Source:*` line (header block, not prose):

- `*Source: exercise/<cap>.md finding <N>*` → `*Source: exercise/default-migrated-<T>/<cap>.md finding <N>*`
- `*Source: archive/exercise/<cap>.md finding <N>*` → `*Source: archive/exercise/default-migrated-archive-<T>/<cap>.md finding <N>*`

**Idempotency.** Lines already containing `default-migrated-` are skipped.
**Reverse-rewrite map.** Record every rewrite as a (file, old-line, new-line)
tuple in the in-memory reverse-rewrite map for Phase 8 rollback.

**Log each rewrite** (same cap-at-5-with-"and K more" pattern as Phase 3).

## Phase 6 — Synthesize `_control.md` per synthetic session

**Active synthetic session `_control.md`** at `.relay/exercise/default-migrated-<T>/_control.md` (written only if active subfolder was created in Phase 2):

    # Exercise Session: default-migrated-<T>

    *Mode:* default
    *Created:* <old hub's Last-updated date, or today if unparseable> by /relay-exercise-migrate
    *Status:* active
    *Last activity:* <today> by /relay-exercise-migrate

    ---

    ## Session Scope

    Synthetic session produced by the 3.2 migration. Scope corresponds to the
    bottom-up capability map recorded in the pre-3.2 master hub as of
    `<original-date>`.

    ---

    ## Context Chains

    <verbatim copy of the old hub's ## Context Chains section body, including
     all "### Chain: <name>" subsections and their ordered lists>

    ---

    ## Session Coverage

    | Status    | Count |
    |-----------|-------|
    | mapped    | N     |
    | exercised | M     |
    | filed     | K     |
    | stale     | S     |

    ---

    ## Session Capabilities

    ### Group: <Group Name>
    | Capability | Status | Last Updated | Exercise File                   | Findings Filed |
    |------------|--------|--------------|---------------------------------|----------------|
    <rows: subset of old hub's ## Capabilities rows — include if (a) the
     row's Exercise File lives in exercise/default-migrated-<T>/, OR (b) the
     row's Status is `mapped` or `stale` and has no Exercise File. Exercise
     File column paths rewritten to exercise/default-migrated-<T>/<cap>.md;
     other columns preserved verbatim.>

    ### Ungrouped
    | Capability | Status | Last Updated | Exercise File | Findings Filed |
    |------------|--------|--------------|---------------|----------------|

    ---

    ## Session Log
    - **<today>** — /relay-exercise-migrate: synthetic session created from 3.2
      migration of flat layout. Lifted N capabilities, C context chains, M
      exercise files.

**Archived synthetic session `_control.md`** at `.relay/archive/exercise/default-migrated-archive-<T>/_control.md` (written only if archive subfolder was created in Phase 2): same structure with these diffs:

- `*Status:* archived` (not `active`) — archived sessions are read-only per
  Feature 1 lifecycle model
- `## Session Scope` wording notes archived content specifically
- `## Session Capabilities` contains only rows whose exercise file is at
  `archive/exercise/default-migrated-archive-<T>/<cap>.md`; Exercise File
  column uses the archive path
- `## Context Chains` section **omitted entirely** (chains apply to active
  exploration only, not frozen archival state)
- `## Session Log` entry reads: `**<today>** — /relay-exercise-migrate:
  archived synthetic session created from 3.2 migration.`

**Dual-side capability resolution.** If a capability has BOTH an active and
an archived exercise file (possible from manual edits under 3.1.0):

- Active side wins for the master hub Aggregate Capabilities row (Phase 7)
- Archived side's row still appears in the archived synthetic session's
  `_control.md`
- Note the dual state in the Refresh Log (Phase 7.6)

## Phase 7 — Rewrite the master hub

Rewrite `.relay/relay-exercise.md` in place with this structure (the
`.pre-3.2-backup` protects against mistakes):

**7.1 Header**:

    # Project Exercise Map

    *Last updated: <today> by /relay-exercise-migrate*

    > Master registry. Per-session detail lives in
    > `.relay/exercise/<session>/_control.md`.

**7.2 `## Project Identity`** — preserved **verbatim** from old hub's same
section (including any whitespace and formatting).

**7.3 `## Sessions`** — write as a new section with up to 2 rows:

    | Session                        | Mode    | Created      | Status   | Control File                                               | Summary                            |
    |--------------------------------|---------|--------------|----------|-------------------------------------------------------------|------------------------------------|
    | default-migrated-<T>           | default | <orig-date>  | active   | exercise/default-migrated-<T>/_control.md                   | N mapped, M exercised, K filed, S stale |
    | default-migrated-archive-<T>   | default | <orig-date>  | archived | archive/exercise/default-migrated-archive-<T>/_control.md   | P exercises archived at migration  |

Omit either row if its side had no content in Phase 1 inventory.

**7.4 `## Aggregate Capabilities`** — rewrite from old hub's `## Capabilities`:

Start with the table header line — **explicitly rename the column** from the
3.1.0 name `Findings Filed` to the 3.2.x name `Latest Findings Filed`:

    | Capability | Status | Last Updated | Latest Session | Latest Exercise File | Latest Findings Filed |
    |------------|--------|--------------|----------------|----------------------|-----------------------|

For each old row, emit a new row with these column values:

- `Capability` → preserved verbatim
- `Status` → preserved verbatim
- `Last Updated` → preserved verbatim (do NOT bump to today — preserves
  historical truth)
- `Latest Session`:
  - If the capability's old Exercise File exists under active subfolder now →
    `default-migrated-<T>`
  - Else if the capability's old Exercise File exists under archive subfolder →
    `default-migrated-archive-<T>`
  - Else (capability had no Exercise File — `mapped` or `stale`): default to
    `default-migrated-<T>` if the active synthetic session was created;
    fall back to `default-migrated-archive-<T>` if only the archive session
    was created; write `—` if **neither synthetic session was created**
    (both sides empty — the old hub has `## Capabilities` rows but no
    exercise files on either side). This keeps the Aggregate Capabilities
    row parseable — `/relay-scan` treats `—` as "no session yet" without
    flagging a dangling ref.
- `Latest Exercise File` → rewrite to new subfolder path per the session
  chosen for Latest Session; or `—` if the capability had no exercise file
- `Latest Findings Filed` → preserved verbatim (paths unaffected by migration)

Group headings (`### Group: <name>`, `### Ungrouped`) — preserved verbatim.

**7.5 `## Aggregate Coverage`** — compute from the Aggregate Capabilities rows
written in 7.4:

    | Status    | Count |
    |-----------|-------|
    | mapped    | N     |
    | exercised | M     |
    | filed     | K     |
    | stale     | S     |

If the old hub's `## Coverage Summary` exists and disagrees with the recomputed
values, log a warning showing both sides but write the recomputed values.

**7.6 `## Refresh Log`** — two subsections:

    ### Pre-3.2 history

    <verbatim copy of the old hub's ## Refresh Log body>

    ### 3.2 migration

    - **<today>** — /relay-exercise-migrate: migrated flat 3.1.0 layout to
      session-subfolder layout. Synthetic sessions `default-migrated-<T>` (N
      active capabilities) and `default-migrated-archive-<T>` (M archived).
      Rewrote K back-references.

**7.7 Remove old sections**: the 3.1.0 hub's `## Context Chains` (now owned
by the active synthetic session's `_control.md`) and `## Capabilities` (now
replaced by `## Aggregate Capabilities`) and `## Coverage Summary` (now
replaced by `## Aggregate Coverage`) are not written to the new hub.

## Phase 8 — Validation

Run these checks against the on-disk state after Phase 7:

1. For each Aggregate Capabilities row with a non-`—` Latest Exercise File:
   verify the referenced file exists on disk.
2. For each Sessions row: verify the Control File path resolves.
3. For every issue/feature `*Source:*` rewrite from Phase 5: verify the
   referenced migrated exercise file exists.
4. For every `**Status:** kept:` line rewritten in Phase 4: verify the
   referenced migrated exercise file exists.
5. For every `**Status:** filed:` line inside migrated exercise files:
   verify the referenced issue/feature file exists. (Pre-existing broken
   refs here are NOT introduced by migration — report separately so the user
   knows they pre-date the run.)

Report (Phase 9 cleanup hasn't run yet — keep "Migration complete" for the
final navigation banner):

> *"Migration writes complete; validating integrity:*
> *  ✓ N Aggregate Capabilities rows validated*
> *  ✓ K back-references validated*
> *  ✓ M session Control Files found*
> *  ✗ W broken references (listed below with file paths and line content)"*

**On zero failures**: proceed to Phase 9 cleanup (which prints the final
"Migration complete" navigation).

**On any failure** (W > 0): prompt the user:

- `rollback` — reverse all moves via the in-memory move log, reverse all
  `*Source:*` rewrites via the in-memory reverse-rewrite map, restore the
  hub from `.pre-3.2-backup`, delete the synthetic subfolders and the
  `MIGRATION_INCOMPLETE.md` sentinel. Report complete reversal.
- `keep-and-continue` — leave the migrated state in place, write
  `.relay/MIGRATION_REPORT.md` enumerating every broken reference with file
  path + line content. User fixes manually later.
- `abort` — leave current state as-is without rollback. User is reminded this
  is not recommended and may leave dangling refs. They can re-run validation
  manually by inspecting the same paths.

## Phase 9 — Cleanup and navigation

1. Delete `.relay/MIGRATION_INCOMPLETE.md` (the sentinel from Phase 1f is no
   longer needed; clean completion releases the re-run gate).

2. Ask: *"Delete backup `.relay/relay-exercise.md.pre-3.2-backup`? [y/N]"* —
   default NO. User keeps it until confident.

3. Do **NOT** bump `.relay/version.md` — version bumps belong to `/relay-setup` and to Feature 1/2's normal release process.

4. Print navigation:

   > *"Migration complete. You're now on the 3.2.x exercise layout. Next:*
   > *  - `/relay-exercise` — create a fresh bottom-up session*
   > *  - `/relay-exercise '<goal>'` — try the new goal-driven mode (if*
   > *    Features 6-1/6-2 are in this release; check `version.md`)*
   > *  - `/relay-exercise-run --session default-migrated-<T>` — resume work*
   > *    inside the migrated session."*

## Contracts

- **Synthetic session slug forms**: `default-migrated-<T>` (active),
  `default-migrated-archive-<T>` (archived), where `T = YYYY-MM-DDTHHMM`
  (colon-free; Windows-filesystem safe).
- **Backup filename**: `.relay/relay-exercise.md.pre-3.2-backup` — never
  versioned, never timestamped; user deletes when confident.
- **Sentinel filename**: `.relay/MIGRATION_INCOMPLETE.md` — written in Phase
  1f, appended per-move in Phase 3, deleted in Phase 9.
- **Report filename**: `.relay/MIGRATION_REPORT.md` — written only on Phase
  8 `keep-and-continue`. Enumerates broken references.
- **3.1.0 detection gate**: `## Capabilities` present AND `## Sessions`
  absent in `.relay/relay-exercise.md`. Any other combination refuses.
- **Path shape**: all rewritten paths use forward slashes (Windows-safe).

## Notes

- This skill is fully self-contained. No other Relay skill imports from or
  references it (greppable to confirm: searching the rest of `.claude/skills/`
  for `relay-exercise-migrate` returns zero hits after install).
- The in-memory move log and reverse-rewrite map exist only for the duration
  of the skill invocation. On process crash between Phase 3 and Phase 8, the
  sentinel `MIGRATION_INCOMPLETE.md` captures the planned moves, but the
  reverse-rewrite map for Phase 5 is lost. If Phase 5 had executed before the
  crash, Phase 8 rollback via `rollback` is impossible automatically —
  user's recourse is manual reconciliation using the sentinel + the backup.
- Migration is a blocking operation. Do not run other Relay skills
  concurrently.
- Re-running after successful migration is a no-op: Phase 1a detects
  `## Sessions` → exits cleanly.
- Running on a project that never used 3.1.0 exercise is a no-op: Phase 1a
  detects missing hub → exits cleanly.
- Log lines from Phase 3 and Phase 5 are capped at the first 5 with "... and
  K more" for large projects to keep output scannable.
