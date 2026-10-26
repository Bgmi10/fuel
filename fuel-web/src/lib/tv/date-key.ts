/**
 * dateKey = "YYYY-MM-DD" in the gym's timezone. It is the only calendar
 * date used by schedules and broadcasts.
 */

export const GYM_TIME_ZONE = "Asia/Kolkata";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for real calendar dates only ("2026-02-30" is rejected). */
export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));

  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** The gym-local calendar date of an instant. */
export function toDateKey(
  instant: Date = new Date(),
  timeZone: string = GYM_TIME_ZONE
): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** First and last dateKey of a month (month is 1-12). Used for calendar queries. */
export function monthRange(
  year: number,
  month: number
): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}
