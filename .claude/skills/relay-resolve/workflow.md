# Relay: Code — Resolve & Close

**Sequence**: `/relay-analyze` → `/relay-plan` or `/relay-superplan` → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → **`/relay-resolve`**

The work on [PHASE/ITEM from relay-ordering.md, e.g. "Phase 1A" or
individual item "store_communities_n_plus_1"] is complete and verified.
Close it out.

0. Prerequisite check: Read the target item file(s) and verify
   resolution readiness:
   - If the full code pipeline was used: verify the most recent
     ## Verification Report has verdict COMPLETE. A notebook in
     .relay/notebooks/ matching this item is supplementary evidence
     but does NOT substitute for a COMPLETE verification verdict.
   - If the item was determined stale by /relay-analyze: verify the
     ## Analysis section documents the staleness finding.
   - **Disjoint-gate composition STOP**: if the target carries BOTH `*Promoted from:*` AND its most-recent Analysis carries `*Mode:* grouped run` (the v1.1 mid-flight promotion-of-grouped-run scenario from Open Question 5), STOP and tell the user: "Target has both promotion metadata (`*Promoted from:*`) and a grouped-run Scope Decision (`*Mode:* grouped run`) in its most-recent Analysis — this is the Open Question 5 v1.1 case (mid-flight promotion of grouped run). Manually resolve which mode applies before re-running /relay-resolve. If the promotion is the intended final mode, drop the grouped-run Scope Decision from the target's Analysis (or annotate it as superseded). If the grouped run is intended, manually undo the promotion (move the feature back to .relay/issues/, restore the source issue from archive). Note: per /relay-analyze step 9 sub-step 6, promoting a source that carries `*Mode:* grouped run` STRIPS the source's Scope Decision from the copied Analysis — so this STOP should fire only on hand-edited or pre-12-3 partial-promotion remnants."

   - **If the target carries a grouped-run Scope Decision** (most-recent `### Scope Decision` has `*Mode:* grouped run`): additionally verify the per-entry closure readiness. For each row in `#### Grouped Entries`:
       - the entry's `Closure obligation` (full or partial) must be satisfied by Implementation evidence (cross-checked against the Verification Report's Grouped Run Coverage diff check from Step 5);
       - any entry with closure status `partial` (planned partial close) or `not closed` (untouched) MUST have an explicit follow-up. Document the disposition in a `### Per-Entry Closure` section appended to the Verification Report (or to a new `### Per-Entry Closure` block in the target file if Verification Report is absent — e.g., stale-item resolutions). Disposition options per entry:
           - `closed` — entry was fully or partially addressed per its obligation (no follow-up needed).
           - `re-opened` — re-file the entry as a separate run via /relay-new-issue (existing item) or by promoting to a new feature (unfiled candidate); cite the new issue/feature path.
           - `superseded` — route via the /relay-analyze step 9 promote sub-flow on the entry (which produces a promoted feature for the broader work); cite the resulting promoted feature path.
           - `follow-up filed` — file via /relay-new-issue; cite the new issue path.
       - if any entry's per-entry disposition is missing or unaddressed, STOP and tell the user: "Grouped run cannot close — entry [N] has not been [closed | re-opened | superseded | follow-up filed]. Resolve before re-running /relay-resolve."

   - **If the target carries a promoted-feature header** (front-matter contains `*Promoted from:*`): additionally verify promoted-feature closure readiness. Read the applied closure tier per the decision table below.

     **12-4 layering boundary** (now a READ rule consumed by this skill): read `*Closure Tier Applied:*` from the front-matter (written by /relay-verify Step 1's Tier 2 → Tier 1 waiver evaluator on the most recent verify pass); use it as the FINAL applied tier. If absent, fall back to `*Closure Tier Baseline:*` — but absence at resolve time on a Tier 2 baseline indicates the waiver evaluator never ran (e.g., /relay-verify was skipped or the feature file was hand-edited). Log a WARNING and proceed with baseline tier (Tier 2) to be conservative. The /relay-verify pass that resolves this absence will write the annotation.

     | `*Closure Tier Baseline:*` (or `*Closure Tier Applied:*` if present) | Required obligations (decision table) |
     |---------------------------------------------------------------------|----------------------------------------|
     | `tier-1` (lightweight): | Every Strong/Medium finding in the plan's `### Promoted Feature Coverage` table must show closure status `closed` per the Verification Report's tier-1 diff check. Untouched obligations require a follow-up disposition documented in a `### Promoted Feature Closure` section appended to the Verification Report. |
     | `tier-2` (broad): | Tier 1 disposition options PLUS the Tier 2 sub-check obligations from /relay-verify Step 1 (subsystem-wide reference scan, cross-file consistency check, subsystem invariant check) must each have a closed disposition. |

     **Tier-2 disposition options** (parallel to grouped-run dispositions):
     - `closed` — Tier 2 obligation was addressed in the diff or by follow-up Verification Fix.
     - `re-opened` — re-file the obligation as a separate run via /relay-new-issue, citing the original promoted feature.
     - `superseded` — escalate via the /relay-analyze step 9 promote sub-flow on a NEW source issue carrying the unaddressed obligation (rare; happens when Tier 2 surfaces work that warrants its own broader promotion).
     - `follow-up filed` — file via /relay-new-issue.

     - if any tier-1 or tier-2 obligation is missing or unaddressed, STOP and tell the user: "Promoted feature cannot close — obligation [N] has not been [closed | re-opened | superseded | follow-up filed]. Resolve before re-running /relay-resolve."
     - **Idempotency-prep note**: this gate determines whether /relay-resolve step 4's bidirectional closure branch (sub-edit 5b) will fire. The actual back-update with idempotency guard happens in step 4. (The read order `*Closure Tier Applied:*` first — written by /relay-verify per Step 1's waiver evaluator — falling back to baseline, applies here too — the read-order is the same as in the 12-4 layering boundary bullet above.)
   - If prerequisites are missing, WARN the user:
     "This item does not appear fully verified. Run
     **/relay-verify** (or **/relay-notebook**) first, or
     confirm you want to resolve it as-is."
     Wait for the user to confirm before proceeding.

