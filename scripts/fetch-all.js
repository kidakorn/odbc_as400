#!/usr/bin/env node
'use strict';

const fs = require('fs');

const USAGE = 'Usage: node scripts/fetch-all.js <path> [name=value ...] [--base http://localhost:3099] [--out file.json]';

function readOption(args, name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  args.splice(index, 2);
  return value;
}

// Retries after a 429 so a long run survives the server rate limit.
async function getPage(url) {
  for (;;) {
    const res = await fetch(url);
    if (res.status === 429) {
      const waitSeconds = Number(res.headers.get('retry-after')) || 60;
      console.error(`Rate limited, waiting ${waitSeconds}s`);
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }
    const body = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${body.error || 'request failed'}`);
    return body;
  }
}

// Responses from paged endpoints include limit and offset; unpaged ones return in one request.
async function fetchAll(url) {
  const first = await getPage(url);
  if (!('limit' in first)) return first.rows;

  const { limit } = first;
  const rows = [];
  for (const row of first.rows) rows.push(row);

  let page = first;
  for (let offset = limit; page.rows.length === limit; offset += limit) {
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    page = await getPage(url);
    for (const row of page.rows) rows.push(row);
  }
  return rows;
}

async function main(argv) {
  const args = [...argv];
  const base = readOption(args, '--base', 'http://localhost:3099');
  const out = readOption(args, '--out', null);
  const [endpointPath, ...pairs] = args;
  if (!endpointPath) {
    console.error(USAGE);
    return 1;
  }

  const url = new URL(endpointPath, base);
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq <= 0) throw new Error(`Expected name=value, got "${pair}"`);
    url.searchParams.set(pair.slice(0, eq), pair.slice(eq + 1));
  }

  const rows = await fetchAll(url);
  const json = JSON.stringify(rows, null, 2);
  if (out) {
    fs.writeFileSync(out, json);
    console.error(`Wrote ${rows.length} rows to ${out}`);
  } else {
    console.log(json);
  }
  return 0;
}

main(process.argv.slice(2))
  .then((code) => { process.exitCode = code; })
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  });
