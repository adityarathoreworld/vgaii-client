import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole } from "@/lib/rbac";
import { clearDemoData } from "@/lib/onboarding/demo-seed";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Body: { phase: "welcome" | "tour" }
// - "welcome": user pressed Skip on the very first modal; no demo seed
//   has happened yet so no cleanup is needed.
// - "tour": user started the tour, demo rows exist, now bailing — must
//   still clean up to leave the tenant in a usable state.
//
// Different audit actions in each case so we can later measure
// activation vs drop-off without joining tables.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    if (!user.clientId || !user.id) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      phase?: "welcome" | "tour";
    };
    const phase = body.phase === "tour" ? "tour" : "welcome";

    let deleted: Awaited<ReturnType<typeof clearDemoData>> | undefined;
    if (phase === "tour") {
      deleted = await clearDemoData(user.clientId);
    }

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
      action: "onboarding.skipped",
      entityType: "User",
      entityId: user.id,
      entityLabel: user.id ?? "",
      summary:
        phase === "tour"
          ? "Onboarding tour skipped (mid-flight cleanup)"
          : "Onboarding tour skipped at welcome modal",
      metadata: { phase, deleted: deleted ?? null },
    });

    return NextResponse.json({ ok: true, phase, deleted: deleted ?? null });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
