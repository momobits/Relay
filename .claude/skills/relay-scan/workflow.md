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
5. Cross-reference with the full docs landscape:
   - Check .relay/implemented/ for matching implementation docs
   - Check .relay/archive/issues/ and .relay/archive/features/ for items that
     were previously resolved — confirm they haven't regressed
   - If a previously archived item has regressed, flag it prominently
6. Write .relay/relay-status.md with appropriate columns for each section.
   Update the `*Last generated:*` date header to today's date (YYYY-MM-DD).

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
