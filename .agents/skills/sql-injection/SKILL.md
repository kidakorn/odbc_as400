---
name: sql-injection
description: SQL injection review for the odbc_as400 ODBC/IBM i query layer. Use when reviewing query templates, parameter binding, row limits, or SQL built from input. Triggers: SQL injection, query, ODBC, AS400, ฉีด SQL.
---

# SQL Injection

## Scope
- Query path: `src/endpoints/endpoints.json` and `registry.js` -> `src/services/endpointService.js` -> `src/db/query.js` -> `src/db/sql.js`.
- Read-only review by default. Propose edits, then wait for `approve`.

## Approval Gate
- Show the diff before any edit and stop.
- Continue only after the user replies `approve`.

## How the project defends
- Values are bound, never concatenated. `toPositional` in `src/db/sql.js` converts `:name` markers to `?` and passes values separately.
- `withRowLimit` interpolates only after `Number.isInteger` and `>= 1` checks.
- `validateQuery` allows only declared parameter names and enforces `maxLength`.
- `registry.js` requires each `sqlTemplate` to start with `SELECT`.

## Rules
1. Never build SQL with `+`, template literals, or `replace` using request data.
2. Identifiers (table, library, column names) cannot be bound. Take them only from `endpoints.json` or config, validated by an allowlist or pattern such as `LIBRARY_PATTERN` in `src/config/index.js`.
3. A missing `:marker` must bind `null` (as `validateQuery` does), not be left in the SQL.
4. Keep `withRowLimit` integer-only. Do not accept limits from requests.
5. Keep queries read-only; flag any `INSERT`, `UPDATE`, `DELETE`, or DDL in templates.
6. Do not log full SQL with bound values.

## Workflow
1. Read the query path files listed above.
2. Check each rule in [checklist](references/checklist.md).
3. Run `node .agents/skills/security-audit/scripts/scan-sql.js src`. Known false positives: `withRowLimit` in `sql.js` and the `SELECT` check in `registry.js`.
4. Report with severity and file links; wait for `approve` before any fix.
