---
name: security-audit
description: Security audit for the odbc_as400 Node.js/Express API. Use when the user asks for security audit, ตรวจความปลอดภัย, SQL injection, XSS, CSRF, command injection, or secure coding review of this project.
---

# Security Audit

## Scope
- Audit code under `src/` and `server.js` only.
- Read-only by default. Report findings; do not edit files.
- Never read, print, or modify `.env` or environment variable values. See the environment rules below.

## Approval Gate
- Before any file edit, show the proposed diff and stop.
- Continue only after the user replies `approve`.
- Each edit needs its own approval.

## Environment Rules
- Do not open `.env`, `.env.*`, or any secret file.
- Do not print `process.env` values. Name-only references are allowed.
- Do not change deployment, OS, or database configuration.

## Workflow
1. Run the read-only scanner: `node .agents/skills/security-audit/scripts/scan-sql.js src`
2. Review each finding in context. Mark it as confirmed or false positive.
3. Check the remaining categories with the matching skill: `secure-coding`, `sql-injection`, `xss`, `csrf`, `command-injection`.
4. Report findings with severity, file link, and a suggested fix.

## Severity
- **High**: exploitable input reaches SQL, shell, or HTML without validation or binding.
- **Medium**: missing hardening that widens an attack surface, such as leaking driver errors.
- **Low**: style or defense-in-depth gaps.

## Report Format
- Summary: count per severity.
- Findings: `[file](file#Lnn)`, severity, evidence, recommended fix.
- Items not verified: list what could not be checked.

## Project Notes
- SQL uses named markers bound through `toPositional` in `src/db/sql.js`. Row limit is an integer guarded by `withRowLimit`.
- Query parameters are whitelisted by `validateQuery` in `src/services/endpointService.js`.
- Unexpected errors are hidden outside production in `src/middleware/errorHandler.js`. Check whether `err.message` leaks internals in non-production.
- The API is GET-only with helmet and CORS from config.
