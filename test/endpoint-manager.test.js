'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { validateEndpoints } = require('../src/endpoints/registry');
const { addEndpoint, updateEndpoint, removeEndpoint, checkDefinition, formatList } = require('../scripts/endpoint-manager');
const endpointsConfig = require('../src/endpoints/endpoints.json');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'endpoint-manager.js');

const MDVICE = {
  id: 'mdvice-by-key',
  path: '/api/web/services/MDVICE',
  description: 'Get device master record by device code',
  sqlTemplate: 'SELECT * FROM MDVICE WHERE CDDEVC = :cddevc',
  params: [{ name: 'cddevc', required: true, maxLength: 10 }],
};

const WGPGBL = {
  id: 'wgpgbl-all',
  path: '/api/web/services/WGPGBL',
  description: 'Get all global setting/branch rows',
  sqlTemplate: 'SELECT * FROM WGPGBL',
  params: [],
};

const NEW_ENDPOINT = {
  id: 'mdvice-by-name',
  path: '/api/web/services/MDVICE/NAME',
  sqlTemplate: 'SELECT * FROM MDVICE WHERE NMDEVC = :nmdevc',
  params: [{ name: 'nmdevc', required: true, maxLength: 40 }],
};

function tempConfig(data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'endpoint-manager-'));
  const file = path.join(dir, 'endpoints.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return { dir, file };
}

function runCli(args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('addEndpoint appends the definition and defaults params to []', () => {
  const next = addEndpoint([MDVICE], { id: 'x', path: '/api/x', sqlTemplate: 'SELECT 1 FROM SYSIBM.SYSDUMMY1' });
  assert.equal(next.length, 2);
  assert.deepEqual(next[1].params, []);
  assert.equal(next[1].id, 'x');
});

test('addEndpoint does not mutate the input array', () => {
  const input = [MDVICE];
  addEndpoint(input, NEW_ENDPOINT);
  assert.equal(input.length, 1);
});

test('updateEndpoint merges only the given fields', () => {
  const next = updateEndpoint([MDVICE, WGPGBL], 'mdvice-by-key', { description: 'New text' });
  assert.equal(next[0].description, 'New text');
  assert.equal(next[0].sqlTemplate, MDVICE.sqlTemplate);
  assert.deepEqual(next[1], WGPGBL);
});

test('updateEndpoint throws for an unknown id', () => {
  assert.throws(() => updateEndpoint([MDVICE], 'nope', { description: 'x' }), /No endpoint with id "nope"/);
});

test('removeEndpoint drops only the matching endpoint', () => {
  const next = removeEndpoint([MDVICE, WGPGBL], 'wgpgbl-all');
  assert.deepEqual(next, [MDVICE]);
});

test('removeEndpoint throws for an unknown id', () => {
  assert.throws(() => removeEndpoint([MDVICE], 'nope'), /No endpoint with id "nope"/);
});

test('checkDefinition rejects unknown top-level and param fields', () => {
  assert.throws(() => checkDefinition({ ...NEW_ENDPOINT, sql: 'typo' }), /unknown field "sql"/);
  const badParam = { ...NEW_ENDPOINT, params: [{ name: 'nmdevc', requird: true }] };
  assert.throws(() => checkDefinition(badParam), /unknown param field "requird"/);
});

test('checkDefinition rejects non-object definitions and non-string description', () => {
  assert.throws(() => checkDefinition([]), /must be a JSON object/);
  assert.throws(() => checkDefinition({ ...NEW_ENDPOINT, description: 5 }), /description must be a string/);
});

test('a definition added through the helpers passes registry validation', () => {
  assert.doesNotThrow(() => validateEndpoints(addEndpoint([MDVICE, WGPGBL], NEW_ENDPOINT)));
});

test('formatList prints one row per endpoint and marks optional params with ?', () => {
  const optional = { ...MDVICE, id: 'opt', path: '/api/opt', params: [{ name: 'cddevc', required: false }] };
  const lines = formatList([MDVICE, WGPGBL, optional]).split('\n');
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^ID\s+METHOD\s+PATH\s+PARAMS\s+DESCRIPTION$/);
  assert.match(lines[1], /mdvice-by-key\s+GET\s+\/api\/web\/services\/MDVICE\s+cddevc\s+/);
  assert.match(lines[2], /wgpgbl-all\s+GET\s+\/api\/web\/services\/WGPGBL\s+-/);
  assert.match(lines[3], /opt\s+GET\s+\/api\/opt\s+cddevc\?/);
});

