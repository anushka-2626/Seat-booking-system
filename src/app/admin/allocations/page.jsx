"use client";

import { useEffect, useState } from "react";
import { fetchAllocationsForWeek, adminForceRelease, lockSeat, unlockSeat } from "@/lib/admin";

export default function AdminAllocationsPage() {
  const [week, setWeek] = useState("Week 1");
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchAllocationsForWeek(week);
        if (!cancelled) setAllocations(data);
      } catch (e) {
        console.error("Failed to load allocations", e);
        if (!cancelled) setMessage("Failed to load allocations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [week]);

  const updateLocal = (id, patch) => {
    setAllocations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  };

  const handleForceRelease = async (row) => {
    try {
      await adminForceRelease({ id: row.id });
      updateLocal(row.id, { status: "released", type: "temp_floater" });
      setMessage("Seat released as temporary floater.");
    } catch (e) {
      console.error("Failed to force release", e);
      setMessage("Failed to force release seat.");
    }
  };

  const handleLock = async (row) => {
    try {
      await lockSeat({ id: row.id });
      updateLocal(row.id, { status: "locked" });
      setMessage("Seat locked for maintenance.");
    } catch (e) {
      console.error("Failed to lock seat", e);
      setMessage("Failed to lock seat.");
    }
  };

  const handleUnlock = async (row) => {
    try {
      await unlockSeat({ id: row.id });
      updateLocal(row.id, { status: "allocated" });
      setMessage("Seat unlocked.");
    } catch (e) {
      console.error("Failed to unlock seat", e);
      setMessage("Failed to unlock seat.");
    }
  };

  const grouped = allocations.reduce((acc, row) => {
    const key = `${row.week}-${row.day}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Allocations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Inspect and control seat allocations, including forced releases and locks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["Week 1", "Week 2"].map((w) => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                week === w
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="text-xs text-slate-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading allocations…</p>
      ) : allocations.length === 0 ? (
        <p className="text-sm text-slate-500">No allocations for this week.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, rows]) => {
            const [, day] = key.split("-");
            return (
              <div key={key} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-slate-800">
                    {day}
                  </div>
                  <div className="text-[11px] text-slate-700">
                    {rows.length} allocations
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-1.5 px-2 font-semibold text-slate-700">
                          Seat
                        </th>
                        <th className="text-left py-1.5 px-2 font-semibold text-slate-700">
                          Employee
                        </th>
                        <th className="text-left py-1.5 px-2 font-semibold text-slate-700">
                          Batch
                        </th>
                        <th className="text-left py-1.5 px-2 font-semibold text-slate-700">
                          Type
                        </th>
                        <th className="text-left py-1.5 px-2 font-semibold text-slate-700">
                          Status
                        </th>
                        <th className="py-1.5 px-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 hover:bg-slate-100/60 transition"
                        >
                          <td className="py-1.5 px-2 font-semibold text-slate-900">
                            {row.seat}
                          </td>
                          <td className="py-1.5 px-2 text-slate-900">
                            {row.allocated_to_employee_id || "—"}
                          </td>
                          <td className="py-1.5 px-2 text-slate-900">
                            {row.batch || "—"}
                          </td>
                          <td className="py-1.5 px-2 text-slate-900">
                            {row.type}
                          </td>
                          <td className="py-1.5 px-2 text-slate-900">
                            {row.status}
                          </td>
                          <td className="py-1.5 px-2 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => handleForceRelease(row)}
                              className="rounded-2xl bg-purple-100 text-purple-800 px-2 py-1 text-[11px] font-semibold hover:bg-purple-200"
                            >
                              Force release
                            </button>
                            {row.status !== "locked" ? (
                              <button
                                type="button"
                                onClick={() => handleLock(row)}
                                className="rounded-2xl bg-amber-100 text-amber-800 px-2 py-1 text-[11px] font-semibold hover:bg-amber-200"
                              >
                                Lock
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUnlock(row)}
                                className="rounded-2xl bg-emerald-100 text-emerald-800 px-2 py-1 text-[11px] font-semibold hover:bg-emerald-200"
                              >
                                Unlock
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

