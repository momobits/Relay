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

5. Update exercise back-references and conditionally archive exercise files:

   If .relay/relay-exercise.md does not exist, skip this step entirely
   (the exercise pipeline is not in use in this project).

   Otherwise, for each item archived during this /relay-resolve run (from step 1
   stale archival and/or step 4 normal archival — iterate the combined list):

   5a. Compute the path transition:
       - Active path: `issues/<file>.md` or `features/<file>.md`
       - Archive path: `archive/issues/<file>.md` or `archive/features/<file>.md`

   5b. Rewrite references to the active path in these locations:

       i.   .relay/relay-exercise.md — in each capability table's
            `Findings Filed` column, find any comma-separated entry
            matching the active path and replace with the archive path.

       ii.  .relay/exercise/*.md — in each active exercise file, find
            lines matching `**Status:** filed: <active-path>` and
            rewrite to `**Status:** filed: <archive-path>`.

       iii. .relay/archive/exercise/*.md — same as (ii), for any
            already-archived exercise files. These exist if a prior
            /relay-resolve run already archived the exercise file
            (per step 5c below) and we're now resolving a later issue
            that still had stale references.

       For each rewrite made, log it to the output:
         "Rewrote reference in .relay/relay-exercise.md: issues/X.md → archive/issues/X.md"

       Check idempotency: if a reference is already in archive form
       (matches `archive/<type>/...`), skip it. This makes the step
       safe to re-run.

   5c. Check if the archived item came from an exercise, and if so,
       whether the exercise is now fully resolved:

       Read the archived item file (now at `archive/issues/<file>.md`
       or `archive/features/<file>.md`). Look for a `*Source:*` header
       line with the pattern:

           *Source: exercise/<capability>.md finding <N>*
           OR
           *Source: archive/exercise/<capability>.md finding <N>*

       - If no `*Source:*` line, the item didn't come from an exercise.
         Skip to the next archived item.
       - If the `*Source:*` path is already in archive form, the
         exercise file is already archived. No further work needed.
         Skip to the next archived item.
       - If the `*Source:*` path is in active form (`exercise/<cap>.md`),
         read the referenced exercise file at
         `.relay/exercise/<capability>.md`. If the file does not exist
         (e.g., manually deleted), log a warning: "Source exercise file
         `<path>` not found; cannot determine resolution state. Skipping
         exercise archival for this item." Skip to the next archived item.

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
            `.relay/exercise/<capability>.md` →
            `.relay/archive/exercise/<capability>.md`

            If the exercise file has a timestamped re-run filename
            (e.g., `outline-chapter-2026-04-12.md`), preserve the
            timestamp in the archive filename.

            Log: "Archived exercise: exercise/<capability>.md →
                  archive/exercise/<capability>.md"

       ii.  In the newly-archived exercise file, rewrite any
            `**Status:** kept: exercise/<capability>.md` lines to
            `**Status:** kept: archive/exercise/<capability>.md`.

       iii. Rewrite `*Source:*` header lines in all issue and feature
            files (both active and already-archived) that reference
            this exercise. Search:
            - .relay/issues/*.md
            - .relay/features/*.md
            - .relay/archive/issues/*.md
            - .relay/archive/features/*.md

            For any file containing
            `*Source: exercise/<capability>.md finding <N>*`,
            rewrite to
            `*Source: archive/exercise/<capability>.md finding <N>*`.

            Log each rewrite.

       iv.  Update the .relay/relay-exercise.md hub row for this
            capability:
            - `Exercise File` column: `exercise/<capability>.md` →
              `archive/exercise/<capability>.md`
            - `Last Updated` column: today's date (YYYY-MM-DD)
            - The `Status` column stays at `filed` — "filed" already
              captures "all findings processed and resolved"; there
              is no separate archived status.

       v.   Append a Refresh Log entry to .relay/relay-exercise.md:
            `**YYYY-MM-DD** — /relay-resolve: archived exercise
             \`<capability>\`. All downstream items resolved.`

   Summary of step 5: all exercise back-references are kept valid
   whenever an issue/feature is archived, and exercise files are
   archived automatically once every filed finding from them has
   been resolved. No orphan references.

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
