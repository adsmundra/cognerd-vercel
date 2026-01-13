import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const config = {
      baseURL: auth.options.baseURL,
      socialProviders: Object.keys(auth.options.socialProviders || {}),
      googleConfigured: !!auth.options.socialProviders?.google,
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      expectedEndpoints: [
        'POST /api/auth/sign-in/social',
        'GET /api/auth/callback/google',
        'GET /api/auth/session'
      ]
    };

    return NextResponse.json({
      success: true,
      config,
      message: 'Auth configuration loaded successfully'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to load auth configuration'
    }, { status: 500 });
  }
}