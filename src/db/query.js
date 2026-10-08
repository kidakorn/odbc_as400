'use strict';

const config = require('../config');
const { getPool } = require('./pool');
const { toPositional, withRowLimit, normalizeRow } = require('./sql');

const PROBE_SQL = 'SELECT 1 FROM SYSIBM.SYSDUMMY1';

// Pool.query takes no options, so a checked-out connection carries the per-query timeout.
async function execute(sql, values) {
  const connection = await getPool().connect();
  try {
    return await connection.query(sql, values, { timeout: config.db.queryTimeout });
  } finally {
    // Closing a pooled connection returns it to the pool.
    await connection.close();
  }
}

async function ping() {
  await execute(PROBE_SQL, []);
}

async function runEndpoint(endpoint, values) {
  const { text, values: bound } = toPositional(endpoint.sqlTemplate, values);
  const rows = await execute(withRowLimit(text, config.rowLimit), bound);
  return rows.map(normalizeRow);
}

module.exports = { ping, runEndpoint };
