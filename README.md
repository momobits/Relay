```
 ██████╗  ███████╗ ██╗       █████╗  ██╗   ██╗
 ██╔══██╗ ██╔════╝ ██║      ██╔══██╗ ╚██╗ ██╔╝
 ██████╔╝ █████╗   ██║      ███████║  ╚████╔╝
 ██╔══██╗ ██╔══╝   ██║      ██╔══██║   ╚██╔╝
 ██║  ██║ ███████╗ ███████╗ ██║  ██║    ██║
 ╚═╝  ╚═╝ ╚══════╝ ╚══════╝ ╚═╝  ╚═╝    ╚═╝
      persistent memory for AI workflows
```

[![Version](https://img.shields.io/npm/v/relay-workflow?style=flat-square&color=blue)](https://www.npmjs.com/package/relay-workflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skills-blueviolet?style=flat-square)](https://docs.anthropic.com/en/docs/claude-code)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

A skill-driven workflow system that gives AI coding agents persistent memory of what was built, what broke, and what's next. It replaces the ephemeral, conversation-scoped context that AI models operate in with a structured documentation system that survives across sessions, models, and teams.

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
rm -rf /tmp/relay
```

### 2. Setup

In Claude Code, run:

```
/relay-setup
```

This creates the `.relay/` data directory, generates initial status files, and scans your project for customizations (edge cases, test commands, notebook patterns).

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

Relay uses **Claude Code skills** — each workflow step is a skill you invoke with `/relay-*`. The skills read and write to the `.relay/` data directory, building up persistent documentation across sessions.

### Workflow Categories

```
PREPARE          DISCOVERY          FEATURE              CODE
(status)         (find work)        (design work)        (do work)

/relay-scan      /relay-discover    /relay-brainstorm    /relay-analyze
  |                (scan for          |                      |
/relay-order       issues)        /relay-design          /relay-plan
                                                        or /relay-superplan
                 /relay-new-issue     |                      |
                   (file item)   /relay-cleanup          /relay-review
                                   (archive stale            |
                                    brainstorms)         *implement*
                                                             |
                                                         /relay-verify
                                                             |
                                                         /relay-notebook
                                                             |
                                                         /relay-resolve
```

The flow between categories: discovery/feature skills create docs → prepare skills prioritize them → code skills implement them. Each skill tells you what to run next.

### Workflow Paths

There are three entry points depending on what you're doing:

```
Specific issue  →  /relay-new-issue  →  /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
Systematic scan →  /relay-discover   →  /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
Feature idea    →  /relay-brainstorm → /relay-design → /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
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

## Lifecycle of an Item

Every issue or feature follows the same documentation lifecycle. Each phase appends to the item file, building a complete record:

```
┌───────────────────────────────────────────────────────────┐
│  .relay/issues/some_bug.md (or .relay/features/...)      │
│                                                          │
│  # Original Issue                                        │  ← /relay-discover or /relay-new-issue
│  Problem, impact, proposed fix, affected files           │
│                                                          │
│  ---                                                     │
│  ## Analysis                                             │  ← /relay-analyze
│  Validation, root cause, blast radius, approach          │
│                                                          │
│  ---                                                     │
│  ## Implementation Plan                                  │  ← /relay-plan or /relay-superplan
│  Steps with WHAT/HOW/WHY/RISK/VERIFY/ROLLBACK            │
│                                                          │
│  ---                                                     │
│  ## Adversarial Review                                   │  ← /relay-review
│  Issues found, edge cases, regression risk, verdict      │
│                                                          │
│  ---                                                     │
│  ## Implementation Guidelines                            │  ← /relay-review (APPROVED)
│  Step-by-step execution rules, deviation logging         │
│                                                          │
│  ---                                                     │
│  ## Verification Report                                  │  ← /relay-verify
│  Step-by-step status table, test results, verdict        │
│                                                          │
│  ---                                                     │
│  ## Post-Implementation Fix #1 (if needed)               │  ← /relay-notebook
│  Problem, plan, rollback for issues found in tests       │
│                                                          │
└───────────────────────────────────────────────────────────┘
                          │
                          ▼  (/relay-resolve)
┌───────────────────────────────────────────────────────────┐
│  .relay/archive/issues/some_bug.md                       │
│  > ARCHIVED — See implementation doc                     │
│  [full history preserved]                                │
├───────────────────────────────────────────────────────────┤
│  .relay/implemented/some_bug.md                          │
│  Summary, files modified, verification, caveats          │
├───────────────────────────────────────────────────────────┤
│  .relay/archive/notebooks/some_bug.ipynb                 │
│  Executable verification proof                           │
└───────────────────────────────────────────────────────────┘
```

---

## Directory Structure

After setup, your project will have:

```
your-project/
├── .claude/
│   └── skills/
│       ├── relay-setup/          # Initialize Relay
│       ├── relay-scan/           # Generate status
│       ├── relay-order/          # Prioritize work
│       ├── relay-discover/       # Scan for issues
│       ├── relay-new-issue/      # File a specific issue
│       ├── relay-brainstorm/     # Explore feature ideas
│       ├── relay-design/         # Design features
│       ├── relay-cleanup/        # Archive stale brainstorms
│       ├── relay-analyze/        # Validate before implementation
│       ├── relay-plan/           # Create implementation plan
│       ├── relay-superplan/     # Create plan via 5 competing agents
│       ├── relay-review/         # Adversarial review
│       ├── relay-verify/         # Verify implementation
│       ├── relay-notebook/       # Verification notebook
│       ├── relay-resolve/        # Close out and archive
│       └── relay-help/           # Navigation guidance
│
├── .relay/                       # Data directory (created by /relay-setup)
│   ├── version.md                # Installed version and skills manifest
│   ├── relay-readme.md           # Relay documentation
│   ├── relay-config.md           # Project-specific settings
│   ├── relay-status.md           # Generated — current state
│   ├── relay-ordering.md         # Generated — prioritized work
│   ├── issues/                   # Active bug/gap reports
│   ├── features/                 # Active feature designs and brainstorms
│   ├── implemented/              # Resolution docs for completed work
│   ├── notebooks/                # Verification notebooks
│   └── archive/
│       ├── issues/               # Archived (resolved) issues
│       ├── features/             # Archived (resolved) features
│       └── notebooks/            # Archived verification notebooks
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

1. Create a new directory in `.claude/skills/relay-[name]/` with:
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
