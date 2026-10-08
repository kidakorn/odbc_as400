'use strict';

const NAMED_PARAM = /:([A-Za-z_][A-Za-z0-9_]*)/g;

// Values become ? markers and are never concatenated, so client input cannot alter the SQL.
function toPositional(sql, params) {
  const values = [];
  const text = sql.replace(NAMED_PARAM, (_, name) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) {
      throw new Error(`Missing value for parameter :${name}`);
    }
    values.push(params[name]);
    return '?';
  });
  return { text, values };
}

// Interpolated, not bound: IBM i releases disagree on ? in FETCH FIRST, so the integer check is the guard.
function withRowLimit(sql, limit) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError('row limit must be a positive integer');
  }
  return `${sql.replace(/;\s*$/, '')} FETCH FIRST ${limit} ROWS ONLY`;
}

// CHAR columns are space-padded; BigInt would make JSON.stringify throw.
function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string') out[key] = value.trimEnd();
    else if (typeof value === 'bigint') out[key] = value.toString();
    else out[key] = value;
  }
  return out;
}

module.exports = { toPositional, withRowLimit, normalizeRow };
