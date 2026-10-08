# Command Injection Checklist

- [ ] No `exec` or `execSync` with request-derived strings
- [ ] Any process call uses `spawn` or `execFile` with `shell: false`
- [ ] No `eval` or `new Function` on request data
- [ ] `require` and file paths are not built from input
- [ ] Path inputs reject traversal (`..`) and stay in a fixed base directory
- [ ] Search results for `child_process` and `eval` reviewed
