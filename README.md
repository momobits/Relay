```
 ██████╗  ███████╗ ██╗       █████╗  ██╗   ██╗
 ██╔══██╗ ██╔════╝ ██║      ██╔══██╗ ╚██╗ ██╔╝
 ██████╔╝ █████╗   ██║      ███████║  ╚████╔╝
 ██╔══██╗ ██╔══╝   ██║      ██╔══██║   ╚██╔╝
 ██║  ██║ ███████╗ ███████╗ ██║  ██║    ██║
 ╚═╝  ╚═╝ ╚══════╝ ╚══════╝ ╚═╝  ╚═╝    ╚═╝

persistent memory for project workflows
harnessing human creativity and frontier ai scale
```

[![Version](https://img.shields.io/npm/v/relay-workflow?style=flat-square&color=blue)](https://www.npmjs.com/package/relay-workflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skills-blueviolet?style=flat-square)](https://docs.anthropic.com/en/docs/claude-code)
[![Codex CLI](https://img.shields.io/badge/Codex_CLI-Skills-orange?style=flat-square)](https://github.com/openai/codex)
[![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-Skills-blue?style=flat-square)](https://github.com/google-gemini/gemini-cli)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

Relay is a structured workflow system for building software with AI. You direct the strategy — what to build, what to prioritize, when to ship. AI handles the scale — analyzing codebases, generating plans, reviewing implementations, verifying correctness. A persistent `.relay/` layer grows with every session, capturing decisions, context, and progress so nothing is ever lost between humans, models, or tools. Works with **Claude Code**, **OpenAI Codex CLI**, and **Google Gemini CLI**.

## The Problem

When you use AI to build software, you're fighting three forces:

- **AI amnesia** — every conversation starts from zero. The model doesn't know what it built yesterday, which approach failed, or what's queued up next.
- **Context fragmentation** — work spreads across sessions, tools, and people. Decisions live in chat logs that expire. Plans exist in one model's context window and vanish when the session ends.
- **No structure for what's next** — you know there are bugs to fix and features to build, but there's no system to track them, prioritize them, or work through them in order. Issues pile up in your head or scattered notes. AI can scan your codebase and surface problems automatically, but without a workflow those findings evaporate with the session.

The bigger the project, the worse it gets. You repeat yourself, re-explain architecture, risk undoing past work, and lose the thread of multi-session efforts. Human creativity gets buried under the overhead of re-establishing context.

## The Solution

Relay creates a **living project layer** — a structured `.relay/` directory that serves as shared memory between you and your AI tools:

- **19 workflow skills** cover the full lifecycle: discover, brainstorm, design, exercise, analyze, plan, review, implement, verify, resolve
- **Every skill reads and writes** to the same documentation, building a compounding knowledge base that grows smarter with every session
- **Cross-platform by design** — start analysis in Claude, plan in Gemini, review in Codex. The `.relay/` files are the shared contract; any AI (or human) picks up where the last left off
- **Human-directed, AI-scaled** — you make the creative decisions; AI handles the depth of analysis, breadth of review, and rigor of verification
- **Full audit trail** — plans, reviews, verifications, and archived resolutions preserve the decision history so you can always trace why something was built the way it was
- **Automated issue discovery** — AI scans your codebase for bugs, gaps, inconsistencies, and tech debt, then logs each finding as a structured issue file that persists across sessions
- **Manual issue and feature filing** — spot a bug yourself or have a feature idea? File it directly into the workflow so it's tracked alongside discovered issues
- **Prioritized ordering** — all tracked work is ranked by dependency, severity, and complexity into a phased plan, so you always know what to tackle next

### Memory That Grows

The `.relay/` directory is your project's long-term memory. Every analysis, plan, review, and resolution is persisted as structured markdown — not locked inside any model's context window. This memory compounds over time: each session inherits the full history of what was tried, what worked, and what was rejected. Months of context in seconds.

### Use the Right Model for the Job

Different frontier models have different strengths. Claude reasons deeply about architecture. Gemini processes massive codebases. Codex excels at rapid implementation. With Relay, you're not locked into one — use whichever model is best suited for the task at hand, or simply pick up with whatever's available. Hit your token limit on one? Continue in another without losing a single decision, analysis, or line of the plan. The relay never drops.

## Quick Start

### 1. Install

```bash
# Install with npx (recommended)
cd your-project
npx relay-workflow@latest install
```

Or install manually:

```bash
git clone https://github.com/momobits/Relay.git /tmp/relay
cp -r /tmp/relay/.claude/skills/relay-* your-project/.claude/skills/
cp -r /tmp/relay/.claude/skills/relay-* your-project/.agents/skills/
rm -rf /tmp/relay
```

### 2. Setup

In your AI coding CLI (Claude Code, Codex, or Gemini), run:

```
/relay-setup
```

This creates the `.relay/` data directory, generates initial status files, and scans your project for customizations (edge cases, test commands, notebook patterns). Works the same in all three CLIs.

### 3. First Run

```
/relay-discover     — scan the codebase for issues
/relay-scan         — generate relay-status.md
/relay-order        — prioritize the work
/relay-analyze      — start working on the highest-priority item
```

Or explore a new feature idea:
```
/relay-brainstorm   — interactive feature exploration
```

Need help? Run `/relay-help` to see where you are and what to do next.

---

## How It Works

Relay uses **skills** — each workflow step is a skill you invoke with `/relay-*`. The skills read and write to the `.relay/` data directory, building up persistent documentation across sessions. Skills are installed to both `.claude/skills/` (Claude Code) and `.agents/skills/` (Codex CLI, Gemini CLI).

### Workflow Categories

```
PREPARE       DISCOVERY        FEATURE          EXERCISE         CODE
(status)      (find work)      (design work)    (stress-test)    (do work)

/relay-scan   /relay-discover  /relay-brainstorm /relay-exercise  /relay-analyze
  |             (scan for        |                 (map)              |
/relay-order    issues)        /relay-design     /relay-exercise-run  /relay-plan
                                                   (execute)       or /relay-superplan
               /relay-new-issue   |                    |                |
                 (file item)   /relay-cleanup  /relay-exercise-file  /relay-review
                                 (archive stale   (file findings)        |
                                  brainstorms)         |             *implement*
                                                  (feeds into            |
                                                   issues/features)  /relay-verify
                                                                         |
                                                                     /relay-notebook
                                                                         |
                                                                     /relay-resolve
```

The flow between categories: discovery/feature skills create docs → prepare skills prioritize them → code skills implement them. Each skill tells you what to run next.

### Workflow Paths

There are four entry points depending on what you're doing:

```
Specific issue     →  /relay-new-issue  →  /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
Systematic scan    →  /relay-discover   →  /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
Feature idea       →  /relay-brainstorm → /relay-design → /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
Exercise session   →  /relay-exercise → /relay-exercise-run → /relay-exercise-file → /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
```

All paths converge on the same **code pipeline** for implementation, ensuring every change gets the same rigor regardless of how it was discovered.

---

## Skill Reference

### Setup

| Skill | Purpose |
|-------|---------|
| **/relay-setup** | Initialize Relay in a new project. Creates `.relay/` directory, status files, and scans the project for customizations. |

### Prepare — Project status and maintenance

| Skill | Purpose |
|-------|---------|
| **/relay-scan** | Scans all docs and codebase, produces `relay-status.md` with current state of every tracked item. Flags regressions in archived items. |
| **/relay-order** | Reads relay-status.md and all outstanding items, analyzes dependencies, produces `relay-ordering.md` with prioritized phases. |

### Discovery — Finding and documenting work

| Skill | Purpose |
|-------|---------|
| **/relay-discover** | Systematic codebase scan for bugs, gaps, dead code, security issues, performance problems, test gaps. Creates issue files in `.relay/issues/`. |
| **/relay-new-issue** | Quick-file tool for a specific bug or gap. Redirects features to `/relay-brainstorm`. Supports in-context and cross-chat handoff. |

### Feature — Designing new features

| Skill | Purpose |
|-------|---------|
| **/relay-brainstorm** | Interactive exploration of a feature idea. Asks clarifying questions, explores codebase, presents approaches with trade-offs. Creates a brainstorm file. |
| **/relay-design** | Takes the brainstorm and designs each feature in detail. Creates individual feature files with architecture, interfaces, data flow, and integration points. |
| **/relay-cleanup** | Archives abandoned brainstorm files that were never completed through `/relay-design`. |

### Exercise — Stress-testing real capabilities

| Skill | Purpose |
|-------|---------|
| **/relay-exercise** | Map project capabilities. Produces `.relay/relay-exercise.md` hub with identity, capabilities, chains, and coverage. |
| **/relay-exercise-run** | Execute realistic scenarios against a capability (or a group). Captures observations as structured findings. |
| **/relay-exercise-file** | Walk findings with the user, file them as issues or brainstorm seeds, update the hub. |

### Code — Implementation pipeline

| Skill | Purpose |
|-------|---------|
| **/relay-analyze** | Validates the item still exists, performs root cause analysis, maps blast radius. Reads ALL items and archives for full context. |
| **/relay-plan** | Creates atomic, independently-verifiable implementation steps. Each step specifies WHAT, HOW, WHY, RISK, VERIFY, ROLLBACK. |
| **/relay-superplan** | Alternative to `/relay-plan`. Dispatches 5 competing agents (Minimal Change, Performance-First, Safety-First, Refactor-Forward, Test-Driven), then synthesizes the best approach. Same output format as `/relay-plan`. |
| **/relay-review** | Adversarial review that tries to break the plan. Tests edge cases, checks for regressions. Produces APPROVED, APPROVED WITH CHANGES, or REJECTED verdict. |
| **/relay-verify** | Post-implementation check: diff vs plan, completeness, correctness, regression tests. |
| **/relay-notebook** | Creates a Jupyter verification notebook that exercises the real project API end-to-end, runs every cell, iterates until all pass. |
| **/relay-resolve** | Archives resolved items, creates implementation docs in `.relay/implemented/`, updates brainstorm files and ordering. |

### Navigation

| Skill | Purpose |
|-------|---------|
| **/relay-help** | Analyzes current project state and recommends what to do next. Shows where you are in the workflow. |

---

## Walkthrough: Fixing a Bug

### Step 1: Discover the issue

Run `/relay-discover` or `/relay-new-issue`. The AI scans the codebase and creates `.relay/issues/user_auth_token_expired_silently.md`.

### Step 2: Update status and ordering

Run `/relay-scan` then `/relay-order`. The issue appears in relay-ordering.md based on severity.

### Step 3: Analyze (`/relay-analyze`)

The AI reads ALL issues, features, archives, and implemented docs. Produces a structured analysis **appended to the issue file**: validation, root cause, blast radius, approach.

### Step 4: Plan (`/relay-plan` or `/relay-superplan`)

Creates an atomic plan with WHAT/HOW/WHY/RISK/VERIFY/ROLLBACK for each step. **Appended to the issue file**. Use `/relay-superplan` for complex changes — it dispatches 5 agents with different strategies and synthesizes the best approach.

### Step 5: Review (`/relay-review`)

Adversarial review tries to break the plan. Verdict: APPROVED, APPROVED WITH CHANGES, or REJECTED.

### Step 6: Implement

Write the code changes per the finalized plan.

### Step 7: Verify (`/relay-verify`)

Checks each step against the plan, runs regression tests.

### Step 8: Notebook (`/relay-notebook`)

Creates and runs a Jupyter notebook that exercises the real project API end-to-end.

### Step 9: Resolve (`/relay-resolve`)

Archives the issue, creates implementation doc, updates ordering. Then run `/relay-scan` and `/relay-order` to refresh status.

**The full lifecycle is documented in one place** — the archived issue file contains the original problem, plan, review, and verification report.

---

## Walkthrough: Building a Feature

### Step 1: Brainstorm (`/relay-brainstorm`)

Interactive exploration of the feature idea. Creates a brainstorm file with approaches, trade-offs, decisions, and feature breakdown.

### Step 2: Design (`/relay-design`)

Designs each feature in detail. Creates individual feature files with architecture, interfaces, data flow.

### Step 3: Prepare

Run `/relay-scan` and `/relay-order` to integrate features into the backlog.

### Step 4-9: Code pipeline

For each feature, in order:
```
/relay-analyze → /relay-plan (or /relay-superplan) → /relay-review → implement → /relay-verify → /relay-notebook → /relay-resolve
```

---

## Walkthrough: Exercising a Capability

### Step 1: Map (`/relay-exercise`)

Scan the project (docs + source), identify its capabilities, confirm identity with the user, and produce `.relay/relay-exercise.md` — the master map. Capabilities are grouped and linked by context chains reflecting how they are actually used.

### Step 2: Run (`/relay-exercise-run`)

Pick a capability (no args → next uncovered), execute realistic scenarios against the real application, capture observations as structured findings classified as would-be-issues, would-be-brainstorms, or notes. Each scenario runs with prerequisite state established from context chains.

### Step 3: File (`/relay-exercise-file`)

Walk the findings with the user. Each decision is persisted immediately. Would-be-issues become files in `.relay/issues/`. Would-be-brainstorms become seeded brainstorms in `.relay/features/` with partial content for `/relay-brainstorm` to develop later. Notes stay in the exercise file as preserved context.

### Step 4: Integrate

Run `/relay-scan` and `/relay-order` to integrate the new issues and brainstorms into the backlog. From here, filed issues follow the standard code pipeline (see *"Fixing a Bug"*). Seeded brainstorms can be developed further with `/relay-brainstorm` when you're ready.

### Step 5: Auto-archival

When every issue and brainstorm that came from an exercise has been resolved through `/relay-resolve`, the exercise file is automatically archived to `.relay/archive/exercise/`. The full exercise history — scenarios, findings, outcomes — is preserved permanently.

---

## Lifecycle of an Item

Every issue or feature follows the same documentation lifecycle. Each phase appends to the item file, building a complete record:

```
┌───────────────────────────────────────────────────────────┐
│  .relay/issues/some_bug.md (or .relay/features/...)       │
│                                                           │
│  # Original Issue                                         │  ← /relay-discover or /relay-new-issue
│  Problem, impact, proposed fix, affected files            │
│                                                           │
│  ---                                                      │
│  ## Analysis                                              │  ← /relay-analyze
│  Validation, root cause, blast radius, approach           │
│                                                           │
│  ---                                                      │
│  ## Implementation Plan                                   │  ← /relay-plan or /relay-superplan
│  Steps with WHAT/HOW/WHY/RISK/VERIFY/ROLLBACK             │
│                                                           │
│  ---                                                      │
│  ## Adversarial Review                                    │  ← /relay-review
│  Issues found, edge cases, regression risk, verdict       │
│                                                           │
│  ---                                                      │
│  ## Implementation Guidelines                             │  ← /relay-review (APPROVED)
│  Step-by-step execution rules, deviation logging          │
│                                                           │
│  ---                                                      │
│  ## Verification Report                                   │  ← /relay-verify
│  Step-by-step status table, test results, verdict         │
│                                                           │
│  ---                                                      │
│  ## Post-Implementation Fix #1 (if needed)                │  ← /relay-notebook
│  Problem, plan, rollback for issues found in tests        │
│                                                           │
└───────────────────────────────────────────────────────────┘
                          │
                          ▼  (/relay-resolve)
┌───────────────────────────────────────────────────────────┐
│  .relay/archive/issues/some_bug.md                        │
│  > ARCHIVED — See implementation doc                      │
│  [full history preserved]                                 │
├───────────────────────────────────────────────────────────┤
│  .relay/implemented/some_bug.md                           │
│  Summary, files modified, verification, caveats           │
├───────────────────────────────────────────────────────────┤
│  .relay/archive/notebooks/some_bug.ipynb                  │
│  Executable verification proof                            │
└───────────────────────────────────────────────────────────┘
```

---

## Directory Structure

After setup, your project will have:

```
your-project/
├── .claude/
│   └── skills/                   # Claude Code skills
│       ├── relay-setup/          # Initialize Relay
│       ├── relay-scan/           # Generate status
│       ├── relay-order/          # Prioritize work
│       ├── relay-discover/       # Scan for issues
│       ├── relay-exercise/       # Map capabilities
│       ├── relay-exercise-file/  # File findings
│       ├── relay-exercise-run/   # Execute scenarios
│       ├── relay-new-issue/      # File a specific issue
│       ├── relay-brainstorm/     # Explore feature ideas
│       ├── relay-design/         # Design features
│       ├── relay-cleanup/        # Archive stale brainstorms
│       ├── relay-analyze/        # Validate before implementation
│       ├── relay-plan/           # Create implementation plan
│       ├── relay-superplan/      # Create plan via 5 competing agents
│       ├── relay-review/         # Adversarial review
│       ├── relay-verify/         # Verify implementation
│       ├── relay-notebook/       # Verification notebook
│       ├── relay-resolve/        # Close out and archive
│       └── relay-help/           # Navigation guidance
│
├── .agents/
│   └── skills/                   # Codex CLI + Gemini CLI skills
│       └── relay-*/              # (same skills, mirrored)
│
├── AGENTS.md                     # Codex CLI context (relay section)
├── GEMINI.md                     # Gemini CLI context (relay section)
│
├── .relay/                       # Data directory (created by /relay-setup)
│   ├── version.md                # Installed version and skills manifest
│   ├── relay-readme.md           # Relay documentation
│   ├── relay-config.md           # Project-specific settings
│   ├── relay-status.md           # Generated — current state
│   ├── relay-ordering.md         # Generated — prioritized work
│   ├── relay-exercise.md         # Exercise pipeline hub (created by /relay-exercise)
│   ├── issues/                   # Active bug/gap reports
│   ├── features/                 # Active feature designs and brainstorms
│   ├── implemented/              # Resolution docs for completed work
│   ├── notebooks/                # Verification notebooks
│   ├── exercise/                 # Active exercise sessions
│   └── archive/
│       ├── issues/               # Archived (resolved) issues
│       ├── features/             # Archived (resolved) features
│       ├── notebooks/            # Archived verification notebooks
│       └── exercise/             # Archived exercise sessions
```

---

## Key Design Decisions

**Everything is persisted in `.md` files.** Plans, reviews, and verifications are appended to the item file — not left in conversation history. Any AI model or human can pick up where the last session left off.

**The code pipeline is the same for issues and features.** Whether you're fixing a one-line bug or building a multi-part feature, the same analyze → plan → review → implement → verify → notebook → resolve sequence applies.

**Archives are memory, not trash.** Resolved items go to `.relay/archive/`, not deleted. Every code skill reads the archives to avoid re-introducing old bugs.

**Reviews are adversarial by design.** `/relay-review` is framed as "try to break the plan" rather than "confirm it's good."

**Notebooks provide executable proof.** Verification notebooks aren't just documentation — they're run against the actual codebase.

**Every skill tells you what to do next.** Each skill ends with a Navigation section that explicitly tells you which skill to run next.

---

## Adding Skills

To extend the workflow with a new skill:

1. Create a new directory in `.claude/skills/relay-[name]/` (and `.agents/skills/relay-[name]/`) with:
   - `SKILL.md` — frontmatter (name, description) + "Follow the instructions in ./workflow.md."
   - `workflow.md` — the full skill instructions

2. Wire it into the workflow:
   - Add a Navigation entry in the preceding skill that routes to the new one
   - Add it to the skill reference table in this file

3. If the skill requires project-specific customization:
   - Add a Phase 2 step in `/relay-setup` that detects project-specific values and populates `relay-config.md`

## Maintenance

**When to update skills:**
- After adding new integrations, services, or test frameworks — run `/relay-resolve` to refresh customizations, or re-run `/relay-setup` Phase 2
- After changing project structure (module renames, directory moves) — update scoping paths and test commands in `.relay/relay-config.md`
- After finding a workflow gap — fix the skill's `workflow.md`

**Feature file status lifecycle:**
- Brainstorm files: `BRAINSTORMING → READY FOR DESIGN → DESIGN COMPLETE → COMPLETE`
- Individual feature files: `DESIGNED` (created by `/relay-design`) → `IMPLEMENTED` (set by `/relay-resolve` before archiving)