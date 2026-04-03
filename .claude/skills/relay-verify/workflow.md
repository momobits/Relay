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
