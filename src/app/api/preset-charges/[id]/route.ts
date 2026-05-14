import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { presetChargeUpdateSchema } from "@/lib/validators/payment";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    const { id } = await params;

    const scope = withClientFilter(user) as { clientId?: string };
    const existing = await prisma.presetCharge.findFirst({
      where: { id, ...scope },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = presetChargeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const charge = await prisma.presetCharge.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "preset.updated",
      entityType: "PresetCharge",
      entityId: charge.id,
      entityLabel: charge.title,
      summary: "Preset charge updated",
      metadata: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ charge });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// Hard delete — `PaymentItem.presetChargeId` is SetNull-on-delete so
// historical payments keep their snapshot title and amount.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    const { id } = await params;

    const scope = withClientFilter(user) as { clientId?: string };
    const existing = await prisma.presetCharge.findFirst({
      where: { id, ...scope },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.presetCharge.delete({ where: { id } });

    await logAudit(req, { actorType: "user", user }, {
      action: "preset.deleted",
      entityType: "PresetCharge",
      entityId: existing.id,
      entityLabel: existing.title,
      summary: `Preset charge "${existing.title}" removed`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
