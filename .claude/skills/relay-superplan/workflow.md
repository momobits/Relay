# Relay: Code — Super Plan (Multi-Agent)

**Sequence**: `/relay-analyze` → `/relay-plan` or **`/relay-superplan`** → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

Generate an implementation plan by dispatching 5 competing agents, each using a
different planning strategy, then synthesize the strongest elements into one final plan.

The output format is identical to `/relay-plan` — downstream skills (`/relay-review`,
`/relay-verify`, etc.) work unchanged.

---

## Prerequisites

**Platform check**: This skill requires Claude Code's parallel
agent dispatch capability (`subagent_type: Plan`). If running
in Codex CLI, Gemini CLI, or another platform without parallel
agent dispatch, STOP and tell the user:
*"Multi-agent synthesis requires Claude Code's agent dispatch
capability. On Codex CLI or Gemini CLI, use **/relay-plan**
instead — the single-pass deep-reasoning approach is the
equivalent on your platform."*
Do not proceed with the 5-agent dispatch.

0. Read the target item file(s) and verify an `## Analysis` section exists
   (from `/relay-analyze`). If no analysis exists, STOP and tell the user:
   "No analysis found in the item file. Run **/relay-analyze** first."

   If multiple `## Analysis` sections exist (from a re-analysis after
   rejection), use the most recent one (identified by the latest
   *Analyzed:* date). Earlier analyses may contain outdated findings.

   Freshness check: read the *Analyzed:* date in the most recent
   Analysis section. If the analysis is more than 7 days old, WARN
   the user:
   "Analysis was done on [date] — the codebase may have changed since then.
   Consider re-running **/relay-analyze** to revalidate before planning."
   Wait for the user to confirm before proceeding.

   Promoted-feature detection (NEW: 12-3): BEFORE the Scope Decision check below, look for a `*Promoted from:*` header in the target feature's metadata block. The same target file may carry BOTH headers (a re-analyzed promoted feature has both), so check `*Promoted from:*` FIRST.

   | Header signal | Action |
   |---------------|--------|
   | `*Promoted from:*` present AND `*Promotion Class:* lightweight` | All 5 agents plan the target as a single-item run AND emit a `### Promoted Feature Coverage` section. See Step 3 and Step 4. |
   | `*Promoted from:*` present AND `*Promotion Class:* broad` | All 5 agents emit a `### Design Deepening` section BEFORE the implementation plan AND a `### Promoted Feature Coverage` section AFTER. /relay-superplan is the PREFERRED path for broad promotions on Claude Code. See Step 3 and Step 4. |
   | `*Promoted from:*` absent | Proceed to the Scope Decision check below. |

   **12-4 layering boundary**: this detection reads `*Promotion Class:*` as the BINDING signal. Phase 12-4's Tier 2 → Tier 1 waiver logic via `*Closure Tier Applied:*` is layered downstream in /relay-verify Step 1 and /relay-resolve Step 0/4e, not here.

   Scope Decision check: in the same most-recent `## Analysis` section,
   look for a `### Scope Decision` subsection. If present, read its
   `*Mode:*` value:
   - `keep narrow` or `linked companion` → plan the target as a single-item run; all 5 agents plan the same single-item scope.
   - `grouped run` → all 5 agents must plan the target plus all entries in `#### Grouped Entries`, and each candidate plan must emit a `### Grouped Run Coverage` section per the Planner Contract. See Step 3 (shared format instructions) and Step 4 (synthesis) below.
   - `promote` → STOP and tell the user: "This analysis carries `*Mode:* promote`. The promotion sub-flow in /relay-analyze step 9 should have written a promoted feature file and archived this issue. Run **/relay-plan** or **/relay-superplan** on the promoted feature instead."
   - No `### Scope Decision` subsection → proceed as a single-item run (legacy / pre-12-2 analyses).

   If an Adversarial Review section exists with verdict REJECTED (from a
   previous `/relay-review`), read it and note the rejection feedback — all
   5 agents must address every issue raised.

All dates in this workflow use YYYY-MM-DD format.

---

## Step 1 — Gather context for agent prompts

Before dispatching agents, collect everything they need so each agent is
self-contained (agents have no conversation history):

a. Read the full item file (issue or feature) including the most recent
   Analysis section
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

