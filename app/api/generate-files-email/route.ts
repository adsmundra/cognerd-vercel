import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email, url, competitors, prompts ,categories} = await req.json();
    if (!email || !url|| !categories || !Array.isArray(competitors) || competitors.length === 0) {
      return NextResponse.json({ success: false, error: 'email and url are required' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const payload = {
      email,
      url,
      categories,
      competitors,
      prompts: prompts || '',
    };

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: 'nishit@thewelzin.com',
      subject: 'Generate Files Request',
      text: JSON.stringify(payload, null, 2),
      html: `<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to send email' }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]);
}
