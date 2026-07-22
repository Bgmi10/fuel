// Always current time (UTC safe)
export const nowUTC = () => new Date();

// Normalize any input to Date
export const toUTC = (value: string | Date) => {
  return new Date(value);
};

export const startOfDayUTC = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  };
  
  export const exclusiveEndDate = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 1); // 👈 move to next day
    return d;
  };

// Add days safely (UTC)
export const addDaysUTC = (date: Date, days: number) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

// Difference in full days
export const diffDaysUTC = (start: Date, end: Date) => {
  return Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
};