1. Identify all issue/feature files that were resolved in this phase:
   - Read .relay/relay-ordering.md to find which item files are in the
     specified phase/item
   - If only some items in the phase were resolved, resolve only those
     items. The remaining items stay in .relay/issues/ or .relay/features/
     for the next ordering cycle. Specify individual items rather than
     the whole phase (e.g., "store_communities_n_plus_1" instead of
     "Phase 3B").
   - For each item file, read it and confirm it was addressed by the
     implementation:
     - If a plan and verification exist in the item file (from the code
       pipeline), cross-reference with the finalized plan and verification.
     - If no plan/verification sections exist (resolved outside the
       pipeline), scan the codebase directly to confirm the resolution —
       identify the files changed and how the item was addressed.
     - If the item was determined to be stale during /relay-analyze
       (the bug/gap never existed or was already fixed before this item
       was worked): do NOT create an implementation doc. Instead,
       archive the item directly to .relay/archive/issues/ (or
       .relay/archive/features/) with the banner:
       > **ARCHIVED** — Closed as stale. [Reason]. No code changes made.
       Skip steps 2-3 for this item (no implementation doc needed).
       Step 5 still processes this item: it rewrites exercise back-references
       for the active→archive path transition and may trigger exercise
       archival once all downstream items from the source exercise are resolved.

2. For each resolved item (skip stale items — they were archived in step 1), create an implementation doc in .relay/implemented/:
   - Filename: same as the item file (e.g., `delete_entity_not_atomic.md`
     → implemented doc `delete_entity_not_atomic.md`)
   - Content:

     ## Summary

     *Resolved: [YYYY-MM-DD]*

     - What was the problem or goal (1-2 sentences)
     - How it was resolved (approach taken)

     ## Files Modified
     - [list of files changed, with brief description of each change]

     ## Verification
     - Link to verification notebook (if created) using relative path:
       `[notebook](../notebooks/[file].ipynb)` (before archival)
       or `[notebook](../archive/notebooks/[file].ipynb)` (after archival)
       Since implementation docs never move, use the archived path as the
       permanent link: `[notebook](../archive/notebooks/[file].ipynb)`
     - Test commands that confirm the change

     ## Caveats
     - Any follow-up items, edge cases deferred, or related issues/features affected

   - For feature files: update the feature file's `*Status:*` line from
     `DESIGNED` to `IMPLEMENTED` before archiving.

