/** Browser-side helpers shared by the admin pages. */

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...(init.headers ?? {}) }
      : init?.headers,
  });

  let json: { data?: T; error?: string } | null = null;

  try {
    json = await response.json();
  } catch {
    /* empty body */
  }

  if (!response.ok) {
    throw new Error(json?.error ?? `Request failed (${response.status}).`);
  }

  return json?.data as T;
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

export const pad = (value: number) => String(value).padStart(2, "0");

/** Calendar cells are plain calendar days, so use local components. */
export const ymd = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** 6 weeks of days covering the month. */
export function monthCells(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);

  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + index)
  );
}

export function formatDay(dateKey: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function formatDuration(totalSeconds: number | null | undefined) {
  const seconds = Math.max(0, Math.round(totalSeconds ?? 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`;
}

/** Run `worker` over `items`, at most `limit` at a time. Workers must catch their own errors. */
export async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) {
          return;
        }
        await worker(items[index]);
      }
    })
  );
}

// ---------------- Timers (schedules and broadcasts) ----------------

export type TimerKey =
  | "demonstrationSeconds"
  | "warmupSeconds"
  | "prepareSeconds"
  | "workSeconds"
  | "restSeconds"
  | "sets"
  | "cycles"
  | "restBetweenCycleSeconds"
  | "coolDownSeconds";

export type Timers = { [K in TimerKey]: number | null };
export type TimerForm = Record<TimerKey, string>;

export const TIMER_FIELDS: { key: TimerKey; label: string; unit: string }[] = [
  { key: "demonstrationSeconds", label: "Demonstration", unit: "sec" },
  { key: "warmupSeconds", label: "Warm-up", unit: "sec" },
  { key: "prepareSeconds", label: "Prepare", unit: "sec" },
  { key: "workSeconds", label: "Work", unit: "sec" },
  { key: "restSeconds", label: "Rest", unit: "sec" },
  { key: "sets", label: "Sets", unit: "sets" },
  { key: "cycles", label: "Cycles", unit: "cycles" },
  { key: "restBetweenCycleSeconds", label: "Rest Between Cycle", unit: "sec" },
  { key: "coolDownSeconds", label: "Cool Down", unit: "sec" },
];

export const emptyTimers = (): TimerForm =>
  Object.fromEntries(TIMER_FIELDS.map((field) => [field.key, ""])) as TimerForm;

export function timersToForm(source: Partial<Timers>): TimerForm {
  const form = emptyTimers();

  for (const field of TIMER_FIELDS) {
    const value = source[field.key];
    form[field.key] = value === null || value === undefined ? "" : String(value);
  }

  return form;
}

export function parseTimers(form: TimerForm): { values: Timers } | { error: string } {
  const values = {} as Timers;

  for (const field of TIMER_FIELDS) {
    const raw = form[field.key].trim();

    if (!raw) {
      values[field.key] = null;
      continue;
    }

    const number = Number(raw);
    const minimum = field.key === "sets" || field.key === "cycles" ? 1 : 0;

    if (!Number.isInteger(number) || number < minimum) {
      return {
        error: `${field.label} must be a whole number${minimum ? " of at least 1" : ""}.`,
      };
    }

    values[field.key] = number;
  }

  return { values };
}

export function toLocalInput(iso: string | null) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
