import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api', '/_next', '/favicon.ico', '/logo-subito.jpeg'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the landing page (exact match)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Allow public paths and static files
  if (
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for the auth cookie
  const token = request.cookies.get('subito_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
