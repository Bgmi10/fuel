export const BOOKING_CUTOFF_HOURS = 24;
const IST_OFFSET = "+05:30";

/**
 * Converts a booking day ("YYYY-MM-DD") and a slot time ("HH:mm" or "HH:mm:ss"),
 * both in gym-local time (IST), into the real session start instant.
 */
export function getSessionStart(
  bookingDay: string,
  startTime: string
): Date | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(startTime).trim());
  if (!match) return null;

  const hours = match[1].padStart(2, "0");
  const sessionStart = new Date(
    `${bookingDay}T${hours}:${match[2]}:00${IST_OFFSET}`
  );

  return Number.isNaN(sessionStart.getTime()) ? null : sessionStart;
}

/** True when the session starts at least BOOKING_CUTOFF_HOURS from now. */
export function isWithinBookingWindow(
  sessionStart: Date,
  now: Date = new Date()
): boolean {
  return (
    sessionStart.getTime() - now.getTime() >=
    BOOKING_CUTOFF_HOURS * 60 * 60 * 1000
  );
}