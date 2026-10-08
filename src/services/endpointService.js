'use strict';

const AppError = require('../utils/AppError');

// Express turns repeated keys into arrays; rejecting them avoids guessing which value was meant.
function validateQuery(endpoint, query) {
  const declared = new Map(endpoint.params.map((p) => [p.name, p]));

  for (const key of Object.keys(query)) {
    if (!declared.has(key)) throw new AppError(`Unknown parameter: ${key}`, 400);
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

module.exports = { validateQuery };
