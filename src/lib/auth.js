import { supabase } from "./supabaseClient";

// Helper to fetch the current authenticated user
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Fetch the employee profile for the current user (joins by auth user.id)
export async function getCurrentEmployeeProfile() {
  const user = await getCurrentUser();
  if (!user) return { user: null, employee: null };

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    // ignore "no rows" error code
    throw error;
  }

  return { user, employee: data ?? null };
}

// Assign a default seat for a new employee in the given batch (1‑40 per batch)
async function assignDefaultSeat(batch) {
  const { data: existing, error } = await supabase
    .from("employees")
    .select("default_seat")
    .eq("batch", batch);
  if (error) throw error;

  const used = new Set((existing ?? []).map((e) => e.default_seat));
  for (let seat = 1; seat <= 40; seat += 1) {
    if (!used.has(seat)) return seat;
  }
  throw new Error(`No regular seats left for ${batch}`);
}

// Sign up with email/password and create/link employee profile
export async function signUpWithEmail({ email, password, employeeId, name, batch }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;

  const user = data.user;
  if (!user) {
    throw new Error("Sign up failed: no user returned from Supabase.");
  }

  // Try to link to an existing employee row first
  const { data: existing, error: empError } = await supabase
    .from("employees")
    .select("*")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (empError && empError.code !== "PGRST116") {
    throw empError;
  }

  if (existing) {
    // If employee_id already claimed by another user
    if (existing.user_id && existing.user_id !== user.id) {
      throw new Error("Employee ID already claimed. Contact admin.");
    }

    // If pre-seeded row (e.g. admin E000) without user_id, attach this auth user
    const patch = { user_id: user.id };
    if (!existing.name) patch.name = name;
    if (!existing.batch) patch.batch = batch;

    const { error: updateError } = await supabase
      .from("employees")
      .update(patch)
      .eq("id", existing.id);
    if (updateError) throw updateError;

    return { user };
  }

  // No existing row with this employee_id -> create a new employee profile
  const defaultSeat = await assignDefaultSeat(batch);

  const { error: profileError } = await supabase.from("employees").insert({
    user_id: user.id,
    employee_id: employeeId,
    name,
    batch,
    default_seat: defaultSeat,
  });

  if (profileError) throw profileError;

  return { user, defaultSeat };
}

export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}


