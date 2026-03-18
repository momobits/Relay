# Relay: Feature — Design & Specify

**Sequence**: `/relay-brainstorm` → **`/relay-design`** → `/relay-scan` → `/relay-order` → `/relay-analyze` → `/relay-plan` → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

Design the features from the brainstorm file.

A brainstorm file (*_brainstorm.md with status READY FOR DESIGN) must exist
in .relay/features/ before running this skill. If none exists, tell the user
to run **/relay-brainstorm** first.

1. Read the brainstorm file in .relay/features/:
   - Find all *_brainstorm.md files with status READY FOR DESIGN
   - If multiple brainstorm files have status READY FOR DESIGN, list
     them and ask the user which one to design first. Process one
     brainstorm per invocation.
   - Read it for the Feature Breakdown table, decisions, development
     order, and open questions

2. For each feature listed in the Feature Breakdown, in the suggested
   development order:

   a. Deep-dive into the codebase:
      - Read the specific files, modules, and interfaces this feature touches
      - Understand the existing patterns and abstractions it must fit into
      - Check .relay/issues/ for known problems that interact with this feature
      - Check .relay/implemented/ and .relay/archive/ for past work that's relevant
      - Identify what's new code vs modifications to existing code

   b. Design the feature iteratively with the user:
      - Present the proposed architecture: components, data flow, interfaces
      - Highlight decisions that need user input
      - Ask: "Does this design match what you had in mind?"
      - Adjust based on feedback before committing to the file

   c. Create the individual feature file in .relay/features/:
      - Use the filename specified in the brainstorm's Feature Breakdown
      - Structure:

        # Feature: [Title]

        *Created: [YYYY-MM-DD]*
        *Brainstorm: [[topic]_brainstorm.md]([topic]_brainstorm.md)*
        *Status: DESIGNED*

        ## Summary
        [1-2 sentence description of what this feature does]

        ## Motivation
        [Why this feature is needed — from the brainstorm decisions]

        ## Design

        ### Architecture
        [Components, how they fit into the existing codebase]

        ### Interfaces
        [New or modified APIs, function signatures, data structures]

        ### Data Flow
        [How data moves through the feature]

        ### Integration Points
        [Where this connects to existing code — specific files and functions]

        ## Affected Files
        - [list of files that need creation or modification]

        ## Dependencies
        - [Other features or issues that must be completed first]
        - Brainstorm: [link to brainstorm file]
        - Related features: [links to sibling feature files from same brainstorm]

        ## Development Order
        [Position in the sequence from the brainstorm, with rationale.
         e.g., "2 of 3 — requires [feature_1].md to be implemented first
         because it depends on the interfaces defined there."]

        ## Open Questions
        [Anything deferred or needing resolution during implementation]

   d. After creating each feature file, explicitly ask the user:
      - "Does this design look right before I move to the next feature?"
      - If changes are needed, update the file before proceeding

3. After all feature files are created:
   - Set the brainstorm file's status to DESIGN COMPLETE
   - Update the Feature Breakdown table with links to the created files
   - Summarize what was created and the development order

Do NOT update relay-status.md or relay-ordering.md — that is the
responsibility of the prepare skills.
Do NOT create implementation plans — that is /relay-plan's job.

## Navigation
When finished, tell the user:
- "Next: run **/relay-scan** to update project status, then **/relay-order** to integrate these into the backlog. Then run **/relay-analyze** to begin implementation."

## Notes

- Each feature file is self-contained but links back to the brainstorm for context and links to sibling features
- The design should be detailed enough for /relay-plan to create an implementation plan from it
- Development order is recorded in each file, but /relay-order makes the final project-wide prioritization
- If designing reveals the brainstorm's breakdown was wrong (features should be split or merged differently), update the brainstorm file and confirm with the user before proceeding
- For simple single-feature brainstorms, this phase creates one file and is brief
- For multi-feature brainstorms, iterate through each feature in the suggested order — earlier designs inform later ones
- If the design reveals new issues or conflicts with existing code, note them in the feature file's Open Questions section — do not create issue files mid-design
