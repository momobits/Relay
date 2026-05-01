# Relay: Code — Adversarial Review & Finalize

**Sequence**: `/relay-analyze` → `/relay-plan` or `/relay-superplan` → **`/relay-review`** → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

Review the implementation plan as an adversary. Your job is to find holes,
not to confirm it's good.

0. Read the target item file(s) and verify an ## Implementation Plan
   section exists (from /relay-plan or /relay-superplan). If no plan exists,
   STOP and tell the user: "No implementation plan found. Run **/relay-plan**
   or **/relay-superplan** first."

1. For each step in the plan, attempt to break it:
   - What happens if this step partially fails (e.g., first query succeeds,
     second throws)?
   - What if the code being modified has changed since the analysis?
     Re-read each target file NOW and confirm the plan still applies.
   - What input would cause this change to produce wrong results?
   - What concurrent operation could race with this change?
   - What happens at the boundary: empty input, None, zero, max-length string,
     unicode, special characters?

2. Test the plan against edge cases specific to this codebase:
   Read the "## Edge Cases" section of .relay/relay-config.md and apply
   every scenario listed there to the plan. These are the project-specific
   conditions that must be considered for every change.

3. Check for regression in the wider project:
   - Read .relay/issues/, .relay/features/, .relay/implemented/, .relay/archive/issues/,
     and .relay/archive/features/. Does the plan accidentally re-introduce any
     previously resolved item?
   - Does the plan change any behavior that other known items depend on?
     (e.g., if item X's proposed approach assumes the current behavior of the
     code this plan modifies)
   - Run through the test files for affected modules. Would any existing
     test break? If so, is the breakage correct (test was wrong) or a
     regression (plan is wrong)?

