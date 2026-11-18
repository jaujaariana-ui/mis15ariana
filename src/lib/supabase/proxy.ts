import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set({ name, value, ...options })
        );
      },
    },
  });

  // Refresh session if expired - required for Server Components
  try {
    await supabase.auth.getClaims();
  } catch {
    // Token is invalid or expired, will be refreshed
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Set cookies in response for the browser
  const cookies = request.cookies.getAll();
  const supabaseHostname = new URL(supabaseUrl).hostname.split('.')[0];
  const cookieName = `sb-${supabaseHostname}-auth-token`;

  const authCookie = cookies.find(c => c.name === cookieName);
  if (authCookie) {
    response.cookies.set({
      name: cookieName,
      value: authCookie.value,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  return response;
}
