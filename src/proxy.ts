import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// In-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; reset: number }>();

// Límites por identidad (invitado/organizador), NO por IP. En un evento los
// invitados comparten la misma IP pública (NAT del WiFi del salón), por lo que
// un límite por IP los hacía competir por una sola cuota. Cada foto consume dos
// peticiones (upload-url + upload), así que `upload` a 40/min permite ~20 fotos
// por minuto y por invitado, mientras que cada invitado tiene su propio cupo.
const RATE_LIMIT_CONFIGS = {
  upload: { maxRequests: 40, windowMs: 60_000 },
  download: { maxRequests: 60, windowMs: 60_000 },
  api: { maxRequests: 120, windowMs: 60_000 },
};

// Hash corto y estable para no guardar tokens JWT completos como clave.
function hashKey(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function getRateLimitKey(request: NextRequest, action: string) {
  // 1) Identidad del invitado (cookie HTTP-only). Cada invitado tiene la suya.
  const guestToken = request.cookies.get('xalt_guest_token')?.value;
  if (guestToken) {
    return `${action}:guest:${hashKey(guestToken)}`;
  }

  // 2) Sesión del organizador (Supabase), para no mezclar admins con invitados.
  const authCookie = request.cookies
    .getAll()
    .find((cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token'));
  if (authCookie?.value) {
    return `${action}:auth:${hashKey(authCookie.value)}`;
  }

  // 3) Sin identidad: se cae a IP (solo aplica a rutas no autenticadas).
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  return `${action}:ip:${hashKey(ip)}`;
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
