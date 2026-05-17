# Relay /relay-auto PreCompact hook (PowerShell port).
# Snapshots active sessions' state.json + latest per-item summary before context compaction.
$ErrorActionPreference = "SilentlyContinue"
if ($env:CLAUDE_PROJECT_DIR) { Set-Location -LiteralPath $env:CLAUDE_PROJECT_DIR }
& node .claude\hooks\relay-hook-runtime.js pre-compact 2>$null
exit 0
