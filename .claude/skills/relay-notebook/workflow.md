# Relay: Code — Create & Validate Verification Notebook

**Sequence**: `/relay-analyze` → `/relay-plan` → `/relay-review` → *implement* → `/relay-verify` → **`/relay-notebook`** → `/relay-resolve`

Create a verification notebook for each implemented and verified issue/feature
file in this phase, then RUN every cell and iterate until all cells pass.

## Prerequisites Check

Before proceeding, read the target item file(s) and verify the **most
recent** ## Verification Report section has verdict COMPLETE (from
/relay-verify). Note: there may be multiple Verification Report sections
if re-verification occurred — check the last one. If missing or the last
verdict is not COMPLETE, STOP and tell the user:
"No completed verification found. Run **/relay-verify** first."

## Part 0 — Environment Check

Before creating the notebook, verify the notebook execution dependencies
are available:

1. Check if `nbclient`, `nbformat`, and `nbconvert` are importable:
   ```
   python3 -c "import nbclient, nbformat, nbconvert"
   ```
   Also check that IPython 7+ is available (required for top-level
   `await` directly in notebook cells):
   ```
   python3 -c "import IPython; v=tuple(int(x) for x in IPython.__version__.split('.')[:2]); assert v>=(7,0), f'IPython 7+ required for top-level await, found {IPython.__version__}'"
   ```
   If the IPython check fails, upgrade before proceeding:
   `pip install --upgrade ipython ipykernel`

2. If all checks pass, proceed to Part A.

3. If they are NOT available:
   a. Look for an existing virtual environment (`.venv/`, `venv/`, or
      check if already running inside one via `sys.prefix != sys.base_prefix`).
   b. If a venv exists: activate it and run
      `pip install nbclient nbformat nbconvert`, then proceed to Part A.
   c. If no venv exists but Python 3 is available: ask the user before
      installing globally: "No virtual environment found. Install
      nbclient/nbformat/nbconvert into the system Python? (Or create a
      venv first with `python3 -m venv .venv`)"
      If the user approves, run `pip install nbclient nbformat nbconvert`,
      then proceed to Part A.
   d. If Python 3 is not available: tell the user
      "Python 3 is required for verification notebooks. Install Python 3
      and re-run this step." Do NOT proceed — this is a blocker.

## Part A — Create the Notebook

Location: .relay/notebooks/
Naming: Use the SAME name as the issue/feature file, but with .ipynb
extension instead of .md.
  e.g., `delete_entity_not_atomic.md` → `delete_entity_not_atomic.ipynb`

For each issue/feature file in the phase:

1. HEADER CELL (markdown):
   - Title: `# [Item Title]: Verification`
   - Brief description of what was changed and what this notebook tests
   - Table of what changed (before/after, or list of changes)
   - Reference to the item file (use repo-root-relative paths so links
     work both before and after the notebook is archived):
     ```
     **Item file**: [.relay/issues/FILENAME.md](.relay/issues/FILENAME.md) or [.relay/features/FILENAME.md](.relay/features/FILENAME.md)
     (after resolution: [.relay/archive/issues/FILENAME.md](.relay/archive/issues/FILENAME.md) or [.relay/archive/features/FILENAME.md](.relay/archive/features/FILENAME.md))
     ```
   - Prerequisites (database, env vars, install steps)

2. SETUP CELL:
   - Read the "### Imports" section of .relay/relay-config.md and use it
     as the import block for this cell
   - Create connection
   - Create isolated test fixtures (unique user, project, namespace with uuid tag)
   - Set up pass/fail tracking:
     ```python
     passed, failed = [], []

     # Use record() when you already have a boolean condition to check.
     # Example: record('entity exists', entity is not None)
     def record(name, condition, detail=''):
         if condition:
             passed.append(name)
             print(f'  PASS: {name}')
         else:
             failed.append(name)
             print(f'  FAIL: {name} -- {detail}')

     # Use run_test() when your test is a callable that might throw
     # an exception. It catches errors and records them as failures.
     # Example: await run_test('ingest works', lambda: m.ingest(ns_id, text))
     async def run_test(name, fn):
         """Wrapper that catches exceptions and records them as failures."""
         try:
             result = fn()
             if asyncio.iscoroutine(result):
                 result = await result
             if isinstance(result, bool):
                 record(name, result)
             elif result is None:
                 record(name, True)  # No return = completed without error
             else:
                 record(name, bool(result), f'returned falsy: {result!r}' if not result else '')
         except Exception as e:
             record(name, False, str(e))
     ```

**CRITICAL — Integration, not simulation**: The notebook MUST exercise the
   project's real code — import the actual modules, connect to real backends,
   call the public API, and verify observable behavior end-to-end. Do NOT
   reimplement or simulate the fixed logic locally in the notebook. If a
   notebook can run without the project's dependencies (database, services,
   etc.), it is a unit test duplicate, not a verification notebook. Unit tests
   already cover isolated logic — this step validates the fix works in the
   integrated system.

3. SEED DATA: Ingest realistic test content that exercises the changed code path.
   Read the "### Standard Fixtures" section of .relay/relay-config.md for
   the project's standard test content and domain conventions. Use those
   unless the specific change requires different data.

4. CORE VERIFICATION (one section per aspect of the change):
   - Each section has a markdown header explaining what it tests
   - Each test uses `record()` for pass/fail tracking
   - Tests should verify BEHAVIOR, not implementation details
   - Include the specific scenario that was broken/missing before the change

