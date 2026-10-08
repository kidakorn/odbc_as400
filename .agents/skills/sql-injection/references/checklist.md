# SQL Injection Checklist

- [ ] Every `sqlTemplate` is read-only (starts with `SELECT`, no DML/DDL)
- [ ] All request values pass through `toPositional` bind markers
- [ ] No request data reaches `withRowLimit` or any identifier position
- [ ] Identifiers come only from `endpoints.json` or validated config
- [ ] Every declared parameter is checked by `validateQuery`
- [ ] Missing optional parameters bind `null`
- [ ] Errors from the driver are not returned to clients
- [ ] Bound values are not written to logs
