import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/server/db';
import { designs } from '@/db/schema.pg';
import { eq, desc } from 'drizzle-orm';
import { avnacCanvasStateSchema } from '@/shared/avnac-types';

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

export async function GET() {
  const cookieStore = cookies();
  const sessionUser = await getSessionUser(cookieStore);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const userDesigns = await db
      .select({
        id: designs.id,
        name: designs.name,
        thumbnail: designs.thumbnail,
        createdAt: designs.createdAt,
        updatedAt: designs.updatedAt,
      })
      .from(designs)
      .where(eq(designs.userId, sessionUser.id))
      .orderBy(desc(designs.updatedAt));

    // Return the StoredDesign format the frontend expects
    const formatted = userDesigns.map(d => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error('[studio/designs] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  const sessionUser = await getSessionUser(cookieStore);

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { designId, data } = body;

    if (!designId || !data) {
      return NextResponse.json({ error: 'Missing designId or data' }, { status: 400 });
    }

    // Validate the incoming JSON via Zod schema
    const parsedData = avnacCanvasStateSchema.parse(data);

    const db = getDb();
    
    // We check if the design already exists so we don't accidentally update 
    // another user's design if the ID was spoofed.
    const existing = await db.select().from(designs).where(eq(designs.id, designId));
    
    if (existing.length > 0) {
      if (existing[0].userId !== sessionUser.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await db.update(designs)
        .set({
          canvasState: parsedData,
          updatedAt: new Date(),
          name: parsedData.name || existing[0].name,
        })
        .where(eq(designs.id, designId));
    } else {
      await db.insert(designs).values({
        id: designId,
        userId: sessionUser.id,
        name: parsedData.name || `Design ${new Date().toLocaleTimeString()}`,
        canvasState: parsedData,
      });
    }

    const updated = await db.select().from(designs).where(eq(designs.id, designId));
    const saved = updated[0];

    return NextResponse.json({
      id: saved.id,
      name: saved.name,
      thumbnail: saved.thumbnail,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[studio/designs] POST error:', err);
    return NextResponse.json({ error: 'Invalid data or server error' }, { status: 400 });
  }
}
