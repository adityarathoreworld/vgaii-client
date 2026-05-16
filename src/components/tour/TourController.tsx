"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTour } from "@/components/tour/TourContext";
import { TOUR_STEPS } from "@/components/tour/steps";

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
  // Track which index we've already routed for so an unrelated render
  // doesn't re-trigger a push.
  const handledIndex = useRef<number | null>(null);

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

    const targetPath = step.route;
    const targetQuery = step.routeQuery ?? "";
    if (pathname !== targetPath) {
      router.push(`${targetPath}${targetQuery}`);
    }
  }, [active, stepIndex, pathname, router, stop]);

  return null;
}
