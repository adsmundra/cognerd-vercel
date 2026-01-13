// This file is used by Better Auth CLI for migrations
// The actual auth configuration is in lib/auth.ts
import * as dotenv from 'dotenv';

// Load environment variables for CLI
dotenv.config({ path: '.env.local' });

// Re-export the auth instance from the main lib
export { auth } from './lib/auth';



















