'use strict';

const express = require('express');
const endpointsConfig = require('../endpoints/endpoints.json');
const { validateEndpoints } = require('../endpoints/registry');
const { createHandler } = require('../controllers/endpointController');
const { ping } = require('../db/query');

// Validated at require time so a bad endpoints.json stops boot instead of serving requests.
const endpoints = validateEndpoints(endpointsConfig);

const router = express.Router();

router.get('/api/health', async (req, res) => {
  try {
    await ping();
    res.json({ status: 'ok', datasource: 'odbc', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Health check failed:', err.odbcErrors || err);
    res.status(503).json({ success: false, error: 'Database unavailable' });
  }
});

for (const endpoint of endpoints) {
  router.get(endpoint.path, createHandler(endpoint));
}

module.exports = router;
