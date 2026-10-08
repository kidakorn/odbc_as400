'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, methods: ['GET'] }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

app.use(routes);
app.use(notFound);
// Must be registered last so it receives errors from every route above.
app.use(errorHandler);

module.exports = app;
