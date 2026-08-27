import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool, applyMigrations } from '../db.js';

const rootDirectory = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const migrationPath =
  process.env.MIGRATIONS_FILE ?? resolve(rootDirectory, 'migrations/0001_canonical_mvp.sql');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be configured');
}

const pool = createPool(databaseUrl);
try {
  await applyMigrations(pool, '0001_canonical_mvp', await readFile(migrationPath, 'utf8'));
  console.log(JSON.stringify({ status: 'migrated', migrationPath }));
} finally {
  await pool.end();
}
