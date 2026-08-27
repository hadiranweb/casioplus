import { Pool, type PoolClient, type QueryResultRow } from 'pg';

export function createPool(databaseUrl: string): Pool {
  if (!databaseUrl.trim()) {
    throw new Error('DATABASE_URL must be configured');
  }

  return new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.DATABASE_MAX_CONNECTIONS ?? 16),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function queryOne<T extends QueryResultRow>(
  pool: Pool,
  text: string,
  values: unknown[],
): Promise<T | null> {
  const result = await pool.query<T>(text, values);
  return result.rows[0] ?? null;
}

export async function applyMigrations(
  pool: Pool,
  version: string,
  migrationSql: string,
): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await withTransaction(pool, async (client) => {
    const existing = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [
      version,
    ]);
    if (existing.rowCount === 1) return;
    await client.query(migrationSql);
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
  });
}
