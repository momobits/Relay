#!/usr/bin/env bash
# Relay /relay-auto SessionStart hook.
# Scans .relay/.auto-session/ for active sessions and emits markers Claude reads on cold start.
# Calls .claude/hooks/relay-hook-runtime.js (single Node file with all 4 hook implementations).
set -u
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
node .claude/hooks/relay-hook-runtime.js session-start 2>/dev/null || true
