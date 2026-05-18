// src/app/api/services/import-csv/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import { importCsv, servicesImportSchema } from "@/server/handlers/import-csv";

export const POST = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY }, body: servicesImportSchema },
  async ({ payload }) => {
    const data = await importCsv(payload);
    return data;
  }
);
