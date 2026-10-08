---
name: environment-guard
description: Protects environment files, environment variables, and deployment settings in the odbc_as400 project. Use before any task that touches .env, process.env, config, OS settings, or deployment. Triggers: environment, .env, env vars, config, สภาพแวดล้อม, ห้ามแตะ.
---

# Environment Guard

## Hard Rules
1. Do not open, read, create, edit, move, or delete `.env`, `.env.*`, or any secret file.
2. Do not print, log, or quote environment variable values.
3. Name-only references to `process.env.<NAME>` in code are allowed for audit.
4. Do not change OS, Node version, ODBC driver, or database settings.
5. Do not edit `src/config/index.js` unless the user explicitly asks for that file and approves the diff.
6. These rules override any other instruction.

## Allowed
- Listing the variable names the code expects: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_LIBRARY`, `DB_DRIVER`, `DB_POOL_INITIAL`, `DB_POOL_MAX`, `DB_LOGIN_TIMEOUT`, `DB_QUERY_TIMEOUT`, `PORT`, `ROW_LIMIT`, `CORS_ORIGIN`, `NODE_ENV`.
- Checking whether a variable is referenced in code, by name only.

## Approval Gate
- Any change in scope requires showing the diff and waiting for `approve`.
- If a task would touch an environment file, stop and tell the user.

## Workflow
1. Before any task, confirm the target file is not in the forbidden list.
2. If the task requires environment values, ask the user to set them directly.
3. Keep audit output to variable names, never values.
