#!/usr/bin/env node
// Relay /relay-auto hook runtime.
//
// Single file implementing all 4 Claude Code hook handlers for the
// /relay-auto orchestrator. The 8 shell wrappers in this directory
// (relay-*.{sh,ps1}) are trivial — they cd to CLAUDE_PROJECT_DIR and
// invoke `node <this-file> <hook-name>`.
//
// Hooks:
//   session-start  → scan .relay/.auto-session/, emit markers for active
//                    sessions so Claude knows on cold start
//   pre-compact    → snapshot active session state.json + latest per-item
//                    summary to .relay/.auto-session/<session>/snapshots/
//                    so the orchestrator can recover from mid-item compact
//   subagent-stop  → append to .relay/.auto-session/_subagent-log.jsonl
//                    (redundant copy of per-item agent activity)
//   stop           → append to .relay/.auto-session/_turn-log.jsonl
//                    (per-turn audit trail with queue position)
//
// Contracts:
// - Never throws. All disk I/O is wrapped in try/catch. Hooks must NEVER
//   block Claude Code; we exit 0 on any internal error, log to stderr.
// - Silent when no active sessions exist (zero stdout, exit 0).
// - Uses only Node built-ins (fs, path) — no dependencies.
// - Reads CLAUDE_PROJECT_DIR (set by the cwd-anchor wrapper) and falls
//   back to process.cwd() if unset.
//
// Retention: pre-compact keeps the last 10 snapshots per session. Older
// snapshots are pruned on each fire.

const fs = require("fs");
const path = require("path");

const SNAPSHOT_RETENTION = 10;
const AUTO_SESSION_DIR = path.join(".relay", ".auto-session");

function getProjectDir() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function autoSessionRoot() {
  return path.join(getProjectDir(), AUTO_SESSION_DIR);
}

function safeReadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function listActiveSessions() {
  const root = autoSessionRoot();
  if (!fs.existsSync(root)) return [];

  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const sessions = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue; // skip log files / reserved dirs

    const statePath = path.join(root, entry.name, "state.json");
    const state = safeReadJSON(statePath);
    if (!state) continue;
    if (state.status !== "active" && state.status !== "paused") continue;

    sessions.push({
      name: entry.name,
      status: state.status,
      mode: state.mode || "single",
      current_index: state.current_index ?? 0,
      total: Array.isArray(state.queue) ? state.queue.length : 0,
      pause_reason: state.pause_reason || null,
      last_activity: state.last_activity || null,
      state_path: statePath,
    });
  }
  return sessions;
}

function compactSummary(sessions) {
  return sessions.map((s) => ({
    name: s.name,
    queue: `${s.current_index}/${s.total}`,
    status: s.status,
    mode: s.mode,
  }));
}

// ────────────────────────────────────────────────────────────────────────
// SessionStart — emit markers Claude reads on every cold start
// ────────────────────────────────────────────────────────────────────────
function hookSessionStart() {
  const sessions = listActiveSessions();
  if (sessions.length === 0) return;

  console.log("[relay-auto:session-start]");
  for (const s of sessions) {
    console.log("[relay-auto:active]");
    console.log(`session: ${s.name}`);
    console.log(`status: ${s.status}`);
    console.log(`mode: ${s.mode}`);
    console.log(`queue: ${s.current_index}/${s.total}`);
    if (s.pause_reason) console.log(`pause_reason: ${s.pause_reason}`);
    if (s.last_activity) console.log(`last_activity: ${s.last_activity}`);
    console.log("[/relay-auto:active]");
    console.log("");
  }

  if (sessions.length === 1) {
    const s = sessions[0];
    console.log(
      `-> Active /relay-auto session detected: \`${s.name}\` (${s.status}, ${s.current_index}/${s.total}). ` +
      `Run \`/relay-auto --resume\` to continue, or \`/relay-auto --list\` for details.`
    );
  } else {
    console.log(
      `-> ${sessions.length} active /relay-auto sessions detected. ` +
      `Run \`/relay-auto --list\` to choose one, or \`/relay-auto --resume --session <name>\` to continue a specific one.`
    );
  }
}

