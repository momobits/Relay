# Relay /relay-auto SubagentStop hook (PowerShell port).
# Appends one JSONL marker per subagent stop to .relay/.auto-session/_subagent-log.jsonl.
$ErrorActionPreference = "SilentlyContinue"
if ($env:CLAUDE_PROJECT_DIR) { Set-Location -LiteralPath $env:CLAUDE_PROJECT_DIR }
& node .claude\hooks\relay-hook-runtime.js subagent-stop 2>$null
exit 0
