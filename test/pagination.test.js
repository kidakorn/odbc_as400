'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withPaging } = require('../src/db/sql');
const { validateEndpoints } = require('../src/endpoints/registry');
const { validateQuery, parsePaging } = require('../src/services/endpointService');

const BOUNDS = { pageSize: 100, rowLimit: 500 };

const PAGED = {
  id: 'wgpgbl-paged',
  path: '/api/web/services/WGPGBL/PAGED',
  sqlTemplate: 'SELECT * FROM WGPGBL',
  orderBy: 'CDBRNC, CDGRP DESC',
  params: [],
};

const PLAIN = {
  id: 'wgpgbl-all',
  path: '/api/web/services/WGPGBL',
  sqlTemplate: 'SELECT * FROM WGPGBL',
  params: [],
};

test('withPaging appends ORDER BY, OFFSET and FETCH FIRST', () => {
  assert.equal(
    withPaging('SELECT * FROM T;', 'A DESC', 50, 100),
    'SELECT * FROM T ORDER BY A DESC OFFSET 100 ROWS FETCH FIRST 50 ROWS ONLY',
  );
});

test('withPaging rejects non-integer limit or offset', () => {
  assert.throws(() => withPaging('SELECT 1 FROM T', 'A', 0, 0), TypeError);
  assert.throws(() => withPaging('SELECT 1 FROM T', 'A', 10, -1), TypeError);
  assert.throws(() => withPaging('SELECT 1 FROM T', 'A', 1.5, 0), TypeError);
});

test('validateEndpoints accepts orderBy with optional ASC/DESC', () => {
  assert.doesNotThrow(() => validateEndpoints([PAGED]));
});

test('validateEndpoints rejects orderBy that is not a plain column list', () => {
  const bad = { ...PAGED, orderBy: 'A; DELETE FROM WGPGBL' };
  assert.throws(() => validateEndpoints([bad]), /orderBy must be column names/);
  const sub = { ...PAGED, orderBy: '(SELECT 1 FROM T)' };
  assert.throws(() => validateEndpoints([sub]), /orderBy must be column names/);
});

test('validateEndpoints rejects orderBy when the template already has ORDER BY', () => {
  const dup = { ...PAGED, sqlTemplate: 'SELECT * FROM WGPGBL ORDER BY CDBRNC' };
  assert.throws(() => validateEndpoints([dup]), /must not contain ORDER BY/);
});

test('parsePaging returns null for endpoints without orderBy', () => {
  assert.equal(parsePaging(PLAIN, {}, BOUNDS), null);
});

test('parsePaging applies defaults for an endpoint with orderBy', () => {
  assert.deepEqual(parsePaging(PAGED, {}, BOUNDS), { limit: 100, offset: 0 });
});

test('parsePaging parses valid limit and offset', () => {
  assert.deepEqual(parsePaging(PAGED, { limit: '250', offset: '500' }, BOUNDS), { limit: 250, offset: 500 });
});

test('parsePaging rejects malformed or out-of-range values with 400', () => {
  const isBad = (query) => {
    try {
      parsePaging(PAGED, query, BOUNDS);
      return false;
    } catch (err) {
      return err.statusCode === 400;
    }
  };
  assert.ok(isBad({ limit: '0' }));
  assert.ok(isBad({ limit: '501' }));
  assert.ok(isBad({ limit: '-1' }));
  assert.ok(isBad({ limit: '1.5' }));
  assert.ok(isBad({ offset: '-5' }));
  assert.ok(isBad({ offset: 'abc' }));
});

test('validateQuery accepts limit and offset only for paged endpoints', () => {
  const [paged] = validateEndpoints([PAGED]);
  assert.doesNotThrow(() => validateQuery(paged, { limit: '10', offset: '0' }));

  const [plain] = validateEndpoints([PLAIN]);
  assert.throws(() => validateQuery(plain, { limit: '10' }), (err) => err.statusCode === 400);
});

test('validateEndpoints accepts fetchAll on an endpoint without orderBy', () => {
  assert.doesNotThrow(() => validateEndpoints([{ ...PLAIN, fetchAll: true }]));
});

test('validateEndpoints rejects fetchAll combined with orderBy', () => {
  assert.throws(() => validateEndpoints([{ ...PAGED, fetchAll: true }]), /cannot be combined with orderBy/);
});
