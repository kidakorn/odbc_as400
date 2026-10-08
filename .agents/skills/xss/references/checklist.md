# XSS Checklist

- [ ] All responses use `res.json` or a correct `Content-Type`
- [ ] `helmet()` active in `src/app.js`
- [ ] `x-powered-by` disabled
- [ ] No request data echoed into HTML
- [ ] Error responses do not reflect raw input in HTML contexts
- [ ] Any future HTML output uses encoding and a CSP
