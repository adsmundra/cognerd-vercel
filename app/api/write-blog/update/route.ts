import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: request.headers as any });
    const userEmail = session?.user?.email || null;
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, company_url, brand_name, topic, blog } = body || {};
    if (!id || !blog) {
      return NextResponse.json({ error: 'Missing required fields: id and blog' }, { status: 400 });
    }

    const sql = `
      UPDATE blogs
      SET company_url = COALESCE($2, company_url),
          brand_name = COALESCE($3, brand_name),
          topic = COALESCE($4, topic),
          blog = $5
      WHERE id = $1 AND email_id = $6
      RETURNING id, company_url, brand_name, topic, blog, created_at;
    `;
    const vals = [id, company_url || null, brand_name || null, topic || null, blog, userEmail];
    const res = await pool.query(sql, vals);
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ item: res.rows[0] });
  } catch (e) {
    console.error('write-blog/update error', e);
    return NextResponse.json({ error: 'Failed to update blog' }, { status: 500 });
  }
}
