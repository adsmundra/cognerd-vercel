import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
  });

  try {
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    // Count users
    let userCount = 0;
    let users = [];
    try {
      const userResult = await pool.query('SELECT id, email, name, "createdAt" FROM "user" ORDER BY "createdAt" DESC LIMIT 10');
      userCount = userResult.rowCount || 0;
      users = userResult.rows;
    } catch (error) {
      console.error('Error querying users:', error);
    }

    // Count sessions
    let sessionCount = 0;
    try {
      const sessionResult = await pool.query('SELECT COUNT(*) FROM "session"');
      sessionCount = parseInt(sessionResult.rows[0].count);
    } catch (error) {
      console.error('Error counting sessions:', error);
    }

    return NextResponse.json({
      tables: tablesResult.rows.map(row => row.table_name),
      userCount,
      sessionCount,
      recentUsers: users,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
      betterAuthSecret: process.env.BETTER_AUTH_SECRET ? 'Set' : 'Not set',
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      error: 'Database connection error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}