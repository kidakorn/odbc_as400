'use strict';

const AppError = require('../utils/AppError');

// Express turns repeated keys into arrays; rejecting them avoids guessing which value was meant.
function validateQuery(endpoint, query) {
  const declared = new Map(endpoint.params.map((p) => [p.name, p]));

  for (const key of Object.keys(query)) {
    if (!declared.has(key) && !(endpoint.orderBy && PAGING_KEYS.includes(key))) {
      throw new AppError(`Unknown parameter: ${key}`, 400);
    }
    if (typeof query[key] !== 'string') {
      throw new AppError(`Parameter ${key} must be given exactly once`, 400);
    }
  }

  const values = {};
  for (const param of endpoint.params) {
    const raw = query[param.name];
    if (raw === undefined || raw === '') {
      if (param.required) throw new AppError(`Missing required parameter: ${param.name}`, 400);
      // NULL keeps every :marker in the template bound, even when the client omits it.
      values[param.name] = null;
      continue;
    }
    if (param.maxLength !== undefined && raw.length > param.maxLength) {
      throw new AppError(`Parameter ${param.name} exceeds ${param.maxLength} characters`, 400);
    }
    values[param.name] = raw;
  }

  return values;
}

const PAGING_KEYS = ['limit', 'offset'];
const MAX_OFFSET = 2147483647;

function parseInteger(raw, name, min, max, fallback) {
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) throw new AppError(`${name} must be an integer`, 400);
  const value = Number(raw);
  if (value < min || value > max) throw new AppError(`${name} must be between ${min} and ${max}`, 400);
  return value;
}

// Only endpoints that declare orderBy are paginated; the rest keep the plain row limit.
function parsePaging(endpoint, query, { pageSize, rowLimit }) {
  if (!endpoint.orderBy) return null;
  return {
    limit: parseInteger(query.limit, 'limit', 1, rowLimit, pageSize),
    offset: parseInteger(query.offset, 'offset', 0, MAX_OFFSET, 0),
  };
}

module.exports = { validateQuery, parsePaging };