test('CLI list prints the shipped endpoints', () => {
  const { code, stdout } = runCli(['list']);
  assert.equal(code, 0);
  for (const ep of endpointsConfig) assert.match(stdout, new RegExp(ep.id));
});

test('CLI validate accepts the shipped config', () => {
  const { code, stdout } = runCli(['validate']);
  assert.equal(code, 0, stdout);
  assert.match(stdout, /is valid/);
});

test('CLI add writes a valid endpoint and keeps existing ones', () => {
  const { dir, file } = tempConfig([MDVICE, WGPGBL]);
  try {
    const def = path.join(dir, 'new.json');
    fs.writeFileSync(def, JSON.stringify(NEW_ENDPOINT));
    const result = runCli(['add', '--file', def, '--config', file]);
    assert.equal(result.code, 0, result.stderr);
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(saved.map((ep) => ep.id), ['mdvice-by-key', 'wgpgbl-all', 'mdvice-by-name']);
    assert.equal(fs.existsSync(`${file}.tmp`), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI add rejects a write-capable statement and leaves the file unchanged', () => {
  const { dir, file } = tempConfig([MDVICE]);
  try {
    const def = path.join(dir, 'bad.json');
    fs.writeFileSync(def, JSON.stringify({ ...NEW_ENDPOINT, sqlTemplate: 'DELETE FROM MDVICE' }));
    const before = fs.readFileSync(file, 'utf8');
    const result = runCli(['add', '--file', def, '--config', file]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /must start with SELECT/);
    assert.equal(fs.readFileSync(file, 'utf8'), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI add accepts a definition file with a UTF-8 BOM', () => {
  const { dir, file } = tempConfig([MDVICE]);
  try {
    const def = path.join(dir, 'bom.json');
    fs.writeFileSync(def, `\uFEFF${JSON.stringify(NEW_ENDPOINT)}`);
    assert.equal(runCli(['add', '--file', def, '--config', file]).code, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI update changes only the given fields', () => {
  const { dir, file } = tempConfig([MDVICE, WGPGBL]);
  try {
    const patch = path.join(dir, 'patch.json');
    fs.writeFileSync(patch, JSON.stringify({ description: 'Updated text' }));
    assert.equal(runCli(['update', 'mdvice-by-key', '--file', patch, '--config', file]).code, 0);
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(saved[0].description, 'Updated text');
    assert.equal(saved[0].sqlTemplate, MDVICE.sqlTemplate);
    assert.deepEqual(saved[1], WGPGBL);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI update with an empty patch is rejected', () => {
  const { dir, file } = tempConfig([MDVICE]);
  try {
    const patch = path.join(dir, 'empty.json');
    fs.writeFileSync(patch, '{}');
    const result = runCli(['update', 'mdvice-by-key', '--file', patch, '--config', file]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /no fields to update/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI remove requires --yes and --dry-run does not write', () => {
  const { dir, file } = tempConfig([MDVICE, WGPGBL]);
  try {
    const before = fs.readFileSync(file, 'utf8');
    const refused = runCli(['remove', 'wgpgbl-all', '--config', file]);
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /re-run with --yes/);

    const preview = runCli(['remove', 'wgpgbl-all', '--dry-run', '--config', file]);
    assert.equal(preview.code, 0);
    assert.match(preview.stdout, /dry-run/);
    assert.equal(fs.readFileSync(file, 'utf8'), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI remove with --yes deletes the endpoint', () => {
  const { dir, file } = tempConfig([MDVICE, WGPGBL]);
  try {
    assert.equal(runCli(['remove', 'wgpgbl-all', '--yes', '--config', file]).code, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), [MDVICE]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI rejects an update that creates a duplicate path', () => {
  const { dir, file } = tempConfig([MDVICE, WGPGBL]);
  try {
    const patch = path.join(dir, 'dup.json');
    fs.writeFileSync(patch, JSON.stringify({ path: WGPGBL.path }));
    const result = runCli(['update', 'mdvice-by-key', '--file', patch, '--config', file]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /duplicate path/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI reports unknown commands and missing ids with exit code 1', () => {
  assert.equal(runCli(['bogus']).code, 1);
  assert.equal(runCli(['show']).code, 1);
  assert.match(runCli(['show', 'nope']).stderr, /No endpoint with id "nope"/);
});
