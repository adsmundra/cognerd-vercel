import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log("DATABASE_URL used by drizzle-kit:", process.env.DATABASE_URL);

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle-generated',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Exclude Better Auth tables from migrations since they're managed by Better Auth
  tablesFilter: ['!user', '!session', '!account', '!verification'],
} satisfies Config;