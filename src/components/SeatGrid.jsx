"use client";

import { useMemo } from "react";
import {
  getAllowedSeats,
  isFloaterSeat,
  TOTAL_SEATS,
  FLOATER_SEATS_START,
} from "@/lib/rules";

/**
 * allocations: array of rows from allocations table for the current week/day
 * currentEmployeeId: logged-in employee_id
 * requiresFloater: true if working as other batch
 */
export default function SeatGrid({
  allocations = [],
  currentEmployeeId,
  requiresFloater,
  selectedSeat,
  onSeatSelect,
}) {
  const allowedSeats = useMemo(() => getAllowedSeats(requiresFloater), [requiresFloater]);

  const seatMap = useMemo(() => {
    const map = new Map();
    allocations.forEach((a) => {
      map.set(a.seat, a);
    });
    return map;
  }, [allocations]);

  return (
    <div className="mt-6 rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Seat Map</h2>
          <p className="text-sm text-slate-700">
            Click a seat to select. {requiresFloater ? "Only floater seats enabled." : "Only regular seats enabled."}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
            <span className="w-3 h-3 rounded bg-white border border-slate-300" />
            Available
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">
            <span className="w-3 h-3 rounded bg-blue-500" />
            Occupied
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-semibold">
            <span className="w-3 h-3 rounded bg-yellow-300" />
            Floater
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-semibold">
            <span className="w-3 h-3 rounded bg-purple-500" />
            Temp Floater
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 sm:grid-cols-10 gap-3">
        {Array.from({ length: TOTAL_SEATS }, (_, i) => i + 1).map((seat) => {
          const isFloater = isFloaterSeat(seat);
          const allocation = seatMap.get(seat);

          const isYourSeat =
            allocation &&
            allocation.allocated_to_employee_id === currentEmployeeId &&
            allocation.type === "regular" &&
            allocation.status === "allocated";

          const isTempFloaterAvailable =
            allocation &&
            allocation.type === "temp_floater" &&
            allocation.status === "released";

          const isBooked =
            allocation &&
            (allocation.status === "booked" ||
              (allocation.type === "regular" && allocation.status === "allocated"));

          // Seat can be selected only if:
          // - user is working as other batch (requiresFloater)
          // - and seat is a floater 41-50 or a temp floater available
          const enabled =
            requiresFloater &&
            ( (isFloater && (!allocation || !isBooked)) || isTempFloaterAvailable );

          const selected = selectedSeat === seat;
          const showFBadge = isFloater && !isBooked;

          return (
            <button
              key={seat}
              disabled={!enabled}
              onClick={() => onSeatSelect(seat)}
              className={`relative rounded-2xl p-3 text-sm font-extrabold shadow-sm transition
                ${
                  isYourSeat
                    ? "bg-blue-600 text-white"
                    : isTempFloaterAvailable
                    ? "bg-amber-100 text-amber-900"
                    : isBooked
                    ? "bg-blue-500 text-white cursor-not-allowed opacity-85"
                    : isFloater
                    ? "bg-yellow-300 text-slate-900"
                    : "bg-white text-slate-900"
                }
                ${enabled ? "hover:scale-[1.02]" : ""}
                ${!enabled ? "opacity-40 cursor-not-allowed" : ""}
                ${selected ? "ring-4 ring-blue-600" : "ring-1 ring-slate-200"}
              `}
              title={
                isYourSeat
                  ? `Your assigned seat (${seat})`
                  : isTempFloaterAvailable
                  ? `Seat ${seat} - Temporary floater (released)`
                  : isBooked
                  ? `Seat ${seat} - Occupied`
                  : enabled
                  ? `Seat ${seat} (${isFloater ? "Floater" : "Temporary floater"})`
                  : requiresFloater
                  ? "Only floater and temporary floater seats are selectable for cross-batch booking"
                  : "Regular seats are auto-assigned for your batch"
              }
            >
              {seat}
              {isYourSeat && (
                <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-emerald-700">
                  You
                </span>
              )}
              {showFBadge && (
                <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70">
                  F
                </span>
              )}
              {isTempFloaterAvailable && !isYourSeat && (
                <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                  Temp
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
