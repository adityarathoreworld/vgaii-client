"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTour } from "@/components/tour/TourContext";
import { TOUR_STEPS } from "@/components/tour/steps";

// Watches `stepIndex` from TourContext. Whenever the index changes:
// 1. If the current pathname doesn't match the step's route, push the
//    new route (+ optional query hint for modal-opening pages).
// 2. Poll for the step's `waitFor` selector for up to 3 seconds. If it
//    appears the tour proceeds naturally; if not, skip to the next step
//    so a missing target can never wedge the user.
//
// Doesn't render anything — mounted as a sibling of TourRunner inside
// the TourProvider. Single source of truth for "the tour is on page X".

const POLL_INTERVAL_MS = 80;
const POLL_TIMEOUT_MS = 3000;

export default function TourController() {
  const { active, stepIndex, next, stop } = useTour();
  const router = useRouter();
  const pathname = usePathname();
  // Track which index we've already handled so an unrelated render
  // doesn't re-trigger a route push.
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

    let cancelled = false;

    const targetPath = step.route;
    const targetQuery = step.routeQuery ?? "";
    const fullTarget = `${targetPath}${targetQuery}`;
    if (pathname !== targetPath) {
      router.push(fullTarget);
      // After the route changes the effect re-runs (pathname update),
      // and `handledIndex.current === stepIndex` short-circuits — so
      // we won't push again. The wait-for poll runs on the next pass.
      return;
    }

    // Already on the right route. If there's no waitFor, the runner
    // will render the step as soon as Joyride sees the new index. If
    // there is one, poll until it shows up or timeout.
    if (!step.waitFor) return;

    const start = Date.now();
    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector(step.waitFor!);
      if (el) return; // Joyride takes over from here.
      if (Date.now() - start > POLL_TIMEOUT_MS) {
        // Target didn't materialise — skip ahead so the tour keeps
        // moving instead of stalling on an invisible step.
        console.warn(
          `[TourController] step ${stepIndex} target ${step.waitFor} not found; skipping`,
        );
        next();
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    setTimeout(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
    };
  }, [active, stepIndex, pathname, router, next, stop]);

  return null;
}
