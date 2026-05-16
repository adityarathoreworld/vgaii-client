"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTour } from "@/components/tour/TourContext";
import { TOUR_STEPS } from "@/components/tour/steps";
import { demoIdsFor, resolvePlaceholders } from "@/components/tour/demo-ids";
import { useStoredUser } from "@/lib/client-auth";

// Watches `stepIndex` from TourContext. Whenever the index changes
// and the current pathname doesn't match the step's route, push the
// new route (+ optional query hint for modal-opening pages).
//
// We DON'T poll for the target selector here — that races against
// Joyride's own targetWaitTimeout and ended up advancing the tour
// before Joyride could draw the tooltip, leaving the user with a
// black overlay and nothing to click. Joyride handles the wait
// natively and fires `error:target_not_found` if it can't resolve;
// TourRunner advances on that event.
//
// Doesn't render anything — mounted as a sibling of TourRunner inside
// the TourProvider.

export default function TourController() {
  const { active, stepIndex, stop } = useTour();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useStoredUser();
  const clientId = user?.clientId ?? null;
  // Track which index we've already routed for so an unrelated render
  // doesn't re-trigger a push.
  const handledIndex = useRef<number | null>(null);

  // Computed once per clientId; demo IDs are deterministic so we don't
  // need to wait for the start endpoint to return them.
  const demoIds = useMemo(
    () => (clientId ? demoIdsFor(clientId) : null),
    [clientId],
  );

  useEffect(() => {
    if (!active) {
      handledIndex.current = null;
      return;
    }
    const step = TOUR_STEPS[stepIndex];
    if (!step) {
      // Past the last step — let the runner's status:finished callback
      // do the cleanup. Defensive stop here in case it doesn't fire.
      stop();
      return;
    }
    if (handledIndex.current === stepIndex) return;
    handledIndex.current = stepIndex;

    const targetPath = resolvePlaceholders(step.route, demoIds);
    const targetQuery = step.routeQuery ?? "";
    // Compare full URL so same-path / different-query transitions
    // (e.g. /appointments → /appointments?add=1) still trigger a push.
    // Without this the modal-opening step would no-op because the
    // pathname hadn't changed.
    const currentQuery = searchParams.toString();
    const currentFull = currentQuery
      ? `${pathname}?${currentQuery}`
      : pathname;
    const targetFull = `${targetPath}${targetQuery}`;
    if (currentFull !== targetFull) {
      router.push(targetFull);
    }
  }, [active, stepIndex, pathname, searchParams, router, stop, demoIds]);

  return null;
}
