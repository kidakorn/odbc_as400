---
name: xss
description: Cross-site scripting review for the odbc_as400 JSON API. Use when reviewing responses, headers, CORS, or any HTML output. Triggers: XSS, cross-site scripting, helmet, response headers, ช่องโหว่ XSS.
---

# Cross-Site Scripting (XSS)

## Scope
- Files: `src/app.js`, `src/controllers/endpointController.js`, `src/middleware/errorHandler.js`.
- The API returns JSON only. Check for any path that returns HTML or reflects input.
- Read-only review by default. Propose edits, then wait for `approve`.

## Approval Gate
- Show the diff before any edit and stop.
- Continue only after the user replies `approve`.

## How the project defends
- `helmet()` is applied in `src/app.js`, setting security headers including `X-Content-Type-Options`.
- `app.disable('x-powered-by')` is set.
- Responses use `res.json(...)`, which sets `Content-Type: application/json`.

## Rules
1. Never return HTML built from request data. Keep `res.json` for all responses.
2. Do not reflect query values into error messages returned to a browser when they could be rendered as HTML.
3. Keep `Content-Type` correct on every response, including errors.
4. If HTML is ever added, encode output with a context-aware encoder and set a Content-Security-Policy.
5. Do not use `res.send(userInput)` with a string.
6. Keep `helmet` enabled; do not disable it per route without review.

## Workflow
1. Read the files listed above.
2. Check each rule in [checklist](references/checklist.md).
3. Report with severity and file links; wait for `approve` before any fix.
