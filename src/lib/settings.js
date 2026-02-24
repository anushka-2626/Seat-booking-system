import { supabase } from "./supabaseClient";

export const DEFAULT_SETTINGS = {
  regular_seats: 40,
  floater_seats: 10,
  floater_start_seat: 41,
  booking_open_hour: 15, // 3 PM (production default)
};

let cachedSettings = null;

export async function loadAppSettings() {
  if (cachedSettings) return cachedSettings;

  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    // ignore "no rows" / not found
    console.error("Failed to load app_settings", error);
  }

  cachedSettings = { ...DEFAULT_SETTINGS, ...(data || {}) };
  return cachedSettings;
}

export function getCachedSettingsSync() {
  return cachedSettings || DEFAULT_SETTINGS;
}

export async function saveAppSettings(partial) {
  const current = cachedSettings || DEFAULT_SETTINGS;
  const next = { ...current, ...partial };

  // We treat app_settings as single-row table
  const { error } = await supabase.from("app_settings").upsert(
    {
      id: 1,
      ...next,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
  cachedSettings = next;
  return cachedSettings;
}

