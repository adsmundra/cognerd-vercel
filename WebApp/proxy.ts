import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Define protected routes
const protectedRoutes = ['/dashboard', '/chat', '/brand-monitor', '/profile', '/brand-profiles'];

// Define auth-related routes that should be skipped
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
const apiRoutes = ['/api/auth'];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for auth routes and API routes
  if (authRoutes.some(route => pathname.startsWith(route)) ||
      apiRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
  }

  // Redirect root to brand-profiles
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/brand-profiles', request.url));
  }
  
  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    try {
      // Check for session cookie
      const sessionCookie = await getSessionCookie(request);
      
      if (!sessionCookie) {
        // Redirect to login with return URL
        const url = new URL('/login', request.url);
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('Session check error:', error);
      // On session check error, redirect to login
      const url = new URL('/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|CogNerdi.png|.*\\..*).)',
  ],
};
