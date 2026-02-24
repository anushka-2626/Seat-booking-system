import { supabase } from "./supabaseClient";
import {
  BATCH_SCHEDULE,
  DAYS,
  REGULAR_SEATS_COUNT,
  FLOATER_SEATS_START,
  TOTAL_SEATS,
  canBook,
} from "./rules";

// Ensure auto allocations exist for all employees in a batch for the given week
export async function ensureAutoAllocationsForWeek(week, batch) {
  const workingDays = BATCH_SCHEDULE[batch]?.[week] || [];
  if (!workingDays.length) return;

  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("employee_id, default_seat, batch")
    .eq("batch", batch);

  if (empError) throw empError;
  if (!employees || employees.length === 0) return;

  for (const day of workingDays) {
    for (const emp of employees) {
      const seat = emp.default_seat;
      if (!seat) continue;

      // Check if an allocation already exists
      const { data: existing, error: selError } = await supabase
        .from("allocations")
        .select("id, status, type")
        .eq("week", week)
        .eq("day", day)
        .eq("seat", seat)
        .eq("batch", batch)
        .maybeSingle();

      if (selError && selError.code !== "PGRST116") {
        throw selError;
      }

      // If no row, insert regular allocation
      if (!existing) {
        const { error: insError } = await supabase.from("allocations").insert({
          week,
          day,
          seat,
          allocated_to_employee_id: emp.employee_id,
          batch,
          type: "regular",
          status: "allocated",
        });
        if (insError) throw insError;
      } else if (existing.status === "released" && existing.type === "temp_floater") {
        // If previously released, keep as is; don't override temp floater state
        continue;
      }
    }
  }
}

// Get all allocations for a given week/day
export async function getDayAllocations(week, day) {
  const { data, error } = await supabase
    .from("allocations")
    .select("*")
    .eq("week", week)
    .eq("day", day);
  if (error) throw error;
  return data ?? [];
}

// Release a seat for a given employee (turn into temp floater for that day)
export async function releaseSeatAllocation({ week, day, seat, employeeId }) {
  const { data: row, error } = await supabase
    .from("allocations")
    .select("*")
    .eq("week", week)
    .eq("day", day)
    .eq("seat", seat)
    .eq("allocated_to_employee_id", employeeId)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  if (!row) {
    throw new Error("No allocation found for this seat and employee.");
  }

  const { error: updError } = await supabase
    .from("allocations")
    .update({
      status: "released",
      type: "temp_floater",
    })
    .eq("id", row.id);
  if (updError) throw updError;
}

// Book a seat (floater or temp floater) for an employee, applying business rules
export async function bookSeatAllocation({
  week,
  day,
  seat,
  workingBatch,
  employeeId,
}) {
  const validation = canBook(week, day, workingBatch, seat);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  // Determine seat type
  const type = seat >= FLOATER_SEATS_START ? "floater" : "temp_floater";

  // For temp floater (released regular seat), ensure it's marked as released
  if (type === "temp_floater") {
    const { data: existing, error: selError } = await supabase
      .from("allocations")
      .select("*")
      .eq("week", week)
      .eq("day", day)
      .eq("seat", seat)
      .maybeSingle();
    if (selError && selError.code !== "PGRST116") throw selError;
    if (!existing || existing.status !== "released") {
      throw new Error("This temporary floater seat is not available.");
    }

    const { error: updError } = await supabase
      .from("allocations")
      .update({
        status: "booked",
        type: "temp_floater",
        allocated_to_employee_id: employeeId,
        batch: workingBatch,
      })
      .eq("id", existing.id);
    if (updError) throw updError;
    return;
  }

  // Floater seat (41‑50): can be newly inserted or updated if free
  const { data: existingFloater, error: floaterError } = await supabase
    .from("allocations")
    .select("*")
    .eq("week", week)
    .eq("day", day)
    .eq("seat", seat)
    .maybeSingle();
  if (floaterError && floaterError.code !== "PGRST116") throw floaterError;

  if (existingFloater && existingFloater.status === "booked") {
    throw new Error("This floater seat is already booked.");
  }

  if (!existingFloater) {
    const { error: insertError } = await supabase.from("allocations").insert({
      week,
      day,
      seat,
      allocated_to_employee_id: employeeId,
      batch: workingBatch,
      type: "floater",
      status: "booked",
    });
    if (insertError) throw insertError;
  } else {
    const { error: updError } = await supabase
      .from("allocations")
      .update({
        status: "booked",
        type: "floater",
        allocated_to_employee_id: employeeId,
        batch: workingBatch,
      })
      .eq("id", existingFloater.id);
    if (updError) throw updError;
  }
}

// Get all allocations for an employee (for Release view)
export async function getEmployeeAllocations(employeeId) {
  const { data, error } = await supabase
    .from("allocations")
    .select("*")
    .eq("allocated_to_employee_id", employeeId);
  if (error) throw error;
  return data ?? [];
}

// Week data for Week View
export async function getWeekData(week) {
  const { data, error } = await supabase
    .from("allocations")
    .select("*")
    .eq("week", week);
  if (error) throw error;

  const result = {
    totals: {
      regularAllocated: 0,
      floaterBooked: 0,
      tempAvailable: 0,
      tempBooked: 0,
      releasedCount: 0,
    },
    byDay: {},
  };

  for (const day of DAYS) {
    result.byDay[day] = {
      regularAllocated: 0,
      floaterBooked: 0,
      tempAvailable: 0,
      tempBooked: 0,
      releasedCount: 0,
      seats: [],
    };
  }

  for (const row of data ?? []) {
    const dayStats = result.byDay[row.day];
    if (!dayStats) continue;

    if (row.type === "regular" && row.status === "allocated") {
      dayStats.regularAllocated += 1;
      result.totals.regularAllocated += 1;
    } else if (row.type === "floater" && row.status === "booked") {
      dayStats.floaterBooked += 1;
      result.totals.floaterBooked += 1;
    } else if (row.type === "temp_floater" && row.status === "released") {
      dayStats.tempAvailable += 1;
      dayStats.releasedCount += 1;
      result.totals.tempAvailable += 1;
      result.totals.releasedCount += 1;
    } else if (row.type === "temp_floater" && row.status === "booked") {
      dayStats.tempBooked += 1;
      result.totals.tempBooked += 1;
    }

    dayStats.seats.push({
      seatNumber: row.seat,
      employeeId: row.allocated_to_employee_id,
      batch: row.batch,
      type: row.type,
      status: row.status,
    });
  }

  return result;
}

