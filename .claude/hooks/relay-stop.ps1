# Relay /relay-auto Stop hook (PowerShell port).
# Appends one JSONL marker per Claude turn to .relay/.auto-session/_turn-log.jsonl.
$ErrorActionPreference = "SilentlyContinue"
if ($env:CLAUDE_PROJECT_DIR) { Set-Location -LiteralPath $env:CLAUDE_PROJECT_DIR }
& node .claude\hooks\relay-hook-runtime.js stop 2>$null
exit 0
