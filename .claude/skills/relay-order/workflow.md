# Relay: Generate Solution Ordering

**Sequence**: `/relay-scan` → **`/relay-order`** → `/relay-analyze` → ...

Generate a solution ordering for all outstanding work:

0. Read the "*Last generated:*" date in .relay/relay-status.md. If it
   is more than 1 day old, WARN the user: "relay-status.md was generated
   on [date] — consider running **/relay-scan** first to refresh before
   ordering." Wait for the user to confirm before proceeding.

1. Read .relay/relay-status.md for current item status
2. Read the full content of every OUTSTANDING and PARTIAL item
   (files in .relay/issues/ and .relay/features/)
   - Exclude brainstorm files (*_brainstorm.md) — these are managed by
     the feature workflow, not actionable work items. Only individual
     feature files (created by /relay-design) are ordered here.
3. Check for intra-feature dependencies:
   - Read the Development Order and Dependencies sections in individual
     feature files — these record which features depend on others and
     link back to their brainstorm for context
   - Respect these intra-feature orderings: keep related features grouped
     and sequenced as specified unless a cross-cutting dependency overrides
4. Analyze cross-item dependencies (does resolving X require Y first?)
5. Consider: severity/priority, complexity, blast radius, quick wins
6. Update the `*Last generated:*` date header to today's date (YYYY-MM-DD).
   Produce an ordered implementation plan in .relay/relay-ordering.md with:
   - Phases (groups of items that can be done together)
   - For each item: ID, title, file link, estimated complexity, dependencies
   - Rationale for the ordering
   - If a phase contains related features (sharing the same brainstorm
     link), note their intended build order from the feature files
7. Keep RESOLVED items in the phases where they were originally placed,
   struck through with a link to their implementation doc. This preserves
   phase history and context. Only create new ordering entries for
   OUTSTANDING and PARTIAL items. Fully completed phases should be marked
   with "— COMPLETE" in their heading.

Output: Updated .relay/relay-ordering.md

## Navigation
When finished, tell the user:
- "Next: run **/relay-analyze** and specify which phase/item to work on from relay-ordering.md."

## Notes

- relay-ordering.md is a generated artifact — regenerate it when the backlog changes
- The ordering should consider both issues (bugs/gaps) and features (new capabilities)
- Dependencies matter: e.g., a feature may require an issue to be resolved first
- Feature files from /relay-design carry explicit Development Order metadata — use it
- Brainstorm files are excluded — feature files carry their own Development Order and Dependencies metadata from /relay-design
