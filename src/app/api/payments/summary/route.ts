import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Daily summary cards on the Finances tab. The caller can request a
// specific day with ?date=YYYY-MM-DD, otherwise today is used.

type Bucket = { method: string; total: number; count: number };

const dayBounds = (raw: string | null) => {
  let start = new Date();
  if (raw && !Number.isNaN(Date.parse(raw))) {
    start = new Date(raw);
  }
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "payments");

    const url = new URL(req.url);
    const { start, end } = dayBounds(url.searchParams.get("date"));

    const scope = withClientFilter(user) as { clientId?: string };
    const range = { gte: start, lt: end };

    // groupBy returns one row per (paymentMethod) bucket. We sum finalAmount
    // (post-discount) so the totals reflect what actually changed hands.
    const [paymentBuckets, expenseTotal, expenseBuckets, pendingTotal] =
      await Promise.all([
        prisma.payment.groupBy({
          by: ["paymentMethod"],
          where: { ...scope, createdAt: range },
          _sum: { finalAmount: true },
          _count: { _all: true },
        }),
        prisma.expense.aggregate({
          where: { ...scope, createdAt: range },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.expense.groupBy({
          by: ["category"],
          where: { ...scope, createdAt: range },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        // "Pending" payments are tracked separately — they don't roll into
        // cash/upi/card buckets because no money has actually arrived yet.
        prisma.payment.aggregate({
          where: {
            ...scope,
            createdAt: range,
            paymentMethod: "pending",
          },
          _sum: { finalAmount: true },
          _count: { _all: true },
        }),
      ]);

    const byMethod: Record<string, Bucket> = {};
    let collectedTotal = 0;
    for (const b of paymentBuckets) {
      const total = b._sum.finalAmount ?? 0;
      byMethod[b.paymentMethod] = {
        method: b.paymentMethod,
        total,
        count: b._count._all,
      };
      // Pending payments are not "collected" — exclude from the headline.
      if (b.paymentMethod !== "pending") collectedTotal += total;
    }

    const expenses = {
      total: expenseTotal._sum.amount ?? 0,
      count: expenseTotal._count._all,
      byCategory: expenseBuckets.map(b => ({
        category: b.category,
        total: b._sum.amount ?? 0,
        count: b._count._all,
      })),
    };

    return NextResponse.json({
      date: start.toISOString(),
      collectedTotal,
      byMethod,
      pending: {
        total: pendingTotal._sum.finalAmount ?? 0,
        count: pendingTotal._count._all,
      },
      expenses,
      net: collectedTotal - expenses.total,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
