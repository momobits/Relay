#!/usr/bin/env bash
# Relay /relay-auto PreCompact hook.
# Snapshots active sessions' state.json + latest per-item summary to
# .relay/.auto-session/<session>/snapshots/precompact-<ts>-*.json before context compaction.
set -u
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
node .claude/hooks/relay-hook-runtime.js pre-compact 2>/dev/null || true
