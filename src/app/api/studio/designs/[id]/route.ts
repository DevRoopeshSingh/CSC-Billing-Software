import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/server/db';
import { designs } from '@/db/schema.pg';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET;

async function getSessionUser(cookieStore: ReturnType<typeof cookies>) {
  const sessionCookie = (await cookieStore).get('csc_session');
  if (!sessionCookie?.value) return null;

  if (!JWT_SECRET) return null;

  try {
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(sessionCookie.value, secret);
    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
      return null;
    }
    return { id: parseInt(payload.sub, 10), role: payload.role };
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const sessionUser = await getSessionUser(cookieStore);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const result = await db
      .select()
      .from(designs)
      .where(and(eq(designs.id, params.id), eq(designs.userId, sessionUser.id)));

    if (result.length === 0) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result[0].canvasState });
  } catch (err) {
    console.error('[studio/designs/[id]] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const sessionUser = await getSessionUser(cookieStore);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const result = await db
      .delete(designs)
      .where(and(eq(designs.id, params.id), eq(designs.userId, sessionUser.id)))
      .returning({ id: designs.id });

    if (result.length === 0) {
      return NextResponse.json({ error: 'Design not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: result[0].id });
  } catch (err) {
    console.error('[studio/designs/[id]] DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
