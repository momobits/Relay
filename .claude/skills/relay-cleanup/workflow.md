# Relay: Feature — Cleanup Abandoned Brainstorms

**Sequence**: **`/relay-cleanup`** (standalone utility)

Clean up orphaned brainstorm files in .relay/features/.

This utility handles brainstorm files that were started but abandoned.
Brainstorms with status DESIGN COMPLETE or COMPLETE are managed by the
main workflow (/relay-resolve archives COMPLETE brainstorms automatically).

1. Read every *_brainstorm.md file in .relay/features/.

2. For each brainstorm file, check its status:
   - COMPLETE — should already have been archived by /relay-resolve.
     If found here, archive it (see step 3) with banner:
     > **ARCHIVED** — All features resolved.
   - DESIGN COMPLETE — features may still be in progress. Check the
     Feature Breakdown table: if ALL listed feature files have been
     archived (exist in .relay/archive/features/ but not in .relay/features/),
     this brainstorm was missed by /relay-resolve. Treat it like COMPLETE
     and archive it with banner:
     > **ARCHIVED** — All features resolved.
     If some features are still active in .relay/features/, leave it alone.
   - READY FOR DESIGN — this brainstorm is waiting for /relay-design.
     Ask the user: "Brainstorm [filename] has status READY FOR DESIGN.
     Should I archive it, or leave it for /relay-design?"
   - BRAINSTORMING — this brainstorm was started but never completed.
     Ask the user: "Brainstorm [filename] has status BRAINSTORMING
     (incomplete). Should I archive it?"

3. For each brainstorm the user wants archived:
   - Move it from .relay/features/[file].md to .relay/archive/features/[file].md
   - Add the appropriate banner at the top based on status:
     - COMPLETE: `> **ARCHIVED** — All features resolved.`
     - READY FOR DESIGN: `> **ARCHIVED** — Abandoned. Was ready for design but not progressed.`
     - BRAINSTORMING: `> **ARCHIVED** — Abandoned. Brainstorming was not completed.`
   - If any individual feature files in .relay/features/ reference this
     brainstorm (check the *Brainstorm:* metadata line), warn the user
     that orphaned feature files exist and ask how to handle them.
   - Exercise back-reference update (conditional):
     Check for a `*Source:*` header line. Two patterns are recognized.

     **Default-mode pattern** (unchanged from 5-1):

     `*Source: exercise/<session>/<capability>.md finding <N>*` or
     `*Source: archive/exercise/<session>/<capability>.md finding <N>*`.
     Parse `<session>` and `<capability>` from the matched path.

     If matched, apply default-mode rewrites:

     a. In .relay/relay-exercise.md, find the row for `<capability>`
        in the master hub's Aggregate Capabilities table and update
        its `Latest Findings Filed` column: rewrite
        `features/<slug>_brainstorm.md` to
        `archive/features/<slug>_brainstorm.md`.

     a2. In the session's `_control.md` (active path
         `.relay/exercise/<session>/_control.md` or archive path
         `.relay/archive/exercise/<session>/_control.md`), find the
         row for `<capability>` and apply the same rewrite to its
         `Findings Filed` column.

     b. In the source exercise file (read its path from the `*Source:*`
        line — may be .relay/exercise/<session>/<capability>.md or
        .relay/archive/exercise/<session>/<capability>.md), find the
        finding with `Status: filed: features/<slug>_brainstorm.md`
        and rewrite to
        `Status: filed: archive/features/<slug>_brainstorm.md`.

     **Goal-mode pattern** (NEW — Feature 6-1):

     `*Source: exercise/<session>/_control.md journey step <N>*` or
     `*Source: archive/exercise/<session>/_control.md journey step <N>*`.
     Parse `<session>` (kebab slug) and `<N>` (step number as integer).

     If matched, apply goal-mode rewrites:

     g1. Session `_control.md` Journey table (active path
         `.relay/exercise/<session>/_control.md` or archive path
         `.relay/archive/exercise/<session>/_control.md`): find the
         row where the `Step` column equals `<N>`. In that row's
         `Notes` column, rewrite every occurrence of
         `features/<slug>_brainstorm.md` to
         `archive/features/<slug>_brainstorm.md`.

     g2. Session `_control.md` Session Log: find every line matching
         `/relay-exercise: step <N> gap filed → features/<slug>_brainstorm.md`
         or `/relay-exercise-run: step <N> filed (features/<slug>_brainstorm.md)`.
         Rewrite each `features/<slug>_brainstorm.md` occurrence to
         `archive/features/<slug>_brainstorm.md`.

         Anchoring rule (to prevent substring over-match): the target
         `features/<slug>_brainstorm.md` MUST be preceded by whitespace
         OR `→ ` OR `(` AND followed by whitespace, `)`, `.`, or
         end-of-line. Example counter-case: a longer path
         `features/other_features/<slug>_brainstorm.md` MUST NOT be
         rewritten when the search target is the short path. Use the
         slug + `_brainstorm.md` suffix as the discriminator and verify
         the character immediately before the match is one of
         `/whitespace`, `→ `, or `(`.

     g3. NO master-hub Aggregate Capabilities rewrite. Goal-mode `gap`
         steps never appear in Aggregate Capabilities (per Feature 6-1
         Phase 8), so there is no row to rewrite. Skip this target for
         goal-mode brainstorms.

     Log each rewrite (both modes):
       [relay-cleanup] Rewrote back-reference in .relay/relay-exercise.md: features/X_brainstorm.md → archive/features/X_brainstorm.md
       [relay-cleanup] Rewrote back-reference in .relay/exercise/<session>/_control.md: features/X_brainstorm.md → archive/features/X_brainstorm.md

     Idempotency (both modes): if a path is already in archive form,
     skip the rewrite.

     Note: this handles brainstorm archival only. Issue back-references
     and exercise file archival are owned by /relay-resolve (step 5).

4. Report what was archived and what was left in place.

## Navigation
When finished, tell the user:
- "Cleanup complete. Run **/relay-scan** if you want to refresh the project status."

## Notes

- This is a utility skill — run it when brainstorm files accumulate
- COMPLETE brainstorms are normally archived by /relay-resolve — this skill is a fallback if one was missed
- DESIGN COMPLETE brainstorms are left alone — their features are in the code pipeline
- Always ask the user before archiving BRAINSTORMING and READY FOR DESIGN files — they may be intentionally paused, not abandoned
- If a brainstorm has associated feature files that were already created by /relay-design, those feature files are independent and should NOT be archived just because the brainstorm is
