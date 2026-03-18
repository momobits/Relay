# Relay: Create Issue

**Sequence**: **`/relay-new-issue`** → `/relay-scan` → `/relay-order` → `/relay-analyze` → `/relay-plan` → `/relay-review` → *implement* → `/relay-verify` → `/relay-notebook` → `/relay-resolve`

## How to invoke

There are two usage patterns:

**In-context** — you're already investigating the codebase and find something:
```
/relay-new-issue The batch processor silently drops episodes when the connection pool is exhausted.
```

**Cross-chat handoff** — you found something in another conversation and want to file it. Paste the relevant context so the AI can investigate from a cold start:
```
/relay-new-issue

Context from another session:
While testing voice ingestion, the extraction pipeline threw a
KeyError on `coherence_facts` when the LLM returned an empty list
instead of a dict. The error was in pipeline.py around line 340.
The episode was silently marked as complete despite the failure.

Create an issue for this.
```

---

Analyze the following and create a documentation file.

Topic: [DESCRIPTION — what you found, what you want filed]

Context (if from another session):
[Paste error messages, observations, file paths, or conversation
 excerpts that describe the finding. If invoking in-context, this
 section can be omitted.]

1. Investigate the topic in the codebase — read relevant files, understand
   the current state. If context is provided from another session, use it
   as a starting point but verify everything against the actual code.

2. Determine if this is an issue (bug, shortcoming, gap) or a feature
   (new capability, enhancement). If it's a feature, STOP — do not
   create a file. Skip to the Navigation section and direct the user
   to /relay-brainstorm.

3. Check the full docs landscape for existing coverage:
   - .relay/issues/ — is this already tracked?
   - .relay/features/ — is this already planned?
   - .relay/implemented/ — was this already addressed?
   - .relay/archive/issues/ and .relay/archive/features/ — was this
     previously resolved or attempted?
   If a matching file exists, update it rather than creating a duplicate.
   If an archived issue has regressed, create a new issue that references
   the archive file.

4. Write the analysis to:
   - .relay/issues/[descriptive_name].md if it's an issue
   - If step 2 determined this is a feature (new capability, enhancement),
     do NOT create a file — skip to the Navigation section and direct the
     user to /relay-brainstorm. All features go through the brainstorm
     → design pipeline to ensure they get proper *Status: DESIGNED*
     metadata and are tracked by the prepare skills (/relay-scan and /relay-order).

5. Include:
   - *Created: [YYYY-MM-DD]*
   - Title and severity (P0 critical / P1 high / P2 medium / P3 low)
   - Problem statement: what's wrong or what's needed, and why it matters
   - Current state: exact file paths, line numbers, code snippets
   - Impact: what breaks, what's degraded, who's affected
   - Proposed fix: concrete remediation steps
   - Affected files: list of files that need changes

Output: New issue doc in .relay/issues/, or redirect to /relay-brainstorm

## Navigation
When finished, tell the user the next step based on the outcome:
- If the topic is a feature (no file was created):
  "This is a feature. Run **/relay-brainstorm** to explore and design it."
- If an issue file was created:
  "Next: run **/relay-scan** to update project status, then **/relay-order** to prioritize the work."

## Notes

- Replace `[DESCRIPTION]` with what you want analyzed — be as specific as possible
- Always check for existing docs first to avoid duplication
- Use descriptive filenames: `fuzzy_matching_gaps.md` not `issue_42.md`
- This skill does NOT update relay-status.md or relay-ordering.md — that is the responsibility of /relay-scan and /relay-order
- For cross-chat handoffs: include enough context that the AI can reproduce the finding without the original conversation
- All features (small or large) are redirected to /relay-brainstorm — only issues are filed directly by this skill
