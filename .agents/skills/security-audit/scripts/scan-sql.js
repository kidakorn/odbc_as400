'use strict';

// Read-only: reports lines that appear to build SQL from concatenation or template interpolation.
const fs = require('fs');
const path = require('path');

const SQL_KEYWORD = /\b(SELECT|INSERT|UPDATE|DELETE|FETCH|WHERE)\b/i;
const DYNAMIC = /(\+\s*[A-Za-z_$][\w$.]*)|(\$\{[^}]+\})/;
const SOURCE_EXT = new Set(['.js', '.cjs', '.mjs']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(full, files);
    } else if (SOURCE_EXT.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function scanFile(file) {
  const findings = [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (SQL_KEYWORD.test(line) && DYNAMIC.test(line)) {
      findings.push({ file, line: i + 1, text: line.trim() });
    }
  });
  return findings;
}

const root = path.resolve(process.argv[2] || 'src');
const findings = walk(root).flatMap(scanFile);

for (const f of findings) {
  console.log(`${path.relative(process.cwd(), f.file)}:${f.line}: ${f.text}`);
}
console.log(`Findings: ${findings.length}`);
process.exitCode = findings.length > 0 ? 1 : 0;
