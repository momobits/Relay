# Relay

A prompt-driven workflow system that gives AI coding agents persistent memory of what was built, what broke, and what's next. It replaces the ephemeral, conversation-scoped context that AI models operate in with a structured documentation system that survives across sessions, models, and teams.

## The Problem

When you use an AI model to build and maintain a codebase, every conversation starts from zero. The model doesn't know:

- What issue it fixed last week and how
- What feature it designed two hours ago
- Which approach was tried and rejected for a similar problem
- What other parts of the codebase were affected by recent changes
- What work is queued up and in what order it should be tackled

This means you repeat context, re-explain decisions, risk re-introducing fixed bugs, and lose the thread of multi-session work. The bigger the project gets, the worse this becomes.

## The Solution

Relay creates a **living documentation layer** that serves as the AI's project memory:

- **Issues and features** are documented in structured `.md` files with full context
- **Implementation plans, reviews, and verifications** are appended to those files as work progresses
- **Verification notebooks** (`.ipynb`) provide executable proof that changes work
- **Resolved items** are archived with implementation docs, preserving the full decision trail
- **Status and ordering** files are regenerated to reflect current project state
- **Project-specific customizations** are auto-detected during setup and maintained as the codebase evolves

Every AI session reads this documentation before acting. Every session writes back what it did. The result is a continuous, auditable record that any AI model (or human) can pick up and continue.

## How It Works

Relay has four prompt categories, each handling a phase of the development lifecycle:

```
PREPARE          DISCOVERY          FEATURE            CODE
(status)         (find work)        (design work)      (do work)

prepare_1 -----> discovery_1        feature_1 -------> code_1  (analyze)
  (scan)           (scan for          (brainstorm)        |
    |               issues)              |             code_2  (plan)
prepare_2        discovery_2        feature_2              |
  (order)          (file item)        (design)         code_3  (review)
                                                           |
                                                       *implement*
                                                           |
                                                       code_4  (verify)
                                                           |
                                                       code_5  (notebook)
                                                           |
                                                       code_6  (resolve)
```

### Workflow Paths

There are three entry points depending on what you're doing:

```
Issue found     -->  discovery_2  -->  code_1 --> code_2 --> code_3 --> implement --> code_4 --> code_5 --> code_6
Feature idea    -->  feature_1   -->  feature_2  -->  code_1 --> code_2 --> code_3 --> implement --> code_4 --> code_5 --> code_6
Small feature   -->  discovery_2  -->  code_1 --> code_2 --> code_3 --> implement --> code_4 --> code_5 --> code_6
```

All paths converge on the same **code pipeline** for implementation, ensuring every change gets the same rigor regardless of how it was discovered.

---

## Prompt Reference

### Prepare — Project status and maintenance

| Prompt | Purpose |
|--------|---------|
| **[prepare_1_scan_and_status](prompts/prepare_1_scan_and_status.md)** | Scans all docs and codebase, produces `relay-status.md` with current state of every tracked item. Flags regressions in archived items. Maintains project-specific customizations as the codebase evolves. |
| **[prepare_2_generate_ordering](prompts/prepare_2_generate_ordering.md)** | Reads relay-status.md and all outstanding items, analyzes dependencies (including intra-feature ordering from brainstorm files), produces `relay-ordering.md` with prioritized phases. |

### Discovery — Finding and documenting work

