#!/usr/bin/env bash
# Relay /relay-auto Stop hook.
# Appends one JSONL marker per Claude turn to .relay/.auto-session/_turn-log.jsonl.
# Audit trail of orchestrator activity (queue position + timestamp per turn).
set -u
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
node .claude/hooks/relay-hook-runtime.js stop 2>/dev/null || true
