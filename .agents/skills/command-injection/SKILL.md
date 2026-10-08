---
name: command-injection
description: Command injection review for the odbc_as400 Node.js service. Use when reviewing child_process, shell execution, dynamic module loading, or any path built from input. Triggers: command injection, exec, spawn, shell, การฉีดคำสั่ง.
---

# Command Injection

## Scope
- Files: all of `src/` and `server.js`.
- Read-only review by default. Propose edits, then wait for `approve`.

## Approval Gate
- Show the diff before any edit and stop.
- Continue only after the user replies `approve`.

## How the project defends
- The project currently does not import `child_process`. Confirm this with a search before concluding.
- Endpoint definitions come from `src/endpoints/endpoints.json`, not from requests.

## Rules
1. Never call `exec` or `execSync` with a string that includes request data.
2. If a process must run, use `spawn` or `execFile` with an argument array and `shell: false`.
3. Never pass request data to `require`, `import`, or `fs` paths without an allowlist.
4. Never use `eval` or `new Function` with request data.
5. Validate any value used as a file path against a fixed base directory and reject `..`.
6. Keep `NODE_OPTIONS` and similar environment-driven behavior out of request handling.

## Workflow
1. Search `src/` and `server.js` for `child_process`, `exec`, `spawn`, `eval`, `Function(`, `require(`, and `fs.`.
2. Check each rule in [checklist](references/checklist.md).
3. Report with severity and file links; wait for `approve` before any fix.
