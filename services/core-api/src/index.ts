import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMigrations, createPool } from './db.js';
import { createApp, headerTenantContext } from './app.js';
import { authenticatedTenantContext } from './auth.js';

const rootDirectory = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const migrationPath =
  process.env.MIGRATIONS_FILE ?? resolve(rootDirectory, 'migrations/0001_canonical_mvp.sql');
const port = Number(process.env.PORT ?? 8080);
const databaseUrl = process.env.DATABASE_URL;
const sessionSecret = process.env.SESSION_SECRET;
const allowDevTenantHeaders = process.env.ALLOW_DEV_TENANT_HEADERS === 'true';

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be configured; Core never uses fake persistence');
}
if (allowDevTenantHeaders && process.env.NODE_ENV === 'production') {
  throw new Error('ALLOW_DEV_TENANT_HEADERS cannot be enabled in production');
}
if (!allowDevTenantHeaders && (!sessionSecret || sessionSecret.trim().length < 32)) {
  throw new Error(
    'SESSION_SECRET must contain at least 32 characters unless explicit local tenant headers are enabled',
  );
}

const pool = createPool(databaseUrl);
const app = createApp(pool, {
  resolveTenantContext: allowDevTenantHeaders
    ? headerTenantContext
    : authenticatedTenantContext(sessionSecret ?? ''),
});

async function start(): Promise<void> {
  const migrationSql = await readFile(migrationPath, 'utf8');
  await applyMigrations(pool, '0001_canonical_mvp', migrationSql);
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(
      JSON.stringify({
        level: 'info',
        service: 'core-api',
        port,
        migrationPath,
      }),
    );
  });
  const close = async () => {
    server.close();
    await pool.end();
  };
  process.once('SIGTERM', close);
  process.once('SIGINT', close);
}

void start().catch(async (error) => {
  console.error(JSON.stringify({ level: 'fatal', service: 'core-api', error }));
  await pool.end();
  process.exit(1);
});

export { app };
