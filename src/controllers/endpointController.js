'use strict';

const { validateQuery } = require('../services/endpointService');
const { runEndpoint } = require('../db/query');

function createHandler(endpoint) {
  return async (req, res, next) => {
    try {
      const values = validateQuery(endpoint, req.query);
      const rows = await runEndpoint(endpoint, values);
      res.json({ P_ISFOUND: rows.length > 0 ? '1' : '0', rows });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { createHandler };
