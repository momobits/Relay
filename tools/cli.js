#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const VERSION = "2.0.6";
const SKILLS_DIR = ".claude/skills";

const RELAY_SKILLS = [
  "relay-analyze",
  "relay-brainstorm",
  "relay-cleanup",
  "relay-design",
  "relay-discover",
  "relay-help",
  "relay-new-issue",
  "relay-notebook",
  "relay-order",
  "relay-plan",
  "relay-resolve",
  "relay-review",
  "relay-scan",
  "relay-setup",
  "relay-superplan",
  "relay-verify",
];

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function install(targetDir) {
  const skillsSrc = path.join(__dirname, "..", SKILLS_DIR);
  const skillsDest = path.join(targetDir, SKILLS_DIR);

  // Verify source skills exist
  if (!fs.existsSync(skillsSrc)) {
    console.error("Error: Relay skills not found in package. Reinstall with: npm install relay-workflow");
    process.exit(1);
  }

  // Create .claude/skills/ in target
  try {
    fs.mkdirSync(skillsDest, { recursive: true });
  } catch (err) {
    console.error(`\n  Error: Cannot create ${skillsDest}\n  ${err.message}\n`);
    process.exit(1);
  }

  // Copy each relay skill
  let installed = 0;
  let skipped = 0;

  for (const skill of RELAY_SKILLS) {
    const src = path.join(skillsSrc, skill);
    const dest = path.join(skillsDest, skill);

    if (!fs.existsSync(src)) {
      console.warn(`  Warning: ${skill} not found in package, skipping`);
      skipped++;
      continue;
    }

    // Check for existing installation
    if (fs.existsSync(dest)) {
      const existingSkill = path.join(dest, "SKILL.md");
      if (fs.existsSync(existingSkill)) {
        // Overwrite — update to latest
        fs.rmSync(dest, { recursive: true, force: true });
      }
    }

    copyDirRecursive(src, dest);
    installed++;
  }

  console.log(`\n  Installed ${installed} Relay skills into ${path.relative(process.cwd(), skillsDest)}/`);
  if (skipped > 0) {
    console.log(`  Skipped ${skipped} (not found in package)`);
  }

  // Show next steps
  console.log(`
  Next steps:
    1. Open Claude Code in your project
    2. Run /relay-setup to initialize the .relay/ data directory
    3. Run /relay-help to see what to do next

  Skills installed:`);

  for (const skill of RELAY_SKILLS) {
    const dest = path.join(skillsDest, skill);
    if (fs.existsSync(dest)) {
      console.log(`    /${skill}`);
    }
  }

  console.log("");
}

function uninstall(targetDir) {
  const skillsDest = path.join(targetDir, SKILLS_DIR);
  let removed = 0;

  for (const skill of RELAY_SKILLS) {
    const dest = path.join(skillsDest, skill);
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`\n  Removed ${removed} Relay skills from ${path.relative(process.cwd(), skillsDest)}/`);
    console.log("  Note: .relay/ data directory was NOT removed (your issues, features, and history are preserved)\n");
  } else {
    console.log("\n  No Relay skills found to remove.\n");
  }
}

function showHelp() {
  console.log(`
  relay-workflow v${VERSION}
  Persistent memory for AI coding workflows

  Usage:
    npx relay-workflow install     Install Relay skills into current project
    npx relay-workflow uninstall   Remove Relay skills (keeps .relay/ data)
    npx relay-workflow version     Show version
    npx relay-workflow help        Show this help

  What it does:
    Copies 15 Claude Code skills into .claude/skills/relay-*/
    These skills give AI agents persistent memory across sessions.

  After install:
    1. Open Claude Code
    2. Run /relay-setup to initialize
    3. Run /relay-help for guidance
  `);
}

// --- Main ---

const args = process.argv.slice(2);
const command = args[0] || "help";
const targetDir = args[1] || process.cwd();

switch (command) {
  case "install":
    console.log(`\n  relay-workflow v${VERSION} — installing...`);
    install(targetDir);
    break;

  case "uninstall":
  case "remove":
    console.log(`\n  relay-workflow v${VERSION} — uninstalling...`);
    uninstall(targetDir);
    break;

  case "version":
  case "--version":
  case "-v":
    console.log(VERSION);
    break;

  case "help":
  case "--help":
  case "-h":
    showHelp();
    break;

  default:
    console.error(`\n  Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
