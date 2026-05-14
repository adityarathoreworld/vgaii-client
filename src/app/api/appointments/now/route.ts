import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// "Active" = a scheduled appointment whose start time is within ±30 minutes
// of right now. Anything past that range is either a future appointment
// ("next") or already over and waiting to be marked visited.
const ACTIVE_WINDOW_MS = 30 * 60 * 1000;

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const scope = withClientFilter(user) as { clientId?: string };
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [active, next, todayCount] = await Promise.all([
      prisma.appointment.findFirst({
        where: {
          ...scope,
          status: "scheduled",
          date: {
            gte: new Date(now - ACTIVE_WINDOW_MS),
            lte: new Date(now + ACTIVE_WINDOW_MS),
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.appointment.findFirst({
        where: {
          ...scope,
          status: "scheduled",
          date: { gt: new Date(now + ACTIVE_WINDOW_MS) },
        },
        orderBy: { date: "asc" },
      }),
      // All scheduled appointments dated today (regardless of completed/no_show
      // status — those would be in History anyway). Useful as a quick "what's
      // on the books for today" counter on the dashboard.
      prisma.appointment.count({
        where: {
          ...scope,
          status: "scheduled",
          date: { gte: startOfToday, lt: startOfTomorrow },
        },
      }),
    ]);

    return NextResponse.json({ active, next, todayCount });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