Launch 5 parallel agents. All 5 must run **concurrently in a single dispatch**. Each agent receives the same context block but a different
planning directive.

**Dispatch requirements (non-negotiable):**
- Use `subagent_type: Plan` for every agent. The `Plan` agent is read-only
  (no Edit, Write, or NotebookEdit access), which physically prevents agents
  from modifying the codebase while planning.
- Every agent prompt must include the read-only directive shown in Step 3
  ("You must NOT modify any files..."). This is a second line of defense in
  case the subagent_type is ever changed.

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
READ-ONLY DIRECTIVE: You must NOT modify any files. Do NOT use Edit, Write,
NotebookEdit, or any other file-modification tool. Do NOT run commands that
mutate the repo. You are PLANNING ONLY — your job is to return plan text
back to the caller, who will handle synthesis and persistence. If you catch
yourself reaching for an edit tool, stop. The "real code" below means the
real code you would write IF you were implementing — but you are not
implementing. Return it as text inside the plan only.

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
- Grouped Run Coverage (REQUIRED if the target's most-recent `### Scope Decision` is `*Mode:* grouped run`): emit a `### Grouped Run Coverage` table mapping every grouped entry to one or more plan steps with explicit Files / Symbols. See `/relay-plan` step 7 for the canonical table format and column definitions. If grouped scope cannot be planned coherently within your strategy's directive, return a plan that explicitly says so in its Strategy Summary and includes a stub Grouped Run Coverage section flagging the unmappable entries — the synthesizer (Step 4) will surface this to the user instead of silently planning around it.
- Promoted Feature Coverage / Design Deepening (REQUIRED if the target carries `*Promoted from:*`): if `*Promotion Class:* lightweight`, emit a `### Promoted Feature Coverage` table mapping every Strong/Medium finding from the copied Analysis's `### Related Work` to one or more plan steps. If `*Promotion Class:* broad`, emit a leading `### Design Deepening` section (subsystem boundaries, named invariants, abstraction seams, related-work disposition) BEFORE the per-step implementation plan, AND a `### Promoted Feature Coverage` section AFTER the steps. See `/relay-plan` step 7 for canonical templates. If broad-promotion boundaries are unresolvable within your strategy's directive, return a plan that explicitly says so in its Strategy Summary and includes a stub Design Deepening section flagging the unresolvable boundaries — the synthesizer (Step 4) will surface this to the user instead of silently planning around it.

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
   - **Grouped Run Coverage** (when target's `### Scope Decision` is `*Mode:* grouped run`): merge the most thorough `### Grouped Run Coverage` table from the 5 candidates into the synthesized plan. The synthesized plan MUST include a Grouped Run Coverage section that covers every grouped entry. **Impossibility-propagation rule**: if any candidate's Strategy Summary explicitly flagged grouped scope as unplannable, propagate that signal to the user — STOP synthesis and tell the user: "One or more strategy candidates flagged grouped run scope as unplannable. Re-run **/relay-analyze** with scope reduction or promotion before re-running **/relay-superplan**." Do NOT silently synthesize around the flag.
   - **Promoted Feature Coverage / Design Deepening** (when target carries `*Promoted from:*`): merge the strongest `### Promoted Feature Coverage` table from the 5 candidates. If `*Promotion Class:* broad`, also preserve the most thorough `### Design Deepening` section verbatim — Design Deepening MUST appear in the synthesized plan; it cannot be summarized away. **Consistency-wins tie-breaker**: when candidates disagree on `### Design Deepening` wording (e.g., different invariant names, different boundary scope), prefer the wording that is most consistent across candidates. If no clear majority emerges, prefer the wording that uses the same vocabulary as the source issue's `### Related Work` findings. **Impossibility-propagation rule**: if any candidate's Strategy Summary flagged broad-promotion boundaries as unresolvable, propagate that signal to the user — STOP synthesis and tell the user: "One or more strategy candidates flagged broad-promotion boundaries as unresolvable. Re-run **/relay-analyze** to re-evaluate scope or split into multiple promoted features before re-running **/relay-superplan**." Do NOT silently synthesize around the flag.

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
a second copy. If no plan exists yet, APPEND after the last Analysis
section.

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
