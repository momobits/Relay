# Relay: Scan & Status

**Sequence**: **`/relay-scan`** → `/relay-order` → `/relay-analyze` → ...

Scan the project documentation and codebase to produce an updated .relay/relay-status.md:

1. Read every .md file in .relay/issues/ and .relay/features/
   - Exclude brainstorm files (*_brainstorm.md) entirely — these are
     exploration files managed by the feature workflow, not actionable
     work items. Only individual feature files (created by /relay-design
     with status DESIGNED) are tracked here.
2. For each file, extract the distinct issues or features described
3. Identify duplicates — same issue/feature described in multiple files
   - If duplicated: consolidate into a single file. Turn the duplicate into
     a redirect: replace its content with a link to the consolidated file
     (e.g., `> **Merged into**: [consolidated_file.md](consolidated_file.md)`)
     so /relay-resolve can archive both. Note the merge in relay-status.md.
4. For each distinct item, scan the codebase to determine current status:
   - RESOLVED: the code fully addresses the issue or implements the feature
   - PARTIAL: some aspects addressed, others remain
   - OUTSTANDING: not yet addressed in code
   - Include a brief explanation of what evidence you found

   **Lifecycle annotations** (Phase 12-4): in addition to status, classify each item by its scope-formation lifecycle state. These annotations are read in Step 6's status writing:
   - **Grouped run leader**: target's most-recent `### Scope Decision` has `*Mode:* grouped run`. Read the `#### Grouped Entries` table to enumerate sibling entries and per-entry closure obligations.
   - **Grouped existing-item sibling**: target file contains a `> Grouped into [<leader>] run on YYYY-MM-DD` annotation in its body (above any horizontal rule, below the front-matter and Status line — the placement is fixed by /relay-analyze step 9 sub-step 3 grouped-run write rule). **Leader-active check**: resolve `[<leader>].md` against `.relay/issues/` and `.relay/features/`. If the leader is ACTIVE, treat the sibling as suppressed-from-standalone (it is rendered only under its run leader in Step 6). If the leader is ARCHIVED (resolves to `.relay/archive/issues/` or `.relay/archive/features/`) or MISSING (no resolution), DE-SUPPRESS — render the sibling as a standalone active row with the annotation `(originally grouped under [<leader>] (archived); now standalone per non-closed disposition)`. This handles the case where the leader resolved with non-closed-disposition siblings remaining active per /relay-resolve step 4 grouped-sibling archival branch (only `closed`-disposition siblings move to archive; `re-opened`/`superseded`/`follow-up filed` siblings stay active).
   - **Promoted feature**: feature file's front-matter contains `*Promoted from:*`. Read also `*Promotion Class:* lightweight | broad`, `*Closure Tier Baseline:* tier-1 | tier-2`, and (if /relay-verify has run) `*Closure Tier Applied:* tier-1 | tier-2`. The classification is rendered in Step 6's status line.
   - **Superseded issue**: archived issue file at `.relay/archive/issues/<source>.md` whose top banner matches `> **ARCHIVED - SUPERSEDED**` (ASCII hyphen with surrounding spaces — the canonical form locked by Phase 12-3). Read the supersession header's `[<feature_name>.md](../features/<feature_name>.md)` link and the `> **Closure status:**` line.
   - **Unfiled candidates** are not items in their own right — they exist only as rows within a grouped run leader's `#### Grouped Entries` table or within a promoted feature's source-issue Related Work findings. They have no standalone files and never appear as standalone status rows.
5. Cross-reference with the full docs landscape:
   - Check .relay/implemented/ for matching implementation docs
   - Check .relay/archive/issues/ and .relay/archive/features/ for items that
     were previously resolved — confirm they haven't regressed
   - If a previously archived item has regressed, flag it prominently
