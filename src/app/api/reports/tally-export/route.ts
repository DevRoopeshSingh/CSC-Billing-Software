import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { generateTallyCSV } from "@/server/handlers/tally-export";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ req }) => {
    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month"); // 1-12
    const yearStr = searchParams.get("year");

    let startDate: Date;
    let endDate: Date;

    if (monthStr && yearStr) {
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const csvStr = await generateTallyCSV(startDate, endDate);

    return new Response(csvStr, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tally_export_${startDate.getFullYear()}_${startDate.getMonth() + 1}.csv"`,
      },
    });
  }
);
