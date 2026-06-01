"use client";

// Floating "+" in the bottom-right corner. Tap to fan out four
// quick-add chips (Lead, Patient, Appointment, Payment). Each chip is
// a Link to the same deep-link URLs the dashboard's Quick Actions
// card uses — those routes already open the right modal on mount, so
// the FAB doesn't need to know about per-feature modals itself.
//
// Hidden when:
//  - the user isn't logged in (no token in localStorage)
//  - the onboarding tour is active (the FAB would compete with
//    Joyride's spotlight and look noisy mid-tour)
//
// Closes on: Esc, backdrop click, or after navigating to a chip.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarPlus,
  Plus,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTour } from "@/components/tour/TourContext";

type FabAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Tailwind classes for the chip's circular icon swatch. We keep
  // these in sync with QuickActionsCard so the dashboard tile and the
  // FAB chip read as the same action.
  iconClass: string;
};

const ACTIONS: FabAction[] = [
  {
    href: "/leads?add=1",
    label: "Add lead",
    icon: UserPlus,
    iconClass: "bg-indigo-100 text-indigo-600",
  },
  {
    href: "/patients?add=1",
    label: "Add patient",
    icon: Users,
    iconClass: "bg-emerald-100 text-emerald-600",
  },
  {
    href: "/appointments?add=1",
    label: "New appointment",
    icon: CalendarPlus,
    iconClass: "bg-sky-100 text-sky-600",
  },
  {
    href: "/finances?tab=payment&new=1",
    label: "Record payment",
    icon: Wallet,
    iconClass: "bg-amber-100 text-amber-600",
  },
];

export default function QuickActionFab() {
  const [open, setOpen] = useState(false);
  const { active: tourActive } = useTour();
  const pathname = usePathname();

  // Close the panel whenever the user navigates. Store-and-compare
  // during render instead of an effect — React-19's
  // set-state-in-effect lint flags the effect form, and the result is
  // identical (the synchronous setOpen runs once per pathname change).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Esc closes. Captured at document level so it works regardless of
  // which child has focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Only render for signed-in dashboard users. AppShell already gates
  // routing behind AuthGuard, so this check is a belt-and-braces
  // guard for the brief moment between mount and the guard kicking
  // in. Same direct-read-localStorage pattern as authHeaders()
  // elsewhere in the codebase — SSR sees `false`, CSR sees the real
  // value on first paint.
  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");

  if (!hasToken || tourActive) return null;

  return (
    <>
      {/* Click-outside backdrop. Transparent so it doesn't dim the page,
          but still catches clicks anywhere outside the chip column. */}
      {open && (
        <button
          type="button"
          aria-label="Close quick actions"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-transparent"
        />
      )}

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {/* Action chips fan up above the FAB. Rendered top-down so the
            first action (Add lead) is closest to the thumb. */}
        {open && (
          <div className="flex flex-col items-end gap-2">
            {ACTIONS.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setOpen(false)}
                  // Stagger entrance so chips cascade in. animation-delay
                  // via inline style — Tailwind doesn't ship arbitrary
                  // animation-delay utilities by default.
                  style={{
                    animation: "fab-chip-in 160ms ease-out backwards",
                    animationDelay: `${i * 30}ms`,
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <span>{a.label}</span>
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${a.iconClass}`}
                  >
                    <Icon size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition focus:outline-none focus:ring-4 focus:ring-indigo-200 ${
            open
              ? "rotate-90 bg-slate-700 hover:bg-slate-800"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          style={{ transitionProperty: "transform, background-color" }}
        >
          {open ? <X size={22} /> : <Plus size={26} />}
        </button>
      </div>

      <style jsx global>{`
        @keyframes fab-chip-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
