# Relay /relay-auto SessionStart hook (PowerShell port).
# Scans .relay/.auto-session/ for active sessions and emits markers Claude reads on cold start.
$ErrorActionPreference = "SilentlyContinue"
if ($env:CLAUDE_PROJECT_DIR) { Set-Location -LiteralPath $env:CLAUDE_PROJECT_DIR }
& node .claude\hooks\relay-hook-runtime.js session-start 2>$null
exit 0
