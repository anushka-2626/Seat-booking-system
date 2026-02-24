"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, signUpWithEmail, getCurrentEmployeeProfile } from "@/lib/auth";

const BATCHES = ["Batch 1", "Batch 2"];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("Batch 1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmail({ email, password });
      } else {
        if (!employeeId || !name) {
          setError("Please enter Employee ID and Name.");
          setLoading(false);
          return;
        }
        await signUpWithEmail({ email, password, employeeId, name, batch });
      }
      // Decide redirect based on role after auth
      const { employee } = await getCurrentEmployeeProfile();
      if (!employee) {
        setError("Profile missing. Please contact admin.");
        return;
      }
      if (employee.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-8 pt-8 pb-6 border-b border-white/10">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Wissen Seat Booking
          </h1>
          <p className="text-sm text-slate-200 mt-1">
            {mode === "login"
              ? "Sign in to manage your weekly seat allocations."
              : "Create your employee profile and get your default seat."}
          </p>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="flex rounded-full bg-slate-900/40 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 text-sm font-semibold rounded-full px-3 py-2 transition ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-200 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 text-sm font-semibold rounded-full px-3 py-2 transition ${
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-200 hover:text-white"
              }`}
            >
              Sign up
            </button>
          </div>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/40 rounded-2xl px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-100 mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl bg-white/90 border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-100 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-white/90 border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-100 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full rounded-2xl bg-white/90 border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="E.g. E001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-100 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl bg-white/90 border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-100 mb-1">
                    Batch
                  </label>
                  <div className="flex gap-2">
                    {BATCHES.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBatch(b)}
                        className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                          batch === b
                            ? "bg-blue-400 text-slate-900"
                            : "bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-400 text-slate-900 font-extrabold text-sm py-2.5 mt-2 shadow-lg hover:bg-blue-300 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
            </button>
          </form>
        </div>

        <div className="px-8 pb-6 text-[11px] text-slate-300 flex items-center justify-between">
          <span>Powered by Supabase Auth</span>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="underline-offset-2 hover:underline"
          >
            Back to app
          </button>
        </div>
      </div>
    </div>
  );
}

