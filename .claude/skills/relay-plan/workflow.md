# Relay: Code — Implementation Plan

**Sequence**: `/relay-analyze` → **`/relay-plan`** → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

Based on the analysis, create a detailed implementation plan.

0. Read the target item file(s) and verify an ## Analysis section exists
   (from /relay-analyze). If no analysis exists, STOP and tell the user:
   "No analysis found in the item file. Run **/relay-analyze** first."

   If multiple ## Analysis sections exist (from a re-analysis after
   rejection), use the most recent one (identified by the latest
   *Analyzed:* date). Earlier analyses may contain outdated findings.

   Freshness check: read the *Analyzed:* date in the most recent
   Analysis section. If the analysis is more than 7 days old, WARN
   the user:
   "Analysis was done on [date] — the codebase may have changed since then.
   Consider re-running **/relay-analyze** to revalidate before planning."
   Wait for the user to confirm before proceeding.

   Scope Decision check: in the same most-recent ## Analysis section,
   look for a `### Scope Decision` subsection. If present, read its
   `*Mode:*` value:
   - `keep narrow` or `linked companion` → plan the target as a single-item run.
   - `grouped run` → plan the target plus all entries in `#### Grouped Entries`. The plan MUST emit a `### Grouped Run Coverage` section per the Planner Contract documented in the same Scope Decision block. See step 7 below.
   - `promote` → STOP and tell the user: "This analysis was promoted to a feature via Feature 3. The promoted feature file is the planner's target, not this issue. Run **/relay-plan** or **/relay-superplan** on the promoted feature."
   - No `### Scope Decision` subsection → proceed as a single-item run (legacy / pre-12-2 analyses).

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
   - CODE (BEFORE): the actual current code from the file, copied verbatim.
     Add an inline comment (# ← ...) on EVERY line explaining what it does
     and, where relevant, where the problem is. The reader should understand
     the current behavior without opening the file.
   - CODE (AFTER): the proposed replacement code, also with an inline comment
     on EVERY line explaining what it does and why. For changed/added lines,
     explain what changed and why. For unchanged lines, explain their role
     in the surrounding context.
     This is NOT pseudocode — write the real code you intend to implement.
     The before/after pair should be diffable: same surrounding context,
     only the relevant lines changed.
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
   a second copy. If no plan exists yet, APPEND after the last
   Analysis section.
   Add a horizontal rule separator, then these sections:

   ---

   ## Implementation Plan

   *Generated: [YYYY-MM-DD]*

   ### Step 1: [title]
   **File**: path/to/file.py (function_name, lines X–Y)

   **Before** (current code):
   ```python
   def example(self, data):              # ← entry point, takes raw input
       result = self.process(data)        # ← processes input but ignores errors
       return result                      # ← returns None on failure, caller doesn't check
   ```

   **After** (proposed change):
   ```python
   def example(self, data):              # ← entry point, unchanged
       result = self.process(data)        # ← same processing call
       if result is None:                 # ← NEW: catch the failure case
           raise ProcessingError(data)    # ← NEW: surface error instead of silent None
       return result                      # ← unchanged: returns valid result
   ```

   **Why**: [what this step accomplishes and how it connects to the root cause]
   **Risk**: [what could break]
   **Verify**: [how to check]
   **Rollback**: [how to revert]

   ### Step 2: [title]
   ...

   ### Grouped Run Coverage
   *(REQUIRED when the target's most-recent `### Scope Decision` is `*Mode:* grouped run`. Omit otherwise.)*

   | Target | Kind | Obligation | Plan Step(s) | Files / Symbols | Notes |
   |--------|------|------------|--------------|-----------------|-------|
   | (target issue) | run leader | full | 1, 2 | file_a.py::func_x | run leader |
   | sibling_a.md | existing item | full | 2, 3 | file_a.py::func_y, docs/config.md | same root cause |
   | unfiled: settings.py::old_flag branch | unfiled candidate | partial - only old_flag references | 3 | settings.py::OLD_FLAG, README.md | broader test gap remains out of scope |

   - Every entry from the Scope Decision's `#### Grouped Entries` table must appear here with at least one Plan Step mapping.
   - Entries with `Closure obligation: full` must have explicit Files / Symbols coverage matching the sibling's blast radius.
   - Entries with `Closure obligation: partial - only X` must name the exact subset in scope.
   - If grouped scope cannot be planned coherently (e.g., a sibling requires architectural changes the plan cannot accommodate without scope creep), STOP and tell the user: "Grouped run scope cannot be cleanly planned. Re-run **/relay-analyze** with scope reduction (drop the entry from the group) or promotion (escalate to Feature 3)."

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

8. Present the plan to the user BEFORE stating the next step.
   Do NOT skip to "run /relay-review". The user must see the full plan,
   not just that you wrote one. For each step, show:

   - **The Before/After code blocks** — these are the core of the plan.
     Present them exactly as persisted, with inline `# ←` comments. The
     user should understand every change by reading your output alone,
     without opening the issue file or source files.
   - **Why, Risk, and Verify** for each step — so the user can evaluate
     the reasoning and flag concerns before review.
   - **Test changes** — what tests are being added or modified.
   - **Risks & mitigations** — the consolidated risk register.

   The user should be able to evaluate the entire plan from your output.
   If your presentation is just "plan created, run /relay-review", you
   have NOT followed this step. Show the code. Show the before/after.

## Navigation
When finished, after presenting the full plan details from step 8 above,
tell the user:
- "Next: run **/relay-review** for adversarial review of the plan."

## Notes

- The plan is persisted in the issue/feature file so it survives across conversations and is archived with the item when resolved
- The step-by-step decomposition is key: it allows incremental implementation with verification at each stage
- "Stress-test every assumption" means re-reading the actual code, not relying on the issue/feature description
- The plan should be detailed enough that someone unfamiliar with the codebase could execute it
- Before/After code blocks are NOT optional — they are the core of each step. The reader should be able to understand the entire change by reading the code blocks alone, without opening any source files. Use real code, not pseudocode. Add an inline comment (# ← ...) on EVERY line — not just key lines. Each comment explains what the line does and, for changed lines, what changed and why
- If the analysis revealed related items that should be addressed together, the plan should include steps for all of them
- On a revision cycle (after REJECTED), the plan replaces the previous version in-place — never two Implementation Plan sections in one file
- If the plan is later revised (e.g., after /relay-review returns APPROVED WITH CHANGES), update the plan in the issue/feature file — don't append a second copy
