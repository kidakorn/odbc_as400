'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toPositional, withRowLimit, normalizeRow } = require('../src/db/sql');
const { validateEndpoints } = require('../src/endpoints/registry');
const { validateQuery } = require('../src/services/endpointService');
const endpointsConfig = require('../src/endpoints/endpoints.json');

const isAppError = (status) => (err) => err.statusCode === status && err.isOperational === true;

const MDVICE = {
  id: 'mdvice-by-key',
  path: '/api/web/services/MDVICE',
  sqlTemplate: 'SELECT * FROM MDVICE WHERE CDDEVC = :cddevc',
  params: [{ name: 'cddevc', required: true, maxLength: 10 }],
};

const WGPGBL = {
  id: 'wgpgbl-all',
  path: '/api/web/services/WGPGBL',
  sqlTemplate: 'SELECT * FROM WGPGBL',
  params: [],
};

test('toPositional replaces named markers in order and repeats values', () => {
  const { text, values } = toPositional(
    'SELECT * FROM T WHERE A = :a AND B = :b AND C = :a',
    { a: 'x', b: 'y' },
  );
  assert.equal(text, 'SELECT * FROM T WHERE A = ? AND B = ? AND C = ?');
  assert.deepEqual(values, ['x', 'y', 'x']);
});

test('toPositional throws when a marker has no value', () => {
  assert.throws(() => toPositional('SELECT * FROM T WHERE A = :a', {}), /Missing value for parameter :a/);
});

test('withRowLimit appends an integer literal and strips a trailing semicolon', () => {
  assert.equal(withRowLimit('SELECT * FROM T;', 500), 'SELECT * FROM T FETCH FIRST 500 ROWS ONLY');
});

test('withRowLimit rejects non-positive or non-integer limits', () => {
  for (const bad of [0, -1, 1.5, '5', NaN]) {
    assert.throws(() => withRowLimit('SELECT 1 FROM T', bad), TypeError);
  }
});

test('normalizeRow trims strings and converts BigInt to string', () => {
  const row = normalizeRow({ CDDEVC: '11251   ', QTY: 12n, NOTE: null, AMT: 1.5 });
  assert.deepEqual(row, { CDDEVC: '11251', QTY: '12', NOTE: null, AMT: 1.5 });
  assert.doesNotThrow(() => JSON.stringify(row));
});

test('validateEndpoints accepts a valid config and freezes the result', () => {
  const endpoints = validateEndpoints([MDVICE, WGPGBL]);
  assert.equal(endpoints.length, 2);
  assert.ok(Object.isFrozen(endpoints[0]));
  assert.ok(Object.isFrozen(endpoints[0].params));
});

test('shipped endpoints.json passes registry validation', () => {
  assert.doesNotThrow(() => validateEndpoints(endpointsConfig));
});

test('validateEndpoints rejects duplicate paths', () => {
  assert.throws(() => validateEndpoints([MDVICE, { ...WGPGBL, path: MDVICE.path }]), /duplicate path/);
});

test('validateEndpoints rejects duplicate ids', () => {
  assert.throws(() => validateEndpoints([MDVICE, { ...WGPGBL, id: MDVICE.id }]), /duplicate id/);
});

test('validateEndpoints rejects non-SELECT statements', () => {
  const bad = { ...WGPGBL, sqlTemplate: 'UPDATE WGPGBL SET CDBRNC = 1' };
  assert.throws(() => validateEndpoints([bad]), /must start with SELECT/);
});

test('validateEndpoints rejects statement chaining and forbidden keywords', () => {
  const chained = { ...WGPGBL, sqlTemplate: 'SELECT * FROM WGPGBL; DELETE FROM WGPGBL' };
  assert.throws(() => validateEndpoints([chained]), /must not contain/);
  const hidden = { ...WGPGBL, sqlTemplate: 'SELECT * FROM (DELETE FROM WGPGBL)' };
  assert.throws(() => validateEndpoints([hidden]), /DELETE is not allowed/);
});

test('validateEndpoints rejects undeclared placeholders', () => {
  const bad = { ...MDVICE, params: [] };
  assert.throws(() => validateEndpoints([bad]), /:cddevc is not declared/);
});

test('validateEndpoints rejects a non-array config', () => {
  assert.throws(() => validateEndpoints({ id: 'x' }), /must be an array/);
});

test('validateQuery returns declared values', () => {
  const [endpoint] = validateEndpoints([MDVICE]);
  assert.deepEqual(validateQuery(endpoint, { cddevc: '11251' }), { cddevc: '11251' });
});

test('validateQuery rejects a missing required parameter with 400', () => {
  const [endpoint] = validateEndpoints([MDVICE]);
  assert.throws(() => validateQuery(endpoint, {}), isAppError(400));
  assert.throws(() => validateQuery(endpoint, { cddevc: '' }), isAppError(400));
});

test('validateQuery rejects repeated parameters with 400', () => {
  const [endpoint] = validateEndpoints([MDVICE]);
  assert.throws(() => validateQuery(endpoint, { cddevc: ['1', '2'] }), isAppError(400));
});

test('validateQuery rejects unknown parameters with 400', () => {
  const [endpoint] = validateEndpoints([MDVICE]);
  assert.throws(() => validateQuery(endpoint, { cddevc: '1', extra: 'x' }), isAppError(400));
});

test('validateQuery rejects values longer than maxLength with 400', () => {
  const [endpoint] = validateEndpoints([MDVICE]);
  assert.throws(() => validateQuery(endpoint, { cddevc: '12345678901' }), isAppError(400));
});

test('validateQuery binds null for an omitted optional parameter', () => {
  const optional = {
    ...MDVICE,
    sqlTemplate: 'SELECT * FROM MDVICE WHERE CDDEVC = :cddevc',
    params: [{ name: 'cddevc', required: false }],
  };
  const [endpoint] = validateEndpoints([optional]);
  assert.deepEqual(validateQuery(endpoint, {}), { cddevc: null });
});
