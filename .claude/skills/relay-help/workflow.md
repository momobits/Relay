# Relay: Help & Navigation

Analyze the user's intent and current project state, then guide them to the right skill.

## Execution

### Step 0 — Parse user input

The user may invoke this skill in several ways:

**With a description** (intent-based):
```
/relay-help I want to add authentication
/relay-help The search API is returning duplicates
/relay-help What should I do next?
/relay-help I found a bug in the parser
```

**Without a description** (state-based):
```
/relay-help
```

If the user provided a description, go to **Step 1 (Intent routing)**.
If no description, skip to **Step 2 (Setup check)**.

---

### Step 1 — Intent routing

The user described what they want. Classify their intent and route them:

**a) They describe a problem, bug, or gap** (something broken, missing, wrong):
→ "This sounds like an issue. Run **/relay-new-issue** to file it:
   `/relay-new-issue [their description]`
   The skill will investigate, confirm it's an issue, and create the file. If it turns out to be a feature, it will redirect you to **/relay-brainstorm**."

**b) They describe a feature, enhancement, or new capability** (something to build):
→ "This sounds like a feature. Run **/relay-brainstorm** to explore it:
   `/relay-brainstorm [their description]`
   The skill will ask clarifying questions and help you design it interactively."

**c) They're unsure or it's ambiguous** (could be either):
→ "Not sure if this is a bug or a feature? Run **/relay-new-issue** — it will investigate the codebase, determine whether it's an issue or a feature, and route you accordingly. Features get redirected to **/relay-brainstorm** automatically."

**d) They want to scan for problems** ("find issues", "what's broken", "audit"):
→ "Run **/relay-discover** to systematically scan the codebase for bugs, gaps, and issues."

**e) They want to continue or resume work** ("what's next", "where was I", "continue"):
→ Skip to **Step 2** and proceed with state-based detection.

**f) They ask about Relay itself** ("how does relay work", "what skills are available"):
→ Show the **Available Relay Skills** table and **Workflow Paths** section below. Explain that Relay has three entry points: scan for issues, file a specific item, or brainstorm a feature — and all paths lead through the same code pipeline.

After routing, also mention the current project state if relevant (e.g., "You also have 2 items in progress — run `/relay-help` without a description to see their status").

---

### Step 2 — Check if Relay is set up

- Look for `.relay/` directory. If it doesn't exist, tell the user:
  "Relay is not set up in this project. Run **/relay-setup** to initialize."
  Stop here.

### Step 3 — Read current state

- Read `.relay/version.md` (if it exists) for installed version info
- Read `.relay/relay-status.md` (if it exists) for item counts, in-progress work, and staleness flags
- Read `.relay/relay-ordering.md` (if it exists) for the current work plan
- Check `.relay/issues/` and `.relay/features/` for active items
- Check `.relay/notebooks/` for in-progress notebooks

### Step 4 — Detect where the user is in the workflow

**No items at all** (empty issues/ and features/):
→ "Your project has no tracked items yet. What would you like to do?
   - **/relay-discover** — scan the codebase for bugs, gaps, and issues
   - **/relay-new-issue** — file a specific bug or gap you already know about
   - **/relay-brainstorm** — explore a new feature idea
   Tell me what you're thinking and I'll point you to the right skill."

**Items exist but no relay-status.md or it's stale (>1 day old)**:
→ "Your status file needs refreshing. Run **/relay-scan** to update, then **/relay-order** to prioritize."

**Items exist with up-to-date status but no relay-ordering.md**:
→ "Status is current but work isn't prioritized. Run **/relay-order** to create the work plan."

