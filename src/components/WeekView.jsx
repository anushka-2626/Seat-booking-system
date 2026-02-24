"use client";

import { useEffect, useState } from "react";
import { DAYS } from "@/lib/rules";
import { getWeekData } from "@/lib/allocations";

export default function WeekView({ week }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getWeekData(week);
        if (!cancelled) setStats(data);
      } catch (e) {
        console.error("Failed to load week data", e);
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [week]);

  if (loading || !stats) {
    return (
      <div className="mt-6 rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-6">
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Week Allocation: {week}</h2>
        <p className="text-sm text-slate-700">Loading allocation data…</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-6">
      <h2 className="text-xl font-extrabold text-slate-900 mb-6">
        Week Allocation: {week}
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4">
          <div className="text-sm text-sky-700 font-semibold">Regular Allocations</div>
          <div className="text-2xl font-extrabold text-sky-900 mt-1">
            {stats.totals.regularAllocated}
          </div>
        </div>
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
          <div className="text-sm text-yellow-700 font-semibold">Floaters Booked</div>
          <div className="text-2xl font-extrabold text-yellow-900 mt-1">
            {stats.totals.floaterBooked}
          </div>
        </div>
        <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
          <div className="text-sm text-purple-700 font-semibold">Temp Floaters (Available)</div>
          <div className="text-2xl font-extrabold text-purple-900 mt-1">
            {stats.totals.tempAvailable}
          </div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
          <div className="text-sm text-rose-700 font-semibold">Temp Floaters (Booked)</div>
          <div className="text-2xl font-extrabold text-rose-900 mt-1">
            {stats.totals.tempBooked}
          </div>
        </div>
      </div>

      {/* Allocation Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-3 px-4 font-extrabold text-slate-900">Day</th>
              <th className="text-center py-3 px-4 font-extrabold text-slate-900">
                Regular Allocations
              </th>
              <th className="text-center py-3 px-4 font-extrabold text-slate-900">
                Floaters Booked
              </th>
              <th className="text-center py-3 px-4 font-extrabold text-slate-900">
                Temp Floaters (Avail / Booked)
              </th>
              <th className="text-left py-3 px-4 font-extrabold text-slate-900">Seats Detail</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => {
              const dayStats = stats.byDay[day];
              return (
                <tr
                  key={day}
                  className="border-b border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="py-4 px-4">
                    <span className="font-bold text-slate-900">{day}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-semibold text-slate-900">
                      {dayStats.regularAllocated}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-semibold text-slate-900">
                      {dayStats.floaterBooked}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-semibold text-slate-900">
                      {dayStats.tempAvailable} / {dayStats.tempBooked}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {dayStats.seats.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {dayStats.seats.map((seat) => (
                          <span
                            key={`${day}-${seat.seatNumber}-${seat.employeeId}-${seat.status}`}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                              seat.type === "floater"
                                ? "bg-yellow-100 text-yellow-800"
                                : seat.type === "temp_floater"
                                ? seat.status === "released"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-purple-200 text-purple-900"
                                : "bg-sky-100 text-sky-800"
                            }`}
                            title={`Employee: ${seat.employeeId || "—"}, Batch: ${
                              seat.batch || "—"
                            }, Status: ${seat.status}`}
                          >
                            <span>Seat {seat.seatNumber}</span>
                            {seat.employeeId && (
                              <span className="text-[10px] opacity-75">
                                ({seat.employeeId})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-800">No allocations</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-800">
          <span className="font-semibold text-slate-900">Legend:</span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-sky-500" />
            Regular Allocations (1-40)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-yellow-500" />
            Floater Seats (41-50)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-purple-500" />
            Temporary Floaters (Released / Booked)
          </span>
        </div>
      </div>
    </div>
  );
}

