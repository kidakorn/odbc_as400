# Secure Coding Checklist

- [ ] Input validated at the route or service layer
- [ ] Unknown and repeated query keys rejected
- [ ] Length limits enforced on every declared parameter
- [ ] Unexpected errors return a generic message in production
- [ ] No secrets or connection strings in source or logs
- [ ] Required configuration fails at startup when missing
- [ ] No `eval`, `new Function`, or `child_process` with user data
- [ ] Dependencies reviewed for known vulnerabilities (read-only check)
- [ ] `'use strict';` present in each module
