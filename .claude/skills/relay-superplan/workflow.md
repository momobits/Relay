# Relay: Code — Super Plan (Multi-Agent)

**Sequence**: `/relay-analyze` → **`/relay-superplan`** → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

Generate an implementation plan by dispatching 5 competing agents, each using a
different planning strategy, then synthesize the strongest elements into one final plan.

The output format is identical to `/relay-plan` — downstream skills (`/relay-review`,
`/relay-verify`, etc.) work unchanged.

---

## Prerequisites

0. Read the target item file(s) and verify an `## Analysis` section exists
   (from `/relay-analyze`). If no analysis exists, STOP and tell the user:
   "No analysis found in the item file. Run **/relay-analyze** first."

   Freshness check: read the *Analyzed:* date in the Analysis section.
   If the analysis is more than 7 days old, WARN the user:
   "Analysis was done on [date] — the codebase may have changed since then.
   Consider re-running **/relay-analyze** to revalidate before planning."
   Wait for the user to confirm before proceeding.

   If an Adversarial Review section exists with verdict REJECTED (from a
   previous `/relay-review`), read it and note the rejection feedback — all
   5 agents must address every issue raised.

All dates in this workflow use YYYY-MM-DD format.

---

## Step 1 — Gather context for agent prompts

Before dispatching agents, collect everything they need so each agent is
self-contained (agents have no conversation history):

a. Read the full item file (issue or feature) including Analysis section
b. Read the source files cited in the Analysis (blast radius, affected code)
c. Read `.relay/relay-config.md` for project-specific edge cases and test commands
d. If a previous REJECTED review exists, extract its full text
e. Summarize all of the above into a **context block** — a self-contained
   briefing that any agent can use without reading additional files.

The context block must include:
- The problem statement and root cause from the Analysis
- User impact (scenarios, before/after)
- Blast radius (files, callers, consumers, tests, config, cross-item interactions)
- The actual current source code for every function/file that will be changed
- Project-specific edge cases and test commands from relay-config.md
- If REJECTED: every issue from the Adversarial Review, verbatim

---

## Step 2 — Dispatch 5 planning agents in parallel

Launch 5 agents using the Agent tool. All 5 must run **in a single message**
(parallel dispatch). Each agent receives the same context block but a different
planning directive.

**Announce to the user:** "Dispatching 5 planning agents with different strategies:
Minimal Change, Performance-First, Safety-First, Refactor-Forward, and Test-Driven.
This will take a moment."

### Agent 1: Minimal Change
```
You are a planning agent using the MINIMAL CHANGE strategy.

Your directive: produce the plan with the fewest possible lines changed and the
fewest files touched. Prefer surgical, targeted fixes over broad refactors.
Avoid changing any code that is not strictly necessary to resolve the issue.
If a one-line fix exists, prefer it. Minimize blast radius.

[CONTEXT BLOCK]

[PLAN FORMAT INSTRUCTIONS — see Step 4]
```

### Agent 2: Performance-First
```
You are a planning agent using the PERFORMANCE-FIRST strategy.

Your directive: optimize the implementation for runtime efficiency. Choose
data structures, algorithms, and code paths that minimize latency, memory
allocation, and computational overhead. Where the analysis identifies a
performance-sensitive path, prioritize speed. If two approaches are equivalent
in correctness, prefer the faster one.

[CONTEXT BLOCK]

[PLAN FORMAT INSTRUCTIONS — see Step 4]
```

### Agent 3: Safety-First
```
You are a planning agent using the SAFETY-FIRST strategy.

Your directive: maximize defensive coding, error handling, and rollback safety.
Add validation at every boundary. Prefer approaches where partial failure is
recoverable. Include extra guard clauses, explicit error messages, and
assertions. Make the rollback plan trivial. If two approaches are equivalent
in correctness, prefer the one that fails more gracefully.

[CONTEXT BLOCK]

[PLAN FORMAT INSTRUCTIONS — see Step 4]
```

### Agent 4: Refactor-Forward
```
You are a planning agent using the REFACTOR-FORWARD strategy.

Your directive: use this change as an opportunity to improve the surrounding
code architecture — but only where it directly serves the fix/feature. Extract
helpers, improve naming, reduce duplication, and clarify interfaces IF those
changes make the primary fix more maintainable. Do not refactor code unrelated
to the change. The result should leave the codebase better than you found it,
not just patched.

[CONTEXT BLOCK]

[PLAN FORMAT INSTRUCTIONS — see Step 4]
```

### Agent 5: Test-Driven
```
You are a planning agent using the TEST-DRIVEN strategy.

Your directive: design the plan starting from tests. For each step, write the
failing test FIRST, then the minimal implementation to make it pass. Structure
the plan so that test coverage is comprehensive before implementation is
complete. Every edge case identified in the blast radius should have a
corresponding test. If the analysis mentions callers or consumers, add tests
that exercise those paths too.

[CONTEXT BLOCK]

[PLAN FORMAT INSTRUCTIONS — see Step 4]
```

---

## Step 3 — Plan format instructions (included in every agent prompt)

Each agent prompt must end with these format instructions so all 5 plans are
structurally identical and comparable:

