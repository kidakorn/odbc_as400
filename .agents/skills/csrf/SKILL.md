---
name: csrf
description: Cross-site request forgery review for the odbc_as400 API. Use when reviewing HTTP methods, CORS, cookies, or state-changing routes. Triggers: CSRF, CORS, cross-site request forgery, ปลอมแปลงคำขอ.
---

# Cross-Site Request Forgery (CSRF)

## Scope
- Files: `src/app.js`, `src/routes/index.js`, `src/config/index.js`.
- Read-only review by default. Propose edits, then wait for `approve`.

## Approval Gate
- Show the diff before any edit and stop.
- Continue only after the user replies `approve`.

## How the project defends
- CORS is restricted: `cors({ origin: config.corsOrigin, methods: ['GET'] })`.
- `CORS_ORIGIN` defaults to `false`, which disables cross-origin access unless set.
- The API exposes only `GET` routes, so there are no state-changing endpoints.

## Rules
1. Keep the API read-only. Any new `POST`, `PUT`, `PATCH`, or `DELETE` route needs a CSRF review first.
2. Never set `origin: true` or `'*'` together with credentials.
3. If cookies or sessions are added, use `SameSite=Strict` or `Lax` and a CSRF token for unsafe methods.
4. Do not treat a `GET` request as proof of intent to change state.
5. Keep `CORS_ORIGIN` as a specific origin list in production.

## Workflow
1. Read the files listed above.
2. Check each rule in [checklist](references/checklist.md).
3. Report with severity and file links; wait for `approve` before any fix.
