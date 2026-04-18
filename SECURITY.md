# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.x     | Yes       |
| 2.x     | No        |
| 1.x     | No        |

Only the latest release receives security updates.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, use one of these channels:

1. **GitHub Security Advisories** (preferred): Go to the [Security tab](https://github.com/momobits/Relay/security/advisories) and create a private advisory
2. **Email**: Contact the maintainers directly

### What to Include

- Type of vulnerability (e.g., path traversal, prompt injection, arbitrary file write)
- Affected files or skills
- Steps to reproduce
- Proof of concept (if available)
- Impact assessment

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgment | 48 hours |
| Assessment | 7 days |
| Fix (critical) | 30 days |
| Fix (other) | 90 days |

## Scope

### In Scope

- Vulnerabilities in Relay skill workflows (e.g., a skill that writes outside `.relay/`)
- Path traversal in file operations (archive, move, create)
- Prompt injection that causes skills to deviate from documented behavior
- Supply chain risks in the npm installer
- Information disclosure through skill outputs

### Out of Scope

- Vulnerabilities in Claude Code itself (report to [Anthropic](https://www.anthropic.com))
- Issues in user-created custom skills
- AI model behavior unrelated to Relay's skill instructions
- Denial of service through large projects (inherent to the tool)

## Best Practices for Users

- Review AI-generated code before committing
- Keep Relay updated to the latest version
- Use `.gitignore` to exclude sensitive files from `.relay/` scans
- Run Relay in projects you trust — skills read and write files in your project directory
