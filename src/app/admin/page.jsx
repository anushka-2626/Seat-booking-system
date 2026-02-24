"use client";

import { useEffect, useState } from "react";
import { getWeekData } from "@/lib/allocations";
import { loadAppSettings } from "@/lib/settings";

export default function AdminDashboardPage() {
  const [week, setWeek] = useState("Week 1");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [weekData, appSettings] = await Promise.all([
          getWeekData(week),
          loadAppSettings(),
        ]);
        if (!cancelled) {
          setStats(weekData);
          setSettings(appSettings);
        }
      } catch (e) {
        console.error("Failed to load admin dashboard", e);
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

  const totalSeats =
    (settings?.regular_seats || 40) + (settings?.floater_seats || 10);

  const currentWeekTotals = stats?.totals || {
    regularAllocated: 0,
    floaterBooked: 0,
    tempAvailable: 0,
    tempBooked: 0,
    releasedCount: 0,
  };

  const totalOccupied =
    currentWeekTotals.regularAllocated +
    currentWeekTotals.floaterBooked +
    currentWeekTotals.tempBooked;
  const occupancyPercent = totalSeats
    ? ((totalOccupied / totalSeats) * 100).toFixed(1)
    : "0.0";

  const tempFloatersCreated = currentWeekTotals.tempAvailable + currentWeekTotals.tempBooked;

  if (loading || !stats) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-4">
          Admin Dashboard
        </h1>
        <p className="text-sm text-slate-700">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-700 mt-1">
            Monitor occupancy, temp floaters, and releases across the week.
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4">
          <div className="text-xs font-semibold text-sky-700">Week Occupancy</div>
          <div className="text-2xl font-extrabold text-sky-900 mt-1">
            {occupancyPercent}%
          </div>
          <p className="text-[11px] text-sky-600 mt-1">
            {totalOccupied} / {totalSeats} seats used
          </p>
        </div>
        <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
          <div className="text-xs font-semibold text-purple-700">
            Temp Floaters Created
          </div>
          <div className="text-2xl font-extrabold text-purple-900 mt-1">
            {tempFloatersCreated}
          </div>
          <p className="text-[11px] text-purple-600 mt-1">
            Released regular seats this week
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-xs font-semibold text-amber-700">
            Temp Floaters Booked
          </div>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">
            {currentWeekTotals.tempBooked}
          </div>
          <p className="text-[11px] text-amber-600 mt-1">
            Cross-batch utilization of released seats
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-xs font-semibold text-emerald-700">
            Released Seats
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 mt-1">
            {currentWeekTotals.releasedCount}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">
            Seats freed up by employees
          </p>
        </div>
      </div>

      {/* Export CSV */}
      <div>
        <button
          type="button"
          onClick={() => {
            const rows = [];
            rows.push([
              "week",
              "day",
              "seat",
              "allocated_to_employee_id",
              "batch",
              "type",
              "status",
            ]);
            for (const day of Object.keys(stats.byDay)) {
              const daySeats = stats.byDay[day].seats;
              daySeats.forEach((s) => {
                rows.push([
                  week,
                  day,
                  s.seatNumber,
                  s.employeeId || "",
                  s.batch || "",
                  s.type,
                  s.status,
                ]);
              });
            }
            const csv = rows.map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `allocations_${week}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center rounded-2xl bg-slate-900 text-white text-xs font-semibold px-4 py-2 shadow-sm hover:bg-slate-800"
        >
          Export current week as CSV
        </button>
      </div>
    </div>
  );
}