// ────────────────────────────────────────────────────────────────────────
// PreCompact — snapshot in-flight state before context compaction
// ────────────────────────────────────────────────────────────────────────
function hookPreCompact() {
  const sessions = listActiveSessions();
  if (sessions.length === 0) return;

  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  for (const s of sessions) {
    const sessionDir = path.join(autoSessionRoot(), s.name);
    const snapDir = path.join(sessionDir, "snapshots");

    try {
      fs.mkdirSync(snapDir, { recursive: true });
    } catch (err) {
      process.stderr.write(`[relay-pre-compact] could not create snapshot dir for ${s.name}: ${err.message}\n`);
      continue;
    }

    // Snapshot state.json (the orchestrator's authoritative cursor)
    try {
      const stateContent = fs.readFileSync(s.state_path, "utf8");
      fs.writeFileSync(path.join(snapDir, `precompact-${ts}-state.json`), stateContent, "utf8");
    } catch (err) {
      process.stderr.write(`[relay-pre-compact] could not snapshot state for ${s.name}: ${err.message}\n`);
    }

    // Snapshot the most recently written per-item summary, if any.
    // This is the file most likely to be lost on mid-item compaction:
    // the orchestrator wrote it just before context filled up, and the
    // next turn's resume will need to detect it exists.
    try {
      const items = fs.readdirSync(sessionDir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".json") && e.name !== "state.json")
        .map((e) => ({
          name: e.name,
          mtime: fs.statSync(path.join(sessionDir, e.name)).mtimeMs,
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (items.length > 0) {
        const newest = items[0];
        const src = path.join(sessionDir, newest.name);
        const dst = path.join(snapDir, `precompact-${ts}-latest-${newest.name}`);
        fs.copyFileSync(src, dst);
      }
    } catch (err) {
      process.stderr.write(`[relay-pre-compact] could not snapshot latest summary for ${s.name}: ${err.message}\n`);
    }

    // Retention: keep only the last SNAPSHOT_RETENTION precompact FIRES per session.
    // Each fire writes 1-2 files sharing the same `precompact-<ts>-` prefix; we group
    // by the embedded ISO-shape timestamp so a fire counts as one slot, not two.
    try {
      const TS_RE = /^precompact-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)-/;
      const allSnaps = fs.readdirSync(snapDir)
        .filter((n) => n.startsWith("precompact-"))
        .map((n) => {
          const m = n.match(TS_RE);
          return { name: n, ts: m ? m[1] : n };
        });

      const uniqueTsDesc = [...new Set(allSnaps.map((s) => s.ts))].sort().reverse();
      const tsToKeep = new Set(uniqueTsDesc.slice(0, SNAPSHOT_RETENTION));
      for (const snap of allSnaps) {
        if (!tsToKeep.has(snap.ts)) {
          try { fs.unlinkSync(path.join(snapDir, snap.name)); } catch {}
        }
      }
    } catch {
      // Retention failure is non-fatal — snapshots will accumulate at worst.
    }
  }

  console.log(`[relay-auto:pre-compact] snapshotted ${sessions.length} active session(s)`);
}

// ────────────────────────────────────────────────────────────────────────
// SubagentStop — append per-item agent return marker to JSONL log
// ────────────────────────────────────────────────────────────────────────
function hookSubagentStop() {
  const sessions = listActiveSessions();
  if (sessions.length === 0) return;

  const logPath = path.join(autoSessionRoot(), "_subagent-log.jsonl");
  const entry = {
    ts: new Date().toISOString(),
    event: "subagent-stop",
    active_sessions: compactSummary(sessions),
  };

  try {
    fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    process.stderr.write(`[relay-subagent-stop] could not write log: ${err.message}\n`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Stop — append per-turn audit marker to JSONL log
// ────────────────────────────────────────────────────────────────────────
function hookStop() {
  const sessions = listActiveSessions();
  if (sessions.length === 0) return;

  const logPath = path.join(autoSessionRoot(), "_turn-log.jsonl");
  const entry = {
    ts: new Date().toISOString(),
    event: "stop",
    active_sessions: compactSummary(sessions),
  };

  try {
    fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    process.stderr.write(`[relay-stop] could not write log: ${err.message}\n`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Dispatch
// ────────────────────────────────────────────────────────────────────────
const cmd = process.argv[2];

try {
  switch (cmd) {
    case "session-start": hookSessionStart(); break;
    case "pre-compact":   hookPreCompact();   break;
    case "subagent-stop": hookSubagentStop(); break;
    case "stop":          hookStop();         break;
    case "--list-hooks":
      // Used by install-hooks to enumerate supported hooks programmatically.
      console.log("session-start\npre-compact\nsubagent-stop\nstop");
      break;
    default:
      process.stderr.write(`Unknown hook: ${cmd}\n`);
      process.exit(1);
  }
} catch (err) {
  // Hooks must NEVER block Claude Code. Log to stderr, exit 0.
  process.stderr.write(`[relay-hook:${cmd}] internal error: ${err.message}\n`);
  process.exit(0);
}
