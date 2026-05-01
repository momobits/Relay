# Relay: Code — Analyze & Validate

**Sequence**: **`/relay-analyze`** → `/relay-plan` or `/relay-superplan` → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

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
   - **Related Work discovery** — perform a structured search across six
     dimensions to surface sibling bugs, contract drift, archived siblings,
     and broader subsystem gaps. Findings are advisory at this stage; the
     binding scope decision is owned by downstream skills.

     **Search dimensions (run in priority order):**

     1. **Live codepath audit** — read the full containing function, method,
        class, or module of the target change surface. Inspect adjacent
        branches, neighboring state transitions, guard clauses, parallel
        helpers, and first-order callers/consumers for sibling bug
        candidates that are not yet filed. This is the dimension that
        catches "the other bug Relay did not know about yet."
     2. **Backlog codepath** — items in .relay/issues/ and
        .relay/features/ that cite the same files or symbols as the
        target item.
     3. **Subsystem** — items (active or archived) sharing the same
        module or directory family as the target's affected files.
     4. **Archived siblings** — .relay/archive/issues/ and
        .relay/archive/features/ touching the same files or symbols.
        Multiple archived siblings in the same subsystem signal
        repeated rediscovery.
     5. **Implementation history** — .relay/implemented/ entries
        touching related code; informs regression risk and subsystem
        incompleteness signals.
     6. **Contract drift** — references to behavior, types, flags, error
        variants, docs, and user-facing prose affected by the target.
        Use mcp__serena__find_referencing_symbols when available for
        symbol-level queries; fall back to grep otherwise.

     **Evidence rubric (apply to each finding):**

     - **Strong** — shares file AND function or symbol with the target,
       OR is a live-source sibling bug candidate in the same containing
       function or state transition.
     - **Medium** — shares file, OR shares root cause as articulated in
       another item's analysis, OR shares user-impact category, OR is
       an archived sibling on the same file.
     - **Weak** — shares directory/module, OR shares vocabulary in the
       problem statement, OR a single archived sibling nearby without
       file-level overlap.

     **Upgrade rules:**

     - Two or more archived siblings in the same subsystem upgrade weak → strong.
     - A test-coverage gap on the same function or branch upgrades a
       finding by one level.
     - User-impact overlap upgrades a finding by one level when the
       overlap is concrete, not merely lexical.

     **Search bounds (track and report per dimension):**

     - Live codepath audit always covers the full containing function or
       class plus first-order callers/consumers; broader caller fan-out
       can be bounded with a note.
     - Backlog codepath and archive searches run in full.
     - Subsystem search is bounded at roughly 30 sibling files per
       directory family; if the bound is hit, emit `bounded at N - M
       more files not examined`.
     - Subsystem search is **skipped** entirely for documentation-only
       targets, defined as: every Affected File matches `*.md`,
       `README*`, `CHANGELOG*`, `LICENSE*`, or `CONTRIBUTING*`. Emit
       `skipped because target is documentation-only`.
     - Each dimension reports its completion state (`complete | bounded
       at N | skipped because Y`) so under-coverage is visible.

     **Tooling availability:**

     - Symbol-level dimensions (1, 6) prefer
       `mcp__serena__find_referencing_symbols` when Serena MCP is
       available in the current environment.
     - If Serena is not available (no Serena tools listed and no
       `relay-config.md` declaration), OR if a Serena query fails at
       runtime (timeout, error response — empty results from a known-good
       symbol are NOT failures), fall back to grep for that dimension and
       record `tooling: grep (serena unavailable)` (or `tooling: grep
       (serena failed: <reason>)` for runtime failures) in the dimension's
       completion state.
     - Prose-level queries (docstrings, README, changelog, error
       messages) always use grep regardless of Serena availability.

     **Contract drift sub-procedure (dimension 6):** derive queries
     from the target's problem statement and proposed fix:

     - **Symbol-level drift** (renamed function, removed type, changed
       identifier in code): Serena-first, grep-fallback.
     - **Type / error-variant drift** (changed exception type, error
       variant, enum value): Serena-first, grep-fallback.
     - **Flag / config drift** (changed flag name or default): grep
       across config and docs; use Serena if the flag corresponds to a
       code symbol.
     - **Prose drift** (stale docstrings, README, config docs, error
       messages, changelog entries): always grep. Search distinctive
       terms from the target's problem statement against `README.md`,
       `.relay/`, `.claude/skills/*/workflow.md`, and doc directories.
     - **Symbol-existence guard:** when deriving symbol-level queries
       from the target's problem statement, verify each cited symbol
       exists in the project source before reporting `complete`. If a
       cited symbol returns 0 results in BOTH Serena and grep, record the
       dimension's completion state as `complete (0 findings; symbol
       resolution: 'X' not found in source — verify spelling)` rather
       than just `complete`. This prevents a misspelled or hallucinated
       cited symbol from producing a false-clean report.

     **Single-repo scope:** the live codepath audit assumes the
     affected source lives in the current repository. Cross-repo
     codepath signals are out of scope for v1.

     **Output:** a findings list (each finding with target / kind /
     evidence / why / suggested-handling) plus the per-dimension
     completion state. Findings can be either:

     - **existing item** — path to an issue or feature file already
       in `.relay/`, or
     - **unfiled candidate** — synthetic identifier such as
       `unfiled: module.py::function_name - post-init branch skips validation`.

     **Suggested handling values:** `keep narrow | group into current
     run | file companion | consider promotion`. Advisory only — the
     binding scope decision is downstream of this skill.
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

   ### Related Work

   *Search dimensions executed: live codepath audit | backlog codepath | subsystem | archive | implemented | contract drift*
   *Tooling: Serena MCP for symbol-level (when available) | grep for prose | both*

   #### Findings

   For each finding:

   - **Target:** path/to/related.md OR `unfiled: module.py::symbol - summary`
   - **Kind:** existing item | unfiled candidate
   - **Evidence:** strong | medium | weak
   - **Why related:** 1–2 sentences with file:line or symbol citations
   - **Suggested handling:** keep narrow | group into current run | file companion | consider promotion
     *(advisory; binding scope decision is performed in step 9's Scope Decision flow below)*

   #### Search Bounds

   - Live codepath audit: complete | bounded at N | skipped because X
   - Backlog codepath: complete | bounded at N | skipped because X
   - Subsystem: complete | bounded at N | skipped because X
   - Archive: complete | bounded at N | skipped because X
   - Implementation: complete | bounded at N | skipped because X
   - Contract drift: complete | bounded at N | skipped because X

   ### Scope Decision

   *Mode:* keep narrow | grouped run | linked companion | promote
   *Decided:* YYYY-MM-DD
   *Rationale:* [why this mode was chosen, with references to specific findings]

   #### Grouped Entries
   *(present only when mode = grouped run)*

   | # | Target | Kind | Evidence | Closure obligation |
   |---|--------|------|----------|--------------------|
   | 1 | (target) | run leader | n/a | full |
   | 2 | path/to/sibling.md | existing item | strong | full |
   | 3 | unfiled: module.py::symbol - summary | unfiled candidate | strong | partial - only the `<symbol>` reference |

   #### Planner Contract
   *(present only when mode = grouped run)*

   - `/relay-plan` or `/relay-superplan` must emit a `### Grouped Run Coverage` section.
   - The coverage section must map every grouped entry to at least one concrete plan step.
   - Any grouped entry with closure obligation `full` must have explicit file or symbol coverage in the plan.
   - Any grouped entry with closure obligation `partial` must name the exact subset in scope.
   - If the planner cannot cover a grouped entry cleanly, it must stop and route back to scope reduction or promotion rather than silently continue.

   #### Closure Contract
   *(present only when mode = grouped run)*

   - `/relay-review` must verify each grouped entry's cited evidence is addressed in the plan at the obligation's granularity.
   - `/relay-verify` must verify the diff touched the files or symbols promised by the plan's `Grouped Run Coverage` section.
   - `/relay-resolve` must record per-entry closure status; partial or unclosed grouped entries must be re-opened, superseded, or have a follow-up issue filed.

   ### Approach
   - Recommended approach (may differ from the issue/feature file's proposal)
   - Alternatives considered and why they were rejected
   - Open questions or decisions needed before implementation

Output: Updated issue/feature file(s) in .relay/issues/ or .relay/features/ with analysis appended

9. Present the analysis to the user BEFORE stating the next step.
   Do NOT skip to "run /relay-plan or /relay-superplan". The user must see the substance of
   your analysis, not just that you did one. For each item analyzed, show:

   - **Validation**: what you found when you read the current source — quote
     the relevant code and confirm/deny the problem still exists. If line
     numbers shifted, show the new location.
   - **Root cause**: explain what creates the bad state, with code references
     the user can follow. If related items share the root cause, name them.
   - **User impact**: the scenarios and before/after you wrote in step 5.
     Present them in full — the user should understand the real-world
     consequence without opening the issue file. This is the most important
     part of the analysis for the user.
   - **Blast radius**: the files, callers, consumers, and past work at risk.
     Name specific functions and test files, not just file paths.
   - **Related Work**: present every finding from step 4's discovery loop —
     target (existing item path or unfiled candidate id), kind, evidence
     grade, why-related explanation with file:line or symbol citations, and
     the advisory suggested handling. Include the Search Bounds report so
     the user sees coverage gaps.
   - **Approach**: your recommendation and why alternatives were rejected.

   Then run the **Scope Decision** flow:

   1. **Compute the recommended mode** from the Findings using this rubric:

      | Findings pattern | Recommendation |
      |------------------|----------------|
      | No findings, or all weak | Keep narrow |
      | Medium/strong findings sharing target's root cause | Grouped run |
      | Strong findings spanning multiple root causes in same subsystem | Consider promotion |
      | Repeated-rediscovery signal (2+ archived siblings) | Consider promotion |
      | Strong orthogonal findings alongside same-root-cause findings | Offer linked companion for the orthogonal ones; grouped/narrow for the rest |

   2. **Present the recommendation and alternatives** to the user:
      - The recommended mode and rationale (cite specific findings).
      - The full set of alternatives: keep narrow, grouped run, linked companion, promote.
      - For grouped run: list the proposed grouped entries (existing items + unfiled candidates) and their closure obligations.
      - Wait for the user to confirm or override the recommendation.

   3. **On confirmation**, persist the chosen mode in the target's Analysis block:
      - **Keep narrow**: write a `### Scope Decision` section with `*Mode:* keep narrow`, `*Decided:* YYYY-MM-DD`, and a `*Rationale:*` line. Skip the Grouped Entries / Planner Contract / Closure Contract subsections.
      - **Grouped run**: write the full `### Scope Decision` section including `#### Grouped Entries`, `#### Planner Contract`, `#### Closure Contract` per the step 8 template. For each existing-item sibling in `#### Grouped Entries`, append the one-line annotation `> Grouped into [target] run on YYYY-MM-DD. See [target] for closure status and per-entry obligation.` to the sibling's file (above any existing horizontal rule, below the front-matter and Status line). Unfiled candidates have no sibling file to annotate; their lifecycle exists only through the run leader.
      - **Linked companion**: for each finding the user wants tracked separately, route to `/relay-new-issue` with a suggested title derived from the finding's `Why related` text. Hand findings across one at a time per Open Question 2's lean. Then write `### Scope Decision` with `*Mode:* linked companion` and a `*Filed companion issues:*` list of the resulting issue paths.
      - **Promote**: route to Feature 3's promotion workflow with the analysis context attached. Feature 3 takes over from this point; Feature 3's workflow performs the Scope Decision write (with `*Mode:* promote`) plus the promoted feature file creation and original issue archival.

   The user should be able to evaluate your analysis without opening any
   files. If your presentation is just "analysis complete, run /relay-plan (or /relay-superplan)",
   you have NOT followed this step. Show the scenarios. Show the code.
   Show the before/after. Then bind the scope mode.

## Navigation
When finished, tell the user the next step based on the outcome:
- If the item is stale (the bug/gap no longer exists in the code, was already addressed outside the pipeline, or the requirement is no longer valid):
  "This item is stale. Run **/relay-resolve** to archive it as a stale close-out. Then run **/relay-scan** to refresh project status."
- If the Scope Decision is `*Mode:* promote`:
  Feature 3's promotion workflow has taken over. The promoted feature file's `*Promotion Class:*` header determines the next step:
  - `lightweight` → "Next: **/relay-plan** or **/relay-superplan** on the promoted feature."
  - `broad` → "Next: **/relay-superplan** on the promoted feature (preferred on Claude Code), or **/relay-plan** with a leading Design Deepening section (fallback). See the promoted feature's Planner Requirements."
- Otherwise (Scope Decision is `keep narrow`, `grouped run`, `linked companion`, or no Scope Decision present for legacy analyses):
  After presenting the full analysis details from step 9 above, conclude with:
  "Next: create the implementation plan. Choose one:
  - **/relay-plan** — single-pass plan (faster, good for straightforward changes)
  - **/relay-superplan** — dispatches 5 competing agents with different strategies (Minimal Change, Performance-First, Safety-First, Refactor-Forward, Test-Driven), then synthesizes the best approach. Better for complex or high-risk changes where exploring multiple approaches adds value."
  If Scope Decision is `*Mode:* grouped run`, the planner will emit a `### Grouped Run Coverage` section as required by the Scope Decision's Planner Contract.

## Notes

- The analysis is persisted in the issue/feature file so it survives across conversations and is available to /relay-plan or /relay-superplan
- This skill forces validation before planning — catching stale items and wrong approaches early
- The "read all items" step is critical: it prevents changes that conflict with other known problems or planned features
- Reading archive/ and implemented/ provides historical context — knowing what was already tried, what approaches worked, and what caveats were noted prevents repeating mistakes and protects past work from regression
- If the analysis reveals the item is stale, the right action is to update/archive the issue/feature file, not proceed with implementation
- The Related Work search in step 4 surfaces sibling bugs, contract drift, and archived siblings as graded findings — including unfiled candidates discovered in the live source. The binding scope decision (modes: keep narrow, grouped run, linked companion, promote) is performed at the end of step 9 via the Scope Decision flow.
- If past work is at risk of regression, call it out explicitly in the Blast Radius section
