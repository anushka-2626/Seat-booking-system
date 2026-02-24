"use client";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SeatGrid from "@/components/SeatGrid";
import WeekView from "@/components/WeekView";
import {
  getCurrentTime,
  isDayHoliday,
  getWorkingDays,
  requiresFloater,
  canBook,
  BATCH_SCHEDULE,
  DAYS,
} from "@/lib/rules";
import { getCurrentEmployeeProfile, signOut } from "@/lib/auth";
import {
  ensureAutoAllocationsForWeek,
  getDayAllocations,
  releaseSeatAllocation,
  bookSeatAllocation,
  getEmployeeAllocations,
} from "@/lib/allocations";
import { ToastContainer } from "@/components/Toast";

export default function Home() {
  const router = useRouter();

  const [week, setWeek] = useState("Week 1");
  const [workingBatch, setWorkingBatch] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [activeTab, setActiveTab] = useState("book");
  const [now, setNow] = useState(null);
  const [mounted, setMounted] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  const [dayAllocations, setDayAllocations] = useState([]);
  const [employeeAllocations, setEmployeeAllocationsState] = useState([]);

  const [releaseWeek, setReleaseWeek] = useState("Week 1");
  const [releaseDay, setReleaseDay] = useState("Mon");
  const [releaseSeatNum, setReleaseSeatNum] = useState("");

  // Auth bootstrap
  useEffect(() => {
    let cancelled = false;
    async function loadAuth() {
      try {
        const { user, employee } = await getCurrentEmployeeProfile();
        if (!user) {
          router.replace("/login");
          return;
        }
        if (!cancelled) {
          setUser(user);
          setEmployee(employee);
          setWorkingBatch(employee?.batch ?? null);
        }
      } catch (e) {
        console.error("Auth error", e);
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }
    loadAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Time + allocations refresh
  useEffect(() => {
    setMounted(true);
    setNow(getCurrentTime());
    const interval = setInterval(() => {
      setNow(getCurrentTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ensure auto allocations whenever week or employee batch changes
  useEffect(() => {
    if (!employee || !employee.batch) return;
    ensureAutoAllocationsForWeek(week, employee.batch).catch((e) =>
      console.error("Failed to ensure auto allocations", e)
    );
  }, [week, employee]);

  // Load allocations for current day/week
  useEffect(() => {
    if (!employee || !workingBatch) return;
    let cancelled = false;
    async function loadAllocations() {
      try {
        const dayData = await getDayAllocations(week, selectedDay);
        const empData = await getEmployeeAllocations(employee.employee_id);
        if (!cancelled) {
          setDayAllocations(dayData);
          setEmployeeAllocationsState(empData);
        }
      } catch (e) {
        console.error("Failed to load allocations", e);
        if (!cancelled) {
          setDayAllocations([]);
          setEmployeeAllocationsState([]);
        }
      }
    }
    loadAllocations();
    return () => {
      cancelled = true;
    };
  }, [week, selectedDay, employee, workingBatch]);

  const myBatch = employee?.batch ?? "Batch 1";
  const myScheduledDays = myBatch ? BATCH_SCHEDULE[myBatch][week] : [];
  const workingDaysForChosenBatch = workingBatch
    ? getWorkingDays(workingBatch, week)
    : [];
  const requiresFloaterSeat = employee && workingBatch
    ? requiresFloater(myBatch, workingBatch)
    : false;

  // Booking allowed after 3 PM
  const isAfter3PMCheck = mounted && now ? now.getHours() >= 15 : false;
  const isHolidayCheck = isDayHoliday(selectedDay);

  const [toasts, setToasts] = useState([]);

  // Only validate booking after mount & auth
  const bookingValidation = useMemo(() => {
    if (!mounted || !employee || !workingBatch) {
      return { allowed: false, reason: "Loading..." };
    }
    return canBook(week, selectedDay, workingBatch, selectedSeat);
  }, [mounted, employee, workingBatch, week, selectedDay, selectedSeat]);

  const showToast = (type, message, title) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleBook = async () => {
    if (!employee) {
      showToast("error", "You must be logged in.");
      return;
    }

    if (!bookingValidation.allowed) {
      showToast("error", bookingValidation.reason);
      return;
    }

    try {
      await bookSeatAllocation({
        week,
        day: selectedDay,
        seat: selectedSeat,
        workingBatch,
        employeeId: employee.employee_id,
      });
      showToast(
        "success",
        `Seat ${selectedSeat} booked for ${selectedDay}, ${week} as ${workingBatch} (${employee.employee_id}).`,
        "Booking confirmed"
      );
      setSelectedSeat(null);
      const updated = await getDayAllocations(week, selectedDay);
      setDayAllocations(updated);
    } catch (error) {
      showToast("error", error.message || "Failed to book seat.", "Booking failed");
    }
  };

  const handleRelease = async () => {
    if (!employee) {
      showToast("error", "You must be logged in.");
      return;
    }

    if (!releaseSeatNum) {
      showToast("error", "Please select a seat to release.");
      return;
    }

    const seatNum = parseInt(releaseSeatNum, 10);
    if (Number.isNaN(seatNum) || seatNum < 1 || seatNum > 50) {
      showToast("error", "Please enter a valid seat number (1-50).");
      return;
    }

    try {
      await releaseSeatAllocation({
        week: releaseWeek,
        day: releaseDay,
        seat: seatNum,
        employeeId: employee.employee_id,
      });
      showToast(
        "success",
        `Seat ${seatNum} released for ${releaseDay}, ${releaseWeek}.`,
        "Seat released"
      );
      setReleaseSeatNum("");
      const updated = await getDayAllocations(week, selectedDay);
      setDayAllocations(updated);
    } catch (error) {
      showToast("error", error.message || "Failed to release seat.", "Release failed");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100">
        <div className="rounded-3xl bg-white/80 border border-white shadow-sm px-6 py-4 text-sm text-slate-700">
          Loading your workspace…
        </div>
      </div>
    );
  }

  if (!user || !employee) {
    // In case profile is missing, fallback to login
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100">
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Wissen Smart Seat Booking
            </h1>
            <p className="text-slate-700 mt-1">
              Week-wise allocation • Floater logic • Booking after 3 PM • Holiday-safe
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur p-3 shadow-sm border border-white">
              <div className="text-xs text-slate-700">
                Time now:{" "}
                <span className="font-semibold text-slate-800">
                  {mounted && now
                    ? now.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </span>
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  isAfter3PMCheck ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {mounted
                  ? isAfter3PMCheck
                  ? "Booking OPEN (After 3 PM)"
                  : "Booking LOCKED (Before 3 PM)"
                  : "Loading..."}
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-900 text-slate-50 px-4 py-2.5 shadow-sm">
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-slate-700">
                  Logged in as
                </div>
                <div className="text-sm font-semibold">
                  {employee.name} • {employee.employee_id}
                </div>
                <div className="text-[11px] text-slate-600">
                  {employee.batch} • Default seat{" "}
                  <span className="font-bold">{employee.default_seat}</span>
                </div>
              </div>
              {employee.role === "admin" && (
                <a
                  href="/admin"
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-amber-400 text-slate-900 hover:bg-amber-300"
                >
                  Admin
                </a>
              )}
              <a
                href="/profile"
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600"
              >
                Profile
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("book")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "book"
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Book Seat
          </button>
          <button
            onClick={() => setActiveTab("week")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "week"
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Week View
          </button>
          <button
            onClick={() => setActiveTab("release")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "release"
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Release Seat
          </button>
        </div>

        {/* Book Seat Tab */}
        {activeTab === "book" && (
          <>
            {/* Controls */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white shadow-sm p-5">
                <p className="text-sm font-semibold text-slate-800">Choose Week</p>
                <div className="mt-3 flex gap-2">
                  {["Week 1", "Week 2"].map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        setWeek(w);
                        setSelectedSeat(null);
                      }}
                      className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        week === w
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-800">Your Batch</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 text-white cursor-default"
                    >
                      {myBatch}
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 mt-3">
                    Scheduled days for you:{" "}
                    <span className="font-semibold text-slate-800">{myScheduledDays.join(", ")}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white shadow-sm p-5">
                <p className="text-sm font-semibold text-slate-800">Working As</p>
                <p className="text-xs text-slate-700 mt-1">
                  If you book in the other batch's days → you must use floater seats.
                </p>

                <div className="mt-3 flex gap-2">
                  {["Batch 1", "Batch 2"].map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        setWorkingBatch(b);
                        setSelectedSeat(null);
                      }}
                      className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        workingBatch === b
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-800">
                    Seat Type Required
                    <div className="text-sm font-extrabold text-slate-900">
                      {requiresFloaterSeat ? "FLOATER (41–50)" : "REGULAR (1–40)"}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      requiresFloaterSeat ? "bg-yellow-100 text-yellow-700" : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {requiresFloaterSeat ? "Cross-batch booking" : "Within your batch"}
                  </span>
                </div>

                <p className="text-xs text-slate-700 mt-3">
                  Days for chosen working batch:{" "}
                  <span className="font-semibold text-slate-800">
                    {workingDaysForChosenBatch.join(", ")}
                  </span>
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 backdrop-blur border border-white shadow-sm p-5">
                <p className="text-sm font-semibold text-slate-800">Pick Day</p>

                <div className="mt-3 grid grid-cols-5 gap-2">
                  {DAYS.map((d) => {
                    const isWorkDay = workingDaysForChosenBatch.includes(d);
                    const active = selectedDay === d;
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          setSelectedDay(d);
                          setSelectedSeat(null);
                        }}
                        className={`rounded-xl px-2 py-2 text-sm font-bold transition border ${
                          active
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        } ${!isWorkDay ? "opacity-50" : ""}`}
                        title={isWorkDay ? "Working day" : "Not a working day for chosen batch"}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 text-xs text-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Selected day status</span>
                    <span
                      className={`px-3 py-1 rounded-full font-semibold ${
                        workingDaysForChosenBatch.includes(selectedDay)
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {workingDaysForChosenBatch.includes(selectedDay) ? "Allowed" : "Not in schedule"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Holiday check</span>
                    <span
                      className={`px-3 py-1 rounded-full font-semibold ${
                        isHolidayCheck ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isHolidayCheck ? "Holiday (blocked)" : "Not a holiday"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee ID Input */}
            {/* Employee ID Input (read-only display now) */}
            <div className="mt-6 rounded-2xl bg-white/80 backdrop-blur border border-white shadow-sm p-5">
              <p className="text-sm font-semibold text-slate-800 mb-1">Your Identity</p>
              <p className="text-xs text-slate-700">
                {employee.name} • {employee.employee_id} • {employee.batch} • Default seat{" "}
                <span className="font-semibold">{employee.default_seat}</span>
              </p>
            </div>

            {/* Seat Grid */}
            <SeatGrid
              allocations={dayAllocations}
              currentEmployeeId={employee.employee_id}
              requiresFloater={requiresFloaterSeat}
              selectedSeat={selectedSeat}
              onSeatSelect={setSelectedSeat}
            />

            {/* Booking CTA */}
            <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-sm text-slate-700">
                <div className="font-semibold text-slate-900">
                  Selection:{" "}
                  {selectedSeat ? (
                    <>
                      Seat <span className="font-extrabold">{selectedSeat}</span> • {selectedDay} • {week} • {workingBatch}
                    </>
                  ) : (
                    <span className="text-slate-700">No seat selected</span>
                  )}
                </div>
                <div className="text-xs text-slate-700 mt-1">
                  Booking rules: After 3 PM • Not on holidays • Must match schedule • Cross-batch uses floater seats
                </div>
              </div>

              <button
                disabled={!bookingValidation.allowed || !selectedSeat}
                onClick={handleBook}
                className={`rounded-2xl px-6 py-3 font-extrabold shadow-sm transition ${
                  bookingValidation.allowed && selectedSeat
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-200 text-slate-700 cursor-not-allowed"
                }`}
              >
                {bookingValidation.allowed && selectedSeat
                  ? "Confirm Booking"
                  : bookingValidation.reason || "Select a seat"}
              </button>
            </div>

            {/* Validation Messages */}
            {!isAfter3PMCheck && (
              <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-3">
                ⛔ Booking opens only after <b>3:00 PM</b>. You can still view availability & plan your week.
              </div>
            )}
            {isHolidayCheck && (
              <div className="mt-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                ⛔ Booking on a holiday is not allowed.
              </div>
            )}
            {!workingDaysForChosenBatch.includes(selectedDay) && (
              <div className="mt-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                ⛔ Selected day is not part of the chosen batch schedule for {week}.
              </div>
            )}
          </>
        )}

        {/* Week View Tab */}
        {activeTab === "week" && (
          <div className="mt-6">
            <div className="rounded-2xl bg-white/80 backdrop-blur border border-white shadow-sm p-5 mb-6">
              <p className="text-sm font-semibold text-slate-800 mb-3">Select Week</p>
              <div className="flex gap-2">
                {["Week 1", "Week 2"].map((w) => (
                  <button
                    key={w}
                    onClick={() => setWeek(w)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
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
            <WeekView week={week} />
          </div>
        )}

        {/* Release Seat Tab */}
        {activeTab === "release" && (
          <div className="mt-6 rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-6">
            <h2 className="text-xl font-extrabold text-slate-900 mb-6">Release Your Seat</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Employee
                </label>
                <div className="rounded-xl bg-slate-50 px-4 py-2 text-xs text-slate-700">
                  {employee.name} • {employee.employee_id} • Default seat{" "}
                  <span className="font-semibold">{employee.default_seat}</span>
                  <div className="mt-1 text-slate-600">
                    Releasing as: <span className="font-semibold">{employee.employee_id}</span>
                  </div>
                </div>
              </div>

              {employeeAllocations.length > 0 && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-3">Your Bookings:</p>
                  <div className="space-y-2">
                    {employeeAllocations.map((booking) => (
                      <button
                        key={`${booking.week}-${booking.day}-${booking.seat}`}
                        onClick={() => {
                          setReleaseWeek(booking.week);
                          setReleaseDay(booking.day);
                          setReleaseSeatNum(booking.seat.toString());
                        }}
                        className={`w-full text-left rounded-lg px-4 py-2 text-sm transition ${
                          releaseSeatNum === booking.seat.toString() &&
                          releaseWeek === booking.week &&
                          releaseDay === booking.day
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Seat {booking.seat} • {booking.day} • {booking.week} • {booking.batch} •{" "}
                        {booking.status}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Week</label>
                  <select
                    value={releaseWeek}
                    onChange={(e) => setReleaseWeek(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 border border-slate-300 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    {["Week 1", "Week 2"].map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Day</label>
                  <select
                    value={releaseDay}
                    onChange={(e) => setReleaseDay(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 border border-slate-300 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Seat Number</label>
                  <input
                    type="number"
                    value={releaseSeatNum}
                    onChange={(e) => setReleaseSeatNum(e.target.value)}
                    placeholder="1-50"
                    min="1"
                    max="50"
                    className="w-full rounded-xl px-4 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={handleRelease}
                disabled={!releaseSeatNum}
                className={`rounded-2xl px-6 py-3 font-extrabold shadow-sm transition ${
                  releaseSeatNum
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-slate-200 text-slate-700 cursor-not-allowed"
                }`}
              >
                Release Seat
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
