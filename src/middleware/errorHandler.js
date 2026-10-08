'use strict';

const config = require('../config');
const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  // Unexpected errors may carry driver internals, so they are logged and never returned as-is.
  console.error(err.odbcErrors || err);
  const message = config.env === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json({ success: false, error: message });
}

module.exports = { notFound, errorHandler };
