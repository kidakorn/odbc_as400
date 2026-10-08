---
name: secure-coding
description: Secure coding practices for the odbc_as400 Node.js/Express API. Use when writing or reviewing code for input validation, error handling, dependencies, or secrets. Triggers: secure coding, code best practices, ปลอดภัย, code review.
---

# Secure Coding

## Scope
- Applies to `src/` and `server.js`.
- Read-only review by default. Propose edits, then wait for `approve`.
- Never read or print `.env` values. See the environment-guard skill.

## Approval Gate
- Show the diff before any edit and stop.
- Continue only after the user replies `approve`.

## Rules
1. Validate all input at the boundary. Use `validateQuery` in `src/services/endpointService.js` as the pattern: reject unknown keys, repeated keys, and over-length values.
2. Use allowlists over denylists for parameter names, values, and enums.
3. Never expose driver or stack details. Keep `src/middleware/errorHandler.js` returning a generic message for unexpected errors.
4. Keep secrets out of code and logs. Read them only through `src/config/index.js`.
5. Fail closed. Missing required config must exit, as `src/config/index.js` does.
6. Keep dependencies current. Flag packages with known vulnerabilities; do not install without `approve`.
7. Keep `'use strict';` and avoid `eval`, `new Function`, and dynamic `require` of user input.
8. Log with context but without sensitive values.

## Workflow
1. Read the target files.
2. Check each rule in [checklist](references/checklist.md).
3. Report findings with severity and a file link.
4. For each fix, show the diff and wait for `approve`.
