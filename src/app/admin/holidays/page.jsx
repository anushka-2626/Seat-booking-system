"use client";

import { useEffect, useState } from "react";
import { fetchHolidays, addHoliday, removeHoliday } from "@/lib/holidays";

export default function AdminHolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [isClosed, setIsClosed] = useState(true);
  const [message, setMessage] = useState("");

  const rlsMessage =
    "Permission denied (RLS). Disable RLS for the holidays table or add an admin policy.";

  const formatError = (e, fallback) => {
    if (!e) return fallback;
    const msg = e.message || fallback;
    const details = e.details || "";
    const hint = e.hint || "";
    const combined = [msg, details, hint].filter(Boolean).join(" • ");
    const text = combined || fallback;
    const lower = (e.message || "").toLowerCase() + " " + (e.details || "").toLowerCase();
    if (lower.includes("row-level security") || lower.includes("permission denied")) {
      return `${text} (${rlsMessage})`;
    }
    return text;
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchHolidays();
        if (!cancelled) setHolidays(data);
      } catch (e) {
        console.error("Failed to load holidays", {
          message: e?.message,
          details: e?.details,
          hint: e?.hint,
          code: e?.code,
        });
        if (!cancelled) setMessage(formatError(e, "Failed to load holidays."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = async () => {
    if (!date || !name) {
      setMessage("Please provide date and name.");
      return;
    }
    try {
      await addHoliday({ date, name, is_closed: isClosed });
      const data = await fetchHolidays();
      setHolidays(data);
      setDate("");
      setName("");
      setIsClosed(true);
      setMessage("Holiday added.");
      setTimeout(() => setMessage(""), 2500);
    } catch (e) {
      console.error("Failed to add holiday", {
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        code: e?.code,
      });
      setMessage(formatError(e, "Failed to add holiday."));
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeHoliday(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      console.error("Failed to remove holiday", {
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        code: e?.code,
      });
      setMessage(formatError(e, "Failed to remove holiday."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Holidays</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage office closed days. Bookings are blocked on holidays.
          </p>
        </div>
      </div>

      {message && (
        <div className="text-xs text-slate-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
          {message}
        </div>
      )}

      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Holiday name"
              className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 mt-5 md:mt-0">
            <input
              id="isClosed"
              type="checkbox"
              checked={isClosed}
              onChange={(e) => setIsClosed(e.target.checked)}
            />
            <label
              htmlFor="isClosed"
              className="text-xs font-semibold text-slate-700"
            >
              Office closed (no booking)
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800"
        >
          Add holiday
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading holidays…</p>
      ) : holidays.length === 0 ? (
        <p className="text-sm text-slate-500">No holidays configured.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-semibold text-slate-700">
                  Date
                </th>
                <th className="text-left py-2 px-3 font-semibold text-slate-700">
                  Name
                </th>
                <th className="text-center py-2 px-3 font-semibold text-slate-700">
                  Closed
                </th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="py-2 px-3 text-slate-900">{h.holiday_date}</td>
                  <td className="py-2 px-3 text-slate-800">{h.name}</td>
                  <td className="py-2 px-3 text-center">
                    {h.is_closed ? "Yes" : "No"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(h.id)}
                      className="rounded-2xl bg-rose-100 text-rose-700 px-3 py-1 text-xs font-semibold hover:bg-rose-200"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

