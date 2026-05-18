// src/app/api/services/load-seed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import { loadSeedCatalogue } from "@/server/handlers/import-csv";
import { z } from "zod";

const loadSeedSchema = z.object({
  mode: z.enum(["preview", "commit"]),
});

export const POST = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY }, body: loadSeedSchema },
  async ({ payload }) => {
    const data = await loadSeedCatalogue(payload.mode);
    return data;
  }
);
