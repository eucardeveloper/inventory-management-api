import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cookie name matching AuthService.ACCESS_COOKIE on the backend
const ACCESS_COOKIE = 'access_token';

// Routes that don't require authentication
const PUBLIC_PATHS = ['/', '/login'];

// Route → allowed roles (empty array = any authenticated user)
const ROLE_REQUIRED: Record<string, string[]> = {
  '/audit': ['ADMIN'],
  '/users': ['ADMIN'],
};

// Routes only accessible if user has the supplier/report permission
const MANAGER_PLUS: string[] = ['/suppliers', '/reports'];

function decodeJwtPayload(token: string): { sub?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded) as { sub?: string; role?: string; exp?: number };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public routes — no auth needed
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Require auth for everything else
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  const payload = decodeJwtPayload(token);

  // Invalid or expired token
  if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('expired', '1');
    return NextResponse.redirect(url);
  }

  // Normalize role (backend sends ROLE_ADMIN or ADMIN)
  const role = ((payload.role ?? '') as string)
    .replace(/^ROLE_/i, '')
    .toUpperCase();

  // ADMIN-only routes
  const adminOnly = ROLE_REQUIRED[pathname];
  if (adminOnly && !adminOnly.includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Manager+ routes (ADMIN or WAREHOUSE_MANAGER)
  if (MANAGER_PLUS.includes(pathname)) {
    if (role !== 'ADMIN' && role !== 'WAREHOUSE_MANAGER') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
