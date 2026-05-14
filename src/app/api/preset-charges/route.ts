import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { presetChargeCreateSchema } from "@/lib/validators/payment";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "payments");

    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("includeInactive") === "1";

    const scope = withClientFilter(user) as { clientId?: string };
    const charges = await prisma.presetCharge.findMany({
      where: { ...scope, ...(includeInactive ? {} : { active: true }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ charges });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// Only CLIENT_ADMIN can add a new preset — staff use them, admins curate them.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = presetChargeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const charge = await prisma.presetCharge.create({
      data: {
        clientId: user.clientId,
        title: parsed.data.title,
        amount: parsed.data.amount,
        active: parsed.data.active ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "preset.created",
      entityType: "PresetCharge",
      entityId: charge.id,
      entityLabel: charge.title,
      summary: `Preset charge "${charge.title}" added at ${charge.amount} paise`,
      metadata: { amount: charge.amount },
    });

    return NextResponse.json({ charge });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
