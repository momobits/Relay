#!/usr/bin/env bash
# Relay /relay-auto SubagentStop hook.
# Appends one JSONL marker per subagent stop to .relay/.auto-session/_subagent-log.jsonl.
# Redundant copy of per-item agent activity (the orchestrator already writes summaries to disk).
set -u
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
node .claude/hooks/relay-hook-runtime.js subagent-stop 2>/dev/null || true
