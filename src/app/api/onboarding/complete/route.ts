import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole } from "@/lib/rbac";
import { clearDemoData } from "@/lib/onboarding/demo-seed";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Tear down demo data + mark the user's tour "done". CLIENT_ADMIN only.
// Idempotent — calling on a tenant with no demo rows is a no-op except
// for the state flip.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    if (!user.clientId || !user.id) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const deleted = await clearDemoData(user.clientId);
    await prisma.$transaction([
      prisma.client.update({
        where: { id: user.clientId },
        data: { demoDataSeededAt: null },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          onboardingState: "done",
          onboardingDoneAt: new Date(),
        },
      }),
    ]);

    await logAudit(req, { actorType: "user", user }, {
      action: "onboarding.completed",
      entityType: "User",
      entityId: user.id,
      entityLabel: user.id ?? "",
      summary: "Onboarding tour completed",
      metadata: { deleted },
    });

    return NextResponse.json({ ok: true, deleted });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
