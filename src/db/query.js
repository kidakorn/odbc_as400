'use strict';

const config = require('../config');
const AppError = require('../utils/AppError');
const { getPool } = require('./pool');
const { toPositional, withRowLimit, withPaging, normalizeRow } = require('./sql');

const PROBE_SQL = 'SELECT 1 FROM SYSIBM.SYSDUMMY1';

// Pool.query takes no options, so a checked-out connection carries the per-query timeout.
let activeSlots = 0;
const slotQueue = [];

// The slot is handed straight to the next waiter, so activeSlots never exceeds poolMax.
async function acquireSlot() {
  if (activeSlots < config.db.poolMax) {
    activeSlots += 1;
    return;
  }
  if (slotQueue.length >= config.db.queueMax) {
    throw new AppError('Server busy, try again later', 503);
  }
  await new Promise((resolve) => slotQueue.push(resolve));
}

function releaseSlot() {
  const next = slotQueue.shift();
  if (next) next();
  else activeSlots -= 1;
}

async function execute(sql, values) {
  await acquireSlot();
  try {
    const connection = await getPool().connect();
    try {
      return await connection.query(sql, values, { timeout: config.db.queryTimeout });
    } finally {
      // Closing a pooled connection returns it to the pool.
      await connection.close();
    }
  } finally {
    releaseSlot();
  }
}

async function ping() {
  await execute(PROBE_SQL, []);
}

async function runEndpoint(endpoint, values, paging) {
  const { text, values: bound } = toPositional(endpoint.sqlTemplate, values);
  const sql = paging
    ? withPaging(text, endpoint.orderBy, paging.limit, paging.offset)
    : endpoint.fetchAll
      ? text.replace(/;\s*$/, '')
      : withRowLimit(text, config.rowLimit);
  const rows = await execute(sql, bound);
  return rows.map(normalizeRow);
}

module.exports = { ping, runEndpoint };
