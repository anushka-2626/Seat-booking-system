"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAllocationsForWeek, adminForceRelease, lockSeat, unlockSeat, fetchEmployees } from "@/lib/admin";
import { DAYS, TOTAL_SEATS, isFloaterSeat } from "@/lib/rules";

function buildEmployeeMap(employees) {
  const map = new Map();
  employees.forEach((e) => {
    map.set(e.employee_id, e.name || e.employee_id);
  });
  return map;
}

export default function AdminWeekViewPage() {
  const [week, setWeek] = useState("Week 1");
  const [batch, setBatch] = useState("Batch 1");
  const [day, setDay] = useState("Mon");
  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeatInfo, setSelectedSeatInfo] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [alloc, emps] = await Promise.all([
          fetchAllocationsForWeek(week),
          fetchEmployees(),
        ]);
        if (!cancelled) {
          setAllocations(alloc);
          setEmployees(emps);
        }
      } catch (e) {
        console.error("Admin week view load error", e);
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

  const employeeMap = useMemo(() => buildEmployeeMap(employees), [employees]);

  const dayAllocations = useMemo(
    () =>
      allocations.filter(
        (a) => a.day === day && a.batch === batch
      ),
    [allocations, day, batch]
  );

  const seatMap = useMemo(() => {
    const map = new Map();
    dayAllocations.forEach((a) => {
      map.set(a.seat, a);
    });
    return map;
  }, [dayAllocations]);

  const handleSeatClick = (seatNumber) => {
    const alloc = seatMap.get(seatNumber) || null;
    setSelectedSeatInfo(alloc ? { ...alloc } : { seat: seatNumber, empty: true });
  };

  const refreshAfterAction = async () => {
    try {
      const alloc = await fetchAllocationsForWeek(week);
      setAllocations(alloc);
    } catch (e) {
      console.error("Failed to refresh allocations", e);
    }
  };

  const handleForceRelease = async () => {
    if (!selectedSeatInfo || !selectedSeatInfo.id) return;
    try {
      await adminForceRelease({ id: selectedSeatInfo.id });
      setMessage("Seat force released as temporary floater.");
      await refreshAfterAction();
    } catch (e) {
      console.error("Force release error", e);
      setMessage("Failed to force release seat.");
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedSeatInfo || !selectedSeatInfo.id) return;
    try {
      if (selectedSeatInfo.status === "locked") {
        await unlockSeat({ id: selectedSeatInfo.id });
        setMessage("Seat unlocked.");
      } else {
        await lockSeat({ id: selectedSeatInfo.id });
        setMessage("Seat locked for maintenance.");
      }
      await refreshAfterAction();
    } catch (e) {
      console.error("Lock/unlock error", e);
      setMessage("Failed to update seat lock status.");
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Week View (Admin)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inspect who sits where, by batch, week, and day. Force releases and locks are available.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            {["Batch 1", "Batch 2"].map((b) => (
              <button
                key={b}
                onClick={() => setBatch(b)}
                className={`px-3 py-1 text-xs font-semibold rounded-2xl ${
                  batch === b
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            {["Week 1", "Week 2"].map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={`px-3 py-1 text-xs font-semibold rounded-2xl ${
                  week === w
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-2xl ${
                  day === d
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message && (
        <div className="text-xs text-slate-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading seat map…</p>
      ) : (
        <div className="rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Seat Map • {batch} • {week} • {day}
              </h2>
              <p className="text-xs text-slate-700">
                Click a seat to see who is assigned or booked.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-800 font-semibold">
                <span className="w-3 h-3 rounded bg-sky-500" />
                Regular
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-semibold">
                <span className="w-3 h-3 rounded bg-yellow-400" />
                Floater
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-800 font-semibold">
                <span className="w-3 h-3 rounded bg-purple-500" />
                Temp floater
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-800 font-semibold">
                <span className="w-3 h-3 rounded bg-rose-500" />
                Locked
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-5 sm:grid-cols-10 gap-3">
            {Array.from({ length: TOTAL_SEATS }, (_, i) => i + 1).map((seat) => {
              const isFloater = isFloaterSeat(seat);
              const alloc = seatMap.get(seat);

              const labelId = alloc?.allocated_to_employee_id || "";
              const labelName = labelId ? employeeMap.get(labelId) || labelId : "";

              let bg = "bg-white text-slate-900";
              if (alloc) {
                if (alloc.status === "locked") {
                  bg = "bg-rose-500 text-white";
                } else if (alloc.type === "temp_floater") {
                  bg =
                    alloc.status === "released"
                      ? "bg-purple-100 text-purple-900"
                      : "bg-purple-500 text-white";
                } else if (alloc.type === "floater") {
                  bg = "bg-yellow-300 text-slate-900";
                } else if (alloc.type === "regular") {
                  bg = "bg-sky-100 text-slate-900";
                }
              } else if (isFloater) {
                bg = "bg-yellow-50 text-slate-900";
              }

              return (
                <button
                  key={seat}
                  type="button"
                  onClick={() => handleSeatClick(seat)}
                  className={`relative rounded-2xl px-3 py-2 text-[11px] font-semibold shadow-sm border border-slate-200 hover:scale-[1.02] transition ${bg}`}
                  title={
                    alloc
                      ? `Seat ${seat} • ${alloc.allocated_to_employee_id || "Unassigned"} • ${alloc.type} • ${alloc.status}`
                      : `Seat ${seat} (${isFloater ? "Floater" : "Regular"})`
                  }
                >
                  <div className="font-extrabold text-xs">Seat {seat}</div>
                  {labelId && (
                    <div className="mt-0.5 text-[10px] text-slate-800 truncate">
                      {labelId}
                    </div>
                  )}
                  {labelName && labelName !== labelId && (
                    <div className="text-[10px] text-slate-700 truncate">
                      {labelName}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedSeatInfo && (
            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">
                  Seat {selectedSeatInfo.seat}
                </div>
                {selectedSeatInfo.empty ? (
                  <div className="text-slate-700">No allocation for this seat.</div>
                ) : (
                  <>
                    <div className="text-slate-800">
                      Employee:{" "}
                      <span className="font-semibold">
                        {selectedSeatInfo.allocated_to_employee_id || "—"}
                      </span>{" "}
                      {selectedSeatInfo.allocated_to_employee_id &&
                        employeeMap.get(selectedSeatInfo.allocated_to_employee_id) && (
                          <span className="text-slate-700">
                            (
                            {employeeMap.get(
                              selectedSeatInfo.allocated_to_employee_id
                            )}
                            )
                          </span>
                        )}
                    </div>
                    <div className="text-slate-800">
                      Type:{" "}
                      <span className="font-semibold">{selectedSeatInfo.type}</span>{" "}
                      • Status:{" "}
                      <span className="font-semibold">
                        {selectedSeatInfo.status}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {!selectedSeatInfo.empty && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleForceRelease}
                    className="rounded-2xl bg-purple-100 text-purple-800 px-3 py-1 font-semibold hover:bg-purple-200"
                  >
                    Force release
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleLock}
                    className="rounded-2xl bg-amber-100 text-amber-800 px-3 py-1 font-semibold hover:bg-amber-200"
                  >
                    {selectedSeatInfo.status === "locked" ? "Unlock seat" : "Lock seat"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

