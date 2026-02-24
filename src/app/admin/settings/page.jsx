"use client";

import { useEffect, useState } from "react";
import { loadAppSettings, saveAppSettings } from "@/lib/settings";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await loadAppSettings();
        if (!cancelled) setSettings(data);
      } catch (e) {
        console.error("Failed to load settings", e);
        if (!cancelled) setMessage("Failed to load settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    try {
      await saveAppSettings({
        regular_seats: Number(settings.regular_seats) || 40,
        floater_seats: Number(settings.floater_seats) || 10,
        floater_start_seat: Number(settings.floater_start_seat) || 41,
        booking_open_hour: Number(settings.booking_open_hour) || 11,
      });
      setMessage("Settings saved.");
    } catch (e) {
      console.error("Failed to save settings", e);
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 2500);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Control seat counts, floater configuration, and booking open hour.
          </p>
        </div>
      </div>

      {message && (
        <div className="text-xs text-slate-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
          {message}
        </div>
      )}

      {loading || !settings ? (
        <p className="text-sm text-slate-500">Loading settings…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Regular seats
              </label>
              <input
                type="number"
                min={1}
                value={settings.regular_seats}
                onChange={(e) =>
                  handleChange("regular_seats", e.target.valueAsNumber)
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Floater seats
              </label>
              <input
                type="number"
                min={0}
                value={settings.floater_seats}
                onChange={(e) =>
                  handleChange("floater_seats", e.target.valueAsNumber)
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Floater start seat
              </label>
              <input
                type="number"
                min={1}
                value={settings.floater_start_seat}
                onChange={(e) =>
                  handleChange("floater_start_seat", e.target.valueAsNumber)
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Booking open hour (0-23)
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={settings.booking_open_hour}
                onChange={(e) =>
                  handleChange("booking_open_hour", e.target.valueAsNumber)
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="rounded-2xl bg-slate-900 text-white px-5 py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

