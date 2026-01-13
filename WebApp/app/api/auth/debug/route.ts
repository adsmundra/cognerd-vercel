import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
  };

  // Check if we can connect to the database
  let dbStatus = 'unknown';
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });
    
    const result = await pool.query('SELECT 1');
    dbStatus = 'connected';
    await pool.end();
  } catch (error: any) {
    dbStatus = `error: ${error.message}`;
  }

  return NextResponse.json({
    envCheck,
    dbStatus,
    timestamp: new Date().toISOString(),
  });
}