'use strict';

const FORBIDDEN_KEYWORD = /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|CALL)\b/i;
const PLACEHOLDER = /:([A-Za-z_][A-Za-z0-9_]*)/g;
const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Runs at startup so a bad endpoint config stops boot instead of failing a live request.
function validateEndpoints(endpoints) {
  if (!Array.isArray(endpoints)) throw new Error('endpoints config must be an array');

  const errors = [];
  const ids = new Set();
  const paths = new Set();

  endpoints.forEach((ep, index) => {
    const label = `endpoint[${index}]${ep && ep.id ? ` (${ep.id})` : ''}`;
    if (!ep || typeof ep !== 'object') {
      errors.push(`${label}: must be an object`);
      return;
    }

    if (typeof ep.id !== 'string' || !ep.id) errors.push(`${label}: id is required`);
    else if (ids.has(ep.id)) errors.push(`${label}: duplicate id`);
    else ids.add(ep.id);

    if (typeof ep.path !== 'string' || !ep.path.startsWith('/api/')) {
      errors.push(`${label}: path must start with /api/`);
    } else if (paths.has(ep.path)) {
      errors.push(`${label}: duplicate path ${ep.path}`);
    } else {
      paths.add(ep.path);
    }

    if (typeof ep.sqlTemplate !== 'string' || !ep.sqlTemplate.trim()) {
      errors.push(`${label}: sqlTemplate is required`);
      return;
    }
    const sql = ep.sqlTemplate;
    if (!/^\s*SELECT\b/i.test(sql)) errors.push(`${label}: sqlTemplate must start with SELECT`);
    if (sql.includes(';')) errors.push(`${label}: sqlTemplate must not contain ';'`);
    const forbidden = sql.match(FORBIDDEN_KEYWORD);
    if (forbidden) errors.push(`${label}: keyword ${forbidden[0].toUpperCase()} is not allowed`);

    const params = ep.params ?? [];
    if (!Array.isArray(params)) {
      errors.push(`${label}: params must be an array`);
      return;
    }

    const declared = new Set();
    params.forEach((p) => {
      if (!p || typeof p.name !== 'string' || !NAME_PATTERN.test(p.name)) {
        errors.push(`${label}: invalid param name`);
        return;
      }
      if (declared.has(p.name)) errors.push(`${label}: duplicate param ${p.name}`);
      declared.add(p.name);
      if (p.required !== undefined && typeof p.required !== 'boolean') {
        errors.push(`${label}: param ${p.name} required must be boolean`);
      }
      if (p.maxLength !== undefined && !(Number.isInteger(p.maxLength) && p.maxLength > 0)) {
        errors.push(`${label}: param ${p.name} maxLength must be a positive integer`);
      }
    });

    for (const [, name] of sql.matchAll(PLACEHOLDER)) {
      if (!declared.has(name)) errors.push(`${label}: :${name} is not declared in params`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Invalid endpoints config:\n - ${errors.join('\n - ')}`);
  }

  return endpoints.map((ep) => Object.freeze({
    ...ep,
    params: Object.freeze((ep.params ?? []).map((p) => Object.freeze({ ...p }))),
  }));
}

module.exports = { validateEndpoints };
