import { supabase } from "./supabaseClient";
import { getCurrentEmployeeProfile } from "./auth";

export async function requireAdmin() {
  const { user, employee } = await getCurrentEmployeeProfile();
  if (!user || !employee || employee.role !== "admin") {
    throw new Error("Not authorized");
  }
  return { user, employee };
}

// Employees
export async function fetchEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("employee_id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateEmployee(id, updates) {
  const { error } = await supabase.from("employees").update(updates).eq("id", id);
  if (error) throw error;
}

// Allocations admin helpers
export async function fetchAllocationsForWeek(week) {
  const { data, error } = await supabase
    .from("allocations")
    .select("*")
    .eq("week", week);
  if (error) throw error;
  return data ?? [];
}

export async function adminForceRelease({ id }) {
  const { error } = await supabase
    .from("allocations")
    .update({ status: "released", type: "temp_floater" })
    .eq("id", id);
  if (error) throw error;
}

export async function lockSeat({ id }) {
  const { error } = await supabase
    .from("allocations")
    .update({ status: "locked" })
    .eq("id", id);
  if (error) throw error;
}

export async function unlockSeat({ id }) {
  const { error } = await supabase
    .from("allocations")
    .update({ status: "allocated" })
    .eq("id", id);
  if (error) throw error;
}

