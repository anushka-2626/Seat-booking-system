"use client";

import { useEffect, useState } from "react";
import { fetchEmployees, updateEmployee } from "@/lib/admin";

const BATCHES = ["Batch 1", "Batch 2"];
const ROLES = ["employee", "admin"];

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchEmployees();
        if (!cancelled) setEmployees(data);
      } catch (e) {
        console.error("Failed to load employees", e);
        if (!cancelled) setMessage("Failed to load employees.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateLocal = (id, patch) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  };

  const handleSave = async (emp) => {
    setSavingId(emp.id);
    setMessage("");
    try {
      await updateEmployee(emp.id, {
        batch: emp.batch,
        default_seat: emp.default_seat,
        role: emp.role || "employee",
        is_active: emp.is_active ?? true,
      });
      setMessage("Employee updated.");
    } catch (e) {
      console.error("Failed to update employee", e);
      setMessage("Failed to update employee.");
    } finally {
      setSavingId(null);
      setTimeout(() => setMessage(""), 2500);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Employees
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage batches, default seats, roles, and activation status.
          </p>
        </div>
      </div>

      {message && (
        <div className="text-xs text-slate-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading employees…</p>
      ) : employees.length === 0 ? (
        <p className="text-sm text-slate-500">No employees found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-semibold text-slate-700">
                  Employee ID
                </th>
                <th className="text-left py-2 px-3 font-semibold text-slate-700">
                  Name
                </th>
                <th className="text-left py-2 px-3 font-semibold text-slate-700">
                  Batch
                </th>
                <th className="text-center py-2 px-3 font-semibold text-slate-700">
                  Default Seat
                </th>
                <th className="text-left py-2 px-3 font-semibold text-slate-700">
                  Role
                </th>
                <th className="text-center py-2 px-3 font-semibold text-slate-700">
                  Active
                </th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="py-2 px-3 font-semibold text-slate-900">
                    {emp.employee_id}
                  </td>
                  <td className="py-2 px-3 text-slate-800">{emp.name}</td>
                  <td className="py-2 px-3">
                    <select
                      value={emp.batch}
                      onChange={(e) =>
                        updateLocal(emp.id, { batch: e.target.value })
                      }
                      className="rounded-xl border border-slate-300 px-2 py-1 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {BATCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={emp.default_seat ?? ""}
                      onChange={(e) =>
                        updateLocal(emp.id, {
                          default_seat: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        })
                      }
                      className="w-16 rounded-xl border border-slate-300 px-2 py-1 text-xs text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={emp.role || "employee"}
                      onChange={(e) =>
                        updateLocal(emp.id, { role: e.target.value })
                      }
                      className="rounded-xl border border-slate-300 px-2 py-1 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={emp.is_active ?? true}
                      onChange={(e) =>
                        updateLocal(emp.id, { is_active: e.target.checked })
                      }
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      disabled={savingId === emp.id}
                      onClick={() => handleSave(emp)}
                      className="rounded-2xl bg-slate-900 text-white px-3 py-1 text-xs font-semibold hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingId === emp.id ? "Saving…" : "Save"}
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

