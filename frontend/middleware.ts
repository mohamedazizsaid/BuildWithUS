// Allow `/embed/*` pages to be loaded inside an <iframe> from any origin.
// By default, modern browsers don't block framing unless a header says so,
// but we set this header explicitly so:
//   1. The CSP makes the policy auditable + visible in DevTools "Headers".
//   2. We can lock it down later (replace '*' with a comma-separated list of
//      allowed origins from EMBED_ALLOWED_ORIGINS env).
// Everything outside `/embed/*` is left alone.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  const allowed = process.env.EMBED_ALLOWED_ORIGINS ?? '*';
  res.headers.set('Content-Security-Policy', `frame-ancestors ${allowed}`);
  // Override anything that would otherwise block framing.
  res.headers.delete('X-Frame-Options');
  return res;
}

export const config = {
  matcher: '/embed/:path*',
};
