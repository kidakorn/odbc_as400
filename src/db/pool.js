'use strict';

const odbc = require('odbc');
const config = require('../config');

let pool = null;

function buildConnectionString() {
  const { driver, host, user, password, library } = config.db;
  // Inside braces a literal '}' must be doubled, or it ends the PWD value early.
  const escapedPassword = password.replace(/}/g, '}}');
  return `DRIVER={${driver}};SYSTEM=${host};UID=${user};PWD={${escapedPassword}};DBQ=${library};NAM=0`;
}

async function init() {
  if (pool) return pool;
  pool = await odbc.pool({
    connectionString: buildConnectionString(),
    loginTimeout: config.db.loginTimeout,
    initialSize: config.db.poolInitial,
    maxSize: config.db.poolMax,
  });
  return pool;
}

function getPool() {
  if (!pool) throw new Error('Database pool is not initialized');
  return pool;
}

async function close() {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.close();
}

module.exports = { init, getPool, close };
