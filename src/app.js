'use strict';

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Logs the path only, so query values never reach the log outside development.
const logPath = (tokens, req, res) => [
  tokens.method(req, res),
  req.path,
  tokens.status(req, res),
  tokens['response-time'](req, res),
  'ms',
].join(' ');

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.corsOrigin, methods: ['GET'] }));
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests' },
}));
app.use(morgan(config.env === 'development' ? 'dev' : logPath));

app.use(routes);
app.use(notFound);
// Must be registered last so it receives errors from every route above.
app.use(errorHandler);

module.exports = app;
