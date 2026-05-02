# Relay: Generate Solution Ordering

**Sequence**: `/relay-scan` → **`/relay-order`** → `/relay-analyze` → ...

Generate a solution ordering for all outstanding work:

0. Read the "*Last generated:*" date in .relay/relay-status.md. If it
   is more than 1 day old, WARN the user: "relay-status.md was generated
   on [date] — consider running **/relay-scan** first to refresh before
   ordering." Wait for the user to confirm before proceeding.

1. Read .relay/relay-status.md for current item status

1.5. **Promoted-feature pre-pass (Phase 12-4)**: BEFORE reading active items in step 2, scan `.relay/features/` for files whose front-matter contains `*Promoted from:*`. For each promoted feature:
   - Parse `*Promoted from: [<source>.md](../archive/issues/<source>.md)*` to extract the source issue's archive path.
   - Read `.relay/archive/issues/<source>.md` and look for the source's prior phase placement in the most-recent /relay-ordering.md (currently committed; before regeneration). The source's strikethrough row in /relay-ordering.md identifies the phase slot to inherit.
   - Build the **issue → feature inheritance map**: `{<source-archive-path>: <promoted-feature-path>, <inherited-phase>: <phase-name>}`. Step 6's rendering will replace the source's struck-through row with the promoted feature row at the inherited slot.
   - **Lean: silent inherit + summarize**: the inheritance is automatic; the regenerated /relay-ordering.md narrative section summarizes which features inherited which slots, but no user prompt is required.
   - **Placement-inheritance flag**: for each entry in the inheritance map, set a `phase_inherited = <inherited-phase>` flag on the promoted feature record (in-memory; not persisted to the feature file). Step 5/6's natural-placement heuristics MUST consult this flag: if set, place the feature at the inherited phase slot AND skip natural-placement computation for it. If not set (source has no prior placement, e.g., promoted from an issue that never appeared in a prior /relay-ordering.md cycle), the promoted feature is placed in step 5/6's normal phase computation. This prevents double-rendering — the feature appears at exactly one phase slot.

2. Read the full content of every OUTSTANDING and PARTIAL item
   (files in .relay/issues/ and .relay/features/)
   - Exclude brainstorm files (*_brainstorm.md) — these are managed by
     the feature workflow, not actionable work items. Only individual
     feature files (created by /relay-design) are ordered here.
   - **Grouped sibling suppression (Phase 12-4)**: if an item file contains a `> Grouped into [<leader>] run on YYYY-MM-DD` annotation AND the leader resolves in `.relay/issues/` or `.relay/features/` (active), treat it as suppressed-from-standalone-ordering. The sibling is rendered only under its run leader in step 6. If the leader resolves in `.relay/archive/issues/` or `.relay/archive/features/` or does not resolve (missing), DE-SUPPRESS — render the sibling as a standalone ordering row with the annotation `(originally grouped under [<leader>] (archived); now standalone per non-closed disposition)`. (Mirrors /relay-scan's leader-active check.)
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
   - **Grouped run rendering (Phase 12-4)**: for every grouped-run leader detected (target's most-recent `### Scope Decision` is `*Mode:* grouped run`), render the row as a compound phase entry:
     ```markdown
     | <ID> | <leader-title> (grouped run, <N> entries) | [<leader>.md](features/<leader>.md) | ... | ... |
     |      | ↳ <sibling-1>.md (existing item, closure: full) | [link](issues/<sibling-1>.md) | inherited from leader | ... |
     |      | ↳ unfiled: module.py::symbol (unfiled candidate, closure: partial - only X) | n/a | inherited from leader | ... |
     ```
     The leader carries the row ID; siblings appear as ↳-prefixed sub-rows that share the leader's complexity/dependencies columns.
   - **Promoted-feature rendering (Phase 12-4)**: for each entry in the issue → feature inheritance map (from step 1.5), replace the source issue's strikethrough row in the prior /relay-ordering.md with the promoted feature's row at the inherited phase slot. Annotate: `<promoted-feature-title> (promoted from [<source>.md](archive/issues/<source>.md), class: lightweight|broad)`.
   - **Broad-promotion planner annotation (Phase 12-4)**: if the promoted feature has `*Promotion Class:* broad` AND no finalized `## Implementation Plan` exists yet, annotate the rationale narrative under the phase: "/relay-superplan preferred on Claude Code; /relay-plan with `### Design Deepening` is the cross-platform fallback. See the promoted feature's Planner Requirements."
7. Keep RESOLVED items in the phases where they were originally placed,
   struck through with a link to their implementation doc. This preserves
   phase history and context. Only create new ordering entries for
   OUTSTANDING and PARTIAL items. Fully completed phases should be marked
   with "— COMPLETE" in their heading.
   - **Stale-position pruning (Phase 12-4)**: when iterating prior /relay-ordering.md rows, identify each entry whose item file is now archived. Branch:
     - If the archived item is **superseded** (archive banner is `> **ARCHIVED - SUPERSEDED**`): the promoted-feature pre-pass (step 1.5) has already mapped its replacement. The replacement's row goes at the inherited phase slot. The original strikethrough row is REMOVED (not preserved as strikethrough) because the lifecycle is now represented by the promoted feature.
     - If the archived item is a **grouped existing-item sibling** (archive banner contains `**ARCHIVED — RESOLVED IN GROUPED RUN**` per /relay-resolve step 4 grouped-sibling archival): the run leader's compound row already lists the sibling as a ↳-sub-row with closure status. The standalone strikethrough row is REMOVED.
     - Otherwise (standard archived completion): preserve the strikethrough row with `→ [impl](implemented/<file>.md)` link as before.

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
- Exercise files (.relay/exercise/<session>/*.md) are NOT ordered work. They represent in-progress review sessions, not prioritized tasks. The issues and brainstorm seeds that result from /relay-exercise-file DO flow into ordering via the normal issue/feature mechanisms.
