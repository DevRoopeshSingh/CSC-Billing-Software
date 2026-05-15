// src/server/auth/with-auth.ts
// One HOF that every Route Handler in this slice goes through. It owns:
//   1. Origin / same-site check for mutations
//   2. CSRF double-submit check for mutations
//   3. Session resolution from the HttpOnly cookie
//   4. Role gate
//   5. Zod parse of the JSON body (or null for GETs)
//   6. Error envelope { error, code? } with appropriate status
//
// Handlers themselves stay pure: (ctx, payload) => result. They throw on bad
// input or auth failures; this wrapper converts the throw into a Response.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession, type Session, type Role } from "./sessions";
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, csrfMatches } from "./cookies";
import { requireAdminPin } from "./admin-pin";

export const ADMIN_PIN_HEADER = "x-admin-pin";

export type Access =
  | { auth: "public" }
  | { auth: "session"; roles: readonly Role[]; requirePin?: boolean };

export const ANY_AUTHED: readonly Role[] = ["admin", "staff", "viewer"];
export const STAFF_PLUS: readonly Role[] = ["admin", "staff"];
export const ADMIN_ONLY: readonly Role[] = ["admin"];

export interface HandlerCtx<P = undefined> {
  req: NextRequest;
  session: Session | null;
  params: Record<string, string>;
  payload: P;
}

export type RouteHandler<P> = (ctx: HandlerCtx<P>) => unknown | Promise<unknown>;

// Generic infers from the schema, so `payload` is the OUTPUT type after
// zod applies defaults / coercion — not the looser INPUT type. Anchoring on
// `z.ZodTypeAny` instead of `z.ZodType<P>` is what fixes the input/output
// leak that bit the customer + service routes before.
type Payload<TBody> = TBody extends z.ZodTypeAny ? z.infer<TBody> : undefined;

interface Options<TBody extends z.ZodTypeAny | undefined> {
  access: Access;
  body?: TBody;
}

type RouteContext = { params: Promise<Record<string, string>> | Record<string, string> };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

async function parseParams(ctx: RouteContext | undefined): Promise<Record<string, string>> {
  if (!ctx?.params) return {};
  const p = ctx.params instanceof Promise ? await ctx.params : ctx.params;
  return p ?? {};
}

function originAllowed(req: NextRequest): boolean {
  // Same-site check: Origin (or Referer) must match this request's host.
  // Server-to-server clients without Origin are blocked by the CSRF check
  // separately, so we only enforce this when a header is present.
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const r = new URL(req.url);
    return o.host === r.host;
  } catch {
    return false;
  }
}

export function withAuth<TBody extends z.ZodTypeAny | undefined = undefined>(
  options: Options<TBody>,
  handler: RouteHandler<Payload<TBody>>
) {
  return async (req: NextRequest, routeCtx?: RouteContext): Promise<Response> => {
    try {
      const params = await parseParams(routeCtx);
      const isMutation = !SAFE_METHODS.has(req.method);

      if (isMutation && !originAllowed(req)) {
        return jsonError("Bad origin", 403, "BAD_ORIGIN");
      }

      // Session resolution (cookie → in-memory store → DB-validated downstream).
      const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value ?? null;
      const session = sessionCookie ? getSession(sessionCookie) : null;

      if (options.access.auth === "session") {
        if (!session) return jsonError("Not authenticated", 401, "UNAUTHENTICATED");
        if (!options.access.roles.includes(session.role)) {
          return jsonError("Forbidden", 403, "FORBIDDEN");
        }
        // CSRF only when authenticated AND mutating. Login/setup are public
        // mutations; they protect themselves via rate-limiting + origin check.
        if (isMutation) {
          const headerToken = req.headers.get(CSRF_HEADER);
          const cookieToken = req.cookies.get(CSRF_COOKIE)?.value ?? null;
          if (!csrfMatches(headerToken, cookieToken)) {
            return jsonError("CSRF check failed", 403, "BAD_CSRF");
          }
        }
        // Destructive admin actions also require the operator's PIN. The PIN
        // travels in a header so it never lands in URLs or access logs.
        if (options.access.requirePin) {
          const pin = req.headers.get(ADMIN_PIN_HEADER);
          await requireAdminPin(pin);
        }
      }

      // Body parse (mutations only; GET/HEAD have no body).
      let payload: Payload<TBody> = undefined as Payload<TBody>;
      if (options.body) {
        let json: unknown = undefined;
        if (req.method !== "GET" && req.method !== "HEAD") {
          try {
            json = await req.json();
          } catch {
            return jsonError("Invalid JSON body", 400, "BAD_JSON");
          }
        }
        const parsed = options.body.safeParse(json);
        if (!parsed.success) {
          const msg = parsed.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; ");
          return jsonError(`Invalid input: ${msg}`, 400, "BAD_INPUT");
        }
        payload = parsed.data as Payload<TBody>;
      }

      const data = await handler({ req, session, params, payload });
      // Handlers may return a NextResponse directly when they need to set
      // cookies (login/setup). Otherwise we JSON-wrap whatever they returned.
      if (data instanceof Response) return data;
      return NextResponse.json(data ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[api ${req.method} ${req.url}]`, err);
      return jsonError(message, 400);
    }
  };
}
