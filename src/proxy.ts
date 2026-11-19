import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// In-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; reset: number }>();

const RATE_LIMIT_CONFIGS = {
  upload: { maxRequests: 10, windowMs: 60_000 },
  download: { maxRequests: 30, windowMs: 60_000 },
  api: { maxRequests: 60, windowMs: 60_000 },
};

function getRateLimitKey(request: NextRequest, action: string) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  const ipHash = Buffer.from(ip).toString('base64');
  return `${action}:${ipHash}`;
}

function checkRateLimit(key: string, config: { maxRequests: number; windowMs: number }) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.reset) {
    rateLimitStore.set(key, { count: 1, reset: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, reset: now + config.windowMs };
  }

  if (existing.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, reset: existing.reset };
  }

  existing.count += 1;
  return { allowed: true, remaining: config.maxRequests - existing.count, reset: existing.reset };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.reset) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    let action = 'api';
    if (pathname.includes('/upload')) action = 'upload';
    else if (pathname.includes('/download')) action = 'download';

    const key = getRateLimitKey(request, action);
    const config = RATE_LIMIT_CONFIGS[action as keyof typeof RATE_LIMIT_CONFIGS] ?? RATE_LIMIT_CONFIGS.api;
    const { allowed, remaining, reset } = checkRateLimit(key, config);

    if (!allowed) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor espera antes de intentar de nuevo.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
          },
        }
      );
    }

    const response = await updateSession(request);
    response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(reset / 1000)));
    return response;
  }

  // Update session and add security headers
  const response = await updateSession(request);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self "https://*.vercel.app"), microphone=()');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
