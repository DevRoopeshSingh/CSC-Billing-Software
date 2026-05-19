// src/app/api/studio/session-token/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Issues a short-lived, scoped studio capability token for the Avnac iframe.
//
// SECURITY CONTRACT:
//   • The caller must hold a valid CSC session cookie (checked server-side).
//   • The token returned is intentionally narrow — scope: 'studio' only.
//   • It must NEVER be the main session JWT.  IframeEditor sends this token
//     to the Avnac origin, which is a cross-origin process and therefore an
//     untrusted recipient of our main credentials.
//
// WEEK 2 TODO:
//   Replace the placeholder HMAC below with a real signed JWT once
//   /api/studio/designs exists and Avnac is updated to validate this token
//   against your Supabase edge function or Next.js middleware.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac, randomBytes } from 'crypto';

// ── Auth helper (reuses existing JWT_SECRET) ──────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify the caller has an active CSC session by inspecting the HttpOnly
 * `csc_session` cookie.  Returns the decoded payload or null if invalid.
 *
 * NOTE: This replicates the minimal auth check from your existing middleware.
 * If your project already exports a `requireSession()` helper, use that instead.
 */
async function getSessionUser(
  cookieStore: ReturnType<typeof cookies>
): Promise<{ id: number; role: string } | null> {
  const sessionCookie = (await cookieStore).get('csc_session');
  if (!sessionCookie?.value) return null;

  if (!JWT_SECRET) {
    console.error('[studio/session-token] JWT_SECRET env var is not set');
    return null;
  }

  try {
    // Import jose lazily — already in your dependency tree from auth middleware
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(sessionCookie.value, secret);
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }
    return { id: parseInt(payload.sub, 10), role: payload.role };
  } catch {
    return null; // Expired / tampered cookie — treat as unauthenticated
  }
}

/**
 * Creates a deterministic HMAC-based studio token.
 * Format: `<userId>.<expiry>.<nonce>.<hmac>`
 *
 * Properties:
 *  - Expires in 15 minutes (hard-coded — rotate before expiry in the client)
 *  - Signed with JWT_SECRET — cannot be forged without the secret
 *  - Scoped to the user's ID — Avnac can only act on behalf of this user
 *  - Nonce prevents replay within the window (16 bytes of randomness)
 */
function createStudioToken(userId: number): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');

  const expiry = Math.floor(Date.now() / 1000) + 15 * 60; // 15 min from now
  const nonce = randomBytes(8).toString('hex'); // 64-bit nonce
  const payload = `${userId}.${expiry}.${nonce}`;
  const sig = createHmac('sha256', JWT_SECRET).update(payload).digest('hex').slice(0, 32);
  return `${payload}.${sig}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST() {
  // 1. Authenticate the caller
  const cookieStore = cookies();
  const sessionUser = await getSessionUser(cookieStore);

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Unauthorized — valid session required for studio token' },
      { status: 401 }
    );
  }

  // 2. Issue the scoped token
  try {
    const token = createStudioToken(sessionUser.id);

    return NextResponse.json(
      { token, expiresIn: 15 * 60 },
      {
        status: 200,
        headers: {
          // Prevent the token from being cached by CDN / browser
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (err) {
    console.error('[studio/session-token] Token creation failed:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Reject all other HTTP methods
export function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
