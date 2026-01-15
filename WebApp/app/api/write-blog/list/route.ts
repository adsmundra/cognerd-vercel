import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    let userEmail: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: request.headers as any });
      userEmail = session?.user?.email || null;
    } catch {}

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ items: [] });
    }
    if (!userEmail) {
      return NextResponse.json({ items: [] });
    }

    const superuserEmails = (process.env.SUPERUSER_EMAILS || '').split(',').map(e => e.trim());
    const isSuperuser = userEmail && superuserEmails.includes(userEmail);

    let sql;
    let params: any[];

    if (isSuperuser) {
      sql = `SELECT id, company_url as "companyUrl", brand_name as "brandName", topic as "topic", created_at as "createdAt" FROM blogs ORDER BY created_at DESC LIMIT 100`;
      params = [];
    } else {
      sql = `SELECT id, company_url as "companyUrl", brand_name as "brandName", topic as "topic", created_at as "createdAt" FROM blogs WHERE email_id = $1 ORDER BY created_at DESC LIMIT 100`;
      params = [userEmail];
    }
    
    const res = await pool.query(sql, params);

    return NextResponse.json({ items: res.rows });
  } catch (e) {
    console.error('write-blog/list error', e);
    return NextResponse.json({ error: 'Failed to list blogs' }, { status: 500 });
  }
}