6. Write .relay/relay-status.md with appropriate columns for each section.
   Update the `*Last generated:*` date header to today's date (YYYY-MM-DD).

   **Lifecycle Integrity Warnings block (Phase 12-4)**: place at the top of `relay-status.md` immediately after the metadata header and BEFORE `## Active Issues` (visibility matters because broken supersession links are silent corruption). Compute warnings from Step 4's lifecycle annotations:

   - **Broken supersession links**: for every `*Promoted from: [<source>.md](../archive/issues/<source>.md)*` header detected in `.relay/features/`, verify `.relay/archive/issues/<source>.md` exists. Missing target → warning: *"Promoted feature `<feature>.md` references missing source `archive/issues/<source>.md`. Manual repair required: locate the source issue or re-run /relay-analyze promote."*
   - **Source not yet archived (interrupted promotion)**: for every `*Promoted from: [<source>.md](../archive/issues/<source>.md)*` header detected in `.relay/features/`, also check whether `.relay/issues/<source>.md` exists. If yes (source is still active despite the promoted feature claiming it's archived) → warning: *"Promoted feature `<feature>.md` references `archive/issues/<source>.md` but source is still at `issues/<source>.md` — interrupted promotion remnant. Manual repair: complete the archival (move the source to archive with the supersession banner), or rollback the promotion (delete the feature file). See /relay-analyze step 9 sub-flow Step B for the archival procedure."* This catches hand-edited and pre-12-3 partial-promotion remnants that the transactional 3-step write at relay-analyze:432-447 prevents in normal operation.
   - **Broken back-supersession links**: for every `> **ARCHIVED - SUPERSEDED**` banner in `.relay/archive/issues/`, verify the cited `[<feature>.md](../features/<feature>.md)` link resolves to a file in `.relay/features/` OR `.relay/archive/features/`. Missing target → warning: *"Superseded issue `archive/issues/<source>.md` references missing feature `<feature>.md`. Manual repair required."*
   - **Missing grouped siblings**: for every grouped-run leader detected in Step 4, verify each `#### Grouped Entries` row with `Kind: existing item` resolves to a file in `.relay/issues/`, `.relay/features/`, `.relay/archive/issues/`, or `.relay/archive/features/`. Missing target → warning: *"Grouped run leader `<leader>.md` references missing sibling `<entry>.md`. Manual repair required: confirm sibling identifier or remove the entry from `#### Grouped Entries`."*
   - **Lean: warn and continue**: lifecycle integrity warnings do NOT block status generation; the rest of `relay-status.md` is written normally with the warnings block at the top.

   If no warnings, omit the block entirely (do not emit an empty `## Lifecycle Integrity Warnings` heading).

   **Active Issues / Active Features rendering (Phase 12-4 extensions)**:
   - **Grouped run leader**: render as a multi-line block. The leader's row contains the standard target name, file link, and status, plus the suffix `(grouped run leader, <N> entries)`. Underneath the leader row, list each grouped entry as a sub-bullet:
     ```markdown
     - **<leader-name>.md** — OUTSTANDING, *(grouped run leader, 3 entries)*
       - <sibling-name-1>.md — existing item, closure: full
       - unfiled: module.py::symbol — unfiled candidate, closure: partial - only the X branch
       - <sibling-name-2>.md — existing item, closure: partial - only the Y branch
     ```
   - **Grouped existing-item siblings — conditional suppression**: if the sibling's leader (per Step 4 leader-active check) is ACTIVE, exclude the sibling from standalone Active Issues / Active Features rows — render only under the run leader. If the leader is ARCHIVED or MISSING, DE-SUPPRESS — render the sibling as a standalone active row with the annotation `(originally grouped under [<leader>] (archived); now standalone per non-closed disposition)`. The de-suppressed row counts toward standalone OUTSTANDING totals.
   - **Promoted feature**: append `(promoted from <source-issue-name>, class: lightweight|broad)` to the feature's status line. If `*Closure Tier Applied:*` differs from `*Closure Tier Baseline:*`, also append `, applied tier: <applied>` so waivers and overrides are visible.
   - **Outstanding totals**: standalone counts EXCLUDE grouped existing-item siblings whose leader is active (they're under their run leader). Counts INCLUDE grouped run leaders (each leader counts as 1 active item regardless of N entries). Counts INCLUDE promoted features as standalone active features. Counts INCLUDE de-suppressed grouped siblings (whose leader is archived).

   Exercise pipeline state (conditional):

   Check if .relay/relay-exercise.md exists. If not, skip this sub-section
   entirely (the exercise pipeline is not in use).

   Otherwise, read the master hub's Aggregate Coverage table and Sessions
   table, and add a new section to relay-status.md after the
   `## Active Features` section and before `## Implemented`:

   ## Exercise Pipeline — .relay/relay-exercise.md

   - Mapped: <count>
   - Exercised: <count> (awaiting filing via /relay-exercise-file)
   - Filed: <count> (awaiting downstream resolution)
   - Stale: <count>
   - Sessions: <X> active, <Y> complete, <Z> archived

   See [relay-exercise.md](relay-exercise.md) for the full capability map
   and Sessions index.

   **Sessions Summary recompute** (idempotent — rewrite master hub only,
   never `_control.md`):

   Preflight: if the master hub has `## Capabilities` but no
   `## Sessions` heading, the project is in an unsupported legacy
   shape. Skip this entire sub-step and emit a single warning:
   `[relay-scan] Warning: master hub is in an unsupported legacy shape; resolve the data layer before re-running scan.`
   The dangling-ref block below applies the same guard (pre-existing
   scan blind spot; acceptable to share the warning).

   For each row in the master hub's Sessions table:

   1. Resolve the `Control File` column path:
      - Active: `.relay/exercise/<session>/_control.md`
      - Archive: `.relay/archive/exercise/<session>/_control.md`

   2. Read the `_control.md` file. If missing or unparseable, skip
      silently (the dangling-ref block below emits the canonical
      warning; no double-report).

   3. Read the `*Mode:*` header. Branch:
      - `default` → recompute Summary from `## Session Coverage`:
        non-zero counts formatted as `<count> <status>` pairs joined
        by `, `. Example: `4 mapped, 2 exercised, 1 filed`
        (stale=0 omitted). **All-zero fallback**: if every count is
        0 (empty session), write Summary as the literal string
        `empty` rather than an empty/comma-only string.
      - `goal` → recompute Summary from `## Journey`:
        `<N>-step journey, <breakdown>` where:
        - N = total Journey table rows (INCLUDING all terminal rows).
        - `<breakdown>` = non-zero Status counts joined by `, ` in the
          fixed order `<E> exercised`, `<A> adapted`, `<F> failed`,
          `<S> skipped`, `<G> gaps` (where each count counts rows
          whose current Status column equals that value). Omit
          zero-count entries.
        - If ALL rows are still `gap` (fresh post-mapping session, no
          runner activity yet), breakdown = `<G> gaps`.
        - If ALL rows are terminal (walk complete), breakdown omits
          `gaps`.
        Examples:
        - Fresh goal session: `6-step journey, 6 gaps`
        - Mid-walk: `6-step journey, 3 exercised, 1 adapted, 2 gaps`
        - Complete walk: `6-step journey, 3 exercised, 1 adapted,
          1 failed, 1 skipped`
        N=0 is impossible (Phase 5 of `/relay-exercise` prohibits
        empty journeys), so no fallback needed for goal mode.
      - Missing `*Mode:*` header → fall back to default-mode formula
        and emit a `[relay-scan] Warning: session <session> has no
        *Mode:* header; assuming default mode for Summary` message.

   4. Rewrite the Sessions table row's Summary column to the computed
      value. Other columns (Session, Mode, Created, Status, Control
      File) are untouched.

   Race condition: if `/relay-exercise-run` or `/relay-exercise-file`
   writes `_control.md` mid-scan, Summary lags by one mutation and
   self-corrects on the next `/relay-scan`. Same principle applies
   to concurrent master-hub writes by the runner/filer — scan may
   race but the monotonic-growth invariant means rewritten Summary
   values cannot corrupt other hub rows.

   Then validate exercise file references in the master hub:

   **Aggregate Capabilities rows:** for each row with Status `exercised`
   or `filed`, read the `Latest Exercise File` column and verify the path
   resolves to an existing file:
   - Active path (`exercise/<session>/<capability>.md`): check
     `.relay/exercise/<session>/<capability>.md`
   - Archive path (`archive/exercise/<session>/<capability>.md`): check
     `.relay/archive/exercise/<session>/<capability>.md`

   For each broken reference, add a warning to relay-status.md:
   *"Exercise file missing for `<capability>` in session `<session>`
   — the session may have been manually deleted. Re-run
   `/relay-exercise` to create a fresh session."*

   **Sessions rows:** for each row in the Sessions table, verify the
   `Control File` column path resolves:
   - Active path (`exercise/<session>/_control.md`): check
     `.relay/exercise/<session>/_control.md`
   - Archive path (`archive/exercise/<session>/_control.md`): check
     `.relay/archive/exercise/<session>/_control.md`

   For each broken control file, add a warning to relay-status.md:
   *"Session control file missing for session `<session>` — this
   session is orphaned. Manually inspect `.relay/exercise/<session>/`
   and either restore `_control.md` or remove the subfolder."*

   If any broken references are found, append a count to the exercise
   pipeline summary:
   `- Broken references: <count> (see warnings above)`

7. Flag any items in issues/ or features/ that are fully RESOLVED but haven't
   been moved to implemented/ yet — these need resolution docs created
   (use the process in /relay-resolve)

8. Detect in-progress work:
   For every issue file (.relay/issues/*.md) and feature file
   (.relay/features/*.md), check which pipeline sections have been appended
   to determine the current workflow stage:
   - Has ## Analysis but no ## Implementation Plan → stage: /relay-plan or /relay-superplan
   - Has ## Implementation Plan but no ## Adversarial Review → stage: /relay-review
   - Has ## Adversarial Review (APPROVED/APPROVED WITH CHANGES) but no
     ## Implementation Guidelines → stage: finalize review (re-run /relay-review to append guidelines)
   - Has ## Adversarial Review (APPROVED/APPROVED WITH CHANGES) and
     ## Implementation Guidelines but no ## Verification Report → stage: implement
   - Has ## Verification Report (verdict COMPLETE) but no notebook in
     .relay/notebooks/ → stage: /relay-notebook
   - Has ## Verification Report (verdict INCOMPLETE or HAS ISSUES) → stage: re-verify
   - Has ## Adversarial Review with verdict REJECTED → stage: /relay-plan or /relay-superplan (revision)
   - Has ## Adversarial Review with verdict DEFERRED → stage: deferred (moved to target phase in relay-ordering.md — skip)
   - If multiple ## Adversarial Review sections exist, use the verdict
     from the LAST one to determine stage
   - **Promoted-feature waiver state** (Phase 12-4): if the item is a promoted feature (front-matter has `*Promoted from:*`) AND its `*Closure Tier Applied:*` is absent at /relay-verify completion, annotate the Stage column suffix with `(awaiting waiver evaluation — re-run /relay-verify to populate `*Closure Tier Applied:*`)`. This catches the rare hand-edited case Step 1 of /relay-verify treats as corruption.
   - **Grouped sibling stage suppression** (Phase 12-4): if the item is detected as a grouped existing-item sibling in Step 4 AND its leader is ACTIVE, do NOT add a separate row to the In-Progress Work table. The run leader's row covers the sibling's stage. (If the leader is ARCHIVED or MISSING per the leader-active check, the sibling is de-suppressed and DOES appear as a separate row with the de-suppression annotation.)
   Write these under a "## In-Progress Work" section in relay-status.md:

   | Item | File | Stage Reached | Next Step |
   |------|------|--------------|-----------|
   | ...  | ...  | ...          | Run /...  |

   This section helps orient anyone returning to the project mid-pipeline.

9. Detect feature pipeline in-progress work:
   For every brainstorm file (.relay/features/*_brainstorm.md), check
   the *Status:* line to determine the current feature stage:
   - Status: BRAINSTORMING → stage: /relay-brainstorm (incomplete)
   - Status: READY FOR DESIGN → stage: /relay-design (pending)
   - Status: DESIGN COMPLETE → stage: /relay-order (features designed, not yet in code pipeline)
   For every non-brainstorm feature file (.relay/features/*.md, excluding
   *_brainstorm.md), check if it has a ## Analysis section:
   - Status: DESIGNED with no ## Analysis → stage: /relay-analyze
   Write these under the same "## In-Progress Work" section, in a
   separate table:

   ### Feature Pipeline

   | Item | File | Stage | Next Step |
   |------|------|-------|-----------|
   | ...  | ...  | ...   | Run /...  |

   For brainstorm files created by the exercise filer (check for a
   `*Source:*` header matching
   `*Source: exercise/<session>/<capability>.md finding <N>*` or
   `*Source: archive/exercise/<session>/<capability>.md finding <N>*`,
   or the goal-mode variant
   `*Source: exercise/<session>/_control.md journey step <N>*`),
   annotate the Next Step column with
   "(seeded from exercise `<capability>` in session `<session>`)" or
   "(seeded from goal session `<session>`, journey step <N>)".

   Also, for each active exercise file in
   `.relay/exercise/<session>/*.md` (across all active session
   subfolders), check if it has any findings with `Status: draft`.
   If yes, add rows to the In-Progress Work section under a new
   sub-table:

   ### Exercise Pipeline

   | Capability | Session   | Exercise File                       | Drafts Remaining | Next Step                                              |
   |------------|-----------|-------------------------------------|------------------|--------------------------------------------------------|
   | <name>     | <session> | exercise/<session>/<name>.md        | <count>          | Run /relay-exercise-file --session <session> <name>    |

10. Staleness detection:
    For every in-progress item (from steps 8 and 9), compare the most
    recent date in the item file (*Analyzed:*, *Generated:*, *Reviewed:*,
    or *Verified:* — whichever is latest) to the current date. If the
    item has been in-progress for more than 7 days:
    - Flag it as STALE in the Next Step column:
      "STALE (last activity [date]) — re-run /relay-analyze to
      validate before continuing"
    Items without any dated pipeline section are not flagged (they
    haven't entered the pipeline yet).

Output: Updated .relay/relay-status.md

## Navigation
When finished, tell the user the next step based on the outcome:
- If regressions were flagged in this scan:
  "Regressions detected — run **/relay-new-issue** to file new issues for them. Then run **/relay-order** to prioritize the work."
- If items are PARTIAL:
  "Some items are partially addressed. Update their issue/feature files to document what was already done and narrow the scope to what remains. Then run **/relay-order** to prioritize."
- Otherwise:
  "Next: run **/relay-order** to prioritize the work."

## Notes

- relay-status.md is a generated artifact — it should be regenerated, not manually edited
- Items that are RESOLVED should eventually be closed using /relay-resolve
- The scan should check actual code, not just documentation claims
- Brainstorm files (`*_brainstorm.md`) are excluded — they are managed by the feature workflow (/relay-brainstorm → /relay-design → /relay-cleanup) and are not actionable work items
- If a previously archived item has regressed, flag it prominently — the Navigation section will direct the user to file new issues for regressions via /relay-new-issue
- Step 8 reads issue and feature files (.relay/issues/*.md and .relay/features/*.md) to detect pipeline stage — it does not scan the codebase
