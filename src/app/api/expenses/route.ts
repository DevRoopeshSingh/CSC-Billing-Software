import { withAuth, ANY_AUTHED, STAFF_PLUS } from "@/server/auth/with-auth";
import {
  listExpenses,
  createExpense,
  expenseCreateSchema,
} from "@/server/handlers/expenses";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => listExpenses()
);

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: expenseCreateSchema,
  },
  async ({ session, payload }) => createExpense(payload, session!.userId)
);
