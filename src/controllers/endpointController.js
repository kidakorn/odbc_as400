'use strict';

const config = require('../config');
const { validateQuery, parsePaging } = require('../services/endpointService');
const { runEndpoint } = require('../db/query');

function createHandler(endpoint) {
  return async (req, res, next) => {
    try {
      const values = validateQuery(endpoint, req.query);
      const paging = parsePaging(endpoint, req.query, config);
      const rows = await runEndpoint(endpoint, values, paging);
      const body = { P_ISFOUND: rows.length > 0 ? '1' : '0', rows };
      res.json(paging ? { ...body, limit: paging.limit, offset: paging.offset } : body);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { createHandler };
