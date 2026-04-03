# Contributing to Relay

Thanks for your interest in contributing to Relay! This guide covers how to get involved.

## Philosophy

Relay gives AI coding agents persistent memory. Contributions should make that memory more reliable, more useful, or easier to adopt. We value:

- **Simplicity over cleverness** — skills should be easy to read and maintain
- **Persistence over ephemeral** — everything important gets written to a file
- **Rigor without friction** — the workflow should enforce quality without slowing people down

## Before You Start

1. **Search existing issues** to avoid duplicates
2. **Open an issue first** for anything beyond a typo fix — describe what you want to change and why
3. **Discuss large changes** before writing code — architecture decisions should be collaborative

## What Makes a Good Contribution

**Good fits:**
- Bug fixes in skill workflows
- Improved detection logic (relay-scan, relay-help)
- Better templates for issue/feature files
- New edge case handling in relay-review
- Documentation improvements
- npx installer improvements

**Not a good fit:**
- Adding complexity without clear benefit
- Skills that duplicate existing functionality
- Changes that break the skill-to-skill data contracts (section names, template formats)

## Pull Request Process

### Branch and PR

1. Fork the repository
2. Create a branch from `main`: `git checkout -b feat/your-change`
3. Make your changes
4. Submit a PR targeting `main`

### PR Standards

- **One change per PR** — don't bundle unrelated fixes
- **Keep it small** — 200-400 lines ideal, 800 max
- **Describe the why** — the PR description should explain motivation, not just list changes
- **Update the README** if you add or rename a skill

### Commit Messages

Use conventional commits:

```
feat: add staleness detection to relay-help
fix: relay-verify missing INCOMPLETE state handling
docs: update README workflow diagram
refactor: simplify relay-scan in-progress detection
```

- Keep the subject line under 72 characters
- Use imperative mood ("add", not "added")

## Skill Development

### Adding a New Skill

1. Create `.claude/skills/relay-[name]/SKILL.md` with frontmatter:
   ```yaml
   ---
   name: relay-[name]
   description: 'When to use this skill — be specific for auto-discovery.'
   ---

   Follow the instructions in ./workflow.md.
   ```

2. Create `.claude/skills/relay-[name]/workflow.md` with the skill instructions

3. Wire it in:
   - Add Navigation entries in adjacent skills
   - Add it to the relay-help Available Skills table
   - Add it to relay-setup's version.md Skills Manifest template
   - Add it to the README Skill Reference table

4. If it reads/writes to `.relay/relay-config.md`, add a Phase 2 step in relay-setup

5. Bump the version in `package.json`, `tools/cli.js` (VERSION constant), and the relay-setup version.md template

### Data Contracts

Skills communicate through sections appended to `.relay/issues/*.md` and `.relay/features/*.md` files. These section names are contracts:

| Section | Written by | Read by |
|---------|-----------|---------|
| `## Analysis` | relay-analyze | relay-plan, relay-superplan, relay-scan |
| `## Implementation Plan` | relay-plan or relay-superplan | relay-review, relay-verify, relay-scan |
| `## Adversarial Review` | relay-review | relay-plan or relay-superplan (if REJECTED), relay-verify, relay-scan |
| `## Implementation Guidelines` | relay-review | relay-verify, relay-help, relay-scan |
| `## Verification Report` | relay-verify | relay-notebook, relay-resolve, relay-help, relay-scan |
| `## Post-Implementation Fix #N` | relay-notebook | relay-resolve |

**Do not rename these sections** without updating every skill that reads them.

## Testing Changes

There is no automated test suite (skills are natural language instructions). To verify your changes:

1. Install the modified skills in a test project
2. Run through the affected workflow path end-to-end
3. Verify that Navigation sections route correctly
4. Check that prerequisite checks in downstream skills still match

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
