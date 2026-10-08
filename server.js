'use strict';

const config = require('./src/config');
const app = require('./src/app');
const pool = require('./src/db/pool');
const query = require('./src/db/query');

const SHUTDOWN_TIMEOUT_MS = 10000;

async function start() {
  // Probe before listening so a bad DB config fails at boot, not on the first request.
  await pool.init();
  await query.ping();

  const server = app.listen(config.port, () => {
    console.log(`IWS API listening on http://localhost:${config.port}`);
  });
  server.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);

    // unref so the timer never keeps the process alive on its own.
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      try {
        await pool.close();
        process.exit(0);
      } catch (err) {
        console.error('Pool close failed:', err.message);
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Startup failed:', err.odbcErrors || err.message);
  process.exit(1);
});
