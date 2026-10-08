'use strict';

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_LIBRARY'];
// DB_LIBRARY is interpolated into the connection string, so it must match IBM i naming rules.
const LIBRARY_PATTERN = /^[A-Za-z0-9_#@$]{1,10}$/;

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (!LIBRARY_PATTERN.test(process.env.DB_LIBRARY)) {
  console.error('DB_LIBRARY must be 1-10 characters: letters, digits, _ # @ $');
  process.exit(1);
}

function readInt(name, fallback, min = 1) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    console.error(`${name} must be an integer >= ${min}`);
    process.exit(1);
  }
  return value;
}

function deepFreeze(obj) {
  Object.values(obj).forEach((value) => {
    if (value && typeof value === 'object') deepFreeze(value);
  });
  return Object.freeze(obj);
}

const poolInitial = readInt('DB_POOL_INITIAL', 1);
const poolMax = readInt('DB_POOL_MAX', 3);
if (poolInitial > poolMax) {
  console.error('DB_POOL_INITIAL must not exceed DB_POOL_MAX');
  process.exit(1);
}

const config = deepFreeze({
  env: process.env.NODE_ENV || 'development',
  port: readInt('PORT', 3099),
  corsOrigin: process.env.CORS_ORIGIN || false,
  rowLimit: readInt('ROW_LIMIT', 500),
  db: {
    driver: process.env.DB_DRIVER || 'IBM i Access ODBC Driver',
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    library: process.env.DB_LIBRARY,
    poolInitial,
    poolMax,
    loginTimeout: readInt('DB_LOGIN_TIMEOUT', 10),
    queryTimeout: readInt('DB_QUERY_TIMEOUT', 15),
  },
});

module.exports = config;
