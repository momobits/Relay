# Relay: Code — Implementation Plan

**Sequence**: `/relay-analyze` → **`/relay-plan`** → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

Based on the analysis, create a detailed implementation plan.

0. Read the target item file(s) and verify an ## Analysis section exists
   (from /relay-analyze). If no analysis exists, STOP and tell the user:
   "No analysis found in the item file. Run **/relay-analyze** first."

   Freshness check: read the *Analyzed:* date in the Analysis section.
   If the analysis is more than 7 days old, WARN the user:
   "Analysis was done on [date] — the codebase may have changed since then.
   Consider re-running **/relay-analyze** to revalidate before planning."
   Wait for the user to confirm before proceeding.

If an Adversarial Review section exists in the issue/feature file with
verdict REJECTED (from a previous /relay-review), read it first and
incorporate the rejection feedback into this revised plan. Address every
issue raised in the review.

All dates in this workflow use YYYY-MM-DD format.

Requirements for the plan:

1. Break the change into atomic, independently-verifiable steps. Each step should:
   - Change as few files as possible (ideally one)
   - Be testable in isolation (you could run tests after just this step)
   - Not leave the codebase in a broken state if you stop here
   Order steps so that each builds on the last without breaking what came before.

2. For each step, specify:
   - WHAT: exact file, function, and line range to change
   - HOW: the specific code change (pseudocode or actual code)
   - WHY: what this step accomplishes and how it connects to the root cause / requirement
   - RISK: what could go wrong, what regression could this introduce
   - VERIFY: how to confirm this step worked (test command, manual check, etc.)
   - ROLLBACK: if this step causes problems, how to revert safely

3. Cross-check every step against the blast radius from the analysis:
   - For each caller/consumer identified: does this step change their behavior?
   - If yes: is the behavior change correct? Do their tests still pass?
   - For each related item: does this step interact with it?

4. Identify test changes needed:
   - Existing tests that need updating (mock changes, new assertions, etc.)
   - New tests that should be added to cover the change
   - Integration/regression tests to run after all steps complete

5. Consider the full breadth of this change:
   - Does this change any public API behavior?
   - Does it change any stored data format?
   - Does it affect performance characteristics?
   - Does it interact with configuration options?
   - Could it affect existing deployments during upgrade?

6. Stress-test every assumption:
   - Re-read each affected function body. Don't rely on memory or the
     issue/feature description — verify the actual code matches your mental model.
   - For each "this is safe because X" claim, verify X is actually true.
   - For each "callers do Y", grep to confirm all callers actually do Y.
   - Run multiple passes over the plan: does step 3 invalidate step 1?
     Does the final state match what you intended?

7. Persist the plan in each relevant issue/feature file in .relay/issues/ or
   .relay/features/. If an Implementation Plan section already exists (from a
   previous rejected plan), REPLACE it with the revised plan — do not append
   a second copy. If no plan exists yet, APPEND after the Analysis section.
   Add a horizontal rule separator, then these sections:

   ---

   ## Implementation Plan

   *Generated: [YYYY-MM-DD]*

   ### Step 1: [title]
   **File**: path/to/file.py
   **Change**: [description]
   **Code**: [specific change]
   **Why**: [what this step accomplishes and how it connects to the root cause]
   **Risk**: [what could break]
   **Verify**: [how to check]
   **Rollback**: [how to revert]

   ### Step 2: [title]
   ...

   ## Test Changes
   - [list of test file changes]

   ## Post-Implementation Checks
   - [ordered list of verification commands]

   ## Risks & Mitigations
   - [consolidated risk register]

   ## Rollback Plan
   - If the change is purely code (no DB migrations, no config changes,
     no stored data format changes), the rollback plan is a single line:
     `git revert <actual-commit-hash>` — fill in the real commit hash
     after implementation, not a placeholder.
   - If the change involves DB migrations, config changes, or stored
     data format changes: include ordered revert steps for each
     (migration reversal commands, config restoration, data cleanup).

   If the phase spans multiple item files, append the relevant steps to
   each file (each item file gets only the steps that apply to it, plus
   the shared rollback plan). Each file must cross-reference the other
   item files in the phase with links and a note about execution order
   (e.g., "This plan depends on steps in [other_item.md](../issues/other_item.md)
   being completed first").

   If the plan spans multiple item files and was REJECTED, the Adversarial
   Review will be in each affected file. Read the review from ALL affected
   files and coordinate the revised plan across them — ensure cross-file
   dependencies are addressed together.

Output: Updated issue/feature file(s) in .relay/issues/ or .relay/features/ with plan persisted

## Navigation
When finished, tell the user:
- "Next: run **/relay-review** for adversarial review of the plan."

## Notes

- The plan is persisted in the issue/feature file so it survives across conversations and is archived with the item when resolved
- The step-by-step decomposition is key: it allows incremental implementation with verification at each stage
- "Stress-test every assumption" means re-reading the actual code, not relying on the issue/feature description
- The plan should be detailed enough that someone unfamiliar with the codebase could execute it
- If the analysis revealed related items that should be addressed together, the plan should include steps for all of them
- On a revision cycle (after REJECTED), the plan replaces the previous version in-place — never two Implementation Plan sections in one file
- If the plan is later revised (e.g., after /relay-review returns APPROVED WITH CHANGES), update the plan in the issue/feature file — don't append a second copy
