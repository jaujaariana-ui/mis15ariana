import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const GUEST_TOKEN_SECRET = process.env.GUEST_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'xalt-moments-guest-secret';
const GUEST_TOKEN_EXPIRATION = '7d';
const GUEST_COOKIE_NAME = 'xalt_guest_token';

export interface GuestTokenPayload {
  guest_id: string;
  auth_user_id: string;
  event_id: string;
}

export function generateGuestToken(payload: GuestTokenPayload): string {
  return jwt.sign(payload, GUEST_TOKEN_SECRET, {
    expiresIn: GUEST_TOKEN_EXPIRATION,
  });
}

export function verifyGuestToken(token: string): GuestTokenPayload | null {
  try {
    return jwt.verify(token, GUEST_TOKEN_SECRET) as GuestTokenPayload;
  } catch {
    return null;
  }
}

export function getGuestCookieOptions(): { httpOnly: boolean; secure: boolean; sameSite: 'lax' | 'strict' | 'none'; path: string; maxAge: number } {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

export { GUEST_COOKIE_NAME };
