# Relay: Code — Analyze & Validate

**Sequence**: **`/relay-analyze`** → `/relay-plan` → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

I want to work on [PHASE/ITEM from relay-ordering.md, e.g. "Phase 1A"].

Before writing any code, analyze and validate:

1. Read .relay/relay-ordering.md to understand the target item(s) and their
   context within the broader work sequence
2. Read the full project landscape — current, archived, and implemented:
   a. Read EVERY file in .relay/issues/ and .relay/features/ — not just the
      target. You need the full picture of known problems and planned work
      so your changes don't conflict with or ignore related items.
   b. Read .relay/archive/issues/ and .relay/archive/features/ to understand
      what was previously resolved and how. This prevents re-introducing
      old bugs or duplicating past work.
   c. Read .relay/implemented/ to understand the approaches taken for past
      work — patterns, trade-offs, and caveats documented there may directly
      affect your current work.
   Summarize the relevant connections across all directories.
3. Read the actual source files cited in the target item(s). The codebase may
   have changed since the item was written. Verify:
   - Does the bug/gap/requirement still exist at the cited line numbers?
   - Has the code been refactored, moved, or partially addressed?
   - Are the proposed implementation steps still valid?
   If the item is stale, say so and recommend archiving or updating.
   If the item is PARTIAL (some aspects already addressed outside the
   pipeline): document what was already done, narrow the scope to what
   remains, and proceed with analysis of the remaining work only.
4. Root cause / requirements analysis — ask: are we addressing a symptom or
   the real problem?
   - Trace the problem upstream: what creates the bad state? (For features:
     what creates the need?)
   - Trace it downstream: what consumes the output? How will it change?
   - Is there a deeper architectural issue that would make this change fragile?
   - Are any OTHER items in .relay/issues/ or .relay/features/ caused by the
     same root cause or motivated by the same need?
     If so, should they be addressed together?
   - Was this root cause previously addressed (check .relay/archive/issues/,
     .relay/archive/features/, and .relay/implemented/)? If so, did the previous
     work regress, or is this a different manifestation of the same
     underlying problem?
5. User impact analysis — step outside the code and ask: what does this
   actually mean for the person using the system?
   - What does the user/operator experience because of this bug or gap?
     (e.g., silent data corruption, misleading reports, missing warnings)
   - What's the worst-case outcome if this goes unaddressed?
   - Think of 1–2 concrete scenarios: a realistic situation where the problem
     fires, told as a short narrative with specific data (names, numbers,
     actions). These make the problem tangible.
   - Describe the before/after: what happens today (broken) vs. what will
     happen after the fix (correct), from the user's point of view.
   This is NOT optional. The technical root cause alone does not communicate
   the problem. If you can't explain the impact in plain terms, you don't
   fully understand the issue yet.
6. Blast radius mapping — for every proposed change, identify:
   - Direct callers (who calls this function/method?)
   - Indirect consumers (who uses the output downstream?)
   - Test coverage (which tests exercise this path? which don't?)
   - Config surface (does this change interact with any config options?)
   - Related items (does this change affect any other known issue or feature,
     positively or negatively?)
   - Past work at risk (does this change touch code that was modified by a
     previous change in .relay/implemented/? Could it undo or destabilize
     that work?)
7. Produce a structured analysis covering: validation, root cause, user impact,
   blast radius, and approach. See step 8 for the exact format to persist.

Do NOT write code yet. Do NOT create a plan yet. Just analyze.

8. Persist the analysis by APPENDING it to each relevant issue/feature file in
   .relay/issues/ or .relay/features/. Add a horizontal rule separator, then
   append the structured analysis:

   ---

   ## Analysis

   *Analyzed: [YYYY-MM-DD]*

   ### Validation
   - Problem/requirement still exists: YES/NO (with current line numbers if shifted)
   - Proposed approach still valid: YES/NO/NEEDS ADJUSTMENT

   ### Root Cause
   - What creates the bad state / what drives the requirement
   - Whether this is a symptom of something deeper
   - Related issues/features that share the same root cause or motivation

   ### What This Means (User Impact)

   **In plain terms:** 1–2 sentences explaining what the user/operator
   experiences because of this problem. No code references — write it as if
   explaining to someone who uses the system but doesn't read the source.

   **Scenario:** A concrete example using realistic data. Walk through what
   happens step by step — what the user does, what the system does wrong,
   and what the user sees (or doesn't see). Give names, numbers, and actions
   so the reader can picture it.

   **Before (current behavior):**
   - Step-by-step of what happens today, ending with the bad outcome

   **After (with fix):**
   - Same scenario, same steps, but showing the corrected behavior and outcome

   (For multiple items in a phase, write a separate Scenario + Before/After
   for each item.)

   ### Blast Radius
   - Files affected (with function names)
   - Callers and consumers
   - Test coverage status
   - Config interactions
   - Cross-item interactions (current .relay/issues/ and .relay/features/)
   - Past work regression risk (.relay/archive/ + .relay/implemented/)

   ### Approach
   - Recommended approach (may differ from the issue/feature file's proposal)
   - Alternatives considered and why they were rejected
   - Open questions or decisions needed before implementation

Output: Updated issue/feature file(s) in .relay/issues/ or .relay/features/ with analysis appended

## Navigation
When finished, tell the user the next step based on the outcome:
- If the item is stale (the bug/gap no longer exists in the code, was already addressed outside the pipeline, or the requirement is no longer valid):
  "This item is stale. Run **/relay-resolve** to archive it as a stale close-out. Then run **/relay-scan** to refresh project status."
- Otherwise:
  "Next: run **/relay-plan** to create the implementation plan."

## Notes

- The analysis is persisted in the issue/feature file so it survives across conversations and is available to /relay-plan
- This skill forces validation before planning — catching stale items and wrong approaches early
- The "read all items" step is critical: it prevents changes that conflict with other known problems or planned features
- Reading archive/ and implemented/ provides historical context — knowing what was already tried, what approaches worked, and what caveats were noted prevents repeating mistakes and protects past work from regression
- If the analysis reveals the item is stale, the right action is to update/archive the issue/feature file, not proceed with implementation
- If multiple items share a root cause, consider proposing a combined approach
- If past work is at risk of regression, call it out explicitly in the Blast Radius section
