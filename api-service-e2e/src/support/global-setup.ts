import { waitForPortOpen } from '@nx/node/utils';
import { execSync } from 'node:child_process';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  // Start services that that the app needs to run (e.g. database, docker-compose, etc.).
  console.log('\nSetting up...\n');

  // Ensure seed data exists (default admin/roles/permissions)
  // Note: this assumes DATABASE_URL is configured for the e2e environment.
  execSync('npx prisma db seed', { stdio: 'inherit' });

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await waitForPortOpen(port, { host });

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
