import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getDb, schema } from "@/server/db";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = getDb();
    const rows = await db.query.loyaltyTransactions.findMany({
      where: eq(schema.loyaltyTransactions.customerId, id),
      orderBy: [desc(schema.loyaltyTransactions.createdAt)],
      limit: 50,
      with: {
        invoice: {
          columns: {
            invoiceNo: true,
          },
        },
      },
    });

    return NextResponse.json(rows);
  }
);
