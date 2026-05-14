"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { rupeesToPaise, formatRupees } from "@/lib/currency";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/lib/constants";

type Expense = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
  createdBy?: { name?: string | null; email?: string | null } | null;
};

type Response = { expenses: Expense[] };

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const METHOD_DEFS: Array<{
  key: PaymentMethod;
  label: string;
  icon: LucideIcon;
  className: string;
  activeClass: string;
}> = [
  {
    key: "cash",
    label: "Cash",
    icon: Banknote,
    className: "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
    activeClass: "border-emerald-500 bg-emerald-600 text-white shadow-sm",
  },
  {
    key: "upi",
    label: "UPI",
    icon: Smartphone,
    className: "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50",
    activeClass: "border-indigo-500 bg-indigo-600 text-white shadow-sm",
  },
  {
    key: "card",
    label: "Card",
    icon: CreditCard,
    className: "border-sky-200 bg-white text-sky-700 hover:bg-sky-50",
    activeClass: "border-sky-500 bg-sky-600 text-white shadow-sm",
  },
  {
    key: "mixed",
    label: "Bank/Mixed",
    icon: Wallet,
    className: "border-violet-200 bg-white text-violet-700 hover:bg-violet-50",
    activeClass: "border-violet-500 bg-violet-600 text-white shadow-sm",
  },
];

const formatCategory = (c: string) =>
  c.replace(/_/g, " ").replace(/\b\w/g, x => x.toUpperCase());

export default function ExpenseEntryTab() {
  const { data, mutate } = useSWR<Response>("/api/expenses");
  const expenses = data?.expenses ?? [];

  const [category, setCategory] = useState<ExpenseCategory>("miscellaneous");
  const [amountInput, setAmountInput] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const reset = () => {
    setCategory("miscellaneous");
    setAmountInput("");
    setMethod("cash");
    setNotes("");
  };

  const save = async () => {
    setError(null);
    setSavedMsg(null);
    const rupees = Number(amountInput);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      return setError("Amount must be a positive number");
    }

    setBusy(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          category,
          amount: rupeesToPaise(rupees),
          paymentMethod: method,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Failed to save");
        return;
      }
      setSavedMsg(`Logged ${formatRupees(rupeesToPaise(rupees))} expense`);
      reset();
      mutate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <section className="space-y-3 lg:col-span-2">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">New expense</h2>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Category
              </span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {formatCategory(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Amount (₹)
              </span>
              <input
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="mt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Payment method
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {METHOD_DEFS.map(m => {
                const Icon = m.icon;
                const active = method === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                      active ? m.activeClass : m.className
                    }`}
                  >
                    <Icon size={14} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-3 block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Vendor, invoice number, anything to remember…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          {savedMsg && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {savedMsg}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save expense"}
            </button>
          </div>
        </div>
      </section>

      <section className="lg:col-span-1">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <h2 className="text-base font-semibold text-slate-900">Recent</h2>
            <span className="text-xs text-slate-500">
              {expenses.length} entries
            </span>
          </div>
          {expenses.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-500">
              No expenses logged yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {expenses.slice(0, 10).map(e => (
                <li key={e.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {formatCategory(e.category)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(e.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {e.paymentMethod}
                      </p>
                      {e.notes && (
                        <p className="truncate text-xs text-slate-600">
                          {e.notes}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-900">
                      {formatRupees(e.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
