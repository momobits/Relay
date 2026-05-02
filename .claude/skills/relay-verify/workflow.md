# Relay: Code — Verify Implementation

**Sequence**: `/relay-analyze` → `/relay-plan` or `/relay-superplan` → `/relay-review` → *implement* → **`/relay-verify`** → `/relay-notebook` → `/relay-resolve`

The implementation is complete. Verify it against the finalized plan.

0. Read the target item file(s) and verify an ## Adversarial Review section
   exists with verdict APPROVED or APPROVED WITH CHANGES (from /relay-review).
   If no approved review exists, STOP and tell the user:
   "No approved review found. Run **/relay-review** first."

1. Diff check — for each step in the plan:
   - Read the modified file and confirm the change matches the plan
   - If the implementation deviated from the plan, is the deviation justified?
     Check the ## Implementation Deviations section (if present) —
     deviations documented there with a reason are justified. Also check
     Verification Fixes from a previous verification pass.
   - If the implementation deviated but NO ## Implementation Deviations
     section exists, flag the deviation as undocumented in the
     Verification Report's Issues Found section.
   - Check that no unplanned changes were introduced (scope creep, drive-by
     refactors, unnecessary additions)
   - **Promoted Feature classification** (only when target carries `*Promoted from:*` in its front-matter): determine the applied closure tier via the Tier 2 → Tier 1 waiver evaluator below, then apply tier-specific checks per the decision table.

     **Tier 2 → Tier 1 waiver evaluator** (Phase 12-4): determine `*Closure Tier Applied:*` BEFORE the read-order rule below fires. The evaluator is idempotent on re-verification and runs once per /relay-verify pass on a promoted feature:
     1. **Re-verification idempotency**: read `*Closure Tier Applied:*` from the active feature file's front-matter. If already present (set by a prior /relay-verify pass or by manual override), use its value as the applied tier and SKIP to the read-order rule below. This preserves manual overrides and prior waiver decisions across re-verification cycles.
     2. **Lightweight short-circuit**: read `*Closure Tier Baseline:*`. If `tier-1`, set applied tier = `tier-1` (waiver does not apply to lightweight promotions). Skip to step 5 (write).
     3. **Broad evaluator**: if `*Closure Tier Baseline:* tier-2`, evaluate the four waiver criteria. ALL four must hold for the waiver to fire:
        a. **All Affected Files are documentation.** Read the active feature file's `## Affected Files` section. Every entry's path must match `*.md`, `README*`, `CHANGELOG*`, `LICENSE*`, or `CONTRIBUTING*` (the same documentation-only whitelist used by /relay-analyze step 4's bounds rule for the Subsystem dimension — alignment per Phase 12-1 caveat #6 prevents heuristic drift).
        b. **Total Affected Files count <= 3.**
        c. **Promotion's related-work findings were prose-only.** Read the source issue's `### Related Work` `#### Findings` (preserved in the archived source per 12-3's Scope-Decision strip rule); every Strong/Medium finding's `Why related` text must cite prose surfaces (docstrings, README, error messages, comments) without code symbol citations (no `function::name`, no `module.py:line`).
        d. **No explicit subsystem invariant named in Analysis.** Grep the active feature's most-recent `## Analysis` for the literal phrase `subsystem invariant:` (case-insensitive). Zero matches required.
        If ALL 4 criteria hold, applied tier = `tier-1` (waiver fires). Else applied tier = `tier-2`.
     4. **Manual override path**: to force `tier-2` regardless of the waiver evaluation, the user manually edits the active feature file's front-matter to add `*Closure Tier Applied: tier-2*` BEFORE invoking /relay-verify. Step 1 (idempotency guard) reads the user's pre-set value and short-circuits without re-evaluation. This is the canonical override mechanism in Relay — manual file edits invalidate automated reasoning, consistent with the existing re-plan / re-review / re-analyze patterns. The pre-set value is preserved across re-verification (idempotency at step 1). Document the override decision in the verify-output waiver block (step 6) so the override is reviewable.
     5. **Write the annotation**: INSERT `*Closure Tier Applied: <applied tier>*` in the active feature file's front-matter, immediately after the `*Closure Tier Baseline:*` line and before `*Status:*`. The idempotency guard at step 1 ensures step 5 only fires when APPLIED is absent — so this branch is INSERT-only; no REPLACE semantics needed. **Re-classification protocol**: if /relay-analyze re-classifies the baseline (lightweight ↔ broad) on a feature with an existing `*Closure Tier Applied:*`, the user MUST manually clear `*Closure Tier Applied:*` from the front-matter before re-running /relay-verify. The re-analyze procedure should warn the user when an applied annotation is detected on a re-classified baseline. (Follows Relay's existing "re-analyze invalidates downstream artifacts" pattern: re-plan replaces plan; re-review replaces review; re-analyze with new baseline invalidates the prior waiver decision.)
     6. **Log the decision in verify output**:

        ```markdown
        > Closure tier: <applied> (baseline: <baseline>; waiver fired: <yes|no>)
        > <if fired: "all 4 criteria hold — N docs-only files, prose-only findings, no subsystem invariant" — OR if not fired: "waiver did not fire: <criterion that failed>" — OR if pre-set override: "manual override: user pre-set *Closure Tier Applied:* in front-matter (idempotency-guard short-circuit)">
        ```

     7. **When the waiver fires (Tier 2 → Tier 1)**, append the canonical waiver block to the verify output AND to the active feature file's `## Verification Report` (added at step 5 below):

        ```markdown
        > Closure proof: Tier 2 waived under threshold heuristic. <N> docs-only
        > files in scope; subsystem-level checks skipped. Tier 1 remains in
        > effect. Reviewable via the Affected Files list above.
        ```

     **12-4 layering boundary** (now a READ rule consumed by this same skill): read `*Closure Tier Applied:*` from the front-matter (set by the waiver evaluator above on the current pass, or carried forward from a prior pass); use it as the FINAL applied tier. If absent AFTER the evaluator above ran, the feature file is corrupt — log a verification objection at HIGH severity: "Promoted feature has `*Closure Tier Baseline:*` but no `*Closure Tier Applied:*` after waiver evaluation. Re-run /relay-verify or manually set `*Closure Tier Applied:*` in the feature file's front-matter."

     | `*Closure Tier Baseline:*` (or `*Closure Tier Applied:*` if differs after waiver) | Checks to apply (decision table) |
     |--------------------------------------------------------------------------------|------------------------------------|
     | `tier-1` (lightweight promotions OR Tier 2 waived to Tier 1) | Verify the diff against the plan's `### Promoted Feature Coverage` table. Every Strong/Medium finding row in the table must have implementation evidence in the diff. Untouched coverage rows raise a **verification objection** that must be resolved before close. |
     | `tier-2` (broad promotions, NOT waived) | Apply tier-1 PLUS three additional checks: (a) **subsystem-wide reference scan** — for every named invariant and abstraction seam in the plan's `### Design Deepening` section, scan the entire subsystem for callers/consumers that may also need to honor the invariant; (b) **cross-file consistency check** — verify the implementation is consistent across every file named in the broader work's blast radius (not just the files in the plan's per-step list); (c) **subsystem invariant check** — for every named invariant, verify the diff does not violate it elsewhere in the subsystem. Each tier-2 sub-check that surfaces an uncovered caller raises a **verification objection**. |

     **Resolution options for promoted-feature verification objections** mirror Grouped Run resolution: (i) file the missing coverage as a Verification Fix (within the current verify pass, per the existing Verification Fixes section flow at step 5), OR (ii) re-classify the promotion via /relay-analyze (lightweight ↔ broad), OR (iii) escalate the unaddressed obligation as a follow-up issue via /relay-new-issue.

     **Read order**: `*Closure Tier Applied:*` first (set by the Tier 2 → Tier 1 waiver evaluator above on the current pass); fall back to `*Closure Tier Baseline:*` only if absent (legacy / pre-12-4 promoted features whose evaluator output was lost or hand-edited away). This is the ONLY read order in this skill.

   - **Grouped Run Coverage check** (only when target's most-recent `### Scope Decision` is `*Mode:* grouped run`): for every entry in the plan's `### Grouped Run Coverage` table, verify the diff touches the promised Files / Symbols at the obligation's granularity:
       - `Closure obligation: full` — every promised file or symbol must show implementation evidence in the diff.
       - `Closure obligation: partial - only X` — only the named subset must show implementation evidence in the diff. Untouched parts of the same file outside X are NOT a verification objection.
       - Untouched grouped entries raise a **verification objection** that must be resolved before close. Resolution options:
           - file the missing implementation as a Verification Fix (within the current verify pass, per the existing Verification Fixes section flow at step 5), OR
           - escalate to scope reduction: re-open this verification with a re-stated Scope Decision (drop the entry from the group via /relay-review's scope-reduction sub-flow, propagate the drop to the sibling file's annotation, and re-run /relay-verify).

2. Completeness check:
   - Were ALL steps in the plan implemented? List any that were skipped.
   - Were ALL test changes made? Run the affected tests and report results.
   - Were ALL files in the blast radius addressed?
   - Are there TODO comments or placeholder code left behind?

3. Correctness check — re-read each modified function in full:
   - Does the logic flow correctly end-to-end?
   - Are error paths handled?
   - Are edge cases from the review (/relay-review) covered?
   - Is the code consistent with surrounding patterns and style?
   - Are there any off-by-one errors, incorrect variable names, or
     copy-paste mistakes?

4. Regression check:
   Read the "## Test Commands" section of .relay/relay-config.md and run
   the commands listed there for the affected modules. Select the
   appropriate commands based on what the change touches (unit, integration,
   import check, etc.).

5. Persist the verification by APPENDING it to each relevant issue/feature
   file in .relay/issues/ or .relay/features/, after the Implementation
   Guidelines section (or after the Adversarial Review section if no
   Implementation Guidelines exist). Add:

   ---

   ## Verification Report

   *Verified: [YYYY-MM-DD]*

   ### Implementation Status
   | Step | Planned | Implemented | Correct |
   |------|---------|-------------|---------|
   | 1    | ...     | YES/NO      | YES/NO  |
   | 2    | ...     | YES/NO      | YES/NO  |

   ### Test Results
   - [test output summary]

   ### Issues Found
   - [any discrepancies, bugs, or gaps discovered during verification]

   ### Verification Fixes
   [If INCOMPLETE or HAS ISSUES: for each issue found, document:]
   - **Problem**: what was wrong
   - **Fix**: what was changed to resolve it
   - **Files modified**: additional files changed beyond the original plan
   - **Risk**: any new regression risk from the fix
   - **Rollback**: how to revert this specific verification fix

   ### Verdict
   - COMPLETE: all changes verified, tests pass, no issues
   - INCOMPLETE: [list what's missing]
   - HAS ISSUES: [list problems that need fixing]

   If INCOMPLETE or HAS ISSUES, fix the problems, update the Verification
   Fixes section above with what was done, then re-run this verification.
   On re-verification, APPEND a new Verification Report section (do not
   replace the previous one — the history of verification passes is
   valuable). The issue/feature file should always reflect the final state.

## Navigation
When finished, tell the user the next step based on the verdict:
- If COMPLETE:
  "Next: run **/relay-notebook** to create and run the verification notebook." (The user may choose to skip to **/relay-resolve** — do not skip on their behalf.)
- If INCOMPLETE or HAS ISSUES:
  "Issues were found and fixed. Say **'re-verify'** to re-run verification, or run **/relay-verify** again."

## Notes

- This is not a rubber stamp — it should actively look for mistakes in the implementation
- "Read the modified function in full" means the whole function, not just the diff
- Running actual tests is required, not optional
- If issues are found, fix them and run this skill again — don't skip to the notebook
- The verification report is persisted in the issue/feature file so the full lifecycle lives in one place
- If verification finds issues that require additional code changes, those changes get their own mini plan/rollback in the Verification Fixes section — this ensures nothing is done without a revert path