4. Check completeness:
   - Does the plan handle ALL the cases described in the issue/feature file?
   - Are there cases the issue/feature file didn't mention that the plan should cover?
   - Does every file in the blast radius get addressed?
   - Is there cleanup needed? (dead code removal, comment updates, etc.)
   - **Sibling-survival** (only when target's most-recent `### Scope Decision` is `*Mode:* grouped run`): walk the `#### Grouped Entries` table and the plan's `### Grouped Run Coverage` section. For each grouped entry, verify the plan addresses the entry's cited evidence at the closure obligation's granularity:
       - Entries with `Closure obligation: full` must have plan steps touching every file/symbol in the entry's blast radius.
       - Entries with `Closure obligation: partial - only X` must have plan steps touching the named subset.
       - Unaddressed entries raise a **Sibling-survival objection**. Either:
           - the reviewer cites the plan step that covers the gap (resolving the objection in-place), OR
           - the reviewer reduces scope by dropping the entry. To drop an entry:
               - in the target's `### Scope Decision`, strike through the row in `#### Grouped Entries` (wrap in `~~...~~`) and append `*Dropped during review YYYY-MM-DD: [reason]*` after the table;
               - in the dropped entry's sibling file (`Kind: existing item` only), strike through the `> Grouped into [target] run` annotation and append `> Removed from group YYYY-MM-DD: [reason]` line;
               - record the drop in the Adversarial Review's Issues Found section as a `Severity: scope reduction` entry citing the reason;
               - if the dropped entry has `Kind: unfiled candidate`, only the target-side and review-side annotations apply (no sibling file).
       - **Edge case — all siblings dropped, only run leader remains**: if cumulative drops leave only the run leader in `#### Grouped Entries`, the Mode remains `grouped run` (technically degenerate but valid; downstream coverage checks no-op against the 1-entry table). The reviewer MAY OPTIONALLY also strike through `*Mode:* grouped run` in the target's `### Scope Decision` and replace with `*Mode:* keep narrow`, recording the mode change in the Adversarial Review's Issues Found as an additional `Severity: scope reduction` entry. This cleanup is optional, not required.

5. Persist the review by APPENDING it to each relevant issue/feature file in
   .relay/issues/ or .relay/features/, after the Implementation Plan section. Add:

   ---

   ## Adversarial Review

   *Reviewed: [YYYY-MM-DD]*

   ### Issues Found

   For each issue, include:
   - Severity (CRITICAL / HIGH / MEDIUM / LOW)
   - What's wrong and why it matters
   - **If it's a code issue**, show the problematic code from the plan
     and the corrected version, with an inline comment (# ← ...) on
     EVERY line explaining what it does:

     **Plan has:**
     ```python
     result = self.process(data)  # ← no error handling; returns None on timeout
     ```

     **Should be:**
     ```python
     result = self.process(data)  # ← same call, unchanged
     if result is None:           # ← NEW: catch timeout / parse failure
         self._emit_call(success=False, error_message="process returned None")  # ← NEW: log the failure
         return []                # ← NEW: safe fallback, matches existing contract
     ```

   - **If it's an architectural issue**, explain the structural problem
     and the correction with enough detail to understand without opening
     files — e.g., which component talks to which, what the data flow
     should be, what dependency is missing or circular.

   ### Edge Cases to Handle
   - [cases the plan needs to address]

   ### Regression Risk
   - [specific regressions identified, with mitigation]

   ### Verdict
   - APPROVED: plan is ready for implementation
   - APPROVED WITH CHANGES: plan needs specific modifications (list them)
   - DEFERRED: item should be moved to a later phase (specify which phase
     and why — e.g., dependency not yet resolved, prerequisite work needed)
   - REJECTED: plan has fundamental problems (explain, suggest alternative)

   If APPROVED WITH CHANGES: update ALL plan sections above to incorporate
   the modifications — Implementation Plan, Test Changes, Post-Implementation
   Checks, Risks & Mitigations, and Rollback Plan. Do not append a second
   plan — replace the existing plan sections with the revised version.
   This becomes the implementation spec.

6. Present the review to the user BEFORE announcing the verdict.
   Do NOT skip to the summary table. The user must see the substance of
   what you checked, not just the outcome. For each item reviewed, show:

   - **Source verification**: quote the actual current code you read from
     each target file alongside the plan's BEFORE block. If they match, say
     so with the code shown. If they differ, show both and flag the drift.
   - **Issues found**: if any, show them with the "Plan has:" / "Should be:"
     code blocks as described in step 5. If none, say "No issues found" but
     still show what you checked (the key code paths, the edge cases tested).
   - **Edge cases tested**: list the specific edge cases you evaluated and
     the result for each. Include the input/scenario and what the plan
     produces — don't just say "tested boundary conditions."
   - **Regression check**: name the specific resolved items and test files
     you checked. If a test would break, show the test code and explain why.

   The user should be able to evaluate your review without opening any files.
   If your presentation is just a table + prose summary, you have NOT
   followed this step. Show the code. Show the evidence.

## Navigation
When finished, tell the user the next step based on the verdict:

- If APPROVED:
  After presenting the full review details from step 6 above, conclude with:
  "The plan is approved and ready for implementation.
   Say **'implement the plan'** to begin coding.
   After implementation is complete, run **/relay-verify** to verify."

  Before implementing, APPEND the following to the issue/feature file
  after the Adversarial Review section:

  ---

  ## Implementation Guidelines

  *Date: [YYYY-MM-DD]*

  - Follow the finalized plan step by step, in order
  - After each step, run its VERIFY command before moving to the next
  - Commit after each logically complete step or group of related steps
  - If a step cannot be implemented as planned, APPEND a deviation
    section to this file before proceeding:

    ## Implementation Deviations

    ### Step [N]: [title]
    - **Planned**: [what the plan said]
    - **Actual**: [what was done instead]
    - **Reason**: [why the deviation was necessary]
  - Do NOT make changes beyond what the plan specifies

- If APPROVED WITH CHANGES (after updating the plan in-place):
  Present a concrete summary of every change made to the plan.
  For each change:
  - **If code changed**: show the before (what the plan originally had)
    and after (what it now says), with an inline `# ←` comment on EVERY
    line explaining what it does. The reader should understand the revision
    without re-reading the full plan.
  - **If architectural or structural**: explain what was reorganized,
    what component/flow/dependency changed, and why the new structure
    is better — with enough detail to evaluate without opening files.
  - **If a step was added, removed, or reordered**: state which step
    and why, with the code or design detail for any new/modified steps.
  Ask: "The plan has been updated with the changes above. Does this
  look right before implementation begins?"
  Wait for the user to confirm or request further adjustments. Once
  confirmed, APPEND the Implementation Guidelines below to the
  issue/feature file, then tell the user:
  "The plan is confirmed. Say **'implement the plan'** to begin coding.
   After implementation is complete, run **/relay-verify** to verify."

  ---

  ## Implementation Guidelines

  *Date: [YYYY-MM-DD]*

  - Follow the finalized plan step by step, in order
  - After each step, run its VERIFY command before moving to the next
  - Commit after each logically complete step or group of related steps
  - If a step cannot be implemented as planned, APPEND a deviation
    section to this file before proceeding:

    ## Implementation Deviations

    ### Step [N]: [title]
    - **Planned**: [what the plan said]
    - **Actual**: [what was done instead]
    - **Reason**: [why the deviation was necessary]
  - Do NOT make changes beyond what the plan specifies

- If DEFERRED:
  Update `.relay/relay-ordering.md` to reflect the deferral:
  1. In the item's current phase table, strike through the item's row
     content and append a deferral note pointing to the new location:
     `| ~~ID~~ | ~~[title](link)~~ | ~~file~~ | ~~complexity~~ | **Deferred to Phase [N]** (see [N.X]) — [reason] |`
  2. Add the item as a new row in the target phase table (create a new
     sub-phase if needed, e.g., "6C — Deferred from 3B")
  3. Update the "Estimated effort" lines for both the source and target
     phases to reflect the change
  4. Update the Summary table: adjust item counts for both phases

  Then tell the user:
  "Item **[title]** has been deferred from **Phase [source]** to
   **Phase [N]** in relay-ordering.md.
   Reason: [reason from verdict].
   Continuing with the next item in the current phase, or run
   **/relay-analyze** to pick the next item from relay-ordering.md."

- If REJECTED:
  "The plan needs rework. Run **/relay-plan** or **/relay-superplan** to
   revise the plan incorporating the rejection feedback from the Adversarial
   Review. If this is the second or subsequent rejection, consider whether
   the approach itself is flawed — run **/relay-analyze** to reconsider
   the fundamental approach before re-planning."

- If the user disagrees with the verdict:
  The user may override any verdict. To override, append to the
  Adversarial Review section:
  **User override**: [APPROVED/REJECTED] — [reason for override]
  Then proceed according to the overridden verdict. The override
  and its reasoning are preserved in the item file for audit.

- If reviewing a multi-item phase with split verdicts (some items
  APPROVED, some REJECTED or DEFERRED):
  Items with no dependencies on rejected/deferred items may proceed to
  implementation independently. Rejected items return to /relay-plan or /relay-superplan.
  Deferred items are moved in relay-ordering.md per the DEFERRED
  instructions above. If cross-dependencies exist between approved
  and rejected/deferred items, all dependent items must be re-planned
  together.

## Notes

- This skill intentionally has an adversarial framing — it produces better results than "please review"
- The "re-read each target file NOW" instruction is critical: it catches drift between planning and review
- Edge cases in the edge cases section should be specific to this project — update them as the codebase evolves
- If the verdict is DEFERRED, update relay-ordering.md immediately — strike through in the source phase, add to the target phase — so the ordering file stays current
- If the verdict is REJECTED, go back to /relay-plan or /relay-superplan with the feedback. If repeated rejections indicate a fundamental approach problem, escalate to /relay-analyze
- The plan is only finalized when this skill returns APPROVED, or when the user confirms an APPROVED WITH CHANGES revision
- When APPROVED WITH CHANGES, the issue/feature file's plan is updated in-place so there is always one source of truth
- The review is persisted in the issue/feature file so the full lifecycle (problem/requirement → plan → review → verification) lives in one place
