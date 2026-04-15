# Relay: Feature — Brainstorm & Explore

**Sequence**: **`/relay-brainstorm`** → `/relay-design` → `/relay-scan` → `/relay-order` → `/relay-analyze` → `/relay-plan` or `/relay-superplan` → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

I want to explore a feature idea: [DESCRIPTION]

Guide me through brainstorming this feature interactively.

0. Check for existing in-progress brainstorms:

   Scan .relay/features/*_brainstorm.md for files with status BRAINSTORMING
   (excluding READY FOR DESIGN, DESIGN COMPLETE, COMPLETE).

   If any exist, present them to the user before starting fresh:

     "Existing brainstorms in progress:
       1. outline_templates_brainstorm.md (seeded from exercise outline-chapter)
       2. auth_overhaul_brainstorm.md

     Continue one of these, or start a new brainstorm? [1 / 2 / new]"

   Show at most 10 entries. If more exist, truncate with:
   "... and N more. Pass a specific file as an argument to load it directly."

   To detect seeded brainstorms, look for the `*Source:*` header line
   with one of these patterns:

   - Default-mode finding source:
     `*Source: exercise/<session>/<capability>.md finding <N>*` or
     `*Source: archive/exercise/<session>/<capability>.md finding <N>*`
     → annotate with "(seeded from exercise `<capability>` in session
     `<session>`)".
   - Goal-mode journey-step source:
     `*Source: exercise/<session>/_control.md journey step <N>*` or
     `*Source: archive/exercise/<session>/_control.md journey step <N>*`
     → annotate with "(seeded from goal session `<session>`, journey
     step <N>)".

   Parse `<session>`, `<capability>` (or journey step) from the matched
   path. The prefix matcher is `exercise/<session>/` or
   `archive/exercise/<session>/`; the suffix differs (`finding <N>` vs
   `journey step <N>`).

   - On selecting an existing brainstorm: load it as the working file,
     read the Goal/Context (and if seeded, read the referenced exercise
     file for additional context), and continue development from where
     it left off. Skip step 4's "Ask before CREATING the file for the
     first time" prompt — the file already exists.
   - On `new`: proceed with the existing workflow (steps 1 through 6
     unchanged).

1. Understand the idea:
   - Ask clarifying questions about what I'm trying to achieve
   - Don't assume scope — let me define it through conversation
   - Identify the core problem or opportunity this feature addresses

2. Explore the codebase for context:
   - What existing code, patterns, and abstractions are relevant?
   - What architectural constraints exist that shape what's possible?
   - Check for related work across the full docs landscape:
     - .relay/features/ — is something similar already planned?
     - .relay/issues/ — are there known issues this feature would affect?
     - .relay/implemented/ — has something similar been built before?
     - .relay/archive/features/ and .relay/archive/issues/ — was this
       previously attempted, designed, or rejected?
   - What would this feature interact with in the current codebase?

3. Identify implementation approaches:
   - Present 2-3 distinct approaches with trade-offs
   - For each: how it fits the current architecture, complexity,
     what it enables, what it limits
   - Surface constraints I might not know about
   - Ask me which direction resonates

4. As the conversation progresses, manage the brainstorm file explicitly:
   - Ask before CREATING the file for the first time:
     "Should I create the brainstorm file with what we have so far?"
   - Once the file exists, update it as decisions land — record each
     decision when it is settled without asking each time.
   - Ask before STRUCTURAL changes: adding or removing a feature from
     the Feature Breakdown table, changing the Development Order, or
     updating the brainstorm status. Example:
     "We've landed on [feature X] as a separate feature — should I add
     it to the breakdown table?"
   Do NOT silently accumulate decisions and batch them — record each
   decision as it is settled, not at the end.

5. Create and maintain a brainstorm file in .relay/features/:
   - Naming: [topic]_brainstorm.md (e.g., rls_brainstorm.md)
   - This is a LIVING DOCUMENT — update it throughout the conversation
     as decisions are made, not just at the end.
   - Structure:

     # Feature Brainstorm: [Topic]

     *Created: [YYYY-MM-DD]*
     *Status: BRAINSTORMING*
     (Lifecycle: BRAINSTORMING → READY FOR DESIGN → DESIGN COMPLETE → COMPLETE)

     ## Goal
     [What we're trying to achieve — refined through conversation]

     ## Context
     [Relevant codebase patterns, constraints, existing code discovered]

     ## Approaches Considered
     ### Approach A: [name]
     - Description, trade-offs, verdict (selected/rejected + why)
     ### Approach B: [name]
     - Description, trade-offs, verdict (selected/rejected + why)

     ## Decisions Made
     - [numbered list of decisions with rationale, accumulated as we go]

     ## Feature Breakdown

     [If this brainstorm produces multiple features, list ALL of them
      here as an accumulation. If it produces a single feature, this
      table has one row.]

     | # | Feature File | Description | Suggested Order | Dependencies |
     |---|-------------|-------------|-----------------|--------------|
     | 1 | `[name].md` | ...         | Build first     | None         |
     | 2 | `[name].md` | ...         | Build second    | Depends on 1 |

     ## Development Order
     [Recommended order with rationale. This is advisory —
      /relay-order makes the final project-wide call,
      but this captures the intra-feature dependencies.]

     ## Open Questions
     [Anything unresolved that /relay-design needs to address]

6. When brainstorming feels complete:
   - Update the brainstorm file status to READY FOR DESIGN
   - Confirm the feature breakdown and proposed file names with the user
   - Confirm the suggested development order with the user

Do NOT design implementation details yet — that's /relay-design.
Do NOT create individual feature files — only the brainstorm file.
Focus on WHAT and WHY, not HOW.

## Navigation
When brainstorming is complete, tell the user:
- "Next: run **/relay-design** to design each feature in detail."

## Notes

- This is intentionally interactive — ask questions, don't monologue
- The brainstorm file is updated throughout the conversation as decisions are made, not dumped at the end
- Ask before the first creation; once the file exists, update routine decisions freely. Ask before structural changes (new Feature Breakdown entry, Development Order changes, status transitions)
- Only ONE brainstorm file is created, even for multi-feature ideas — it accumulates all the areas/namespaces
- The Feature Breakdown table is the handoff contract to /relay-design — it names the files and describes what each one covers. /relay-design will create the individual feature files listed in the table.
- Suggested development order is recorded so /relay-design and eventually /relay-order can use it
- If the idea is simple (one feature, obvious approach), this phase can be brief
- If the idea is complex (architectural decisions, multiple features), this phase may take several rounds
- If the brainstorm reveals this is actually a bug/gap rather than a feature, pivot to /relay-new-issue
