/**
 * Business rules and validation logic for seat booking system
 */

// Holiday list - dates in format "YYYY-MM-DD" or day names
export const HOLIDAYS = [
  "2026-01-01", // New Year's Day
  "2026-01-26", // Republic Day
  "2026-03-08", // Holi
  "2026-08-15", // Independence Day
  "2026-10-02", // Gandhi Jayanti
  "2026-10-31", // Diwali
  "2026-12-25", // Christmas
];

// Batch schedules
export const BATCH_SCHEDULE = {
  "Batch 1": {
    "Week 1": ["Mon", "Tue", "Wed"],
    "Week 2": ["Thu", "Fri"],
  },
  "Batch 2": {
    "Week 1": ["Thu", "Fri"],
    "Week 2": ["Mon", "Tue", "Wed"],
  },
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const TOTAL_SEATS = 50;
export const FLOATER_SEATS_START = 41;
export const REGULAR_SEATS_COUNT = 40;

/**
 * Get current local time
 */
export function getCurrentTime() {
  return new Date();
}

import { getCachedSettingsSync } from "./settings";

/**
 * Check if current time is after booking open hour
 * (defaults to 3 PM / 15:00 via app_settings.booking_open_hour)
 */
export function isAfter3PM() {
  const now = getCurrentTime();
  const { booking_open_hour } = getCachedSettingsSync();
  return now.getHours() >= booking_open_hour;
}

/**
 * Check if a date is a holiday
 * @param {string} dateString - Date in format "YYYY-MM-DD" or day name like "Mon"
 * @param {string} week - Week identifier ("Week 1" or "Week 2")
 * @param {string} day - Day name ("Mon", "Tue", etc.)
 */
export function isHoliday(dateString, week, day) {
  // Check against holiday list
  const today = getCurrentTime();
  const dateStr = today.toISOString().split("T")[0];
  
  // Simple check: if dateString matches any holiday
  if (HOLIDAYS.includes(dateString)) {
    return true;
  }
  
  // For day-based holidays (future enhancement)
  // For now, we'll use a simple approach: check if the date matches
  return false;
}

/**
 * Get holiday status for a specific day
 * This is a simplified version - you can enhance it to check actual dates
 */
export function checkDayHoliday(week, day) {
  // For demo purposes, we'll check if day matches any holiday pattern
  // In a real system, you'd check the actual date
  const today = getCurrentTime();
  const dateStr = today.toISOString().split("T")[0];
  
  // Simple implementation: check if today's date is in holidays
  // For a more robust solution, calculate the actual date for week+day
  return HOLIDAYS.some(holiday => {
    // This is simplified - in production, calculate actual date for week+day
    return false; // For now, return false unless we implement date calculation
  });
}

/**
 * Check if a day is a holiday
 * Checks if today's date matches any holiday in the list
 */
export function isDayHoliday(day) {
  const today = getCurrentTime();
  const todayStr = today.toISOString().split("T")[0];
  
  // Check if today's date is in the holiday list
  if (HOLIDAYS.includes(todayStr)) {
    return true;
  }
  
  // You can add day-based holiday logic here
  // Example: if you want to block all Fridays, return day === "Fri"
  return false;
}

/**
 * Get working days for a batch and week
 */
export function getWorkingDays(batch, week) {
  return BATCH_SCHEDULE[batch]?.[week] || [];
}

/**
 * Check if booking requires floater seat
 * @param {string} userBatch - User's assigned batch
 * @param {string} workingBatch - Batch they're working as
 */
export function requiresFloater(userBatch, workingBatch) {
  return userBatch !== workingBatch;
}

/**
 * Get allowed seats based on batch requirements
 * @param {boolean} requiresFloater - Whether floater seats are required
 */
export function getAllowedSeats(requiresFloater) {
  if (requiresFloater) {
    // Return floater seats (41-50)
    return Array.from({ length: 10 }, (_, i) => FLOATER_SEATS_START + i);
  }
  // Return regular seats (1-40)
  return Array.from({ length: REGULAR_SEATS_COUNT }, (_, i) => i + 1);
}

/**
 * Check if a seat is a floater seat
 */
export function isFloaterSeat(seatNumber) {
  return seatNumber >= FLOATER_SEATS_START;
}

/**
 * Validate if booking is allowed
 * @param {string} week - Week identifier
 * @param {string} day - Day name
 * @param {string} workingBatch - Batch being worked as
 * @param {number} seatNumber - Seat number
 */
export function canBook(week, day, workingBatch, seatNumber) {
  // Check time
  if (!isAfter3PM()) {
    return { allowed: false, reason: "Booking only allowed after 3 PM" };
  }
  
  // Check holiday
  if (isDayHoliday(day)) {
    return { allowed: false, reason: "Booking not allowed on holidays" };
  }
  
  // Check if day is in working batch schedule
  const workingDays = getWorkingDays(workingBatch, week);
  if (!workingDays.includes(day)) {
    return { allowed: false, reason: "Day not in batch schedule" };
  }
  
  // Check seat selection
  if (!seatNumber) {
    return { allowed: false, reason: "Please select a seat" };
  }
  
  return { allowed: true };
}
