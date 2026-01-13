import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// DEBUG: Log the database URL to verify it's loaded
console.log('DATABASE_URL_RUNTIME:', process.env.DATABASE_URL);

// Create a connection pool with improved timeout settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10, // Reduced for better connection management
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout
  maxUses: 7500,
  // Add retry and keepalive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Create the drizzle database instance with schema
export const db = drizzle(pool, { schema });

// Export the pool for raw queries if needed
export { pool };

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Database connected successfully');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
});
process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
});