| Prompt | Purpose |
|--------|---------|
| **[discovery_1_discover_issues](prompts/discovery_1_discover_issues.md)** | Systematic codebase scan for bugs, gaps, dead code, security issues, performance problems, test gaps. Creates issue files in `docs/issues/`. Checks archives to avoid re-reporting. |
| **[discovery_2_create_issue_or_feature](prompts/discovery_2_create_issue_or_feature.md)** | Quick-file tool for a specific bug or small feature. Supports two modes: in-context (you're investigating) or cross-chat handoff (paste findings from another session). |

### Feature — Designing new features

| Prompt | Purpose |
|--------|---------|
| **[feature_1_brainstorm](prompts/feature_1_brainstorm.md)** | Interactive exploration of a feature idea. Asks clarifying questions, explores codebase constraints, presents approaches with trade-offs. Creates one brainstorm file that accumulates decisions and names the feature files to create. |
| **[feature_2_design](prompts/feature_2_design.md)** | Takes the brainstorm (or a standalone feature file from discovery_2) and designs each feature in detail. Creates individual feature files with architecture, interfaces, data flow, and integration points. Each file links back to its brainstorm. |

### Code — Implementation pipeline

| Prompt | Purpose |
|--------|---------|
| **[code_1_analyze](prompts/code_1_analyze.md)** | Validates the item still exists, performs root cause / requirements analysis, maps blast radius (callers, consumers, tests, config, cross-item interactions, past work at risk). Reads ALL items and archives for full context. |
| **[code_2_plan](prompts/code_2_plan.md)** | Creates atomic, independently-verifiable implementation steps. Each step specifies WHAT, HOW, WHY, RISK, VERIFY, ROLLBACK. Plan is appended to the item file and persisted across sessions. |
| **[code_3_review](prompts/code_3_review.md)** | Adversarial review that tries to break the plan. Tests edge cases, checks for regressions, validates completeness. Produces a verdict: APPROVED, APPROVED WITH CHANGES, or REJECTED. |
| **[code_4_verify](prompts/code_4_verify.md)** | Post-implementation check: diff vs plan, completeness, correctness, regression tests. Produces a Verification Report appended to the item file. |
| **[code_5_notebook](prompts/code_5_notebook.md)** | Creates a Jupyter verification notebook, runs every cell, iterates until all pass. Classifies failures as notebook bugs, related project issues (fix inline), or unrelated issues (file via discovery_2). |
| **[code_6_resolve](prompts/code_6_resolve.md)** | Archives resolved items, creates implementation docs in `docs/implemented/`, updates brainstorm files, regenerates status. Works for both full-pipeline items and quick fixes. |

---

## Setup

### 1. Bootstrap Relay

Run the setup prompt to create the directory structure and all prompt files:

```
@docs/prompts/setup_workflow.md
```

This creates:

```
docs/
├── relay-readme.md                    # This file — Relay workflow documentation
├── relay-status.md                    # Generated — current state of all items
├── relay-ordering.md                  # Generated — prioritized work order
├── issues/                            # Active bug/gap reports
├── features/                          # Active feature designs and brainstorms
├── implemented/                       # Resolution docs for completed work
├── notebooks/                         # Verification notebooks
├── archive/
│   ├── issues/                        # Archived (resolved) issues
│   ├── features/                      # Archived (resolved) features
│   └── notebooks/                     # Archived verification notebooks
└── prompts/
    ├── setup_workflow.md              # Bootstrap
    ├── prepare_1_scan_and_status.md   # Generate relay-status.md
    ├── prepare_2_generate_ordering.md # Generate relay-ordering.md
    ├── discovery_1_discover_issues.md # Scan codebase for bugs/gaps
    ├── discovery_2_create_issue_or_feature.md  # Quick-file an item
    ├── feature_1_brainstorm.md        # Interactive brainstorm
    ├── feature_2_design.md            # Design feature files
    ├── code_1_analyze.md              # Validate + blast radius
    ├── code_2_plan.md                 # Implementation plan
    ├── code_3_review.md               # Adversarial review
    ├── code_4_verify.md               # Post-implementation verify
    ├── code_5_notebook.md             # Verification notebook
    └── code_6_resolve.md              # Archive + close
```

### 2. Project customization (automatic)

Setup Phase 2 scans your codebase and customizes Relay for your project:

- **Edge cases** (`code_3_review.md`): Discovers optional integrations, external services, feature flags, and config options — generates project-specific edge cases for adversarial reviews
- **Test commands** (`code_4_verify.md`): Detects test frameworks, directory structure, and import patterns — generates project-specific regression check commands
- **Notebook patterns** (`code_5_notebook.md`): Detects async patterns, connection teardown, logging flush timing — generates project-specific seed data, cleanup, and guidelines
- **Scoping paths** (`discovery_1_discover_issues.md`): Detects module structure — updates scan path examples

The AI presents each customization for your confirmation. If you're unsure, accept the scan defaults — `prepare_1_scan_and_status` maintains these automatically as the project evolves.

### 3. First run

```
1. @discovery_1_discover_issues.md    — scan the codebase for issues
2. @prepare_1_scan_and_status.md      — generate relay-status.md
3. @prepare_2_generate_ordering.md    — prioritize the work
4. Start working: @code_1_analyze.md  — pick the highest-priority item
```

---

## Walkthrough: Fixing a Bug

Here's a complete example of finding and fixing a bug, showing every file created and modified at each step.

### Step 1: Discover the issue

Run `@discovery_1_discover_issues.md` or `@discovery_2_create_issue_or_feature.md`. The AI scans the codebase and creates:

```
docs/issues/user_auth_token_expired_silently.md
```

```markdown
# User Auth Token Expires Silently

**Severity**: P1 — High

## Problem
When a user's auth token expires mid-session, API calls return
empty results instead of a 401 error. The client has no way to
know it needs to re-authenticate.

## Current State
- `src/auth/middleware.py` line 45: expired tokens pass validation
- `src/api/handler.py` line 112: catches auth errors but returns []

## Impact
Users see empty data and don't know why. No error in logs.

## Proposed Fix
Check token expiry in middleware, return 401 with clear message.

## Affected Files
- src/auth/middleware.py
- src/api/handler.py
- tests/test_auth.py
```

### Step 2: Update status and ordering

Run `@prepare_1_scan_and_status.md` then `@prepare_2_generate_ordering.md`.

`relay-status.md` now shows the new issue as OUTSTANDING. `relay-ordering.md` places it in Phase 1 based on severity.

### Step 3: Analyze (`code_1_analyze`)

Run `@code_1_analyze.md` — "I want to work on Phase 1."

The AI reads ALL issues, features, archives, and implemented docs. It re-reads the actual source files. It produces:

```
## Validation
- Problem still exists: YES (middleware.py line 45, handler.py line 112)
- Proposed fix still valid: YES

## Root Cause
- middleware.py checks token signature but not expiry timestamp
- handler.py catch-all masks the auth failure

## Blast Radius
- Files: middleware.py, handler.py, 2 test files
- Callers: every authenticated API endpoint (14 routes)
- Tests: test_auth.py has no expiry test case
- Config: TOKEN_EXPIRY_SECONDS setting is read but not enforced

## Approach
- Fix middleware to check expiry, return 401
- Remove catch-all in handler.py
- Add test for expired token
```

### Step 4: Plan (`code_2_plan`)

Run `@code_2_plan.md`. The AI creates an atomic plan and **appends it to the issue file**:

```markdown
---

## Implementation Plan

*Generated: 2025-01-15*

### Step 1: Add expiry check to middleware
**File**: src/auth/middleware.py
**Change**: After signature validation (line 45), add timestamp check
**Risk**: Could reject valid tokens if server clock is skewed
**Verify**: `pytest tests/test_auth.py -v`
**Rollback**: Remove the expiry check, redeploy

### Step 2: Remove catch-all in handler
**File**: src/api/handler.py
**Change**: Replace catch-all with specific error handling
**Risk**: Unhandled exceptions could crash instead of returning []
**Verify**: `pytest tests/test_api.py -v`
**Rollback**: Restore the catch-all

### Step 3: Add expired token test
**File**: tests/test_auth.py
**Change**: New test case with expired JWT
**Verify**: `pytest tests/test_auth.py::test_expired_token -v`

## Rollback Plan
1. `git revert HEAD~3..HEAD`
2. Redeploy
```

### Step 5: Adversarial review (`code_3_review`)

Run `@code_3_review.md`. The AI tries to break the plan:

```markdown
---

## Adversarial Review

*Reviewed: 2025-01-15*

### Issues Found
1. [Medium] Step 1 doesn't handle clock skew — add 30s grace period
2. [Low] Step 2 should log the error before returning 401

### Edge Cases to Handle
- Token with expiry exactly at current time (boundary)
- Token with no expiry field at all (malformed)

### Regression Risk
- None identified — the catch-all removal is safe because
  all auth errors are now handled explicitly

### Verdict
APPROVED WITH CHANGES: Add clock skew grace period to Step 1,
add logging to Step 2.
```

The Implementation Plan is updated in-place with the changes.

### Step 6: Implement

Write the code changes per the finalized plan.

### Step 7: Verify (`code_4_verify`)

Run `@code_4_verify.md`. The AI checks each step against the plan:

```markdown
---

## Verification Report

*Verified: 2025-01-15*

### Implementation Status
| Step | Planned | Implemented | Correct |
|------|---------|-------------|---------|
| 1    | Expiry check + grace period | YES | YES |
| 2    | Remove catch-all + logging  | YES | YES |
| 3    | Expired token test          | YES | YES |

### Test Results
- 47 passed, 0 failed

### Verdict
COMPLETE
```

### Step 8: Verification notebook (`code_5_notebook`)

Run `@code_5_notebook.md`. Creates and runs:

```
docs/notebooks/user_auth_token_expired_silently.ipynb
```

The notebook ingests test data, verifies expired tokens return 401, checks that valid tokens still work, and tests boundary conditions. All cells pass.

### Step 9: Resolve (`code_6_resolve`)

Run `@code_6_resolve.md`. The AI:

1. Creates `docs/implemented/user_auth_token_expired_silently.md` with a summary of what was done
2. Moves the issue to `docs/archive/issues/user_auth_token_expired_silently.md` with an ARCHIVED banner
3. Moves the notebook to `docs/archive/notebooks/`
4. Regenerates relay-status.md and relay-ordering.md

**The full lifecycle is now documented in one place** — the archived issue file contains the original problem, the plan, the review, and the verification report.

---

## Walkthrough: Building a Feature

Here's a complete example of designing and building a multi-part feature.

### Step 1: Brainstorm (`feature_1_brainstorm`)

Run `@feature_1_brainstorm.md` — "I want to explore adding a caching layer."

The AI asks clarifying questions, explores the codebase, presents approaches. After several rounds of conversation, it creates:

```
docs/features/caching_brainstorm.md
```

```markdown
# Feature Brainstorm: Caching Layer

*Created: 2025-01-16*
*Status: READY FOR DESIGN*

## Goal
Reduce database load by caching frequently accessed queries.

## Approaches Considered
### Approach A: Redis cache
- Pros: fast, battle-tested. Cons: new infrastructure dependency.
- Verdict: SELECTED

### Approach B: In-memory LRU
- Pros: no external dependency. Cons: not shared across instances.
- Verdict: REJECTED — multi-instance deployment planned.

## Decisions Made
1. Use Redis with configurable TTL per query type
2. Cache invalidation on write, not time-based
3. Feature must be opt-in (disabled by default)

## Feature Breakdown
| # | Feature File | Description | Suggested Order | Dependencies |
|---|-------------|-------------|-----------------|--------------|
| 1 | `cache_infrastructure.md` | Redis connection, config, health check | Build first | None |
| 2 | `cache_query_layer.md` | Query result caching with invalidation | Build second | Depends on 1 |

## Development Order
Build infrastructure first, then the query layer.
```

### Step 2: Design (`feature_2_design`)

Run `@feature_2_design.md`. The AI reads the brainstorm, designs each feature iteratively, creates:

```
docs/features/cache_infrastructure.md    — Redis connection, config, health check
docs/features/cache_query_layer.md       — Query caching with invalidation logic
```

Each file links back to the brainstorm and specifies its position in the development order.

### Step 3: Prepare

Run `@prepare_1_scan_and_status.md` and `@prepare_2_generate_ordering.md` to integrate the features into the project backlog.

### Step 4-9: Code pipeline

For each feature, in order:

```
code_1_analyze  →  code_2_plan  →  code_3_review  →  implement  →  code_4_verify  →  code_5_notebook  →  code_6_resolve
```

When `code_6_resolve` archives the second feature, it updates the brainstorm file's status to COMPLETE.

---

## Lifecycle of an Item

Every issue or feature follows the same documentation lifecycle. Each phase appends to the item file, building a complete record:

```
┌─────────────────────────────────────────────────────┐
│  docs/issues/some_bug.md (or docs/features/...)     │
│                                                     │
│  # Original Issue                                   │  ← discovery_1 or discovery_2
│  Problem, impact, proposed fix, affected files      │
│                                                     │
│  ---                                                │
│  ## Implementation Plan                             │  ← code_2_plan
│  Steps with WHAT/HOW/WHY/RISK/VERIFY/ROLLBACK       │
│                                                     │
│  ---                                                │
│  ## Adversarial Review                              │  ← code_3_review
│  Issues found, edge cases, regression risk, verdict │
│                                                     │
│  ---                                                │
│  ## Verification Report                             │  ← code_4_verify
│  Step-by-step status table, test results, verdict   │
│                                                     │
│  ---                                                │
│  ## Post-Implementation Fix #1 (if needed)          │  ← code_5_notebook
│  Problem, plan, rollback for issues found in tests  │
│                                                     │
└─────────────────────────────────────────────────────┘
                        │
                        ▼  (code_6_resolve)
┌─────────────────────────────────────────────────────┐
│  docs/archive/issues/some_bug.md                    │
│  > ARCHIVED — See implementation doc                │
│  [full history preserved]                           │
├─────────────────────────────────────────────────────┤
│  docs/implemented/some_bug.md                       │
│  Summary, files modified, verification, caveats     │
├─────────────────────────────────────────────────────┤
│  docs/archive/notebooks/some_bug.ipynb              │
│  Executable verification proof                      │
└─────────────────────────────────────────────────────┘
```

---

## File Flow Diagram

```
                    ┌──────────────┐
                    │  Codebase    │
                    └──────┬───────┘
                           │ scan
                    ┌──────▼───────┐       ┌──────────────────┐
                    │ discovery_1  │──────>│  docs/issues/     │
                    │ discovery_2  │──────>│  docs/features/   │
                    └──────────────┘       └────────┬──────────┘
                                                    │
                    ┌──────────────┐                 │
                    │  prepare_1   │<────────────────┤ read
                    │  (scan)      │                 │
                    └──────┬───────┘                 │
                           │                         │
                    ┌──────▼───────┐                 │
                    │  prepare_2   │                 │
                    │  (order)     │                 │
                    └──────┬───────┘                 │
                           │ produces                │
                    ┌────────────────────────┐        │
                    │  relay-ordering.md    │        │
                    └──────┬───────────────┘        │
                           │ pick phase              │
                    ┌──────▼───────┐                 │
                    │  code_1      │ reads all ──────┘
                    │  (analyze)   │ reads archive/
                    └──────┬───────┘ reads implemented/
                           │
                    ┌──────▼───────┐
                    │  code_2      │──── appends plan ──────> issue/feature file
                    │  (plan)      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  code_3      │──── appends review ────> issue/feature file
                    │  (review)    │
                    └──────┬───────┘
                           │ APPROVED
                    ┌──────▼───────┐
                    │  *implement* │──── writes code ───────> codebase
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  code_4      │──── appends verify ────> issue/feature file
                    │  (verify)    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  code_5      │──── creates ───────────> docs/notebooks/
                    │  (notebook)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌────────────────────────┐
                    │  code_6      │────>│ docs/implemented/      │
                    │  (resolve)   │────>│ docs/archive/issues/   │
                    └──────┬───────┘────>│ docs/archive/features/ │
                           │        ────>│ docs/archive/notebooks/│
                           │             └────────────────────────┘
                    ┌─────────────────────────────┐
                    │ relay-status.md (updated)   │
                    │ relay-ordering.md (updated) │
                    └─────────────────────────────┘
```

---

## Key Design Decisions

**Everything is persisted in `.md` files.** Plans, reviews, and verifications are appended to the item file — not left in conversation history. Any AI model or human can pick up where the last session left off.

**The code pipeline is the same for issues and features.** Whether you're fixing a one-line bug or building a multi-part feature, the same analyze → plan → review → implement → verify → notebook → resolve sequence applies. This ensures consistent rigor.

**Archives are memory, not trash.** Resolved items go to `docs/archive/`, not deleted. Every code prompt reads the archives to avoid re-introducing old bugs, duplicating past approaches, or conflicting with previous work.

**Brainstorm files are accumulation points.** A single brainstorm file captures the full exploration of a feature idea — approaches considered, decisions made, and the breakdown into individual feature files. This prevents the common AI pattern of exploring an idea once, losing it, and starting over.

**Reviews are adversarial by design.** `code_3_review` is framed as "try to break the plan" rather than "confirm it's good." This produces significantly better results — the AI finds real problems instead of rubber-stamping.

**Notebooks provide executable proof.** Verification notebooks aren't just documentation — they're run against the actual codebase. If a cell fails, the workflow classifies the failure and either fixes it inline or files a new issue.

**Status files are generated, not edited.** `relay-status.md` and `relay-ordering.md` are regenerated by the prepare prompts. This prevents drift between documentation and reality.

**Project customizations are auto-maintained.** Edge cases, test commands, notebook patterns, and scan paths are detected during setup and kept current by `prepare_1` on every status scan. The workflow adapts as your project evolves without manual intervention.
