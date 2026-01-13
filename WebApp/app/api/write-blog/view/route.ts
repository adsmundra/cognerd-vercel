import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    let userEmail: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: request.headers as any });
      userEmail = session?.user?.email || null;
    } catch {}

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    }
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = `SELECT id, company_url, brand_name, email_id, topic, blog, created_at FROM blogs WHERE id = $1 AND email_id = $2`;
    const res = await pool.query(sql, [id, userEmail]);
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(res.rows[0]);
  } catch (e) {
    console.error('write-blog/view error', e);
    return NextResponse.json({ error: 'Failed to load blog' }, { status: 500 });
  }
}
