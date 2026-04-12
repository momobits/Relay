# Relay: Discover Issues

**Sequence**: **`/relay-discover`** → `/relay-scan` → `/relay-order` → `/relay-analyze` → ...

Scan the codebase to discover issues. For each issue found, create a
new .md file in .relay/issues/.

1. Read the full docs landscape to understand what's already known:
   - .relay/issues/ — currently tracked problems
   - .relay/features/ — planned work
   - .relay/implemented/ — completed work and how it was done
   - .relay/archive/issues/ — previously resolved issues
   - .relay/archive/features/ — previously resolved features
   Do NOT re-report anything that is already documented, previously
   resolved, or archived. If an archived issue has regressed, reference
   the archive file and explain what changed.
2. Read .relay/relay-status.md (if it exists) for current tracked items
3. Scan the codebase systematically. Look for:
   - Bugs: logic errors, unhandled edge cases, broken code paths
   - Gaps: missing functionality referenced in docs, specs, or PRDs but not implemented
   - Inconsistencies: mismatches between schema and code, API docs vs actual signatures
   - Dead code: unused imports, unreachable branches, stale config options
   - Security: injection risks, missing validation, unsafe defaults
   - Performance: N+1 queries, unbounded loops, missing indexes
   - Test gaps: untested critical paths, assertions that don't verify behavior
   - Error handling: swallowed exceptions, missing error paths, unhelpful messages
4. For each distinct issue found:
   a. Check .relay/issues/ — skip if already documented
   b. Check .relay/features/ — if a feature file with the same name or topic
      exists, note the overlap and use a distinct filename that clarifies this
      is an issue (e.g., prefix with the specific problem)
   c. Create .relay/issues/[descriptive_name].md with:
      - *Created: [YYYY-MM-DD]*
      - Title and severity (P0 critical / P1 high / P2 medium / P3 low)
      - Problem statement: what's wrong and why it matters
      - Current state: exact file paths, line numbers, code snippets
      - Impact: what breaks, what's degraded, who's affected
      - Proposed fix: concrete remediation steps
      - Affected files: list of files that need changes
Focus on real, actionable issues. Do not report style preferences,
minor naming quibbles, or hypothetical problems that require unlikely inputs.

Output: New issue files in .relay/issues/

## Navigation
When finished, tell the user:
- "Next: run **/relay-scan** to update project status, then **/relay-order** to prioritize the work."

## Scoping Variants

To narrow the scan, the user can append one of these:

- **Scope to a module**: `Focus your scan on src/search/ and src/extraction/`
- **Scope to a concern**: `Focus on security issues only`
- **Scope to recent changes**: `Focus on files changed in the last 5 commits (use git diff)`
- **Depth**: `Do a deep scan — read every function body` vs `Do a quick scan — focus on public API and integration points`

## Notes

- This skill reads and scans the codebase but does not modify relay-status.md or relay-ordering.md — run /relay-scan and /relay-order separately after discovery
- Already-documented items (in .relay/issues/, .relay/features/, or .relay/archive/) should be skipped, not re-reported
- For filing a single known issue, use /relay-new-issue instead — /relay-discover is for systematic codebase-wide scans
- Scoping variants (module, concern, depth) can be combined for targeted scans
