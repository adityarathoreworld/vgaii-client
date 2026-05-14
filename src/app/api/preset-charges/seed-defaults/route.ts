import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole } from "@/lib/rbac";
import { DEFAULT_PRESET_CHARGES } from "@/lib/payment-defaults";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// One-click populate of starter charges. Refuses to run if the tenant
// already has any presets — keeps the action idempotent and safe for
// accidental double-clicks.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const existing = await prisma.presetCharge.count({
      where: { clientId: user.clientId },
    });
    if (existing > 0) {
      return NextResponse.json(
        { error: "Preset charges already exist for this client" },
        { status: 409 },
      );
    }

    const created = await prisma.presetCharge.createMany({
      data: DEFAULT_PRESET_CHARGES.map((p, idx) => ({
        clientId: user.clientId!,
        title: p.title,
        amount: p.amount,
        active: true,
        sortOrder: idx,
      })),
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "preset.seeded",
      entityType: "PresetCharge",
      entityLabel: `${created.count} starter charges`,
      summary: `Seeded ${created.count} default preset charges`,
    });

    return NextResponse.json({ created: created.count });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