**Ordering exists with outstanding phases**:
Check if any items are in-progress (have pipeline sections appended):
- If in-progress items found, recommend resuming from their current stage.
  Check sections in the item file to determine stage (check in this order —
  later conditions take precedence over earlier ones):
  - Has ## Analysis but no ## Implementation Plan → "Resume with **/relay-plan** on [item]"
  - Has ## Implementation Plan but no ## Adversarial Review → "Resume with **/relay-review** on [item]"
  - Has ## Adversarial Review with verdict REJECTED → "Plan was rejected. Resume with **/relay-plan** on [item] to revise"
  - Has ## Adversarial Review (APPROVED/APPROVED WITH CHANGES) but no ## Implementation Guidelines → "Ready to implement [item]. Say **'implement the plan'**"
  - Has ## Implementation Guidelines but no ## Verification Report → "Implementation may be done. Resume with **/relay-verify** on [item]"
  - Has ## Verification Report with verdict INCOMPLETE or HAS ISSUES → "Verification found issues. Resume with **/relay-verify** on [item]"
  - Has ## Verification Report with verdict COMPLETE but no notebook in .relay/notebooks/ → "Resume with **/relay-notebook** on [item]"
  - Has matching notebook in .relay/notebooks/ → "Ready to close out. Run **/relay-resolve** on [item]"
- If no in-progress items, recommend starting the next phase:
  → "Next up: [Phase X] from relay-ordering.md. Run **/relay-analyze** to begin."
- Always add: "You can also file new items anytime with **/relay-new-issue** or **/relay-brainstorm**."

**All phases complete**:
→ "All planned work is complete! Options:
   - **/relay-discover** — scan for new issues
   - **/relay-brainstorm** — explore new features
   - **/relay-new-issue** — file a specific bug or gap
   - **/relay-scan** — refresh status to confirm everything is clean"

**Feature pipeline in progress**:
- Brainstorm with status BRAINSTORMING → "Continue brainstorming with **/relay-brainstorm**"
- Brainstorm with status READY FOR DESIGN → "Design the features with **/relay-design**"
- Features DESIGNED but not in ordering → "Run **/relay-scan** then **/relay-order** to integrate features into the work plan"
- Brainstorms with BRAINSTORMING or READY FOR DESIGN that are older than 7 days → also mention: "You have stale brainstorms. Run **/relay-cleanup** to archive abandoned ones."

### Step 5 — Present recommendations

- Show the current state summary (items count, what's in progress)
- Recommend the specific next action with the skill command
- If multiple paths are available, list them with brief explanations
- If the user seems unsure, ask what they're trying to accomplish

## Available Relay Skills

| Skill | Purpose |
|-------|---------|
| **/relay-setup** | Initialize Relay in a new project |
| **/relay-discover** | Scan codebase for bugs, gaps, issues |
| **/relay-new-issue** | File a specific bug or gap |
| **/relay-brainstorm** | Explore a new feature idea |
| **/relay-design** | Design features from brainstorm |
| **/relay-cleanup** | Archive abandoned brainstorms |
| **/relay-scan** | Update project status |
| **/relay-order** | Prioritize work |
| **/relay-analyze** | Validate item before implementation |
| **/relay-plan** | Create implementation plan |
| **/relay-review** | Adversarial review of plan |
| **/relay-verify** | Verify implementation |
| **/relay-notebook** | Create verification notebook |
| **/relay-resolve** | Close out and archive completed work |

## Workflow Paths

```
Specific issue  →  /relay-new-issue  →  /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
Systematic scan →  /relay-discover   →  /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
Feature idea    →  /relay-brainstorm → /relay-design → /relay-scan → /relay-order → /relay-analyze → ... → /relay-resolve
```

## Code Pipeline

```
/relay-analyze → /relay-plan → /relay-review → implement → /relay-verify → /relay-notebook → /relay-resolve
```

## Notes

- This skill reads .relay/ state files but does not modify them
- If relay-status.md exists, use its dates and in-progress tables rather than re-scanning the codebase
- When multiple paths are available, present all options but highlight the recommended one
- Run each Relay skill in a fresh conversation for best results
- When the user provides a description, prioritize intent routing (Step 1) over state detection (Step 4)
- /relay-new-issue is the universal entry point for uncertain items — it investigates and redirects features automatically
