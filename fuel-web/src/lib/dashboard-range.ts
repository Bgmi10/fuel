export const INDIA_TIME_OFFSET_MS = 330 * 60 * 1000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type Period = "today" | "week" | "month" | "year" | "custom";

export const PERIODS = new Set<Period>([
  "today",
  "week",
  "month",
  "year",
  "custom",
]);

export const parsePeriod = (
  value: string | null,
  fallback: Period
): Period | null => {
  const candidate = (value || fallback) as Period;
  return PERIODS.has(candidate) ? candidate : null;
};

const pad = (value: number) => String(value).padStart(2, "0");

export const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month)}-${pad(day)}`;

export const addDaysToDateKey = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return toDateKey(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
};

export const getIndiaDateKey = (date = new Date()) => {
  const shifted = new Date(date.getTime() + INDIA_TIME_OFFSET_MS);

  return toDateKey(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
};

export const indiaDayStartToUtc = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0, 0) - INDIA_TIME_OFFSET_MS
  );
};

export const indiaDayEndToUtc = (dateKey: string) =>
  new Date(indiaDayStartToUtc(addDaysToDateKey(dateKey, 1)).getTime() - 1);

/** Whole calendar days from `fromKey` to `toKey` (negative if earlier). */
export const diffDays = (fromKey: string, toKey: string) => {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);

  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000
  );
};

export const getWeekStartKey = (todayKey: string) => {
  const [year, month, day] = todayKey.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return addDaysToDateKey(todayKey, -((dayOfWeek + 6) % 7));
};

export const resolveDateRange = ({
  period,
  from,
  to,
}: {
  period: Period;
  from: string | null;
  to: string | null;
}) => {
  const todayKey = getIndiaDateKey();
  const [year, month] = todayKey.split("-").map(Number);

  let fromKey = todayKey;
  let toKey = todayKey;

  if (period === "week") fromKey = getWeekStartKey(todayKey);
  if (period === "month") fromKey = toDateKey(year, month, 1);
  if (period === "year") fromKey = toDateKey(year, 1, 1);

  if (period === "custom") {
    if (
      !from ||
      !to ||
      !DATE_PATTERN.test(from) ||
      !DATE_PATTERN.test(to) ||
      from > to
    ) {
      throw new Error("INVALID_CUSTOM_RANGE");
    }

    fromKey = from;
    toKey = to;
  }

  return {
    fromKey,
    toKey,
    startDate: indiaDayStartToUtc(fromKey),
    endDate: indiaDayEndToUtc(toKey),
  };
};

export const getChartKeys = (fromKey: string, toKey: string) => {
  const result: string[] = [];
  let current = fromKey;

  while (current <= toKey) {
    result.push(current);
    current = addDaysToDateKey(current, 1);
  }

  return result;
};

/** Invoice total payable in PAISE (same rule as the billing pages). */
export const invoiceTotalPaise = (invoice: {
  finalAmount: number;
  totalTax: number | null;
  discountAmount: number;
}) =>
  Math.max(
    invoice.finalAmount +
      Math.round(invoice.totalTax ?? 0) -
      invoice.discountAmount,
    0
  );