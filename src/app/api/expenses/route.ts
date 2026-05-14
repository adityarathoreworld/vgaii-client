import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { expenseCreateSchema } from "@/lib/validators/payment";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "payments");

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const category = url.searchParams.get("category");

    const where: Prisma.ExpenseWhereInput = withClientFilter(
      user,
    ) as Prisma.ExpenseWhereInput;
    if (from || to) {
      const range: { gte?: Date; lte?: Date } = {};
      if (from && !Number.isNaN(Date.parse(from))) range.gte = new Date(from);
      if (to && !Number.isNaN(Date.parse(to))) range.lte = new Date(to);
      if (Object.keys(range).length > 0) where.createdAt = range;
    }
    if (category) {
      where.category = category as Prisma.ExpenseWhereInput["category"];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ expenses });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "payments");

    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = expenseCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        clientId: user.clientId,
        category: parsed.data.category,
        amount: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod,
        notes: parsed.data.notes ?? "",
        createdById: user.id,
      },
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "expense.created",
      entityType: "Expense",
      entityId: expense.id,
      entityLabel: expense.category,
      summary: `Logged ${expense.amount} paise expense (${expense.category})`,
      metadata: {
        category: expense.category,
        amount: expense.amount,
        method: expense.paymentMethod,
      },
    });

    return NextResponse.json({ expense });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
