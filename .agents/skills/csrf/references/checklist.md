# CSRF Checklist

- [ ] All routes are `GET` only, or each unsafe route has a CSRF review
- [ ] CORS `methods` list matches the actual routes
- [ ] CORS origin is a specific value, not `true` or `*`, when credentials are used
- [ ] `CORS_ORIGIN` is set explicitly in production
- [ ] Any cookies use `SameSite` and `Secure` as appropriate
- [ ] No state changes triggered by `GET` requests
