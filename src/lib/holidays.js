import { supabase } from "./supabaseClient";

// Holidays helpers for table:
// holidays(id uuid, holiday_date date, name text, is_closed boolean, created_at timestamp)

export async function fetchHolidays() {
  const { data, error } = await supabase
    .from("holidays")
    .select("id, holiday_date, name, is_closed, created_at")
    .order("holiday_date", { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function addHoliday({ date, name, is_closed }) {
  const { error } = await supabase.from("holidays").insert({
    holiday_date: date,
    name,
    is_closed,
  });
  if (error) {
    throw error;
  }
}

export async function removeHoliday(id) {
  const { error } = await supabase.from("holidays").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

