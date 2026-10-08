'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Set before requiring the app so config reads these instead of .env.
Object.assign(process.env, {
  DB_HOST: 'test-host',
  DB_USER: 'test-user',
  DB_PASSWORD: 'test-password',
  DB_LIBRARY: 'TESTLIB',
  NODE_ENV: 'test',
  RATE_LIMIT_MAX: '2',
  RATE_LIMIT_WINDOW_MS: '60000',
});

const app = require('../src/app');

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => {
  server.closeAllConnections();
  server.close(resolve);
}));

test('requests beyond RATE_LIMIT_MAX in the window get 429', async () => {
  const statuses = [];
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${base}/api/unknown`);
    statuses.push(res.status);
  }
  assert.deepEqual(statuses, [404, 404, 429]);
});
