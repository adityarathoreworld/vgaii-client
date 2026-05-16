import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole } from "@/lib/rbac";
import { seedDemoData } from "@/lib/onboarding/demo-seed";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Seeds demo data and flips the user's onboarding state to "in_progress".
// CLIENT_ADMIN only.
//
// Body `{ force?: boolean }`. Without `force`, refuses to re-run if the
// user is already "done" — protects against double-clicks on the
// welcome modal. The "Restart tour" button on /account sends `force:
// true` to re-trigger from a completed state.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    if (!user.clientId || !user.id) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      force?: boolean;
    };

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { onboardingState: true },
    });
    if (
      existing?.onboardingState === "done" &&
      !body.force
    ) {
      return NextResponse.json(
        { error: "Onboarding already completed" },
        { status: 409 },
      );
    }

    // Seed runs in its own transaction inside the helper; piggyback the
    // tenant + user state flips into a second transaction so a partial
    // seed failure leaves the flags untouched.
    const seedResult = await seedDemoData(user.clientId, user.id);
    const [, updatedUser] = await prisma.$transaction([
      prisma.client.update({
        where: { id: user.clientId },
        data: { demoDataSeededAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          onboardingState: "in_progress",
          onboardingStartedAt: new Date(),
          // Clear any previous doneAt so the resume banner logic stays
          // honest after a force-restart.
          onboardingDoneAt: null,
        },
        select: { id: true, onboardingState: true },
      }),
    ]);

    await logAudit(req, { actorType: "user", user }, {
      action: "onboarding.started",
      entityType: "User",
      entityId: user.id,
      entityLabel: user.id ?? "",
      summary: body.force ? "Onboarding tour restarted" : "Onboarding tour started",
      metadata: { seeded: seedResult, force: !!body.force },
    });

    return NextResponse.json({
      ok: true,
      state: updatedUser.onboardingState,
      seeded: seedResult,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
