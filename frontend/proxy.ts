import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths and Next.js internals
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('fst_token')?.value;

  // Not authenticated → login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
