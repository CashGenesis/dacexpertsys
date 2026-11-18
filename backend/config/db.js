import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

// Resilience settings for remote databases whose connections can be dropped by the network:
// - connectionTimeoutMillis: fail fast instead of hanging forever when a connection can't be made
// - idleTimeoutMillis: close idle clients before the server/network silently drops them
// - keepAlive: TCP keep-alive so idle sockets are not cut by NAT/firewalls
const RESILIENCE = {
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
};

// DATABASE_URL (Supabase) takes precedence over the local PG_* settings.
// Supabase signs its certificates with its own root CA, pinned here for verified TLS.
// The Supabase session pooler allows only a few clients (pool_size, 15 by default) shared by
// every app connected to the project, so this backend keeps its own pool small.
// Extra queries wait in the local queue instead of being refused by Supabase.
const pool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { ca: fs.readFileSync(path.resolve(__dirname, 'supabase-ca.crt'), 'utf8') },
    max: Number(process.env.PG_POOL_MAX) || 5,
    ...RESILIENCE,
  })
  : new Pool({
    host: process.env.PG_HOST || process.env.PGHOST || 'localhost',
    user: process.env.PG_USER || process.env.PGUSER || 'postgres',
    database: process.env.PG_DATABASE || process.env.PGDATABASE || 'dac_system',
    password: process.env.PG_PASSWORD || process.env.PGPASSWORD || 'your_postgres_password',
    port: Number(process.env.PG_PORT || process.env.PGPORT) || 5432,
    ...RESILIENCE,
  });

// An idle client whose connection is dropped (e.g. ECONNRESET) emits 'error' on the pool.
// Without this listener Node treats it as unhandled and the whole server crashes.
// The broken client is already removed from the pool; the next query opens a fresh one.
pool.on('error', (err) => {
  console.warn(`PostgreSQL idle client error (${err.code || 'unknown'}): ${err.message}. The connection will be re-established on the next query.`);
});

// When the Supabase pooler is full (other apps hold its slots) a new connection is refused
// with EMAXCONNSESSION. Slots free up within moments, so retry a few times with backoff
// before failing the request.
const POOLER_FULL_RETRIES = 4;
const isPoolerFull = (err) => /EMAXCONNSESSION|max clients reached/i.test(String(err?.message || ''));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withPoolerRetry(action) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await action();
    } catch (err) {
      if (!isPoolerFull(err) || attempt >= POOLER_FULL_RETRIES) throw err;
      await wait(300 * 2 ** attempt);
    }
  }
}

// pool.query(text, values) and the promise form of pool.connect() are what the app uses.
// Callback forms (used internally by pg) pass through unchanged.
const rawQuery = pool.query.bind(pool);
const rawConnect = pool.connect.bind(pool);
pool.query = (...args) => (typeof args[args.length - 1] === 'function'
  ? rawQuery(...args)
  : withPoolerRetry(() => rawQuery(...args)));
pool.connect = (...args) => (args.length
  ? rawConnect(...args)
  : withPoolerRetry(() => rawConnect()));

export default pool;
