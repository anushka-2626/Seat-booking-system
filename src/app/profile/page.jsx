"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentEmployeeProfile,
  signOut,
  updatePassword,
} from "@/lib/auth";
import { getEmployeeAllocations, releaseSeatAllocation } from "@/lib/allocations";

export default function ProfilePage() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [releasingId, setReleasingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { user, employee } = await getCurrentEmployeeProfile();
        if (!user) {
          router.replace("/login");
          return;
        }
        if (!cancelled) {
          setEmployee(employee);
          // Load employee's allocations/bookings
          if (employee?.employee_id) {
            const allocs = await getEmployeeAllocations(employee.employee_id);
            setBookings(allocs);
          }
        }
      } catch (e) {
        console.error("Profile load error", e);
        if (!cancelled) setError("Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("Please enter the new password twice.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setChanging(true);
    try {
      await updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated successfully.");
    } catch (e) {
      console.error("Password update error", e);
      setError(e.message || "Failed to update password.");
    } finally {
      setChanging(false);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleReleaseSeat = async (booking) => {
    if (!booking || !booking.id) return;
    
    setReleasingId(booking.id);
    setError("");
    try {
      await releaseSeatAllocation({
        week: booking.week,
        day: booking.day,
        seat: booking.seat,
        employeeId: employee?.employee_id,
      });
      // Update local state by marking this booking as released
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, status: "released", type: "temp_floater" }
            : b
        )
      );
      setSuccess("Seat released successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      console.error("Failed to release seat", e);
      setError(e.message || "Failed to release seat.");
    } finally {
      setReleasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100">
        <div className="rounded-3xl bg-white/80 border border-white shadow-sm px-6 py-4 text-sm text-slate-700">
          Loading profile…
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100">
        <div className="max-w-md w-full rounded-3xl bg-white/80 border border-white shadow-sm p-6 text-center space-y-3">
          <h1 className="text-lg font-extrabold text-slate-900">Profile missing</h1>
          <p className="text-sm text-slate-600">
            We couldn&apos;t find your employee profile. Please contact your administrator.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 rounded-2xl bg-slate-900 text-white text-xs font-semibold px-4 py-2 hover:bg-slate-800"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (employee?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100">
      <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition"
        >
          ← Back
        </button>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Your Profile</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your personal details and account security.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-2xl bg-slate-900 text-white text-xs font-semibold px-4 py-2 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
            {success}
          </div>
        )}

        <div className="rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Employee details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-800">
            <div>
              <div className="font-semibold text-slate-900">Name</div>
              <div>{employee.name}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Employee ID</div>
              <div>{employee.employee_id}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Batch</div>
              <div>{employee.batch}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Role</div>
              <div>{employee.role || "employee"}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Default seat</div>
              <div>{employee.default_seat ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={changing}
              className="rounded-2xl bg-slate-900 text-white text-xs font-semibold px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
            >
              {changing ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Your bookings</h2>
          {bookings.length === 0 ? (
            <p className="text-xs text-slate-800">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">
                      Week
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">
                      Day
                    </th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-700">
                      Seat
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">
                      Type
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const canRelease = booking.status === "allocated" || booking.status === "booked";
                    return (
                      <tr
                        key={booking.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition"
                      >
                        <td className="py-2 px-3 text-slate-900 font-semibold">
                          {booking.week}
                        </td>
                        <td className="py-2 px-3 text-slate-800">{booking.day}</td>
                        <td className="py-2 px-3 text-center text-slate-900">
                          {booking.seat}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              booking.type === "regular"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {booking.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              booking.status === "allocated" || booking.status === "booked"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {canRelease && (
                            <button
                              type="button"
                              disabled={releasingId === booking.id}
                              onClick={() => handleReleaseSeat(booking)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-60 transition"
                            >
                              {releasingId === booking.id ? "Releasing…" : "Release"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