5. EDGE CASES:
   - Empty input, None values, boundary conditions
   - The specific edge cases identified during the review (/relay-review)

6. REGRESSION CHECKS:
   - Verify that related functionality still works after the change
   - If the change touches extraction: verify search still works
   - If the change touches storage: verify ingest/search/export still work
   - If the change touches API: verify public API equivalents still work

7. SUMMARY CELL:
   ```python
   print(f'RESULTS: {len(passed)} passed, {len(failed)} failed')
   if failed:
       print('\nFailed:')
       for name in failed:
           print(f'  FAIL: {name}')
   else:
       print('All tests passed!')
   ```

8. CLEANUP CELL:
   - Delete any test fixtures created in the SETUP CELL (users, projects,
     namespaces, test data) to prevent test artifacts from accumulating
   - Close connections and release resources
   - Read the "### Cleanup Pattern" section of .relay/relay-config.md and
     use it as the basis for this cell's teardown code.

## Part B — Run, Validate, and Iterate

After creating the notebook, execute every cell sequentially. For each cell
that errors or produces a FAIL:

1. DIAGNOSE the failure. Classify it as one of three types:

   a) NOTEBOOK CODE ISSUE — the cell code itself is wrong (typo, wrong API
      call, incorrect assertion, missing await, etc.)
      → Fix the cell code directly and re-run. No item file update needed.

   b) PROJECT CODE ISSUE — RELATED to the current change. The implementation
      is incomplete, has a bug, or introduced a regression in the code path
      that was just changed.
      → Append a Post-Implementation Fix to the item file (see below).
      → Implement the fix in the project code.
      → Re-run the failing cell.

   c) PROJECT CODE ISSUE — UNRELATED to the current change. A pre-existing
      bug that the notebook happened to expose.
      → Flag this to the user. Do NOT fix it inline.
      → Invoke **/relay-new-issue** to create a new issue file. Provide
        the notebook context:
        - Currently working on: [item file being verified]
        - Notebook: [notebook file]
        - Failing cell: [cell description]
        - Error: [the actual error]
      → In the notebook, mark the cell with a comment:
        ```python
        # KNOWN ISSUE: see .relay/issues/[new_issue_name].md
        # (after resolution: .relay/archive/issues/[new_issue_name].md)
        ```
      → Continue to the next cell.

2. For type (b) — RELATED project code issues:

   Append to the item file in .relay/issues/ or .relay/features/ (do NOT replace
   existing sections — these are additive):

   ---

   ## Post-Implementation Fix #[N]

   *Date: [YYYY-MM-DD]*
   *Found during: notebook cell [cell description]*

   ### Problem
   - What failed and what the error/unexpected behavior was
   - Root cause: what the original implementation missed or got wrong

   ### Plan
   - Specific code changes to fix this
   - Files to modify

   ### Rollback
   - How to revert just this post-implementation fix
   - Whether reverting this also requires reverting the original change

   After documenting, implement the fix, then re-run the failing cell.
   If the fix introduces further failures, repeat this process as
   Post-Implementation Fix #[N+1].

3. Keep iterating until:
   - All cells pass, OR
   - All remaining failures are type (c) unrelated issues with
     `# KNOWN ISSUE` comments

4. Once stable, update the notebook's summary cell output to reflect
   the final pass/fail state.

Output: Validated notebook(s) in .relay/notebooks/, updated item file(s)
if post-implementation fixes were needed

## Navigation
When finished, tell the user:
- "Next: run **/relay-resolve** to close out and archive."

## Guidelines

- Read the "### Async Pattern" section of .relay/relay-config.md for
  project-specific async, logging flush, and timing requirements
- Use `uuid.uuid4().hex[:8]` tags for test isolation
- Prefer `record()` assertions over bare `assert` — record() shows all
  results at the end, assert stops at first failure
- Keep test content short but realistic — enough to trigger the code path
- Do NOT test implementation details (internal method calls, log messages) —
  test observable behavior (return values, stored data, search results)
- Every cell must produce visible output (print statements, record() calls)
  so the user can review what happened during execution
- Build high-quality verification cells that thoroughly test the fix/feature
  in the context of the actual project — not toy examples
- Log intermediate state (e.g., print entity counts, show query results)
  so failures are diagnosable from the notebook output alone
- Run every cell and verify the output before considering the notebook done —
  a notebook with untested cells is incomplete

## Notes

- Notebooks live in `.relay/notebooks/`, NOT in the project root `notebooks/` directory
- Notebook filename matches the issue/feature filename (`.md` → `.ipynb`) for traceability
- The header cell includes both the active and archived path so the link works before and after resolution
- When /relay-resolve archives the item, it also archives the notebook to `.relay/archive/notebooks/`
- Every notebook should be self-contained: create its own fixtures, don't depend on other notebooks
- If a phase has multiple item files, create one notebook per item file (not one giant notebook)
- Post-Implementation Fixes are numbered sequentially (#1, #2, #3...) and never replace each other — this preserves the full history of what went wrong and how it was addressed
- If a post-implementation fix is large or complex enough to warrant full analysis, escalate: tell the user to re-run /relay-analyze → /relay-plan → /relay-review for it instead of handling inline
- For type (c) unrelated issues: /relay-new-issue handles the issue filing — provide the notebook context so it can investigate from a cold start
