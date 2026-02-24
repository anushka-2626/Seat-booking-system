/**
 * localStorage utilities for persisting bookings
 * Data model: bookings[week][day][seatNumber] = { employeeId, batch, timestamp, type: "regular"|"floater" }
 */

import { DAYS } from "./rules";

const STORAGE_KEY = "seat-bookings";

/**
 * Get all bookings from localStorage
 */
export function getAllBookings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error reading bookings from localStorage:", error);
    return {};
  }
}

/**
 * Save all bookings to localStorage
 */
function saveBookings(bookings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch (error) {
    console.error("Error saving bookings to localStorage:", error);
  }
}

/**
 * Get bookings for a specific week
 */
export function getWeekBookings(week) {
  const bookings = getAllBookings();
  return bookings[week] || {};
}

/**
 * Get bookings for a specific day in a week
 */
export function getDayBookings(week, day) {
  const weekBookings = getWeekBookings(week);
  return weekBookings[day] || {};
}

/**
 * Get booking for a specific seat on a specific day/week
 */
export function getSeatBooking(week, day, seatNumber) {
  const dayBookings = getDayBookings(week, day);
  return dayBookings[seatNumber] || null;
}

/**
 * Check if a seat is booked
 */
export function isSeatBooked(week, day, seatNumber) {
  return getSeatBooking(week, day, seatNumber) !== null;
}

/**
 * Book a seat
 * @param {string} week - Week identifier ("Week 1" or "Week 2")
 * @param {string} day - Day name ("Mon", "Tue", etc.)
 * @param {number} seatNumber - Seat number (1-50)
 * @param {string} employeeId - Employee ID
 * @param {string} batch - Batch identifier
 * @param {string} type - Seat type ("regular" or "floater")
 */
export function bookSeat(week, day, seatNumber, employeeId, batch, type) {
  const bookings = getAllBookings();
  
  // Initialize structure if needed
  if (!bookings[week]) {
    bookings[week] = {};
  }
  if (!bookings[week][day]) {
    bookings[week][day] = {};
  }
  
  // Check if seat is already booked
  if (bookings[week][day][seatNumber]) {
    throw new Error(`Seat ${seatNumber} is already booked for ${day}, ${week}`);
  }
  
  // Create booking
  bookings[week][day][seatNumber] = {
    employeeId,
    batch,
    timestamp: new Date().toISOString(),
    type,
  };
  
  saveBookings(bookings);
  return bookings[week][day][seatNumber];
}

/**
 * Release a seat (unbook)
 * @param {string} week - Week identifier
 * @param {string} day - Day name
 * @param {number} seatNumber - Seat number
 * @param {string} employeeId - Employee ID (for verification)
 */
export function releaseSeat(week, day, seatNumber, employeeId) {
  const bookings = getAllBookings();
  
  if (!bookings[week]?.[day]?.[seatNumber]) {
    throw new Error(`Seat ${seatNumber} is not booked for ${day}, ${week}`);
  }
  
  const booking = bookings[week][day][seatNumber];
  
  // Verify employee ID matches
  if (booking.employeeId !== employeeId) {
    throw new Error(`Seat ${seatNumber} is booked by a different employee`);
  }
  
  // Remove booking
  delete bookings[week][day][seatNumber];
  
  // Clean up empty structures
  if (Object.keys(bookings[week][day]).length === 0) {
    delete bookings[week][day];
  }
  if (Object.keys(bookings[week]).length === 0) {
    delete bookings[week];
  }
  
  saveBookings(bookings);
  return true;
}

/**
 * Get all bookings for an employee
 */
export function getEmployeeBookings(employeeId) {
  const bookings = getAllBookings();
  const employeeBookings = [];
  
  for (const week in bookings) {
    for (const day in bookings[week]) {
      for (const seatNumber in bookings[week][day]) {
        const booking = bookings[week][day][seatNumber];
        if (booking.employeeId === employeeId) {
          employeeBookings.push({
            week,
            day,
            seatNumber: parseInt(seatNumber),
            ...booking,
          });
        }
      }
    }
  }
  
  return employeeBookings;
}

/**
 * Get booking statistics for a week
 */
export function getWeekStats(week) {
  const weekBookings = getWeekBookings(week);
  const stats = {
    regular: { booked: 0, total: 40 },
    floater: { booked: 0, total: 10 },
    byDay: {},
  };
  
  DAYS.forEach((day) => {
    const dayBookings = getDayBookings(week, day);
    const dayStats = {
      regular: { booked: 0, total: 40 },
      floater: { booked: 0, total: 10 },
      seats: [],
    };
    
    for (const seatNumber in dayBookings) {
      const seatNum = parseInt(seatNumber);
      const booking = dayBookings[seatNumber];
      
      if (seatNum >= 41) {
        stats.floater.booked++;
        dayStats.floater.booked++;
      } else {
        stats.regular.booked++;
        dayStats.regular.booked++;
      }
      
      dayStats.seats.push({
        seatNumber: seatNum,
        employeeId: booking.employeeId,
        batch: booking.batch,
        type: booking.type,
      });
    }
    
    stats.byDay[day] = dayStats;
  });
  
  return stats;
}