3. If a resolved feature was part of a brainstorm, update the brainstorm
   file BEFORE archiving:
   - To find the parent brainstorm: check the `*Brainstorm:*` metadata line
     in the feature file for the relative link to the brainstorm file.
   - Mark the feature as complete in the Feature Breakdown table.
   - If ALL features in the brainstorm are now resolved (check the table —
     all rows marked complete, and no unarchived sibling feature files remain
     in .relay/features/), set the brainstorm's status to COMPLETE and archive
     the brainstorm:
     - Move it from .relay/features/ to .relay/archive/features/
     - Add banner: `> **ARCHIVED** — All features resolved.`

4. Archive each resolved item and its notebook:
   - Move item from .relay/issues/[file].md (or .relay/features/[file].md) to
     .relay/archive/issues/[file].md (or .relay/archive/features/[file].md)
   - Add banner at the top of the archived file:
     > **ARCHIVED** — Resolved. See [implementation doc](../../implemented/FILENAME.md)
   - Note: if this item later regresses, do NOT unarchive it. Instead,
     run **/relay-new-issue** to file a new issue that references this
     archived file. The /relay-scan regression detection step surfaces
     these cases automatically.
   - If a matching notebook exists in .relay/notebooks/[file].ipynb, move it
     to .relay/archive/notebooks/[file].ipynb
   - **Grouped-run sibling archival** (only when this resolution is closing a grouped run — target's most-recent `### Scope Decision` has `*Mode:* grouped run`):
       - For each entry in `#### Grouped Entries` with `Kind: existing item` and per-entry closure status `closed` (per Step 0's Per-Entry Closure section):
           - move the sibling from `.relay/issues/[sibling].md` (or `.relay/features/[sibling].md`) to the corresponding archive directory `.relay/archive/issues/[sibling].md` (or `.relay/archive/features/[sibling].md`);
           - add a banner at the top of the archived sibling: `> **ARCHIVED — RESOLVED IN GROUPED RUN** with [run leader name](../../implemented/[leader].md). See run leader's Per-Entry Closure for closure status and obligation granularity.`
           - the sibling's `> Grouped into [target] run on YYYY-MM-DD` annotation is **preserved** in the archived file (matches Phase 1D / Phase 4-1 back-ref-preservation convention — preserves history).
       - Entries with `Kind: unfiled candidate` have no sibling file to archive; their lifecycle ends in the run leader's archive entry's `## Per-Entry Closure` section (the leader's archived file already names them).
       - In the run leader's implementation doc (created in step 2), add a `## Per-Entry Closure` section listing every grouped entry with: target name, kind, closure obligation, final closure status (closed | partial | re-opened | superseded | follow-up filed), and a one-line citation of the implementation evidence (file:line or impl-doc reference).

   - **Promoted-feature bidirectional closure** (only when this resolution is closing a promoted feature — target carries `*Promoted from:*` in its front-matter):
       - **Step 4a — Read the supersession header**: read the target feature file's `*Promoted from:*` header to extract the source-issue archive path. The header format is `*Promoted from: [<source>.md](../archive/issues/<source>.md)*`. Resolve the link target to an absolute path: `.relay/archive/issues/<source>.md`.
       - **Step 4b — Validate the archive path exists**: verify `.relay/archive/issues/<source>.md` exists on disk. If absent, log a verification objection at HIGH severity: "Promoted feature's `*Promoted from:*` points at `<path>` which does not exist. Cannot back-update a missing source issue. Resolution: locate the source issue (it may be in `.relay/issues/` if the original promotion did not move it, indicating an interrupted promotion — manual repair required), or skip the back-update and warn the user that the supersession chain is broken." Do NOT silently proceed.
       - **Step 4c — Idempotency guard on the source issue's archive banner**: read `.relay/archive/issues/<source>.md`. Look for the `> **ARCHIVED - SUPERSEDED**` banner block at the top. Within that block, look for the line `> **Closure status:** open` (the literal status set at promotion time). If the banner is present AND `Closure status:` reads `open`, proceed to Step 4d. If the banner is present AND `Closure status:` reads anything OTHER than `open` (e.g., `closed YYYY-MM-DD via [path]`), DO NOT overwrite — log: "Source issue archive entry already has `Closure status:` set to `<existing-value>`. Skipping back-update to preserve manual or prior closure record." This makes the step idempotent: re-running /relay-resolve does not append duplicate closure lines.
       - **Step 4d — Append the closure back-update**: replace the line `> **Closure status:** open - see the superseding feature for current resolution state. This entry will receive a back-update when the feature is resolved.` with `> **Closure status:** closed YYYY-MM-DD via [<feature_name>.md](../features/<feature_name>.md)` followed by a single one-line summary `> <one-line summary of the broader work resolved>`. Use the canonical `closed YYYY-MM-DD via` token so future readers can grep for it. Preserve the rest of the supersession banner unchanged (the `Promoted because:` rationale and the `*Original analysis preserved below.*` line).
       - **Step 4e — Run-leader implementation doc cross-reference**: in the feature's implementation doc (created in step 2), add a `## Promoted Feature Closure` section listing the following fields, READ from the active feature file's front-matter (which /relay-verify Step 1's waiver evaluator populated):
           - `*Promoted from:*` source path (verbatim from front-matter).
           - `*Promotion Class:* lightweight | broad` (verbatim from front-matter).
           - `*Closure Tier Baseline:* tier-1 | tier-2` (verbatim from front-matter).
           - `*Closure Tier Applied:* tier-1 | tier-2` (verbatim from front-matter; populated by /relay-verify Step 1 — equals baseline if no waiver fired and no manual override; equals tier-1 for a Tier 2 waived to Tier 1; equals tier-2 if user pre-set `*Closure Tier Applied: tier-2*` in front-matter before /relay-verify).
           - **Waiver decision**: if `*Closure Tier Applied:*` != `*Closure Tier Baseline:*` AND no manual override was recorded by /relay-verify, include the canonical waiver block from /relay-verify's output:

             ```markdown
             > Closure proof: Tier 2 waived under threshold heuristic. <N> docs-only
             > files in scope; subsystem-level checks skipped. Tier 1 remains in
             > effect. Reviewable via the Affected Files list above.
             ```

           - **Manual override decision**: if /relay-verify recorded `manual override: user pre-set *Closure Tier Applied:* in front-matter` in its output, include the line: `> Manual override: user pre-set *Closure Tier Applied: tier-2* in front-matter before /relay-verify; idempotency-guard short-circuit preserved this value across the verify pass.`
           - Promoted Feature Coverage diff verification result (verbatim from /relay-verify's Verification Report).
           - If applied tier is `tier-2` (NOT waived), include the Tier 2 disposition table from Step 0's Promoted Feature Closure block.
       - **Failure-mode rollback**: if Step 4d succeeds (back-update written) but Step 4e fails (impl-doc write fails), the back-update is harmless — the impl-doc can be re-created on next /relay-resolve run because Step 4d is idempotent (will detect the closed Status and skip). If Step 4d fails (e.g., archive file write-protected), Steps 4a-4c have done no destructive work; surface the error and STOP. The feature itself has not yet been archived at this point in step 4 — it is archived BELOW this branch (the sibling-archival branch and the standard archival happen first). **Ordering matters**: bidirectional closure runs BEFORE the feature is archived from `.relay/features/` because the feature's `*Promoted from:*` header must still be readable from its active path.
       - **Bidirectional record requirement**: the bidirectional record is REQUIRED so /relay-scan and 12-4's lifecycle integrity check can verify (i) every `*Promoted from:*` header points to a real archived issue, AND (ii) every `**ARCHIVED - SUPERSEDED**` banner is back-updated when its superseding feature resolves.

5. Update exercise back-references and conditionally archive exercise files:

   If .relay/relay-exercise.md does not exist, skip this step entirely
   (the exercise pipeline is not in use in this project).

   Otherwise, for each item archived during this /relay-resolve run (from step 1
   stale archival and/or step 4 normal archival — iterate the combined list):

   5a. Compute the path transition:
       - Active path: `issues/<file>.md` or `features/<file>.md`
       - Archive path: `archive/issues/<file>.md` or `archive/features/<file>.md`

   5b. Rewrite references to the active path in these locations:

       i.   .relay/relay-exercise.md — master hub Aggregate Capabilities
            table: in each row's `Latest Findings Filed` column, find any
            comma-separated entry matching the active path and replace
            with the archive path.

       ii.  .relay/exercise/<session>/_control.md — for every active
            session subfolder, in each Session Capabilities row's
            `Findings Filed` column, apply the same rewrite.

       iii. .relay/exercise/*/*.md — in each active exercise file under
            ANY session subfolder, find lines matching
            `**Status:** filed: <active-path>` and rewrite to
            `**Status:** filed: <archive-path>`.

       iv.  .relay/archive/exercise/*/*.md — same as (iii), for any
            already-archived exercise files in any archived session
            subfolder. These exist if a prior /relay-resolve run already
            archived the exercise file (per step 5c below) and we're now
            resolving a later issue that still had stale references.

       For each rewrite made, log it to the output:
         "Rewrote reference in .relay/relay-exercise.md: issues/X.md → archive/issues/X.md"
         "Rewrote reference in .relay/exercise/<session>/_control.md: issues/X.md → archive/issues/X.md"

       Check idempotency: if a reference is already in archive form
       (matches `archive/<type>/...`), skip it. This makes the step
       safe to re-run.

   5c. Check if the archived item came from an exercise, and if so,
       whether the exercise is now fully resolved:

       Read the archived item file (now at `archive/issues/<file>.md`
       or `archive/features/<file>.md`). Look for a `*Source:*` header
       line with the pattern:

           *Source: exercise/<session>/<filename>.md finding <N>*
           OR
           *Source: archive/exercise/<session>/<filename>.md finding <N>*

       where `<filename>` is one of:
       - `<capability>` (default-mode, legacy)
       - `step-<M>-<capability>` (goal-mode; Feature 6-2 step-prefixed)
       - `<capability>-<YYYY-MM-DD>` or
         `step-<M>-<capability>-<YYYY-MM-DD>` (dated re-run of either,
         optional `-2`, `-3` collision suffix)

       Gap-seed sources (`exercise/<session>/_control.md journey
       step <N>`) are a separate pattern, not a `<filename>` shape.
       They are handled in the bullet list below as a dedicated skip
       branch, not via the two-phase parse.

       Parse in two phases:

       1. **Path parse**: split the matched path on `/` to extract
          `<session>` and `<filename-without-md>`.

       2. **Filename parse**: match `<filename-without-md>` against the
          regex
          `^(?:step-(\d+)-)?([a-z0-9-]+?)(?:-\d{4}-\d{2}-\d{2}(?:-\d+)?)?$`.
          Captures:
          - Group 1 (optional): `<step_number>` as integer, or null
            for default-mode
          - Group 2: `<capability>` (the kebab-case capability slug)

       Use the parsed `<capability>` for row lookups in 5e.iv and
       5e.v. Use the full matched `<filename>.md` (from path parse)
       for path rewrites in 5e.i–iii (moves, path substitutions).
       Log messages include `<step_number>` (when present) so output
       reads like `archived exercise \`step-2-outline-chapter\``
       instead of losing the step context.

       - If no `*Source:*` line, the item didn't come from an exercise.
         Skip to the next archived item.
       - If the `*Source:*` path is already in archive form, the
         exercise file is already archived. No further work needed.
         Skip to the next archived item.
       - If the `*Source:*` path is in active form
         (`exercise/<session>/<filename>.md`), read the referenced
         exercise file at `.relay/exercise/<session>/<filename>.md`.
         If the file does not exist (e.g., manually deleted), log a
         warning: "Source exercise file `<path>` not found; cannot
         determine resolution state. Skipping exercise archival for
         this item." Skip to the next archived item.
       - If the `*Source:*` line matches the goal-mode gap-seed
         pattern (`exercise/<session>/_control.md journey step <N>`
         or `archive/exercise/<session>/_control.md journey step <N>`),
         skip exercise archival — gap seeds reference a journey step
         in `_control.md`, not a discrete exercise file. The Journey
         row in `_control.md` tracks the seeded brainstorm via its
         Notes column; brainstorm-seed file archival is handled by
         `/relay-cleanup` (for abandoned seeds) or this workflow's
         step 3 (for successfully-resolved seeds) — step 5c has no
         exercise file to archive. Skip to the next archived item.

   5d. Determine if the exercise is fully resolved:

       In the active exercise file, scan the Findings section for all
       findings with Status starting with `filed:`. For each such
       finding, check the path:

       - If the path starts with `archive/issues/` or `archive/features/`,
         the filed item is already archived. Count it as resolved.
       - If the path starts with `issues/` or `features/` (active form),
         the filed item is still active. The exercise is NOT yet
         fully resolved.

       Findings with Status `kept:`, `skipped`, or `draft` do NOT block
       archival — notes, skipped findings, and anything still in draft
       are handled as follows:
       - `kept:` and `skipped` → no-op, they do not prevent archival
       - `draft` → this indicates the filer was never run to completion
         on this exercise, which is an anomaly. Log a warning:
         "Exercise <capability> has draft findings — /relay-exercise-file
         was not completed. Skipping exercise archival. Run the filer
         first." Skip to the next archived item; do NOT archive this
         exercise.

       If every `filed:` finding points to an archived path (and there
       are no `draft` findings), the exercise is fully resolved.
       Proceed to 5e.

   5e. Archive the exercise file (single-archival sweep):

       i.   Move the exercise file:
            `.relay/exercise/<session>/<filename>.md` →
            `.relay/archive/exercise/<session>/<filename>.md`

            Create `.relay/archive/exercise/<session>/` on demand if
            it doesn't yet exist. (Earlier resolves may have already
            created the archive subfolder for this session.)

            (Timestamp and step-prefix are both carried by
            `<filename>` — no separate handling needed.)

            Log: "Archived exercise:
                  exercise/<session>/<filename>.md →
                  archive/exercise/<session>/<filename>.md"

       ii.  In the newly-archived exercise file, rewrite any
            `**Status:** kept: exercise/<session>/<filename>.md` lines
            to `**Status:** kept: archive/exercise/<session>/<filename>.md`.

       iii. Rewrite `*Source:*` header lines in all issue and feature
            files (both active and already-archived) that reference
            this exercise. Search:
            - .relay/issues/*.md
            - .relay/features/*.md
            - .relay/archive/issues/*.md
            - .relay/archive/features/*.md

            For any file containing
            `*Source: exercise/<session>/<filename>.md finding <N>*`,
            rewrite to
            `*Source: archive/exercise/<session>/<filename>.md finding <N>*`.

            Log each rewrite.

       iv.  Update the session `_control.md` row at
            `.relay/exercise/<session>/_control.md`. Key the row
            lookup on the **stripped `<capability>`** from 5c's
            filename parse (NOT the composite step-prefixed filename).
            Update:
            - `Exercise File` column:
              `exercise/<session>/<filename>.md` →
              `archive/exercise/<session>/<filename>.md`
              (full `<filename>` from 5c's path parse — for goal
              mode this preserves the `step-<N>-` prefix)
            - `Last Updated` column: today's date

            In goal mode, also leave the Journey row untouched — this
            archival is a path rewrite, not a state transition. Journey
            Status stays at its current terminal value.

       v.   Update the master hub Aggregate Capabilities row at
            `.relay/relay-exercise.md`. Key the row lookup on the
            **stripped `<capability>`** (same as 5e.iv). Update:
            - `Latest Exercise File` column:
              `exercise/<session>/<filename>.md` →
              `archive/exercise/<session>/<filename>.md`
            - `Last Updated` column: today's date (YYYY-MM-DD)
            - The `Status` column stays at `filed` — "filed" already
              captures "all findings processed and resolved"; there
              is no separate archived status.

            **Multi-step → same-capability guard**: when two Journey
            steps both exercised the same project capability (e.g.,
            steps 2 and 5 both Project-Match `outline-chapter`), the
            Aggregate Capabilities row's `Latest Exercise File`
            reflects the most-recently-written step. When resolving
            an issue sourced from the OLDER step's exercise file,
            check: if the current `Latest Exercise File` value does
            NOT match the path being rewritten, SKIP this row update
            (the column already points at a newer exercise file;
            rewriting would corrupt history). Log the skip:
            `[relay-resolve] Aggregate Capabilities row for
            <capability> points at a newer exercise; skipping archival
            rewrite for <filename>.md.` The per-session `_control.md`
            Session Capabilities row (5e.iv) follows the same guard.

       vi.  Append a Session Log entry to the session `_control.md`:
            `**YYYY-MM-DD** — /relay-resolve: archived exercise
             \`<capability>\`. All downstream items resolved.`

       vii. Append a Refresh Log entry to .relay/relay-exercise.md:
            `**YYYY-MM-DD** — /relay-resolve: archived exercise
             \`<capability>\` in session \`<session>\`.`

   5f. Session close-out: if the active session subfolder
       `.relay/exercise/<session>/` is now empty (no exercise files
       remain — only `_control.md`), AND every Session Capabilities
       row in `_control.md` has its `Exercise File` column pointing
       at an archive path, close the session:

       i.   Update `_control.md`:
            - `*Status:* active` → `*Status:* archived`
            - `*Last activity:* YYYY-MM-DD by /relay-resolve`

       ii.  Move `_control.md`:
            `.relay/exercise/<session>/_control.md` →
            `.relay/archive/exercise/<session>/_control.md`
            (the `_control.md` file is the last thing to leave the
            active subfolder)

       iii. Remove the now-empty active session subfolder
            `.relay/exercise/<session>/`.

       iv.  Update the master hub Sessions table row for this session:
            - `Status` column: `active` → `archived`
            - `Control File` column:
              `exercise/<session>/_control.md` →
              `archive/exercise/<session>/_control.md`

       v.   Append to the master hub Refresh Log:
            `**YYYY-MM-DD** — /relay-resolve: session \`<session>\`
             archived. All exercises resolved.`

   Summary of step 5: all exercise back-references are kept valid
   whenever an issue/feature is archived, exercise files are archived
   automatically once every filed finding from them has been resolved,
   and session subfolders are closed out when their last exercise
   migrates. No orphan references, no orphan subfolders.

6. Check if ANY remaining items in .relay/issues/ or .relay/features/ were
   partially addressed or affected by this change:
   - If an item was partially addressed, update it to reflect the new state
   - If an item's proposed approach needs adjustment because of this change,
     update it

7. Refresh .relay/relay-config.md:
   Since the project code has changed, check if relay-config.md is still
   accurate. For each section:
   - **Edge Cases**: scan the files modified in this phase. If any new
     optional services, config options, concurrency patterns, or external
     API call sites were added or changed, update the Edge Cases section.
   - **Test Commands**: verify the test paths and commands still work.
     If new test files were added or directories restructured, update.
   - **Notebook Setup**: if imports, fixture patterns, or async behavior
     changed, update the relevant subsection.
   Only update sections where the changes in this phase actually affect
   them — do not re-scan the entire codebase.

8. Update .relay/relay-ordering.md:
   For each resolved item, find it in relay-ordering.md and strike it
   through (wrap in ~~...~~). Add a link to the implementation doc.
   If all items in a phase are now resolved, mark the phase heading
   with "— COMPLETE" and add a **Resolved** date line below the heading.
   Do NOT remove the phase or its items — the history provides context.

Output: Implementation docs in .relay/implemented/, archived items and
brainstorms

## Navigation
When finished, tell the user:
- "This phase is complete. You should commit these changes before continuing. Run **/relay-scan** to update the project status, then **/relay-order** to reprioritize. Then pick the next phase from relay-ordering.md and run **/relay-analyze**. Or run **/relay-discover** to scan for new issues."

## Notes

- This skill uses the same phase/item reference as /relay-analyze, so you can say "Phase 1A" consistently
- If the phase contained multiple item files, they are all resolved and archived in one pass
- Step 6 is important: resolving one item often changes the context for others — their proposed approaches may need updating
- This skill works for both full-pipeline items (with plan/review/verification) and items resolved outside the pipeline — step 1 adapts based on what exists in the item file