```
Produce your plan in this exact format. This is NOT optional — follow it precisely.

Break the change into atomic, independently-verifiable steps. Each step should:
- Change as few files as possible (ideally one)
- Be testable in isolation
- Not leave the codebase in a broken state if you stop here

For each step, specify:
- WHAT: exact file, function, and line range to change
- CODE (BEFORE): the actual current code, copied verbatim. Add an inline
  comment (# ← ...) on EVERY line explaining what it does.
- CODE (AFTER): the proposed replacement code, with inline comment on EVERY
  line. For changed/added lines, explain what changed and why. Write real
  code, not pseudocode. The before/after pair should be diffable.
- WHY: what this step accomplishes and how it connects to the root cause
- RISK: what could go wrong, what regression could this introduce
- VERIFY: how to confirm this step worked (test command, manual check)
- ROLLBACK: if this step causes problems, how to revert safely

Cross-check every step against the blast radius from the analysis.

Also include:
- Test Changes: existing tests to update, new tests to add
- Post-Implementation Checks: ordered verification commands
- Risks & Mitigations: consolidated risk register
- Rollback Plan: overall revert strategy

At the TOP of your plan, add a 2-3 sentence "Strategy Summary" explaining
your approach and why you chose it given your directive.

Return ONLY the plan. No preamble, no meta-commentary.
```

---

## Step 4 — Synthesize the best plan

Once all 5 agents return, perform synthesis:

1. **Read all 5 plans.** For each plan, note:
   - Strategy summary (what approach they took)
   - Number of steps and files touched
   - Key differences from other plans
   - Strengths (what this plan does better than others)
   - Weaknesses (risks, gaps, over-engineering, missing cases)

2. **Compare across plans.** Build a comparison matrix:

   | Aspect | Minimal | Performance | Safety | Refactor | Test-Driven |
   |--------|---------|-------------|--------|----------|-------------|
   | Steps | | | | | |
   | Files touched | | | | | |
   | Key strength | | | | | |
   | Key weakness | | | | | |
   | Unique insight | | | | | |

3. **Select the base plan.** Choose the plan that best balances correctness,
   simplicity, and maintainability as the starting point. This is usually
   (but not always) Minimal Change or Test-Driven.

4. **Cherry-pick from other plans.** Enhance the base plan by incorporating
   the best elements from the other four:
   - Safety-First's guard clauses or error handling (if the base plan lacks them)
   - Performance-First's optimizations (if they don't add complexity)
   - Refactor-Forward's structural improvements (if they genuinely help)
   - Test-Driven's test cases (fill coverage gaps in the base plan)
   - Any unique insight from any plan that others missed

5. **Produce the final synthesized plan** using the exact relay-plan format
   (see Step 5). The final plan must be a coherent whole — not a patchwork
   of 5 plans stapled together.

6. **Present the synthesis to the user.** Show:
   - The comparison matrix from step 2
   - Which plan was chosen as the base and why
   - What was cherry-picked from the other plans and why
   - The full final plan (same presentation requirements as /relay-plan step 8)

---

## Step 5 — Persist the plan

Persist the final synthesized plan in each relevant issue/feature file in
`.relay/issues/` or `.relay/features/`. If an Implementation Plan section
already exists (from a previous rejected plan), REPLACE it — do not append
a second copy. If no plan exists yet, APPEND after the Analysis section.

Use this exact format:

```markdown
---

## Implementation Plan

*Generated: [YYYY-MM-DD] via /relay-superplan (5-agent synthesis)*

### Strategy
*Base: [which strategy was chosen as base]*
*Incorporated: [list of cherry-picked elements from other strategies]*

### Step 1: [title]
**File**: path/to/file.ext (function_name, lines X-Y)

**Before** (current code):
```[lang]
code with # <- comments on every line
```

**After** (proposed change):
```[lang]
code with # <- comments on every line
```

**Why**: [what this step accomplishes]
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
- [revert strategy]
```

The only additions over the standard relay-plan format are:
- The "via /relay-superplan (5-agent synthesis)" note on the Generated line
- The Strategy subsection documenting the base plan and cherry-picks

Everything else is identical so `/relay-review` works without modification.

---

## Step 6 — Present to user

Present the FULL plan to the user BEFORE stating the next step. This follows
the same requirements as `/relay-plan` step 8:

- Show the Before/After code blocks for every step with inline `# <-` comments
- Show Why, Risk, and Verify for each step
- Show Test Changes, Risks & Mitigations
- The user must be able to evaluate the entire plan from your output alone

Additionally, present the synthesis rationale:
- The 5-plan comparison matrix
- Why the base plan was chosen
- What was cherry-picked and why

If your presentation is just "plan created, run /relay-review", you have
NOT followed this step.

## Navigation

When finished, after presenting the full plan details, tell the user:
- "Next: run **/relay-review** for adversarial review of the plan."

## Notes

- The plan output is format-compatible with /relay-plan — all downstream skills work unchanged
- The 5 agents run in parallel so wall-clock time is roughly the same as a single agent
- Each agent is self-contained — they receive the full context block, not file references
- The synthesis step is where the real value is: combining diverse perspectives into one coherent plan
- If a previous plan was REJECTED, all 5 agents receive the rejection feedback so none repeat the mistake
- The Strategy subsection in the persisted plan provides an audit trail of the synthesis decisions
- On a revision cycle (after REJECTED), the plan replaces the previous version in-place
