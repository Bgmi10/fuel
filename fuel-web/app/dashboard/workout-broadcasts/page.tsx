"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit3,
  Eye,
  Film,
  Loader2,
  Monitor,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Square,
  TimerReset,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { toDateKey } from "@/src/lib/tv/date-key";
import {
  PlanError,
  buildPlan,
  phaseAt,
  type PhaseType,
  type PlanExercise,
} from "@/src/lib/tv/plan";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type Intensity = "LOW" | "MEDIUM" | "HIGH";
type Mode = "SCHEDULE" | "TIMER_ONLY";
type Status =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

type TimerKey =
  | "demonstrationSeconds"
  | "warmupSeconds"
  | "prepareSeconds"
  | "workSeconds"
  | "restSeconds"
  | "sets"
  | "cycles"
  | "restBetweenCycleSeconds"
  | "coolDownSeconds";

type Timers = { [K in TimerKey]: number | null };
type TimerForm = Record<TimerKey, string>;

const TIMER_FIELDS: { key: TimerKey; label: string; unit: string }[] = [
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

interface Branch {
  id: string;
  name: string;
}

interface Tv {
  id: string;
  name: string;
  isOnline: boolean;
}

interface Video {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

interface ScheduleExercise {
  id: string;
  videoId: string | null;
  exerciseName: string | null;
  sortOrder: number;
  video: Video | null;
}

interface Schedule extends Timers {
  id: string;
  dateKey: string;
  programId: string;
  nextSessionStartsAt: string | null;
  program: {
    name: string;
    subtitle: string | null;
    description: string | null;
    intensity: Intensity | null;
  };
  exercises: ScheduleExercise[];
}

interface BroadcastExercise {
  id: string;
  sortOrder: number;
  exerciseName: string;
  videoId: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

interface BroadcastTv {
  id: string;
  tvDeviceId: string;
  tvDevice: { id: string; name: string; isOnline: boolean };
  exercises: { exerciseId: string; sortOrder: number }[];
}

interface Broadcast extends Timers {
  id: string;
  branchId: string;
  dateKey: string;
  scheduleId: string | null;
  mode: Mode;
  status: Status;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  intensity: Intensity | null;
  nextSessionStartsAt: string | null;
  exercises: BroadcastExercise[];
  tvs: BroadcastTv[];
}

/** One exercise row in the form. `key` is stable while editing. */
interface DraftExercise {
  key: string;
  videoId: string | null;
  name: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

interface Draft {
  id: string | null;
  dateKey: string;
  mode: Mode;
  scheduleId: string;
  title: string;
  subtitle: string;
  description: string;
  intensity: Intensity | "";
  timers: TimerForm;
  nextSession: string;
  exercises: DraftExercise[];
  /** tvDeviceId -> keys of the exercises that TV plays */
  tvSelections: Record<string, string[]>;
}

interface PreviewData {
  title: string;
  subtitle: string | null;
  mode: Mode;
  timers: Timers;
  exercises: PlanExercise[];
  heading: string;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const pad = (value: number) => String(value).padStart(2, "0");

/** Calendar cells are plain calendar days, so use local components. */
const ymd = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function monthCells(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = first.getDay();

  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(first.getFullYear(), first.getMonth(), 1 - startOffset + index)
  );
}

function formatDay(dateKey: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
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

const emptyTimers = (): TimerForm =>
  Object.fromEntries(TIMER_FIELDS.map((field) => [field.key, ""])) as TimerForm;

function timersToForm(source: Partial<Timers>): TimerForm {
  const form = emptyTimers();

  for (const field of TIMER_FIELDS) {
    const value = source[field.key];
    form[field.key] = value === null || value === undefined ? "" : String(value);
  }

  return form;
}

function parseTimers(form: TimerForm): { values: Timers } | { error: string } {
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
        error: `${field.label} must be a whole number${
          minimum ? " of at least 1" : ""
        }.`,
      };
    }

    values[field.key] = number;
  }

  return { values };
}

function toLocalInput(iso: string | null) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const newKey = () => crypto.randomUUID();

function exerciseFromVideo(video: Video): DraftExercise {
  return {
    key: newKey(),
    videoId: video.id,
    name: video.name,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    durationSeconds: video.durationSeconds,
  };
}

function exerciseFromSchedule(exercise: ScheduleExercise): DraftExercise {
  if (exercise.video) {
    return exerciseFromVideo(exercise.video);
  }

  return {
    key: newKey(),
    videoId: null,
    name: exercise.exerciseName ?? "Exercise",
    videoUrl: null,
    thumbnailUrl: null,
    durationSeconds: null,
  };
}

function blankDraft(dateKey: string): Draft {
  return {
    id: null,
    dateKey,
    mode: "SCHEDULE",
    scheduleId: "",
    title: "",
    subtitle: "",
    description: "",
    intensity: "",
    timers: emptyTimers(),
    nextSession: "",
    exercises: [],
    tvSelections: {},
  };
}

function draftFromBroadcast(broadcast: Broadcast): Draft {
  const exercises = broadcast.exercises
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (exercise): DraftExercise => ({
        key: exercise.id,
        videoId: exercise.videoId,
        name: exercise.exerciseName,
        videoUrl: exercise.videoUrl,
        thumbnailUrl: exercise.thumbnailUrl,
        durationSeconds: exercise.durationSeconds,
      })
    );

  const allKeys = exercises.map((exercise) => exercise.key);
  const tvSelections: Record<string, string[]> = {};

  for (const tv of broadcast.tvs) {
    tvSelections[tv.tvDeviceId] =
      tv.exercises.length > 0
        ? tv.exercises
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => item.exerciseId)
        : allKeys;
  }

  return {
    id: broadcast.id,
    dateKey: broadcast.dateKey,
    mode: broadcast.mode,
    scheduleId: broadcast.scheduleId ?? "",
    title: broadcast.title ?? "",
    subtitle: broadcast.subtitle ?? "",
    description: broadcast.description ?? "",
    intensity: broadcast.intensity ?? "",
    timers: timersToForm(broadcast),
    nextSession: toLocalInput(broadcast.nextSessionStartsAt),
    exercises,
    tvSelections,
  };
}

function previewFromDraft(draft: Draft, tvId?: string, tvName?: string): PreviewData | string {
  const parsed = parseTimers(draft.timers);

  if ("error" in parsed) {
    return parsed.error;
  }

  const selected = tvId ? draft.tvSelections[tvId] : undefined;
  const list =
    draft.mode === "TIMER_ONLY"
      ? []
      : selected && selected.length > 0
      ? draft.exercises.filter((exercise) => selected.includes(exercise.key))
      : draft.exercises;

  return {
    title: draft.title || "Workout Broadcast",
    subtitle: draft.subtitle || null,
    mode: draft.mode,
    timers: parsed.values,
    exercises: list.map((exercise) => ({
      id: exercise.key,
      name: exercise.name,
      videoUrl: exercise.videoUrl,
      thumbnailUrl: exercise.thumbnailUrl,
      durationSeconds: exercise.durationSeconds,
    })),
    heading: tvName ? `As shown on ${tvName}` : "As shown on TV",
  };
}

const STATUS_STYLE: Record<Status, string> = {
  DRAFT: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  SCHEDULED: "bg-lime-400/10 text-lime-400 border-lime-400/20",
  LIVE: "bg-red-500/10 text-red-400 border-red-500/20",
  PAUSED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  CANCELLED: "bg-zinc-700/30 text-zinc-500 border-zinc-700",
};

const PHASE_LABEL: Record<PhaseType, string> = {
  PREPARE: "GET READY",
  WARMUP: "WARM-UP",
  DEMONSTRATION: "DEMONSTRATION",
  WORK: "WORK",
  REST: "REST",
  REST_BETWEEN_CYCLE: "CYCLE REST",
  COOLDOWN: "COOL DOWN",
};

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-lime-400";

const isRunning = (status: Status) => status === "LIVE" || status === "PAUSED";

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function WorkoutBroadcastsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [tvs, setTvs] = useState<Tv[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);

  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey());

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const [librarySearch, setLibrarySearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [replacingKey, setReplacingKey] = useState<string | null>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(false);

  const cells = useMemo(() => monthCells(month), [month]);
  const rangeFrom = ymd(cells[0]);
  const rangeTo = ymd(cells[cells.length - 1]);
  const todayKey = toDateKey();

  // ---------------- Loading ----------------

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/branches", { cache: "no-store" });
        const payload = await response.json();
        const list: Branch[] = Array.isArray(payload) ? payload : payload.branches ?? [];

        setBranches(list);
        setBranchId((current) => current || list[0]?.id || "");
      } catch (loadError) {
        setError(errorMessage(loadError));
      }
    })();

    api<Video[]>("/api/workout-videos?active=true&limit=500")
      .then(setVideos)
      .catch((loadError) => setError(errorMessage(loadError)));
  }, []);

  useEffect(() => {
    if (!branchId) {
      setTvs([]);
      return;
    }

    api<Tv[]>(`/api/tvs?branchId=${encodeURIComponent(branchId)}`)
      .then(setTvs)
      .catch((loadError) => setError(errorMessage(loadError)));
  }, [branchId]);

  const loadMonth = useCallback(
    async (silent = false) => {
      if (!branchId) {
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }

        const [scheduleList, broadcastList] = await Promise.all([
          api<Schedule[]>(`/api/workout-schedules?from=${rangeFrom}&to=${rangeTo}`),
          api<Broadcast[]>(
            `/api/workout-broadcasts?branchId=${encodeURIComponent(
              branchId
            )}&from=${rangeFrom}&to=${rangeTo}`
          ),
        ]);

        setSchedules(scheduleList);
        setBroadcasts(broadcastList);
      } catch (loadError) {
        if (!silent) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [branchId, rangeFrom, rangeTo]
  );

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  // While anything is running, keep statuses fresh (auto-completion included).
  const hasRunning = broadcasts.some((broadcast) => isRunning(broadcast.status));

  useEffect(() => {
    if (!hasRunning) {
      return;
    }

    const timer = setInterval(() => void loadMonth(true), 5000);
    return () => clearInterval(timer);
  }, [hasRunning, loadMonth]);

  // ---------------- Derived ----------------

  const broadcastsByDate = useMemo(() => {
    const map = new Map<string, Broadcast[]>();
    for (const broadcast of broadcasts) {
      map.set(broadcast.dateKey, [...(map.get(broadcast.dateKey) ?? []), broadcast]);
    }
    return map;
  }, [broadcasts]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      map.set(schedule.dateKey, [...(map.get(schedule.dateKey) ?? []), schedule]);
    }
    return map;
  }, [schedules]);

  const dayBroadcasts = broadcastsByDate.get(selectedDate) ?? [];
  const activeBranch = branches.find((branch) => branch.id === branchId) ?? null;

  // ---------------- Actions ----------------

  function notify(message: string) {
    setError("");
    setSuccess(message);
  }

  async function control(
    broadcast: Broadcast,
    action: "start" | "pause" | "resume" | "stop"
  ) {
    if (action === "stop" && !window.confirm("Stop this broadcast on all TVs?")) {
      return;
    }

    try {
      setBusyId(broadcast.id);
      setError("");
      setSuccess("");

      await api(`/api/workout-broadcasts/${broadcast.id}/${action}`, { method: "POST" });
      await loadMonth(true);

      notify(
        {
          start: "Broadcast started.",
          pause: "Broadcast paused.",
          resume: "Broadcast resumed.",
          stop: "Broadcast stopped.",
        }[action]
      );
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(broadcast: Broadcast) {
    if (!window.confirm("Delete this broadcast?")) {
      return;
    }

    try {
      setBusyId(broadcast.id);
      setError("");
      await api(`/api/workout-broadcasts/${broadcast.id}`, { method: "DELETE" });
      await loadMonth(true);
      notify("Broadcast deleted.");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusyId(null);
    }
  }

  function openCreate(dateKey: string) {
    setError("");
    setSuccess("");
    resetPicker();
    setDraft(blankDraft(dateKey));
  }

  function openEdit(broadcast: Broadcast) {
    setError("");
    setSuccess("");
    resetPicker();
    setDraft(draftFromBroadcast(broadcast));
  }

  function resetPicker() {
    setLibrarySearch("");
    setManualName("");
    setReplacingKey(null);
    setShowAllSchedules(false);
  }

  function openPreview(broadcast: Broadcast, tvId?: string) {
    const tvName = broadcast.tvs.find((tv) => tv.tvDeviceId === tvId)?.tvDevice.name;
    const result = previewFromDraft(draftFromBroadcast(broadcast), tvId, tvName);

    if (typeof result === "string") {
      setError(result);
      return;
    }

    setPreview(result);
  }

  // ---------------- Form mutations ----------------

  function patch(changes: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...changes } : current));
  }

  function chooseMode(mode: Mode) {
    setDraft((current) => {
      if (!current || current.id) {
        return current;
      }

      return mode === "TIMER_ONLY"
        ? {
            ...current,
            mode,
            scheduleId: "",
            exercises: [],
            tvSelections: Object.fromEntries(
              Object.keys(current.tvSelections).map((id) => [id, []])
            ),
          }
        : { ...current, mode };
    });
  }

  function chooseSchedule(scheduleId: string) {
    const schedule = schedules.find((item) => item.id === scheduleId);

    setDraft((current) => {
      if (!current) {
        return current;
      }

      if (!schedule) {
        return { ...current, scheduleId: "" };
      }

      const exercises = schedule.exercises
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(exerciseFromSchedule);

      const keys = exercises.map((exercise) => exercise.key);

      return {
        ...current,
        scheduleId,
        title: schedule.program.name,
        subtitle: schedule.program.subtitle ?? "",
        description: schedule.program.description ?? "",
        intensity: schedule.program.intensity ?? "",
        timers: timersToForm(schedule),
        nextSession: toLocalInput(schedule.nextSessionStartsAt),
        exercises,
        tvSelections: Object.fromEntries(
          Object.keys(current.tvSelections).map((id) => [id, keys])
        ),
      };
    });
  }

  function addExercise(exercise: DraftExercise) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      if (replacingKey) {
        const target = current.exercises.find((item) => item.key === replacingKey);

        if (target) {
          const replacement = { ...exercise, key: target.key };

          return {
            ...current,
            exercises: current.exercises.map((item) =>
              item.key === target.key ? replacement : item
            ),
          };
        }
      }

      return {
        ...current,
        exercises: [...current.exercises, exercise],
        tvSelections: Object.fromEntries(
          Object.entries(current.tvSelections).map(([id, keys]) => [
            id,
            [...keys, exercise.key],
          ])
        ),
      };
    });

    setReplacingKey(null);
  }

  function addManual() {
    const name = manualName.trim();

    if (!name) {
      return;
    }

    addExercise({
      key: newKey(),
      videoId: null,
      name,
      videoUrl: null,
      thumbnailUrl: null,
      durationSeconds: null,
    });
    setManualName("");
  }

  function removeExercise(key: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.filter((item) => item.key !== key),
            tvSelections: Object.fromEntries(
              Object.entries(current.tvSelections).map(([id, keys]) => [
                id,
                keys.filter((item) => item !== key),
              ])
            ),
          }
        : current
    );

    if (replacingKey === key) {
      setReplacingKey(null);
    }
  }

  function moveExercise(index: number, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const target = index + direction;

      if (target < 0 || target >= current.exercises.length) {
        return current;
      }

      const exercises = current.exercises.slice();
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];

      return { ...current, exercises };
    });
  }

  function toggleTv(tvId: string) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const next = { ...current.tvSelections };

      if (tvId in next) {
        delete next[tvId];
      } else {
        next[tvId] =
          current.mode === "SCHEDULE" ? current.exercises.map((item) => item.key) : [];
      }

      return { ...current, tvSelections: next };
    });
  }

  function toggleTvExercise(tvId: string, key: string) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const selected = current.tvSelections[tvId] ?? [];

      return {
        ...current,
        tvSelections: {
          ...current.tvSelections,
          [tvId]: selected.includes(key)
            ? selected.filter((item) => item !== key)
            : [...selected, key],
        },
      };
    });
  }

  function setTvAll(tvId: string, all: boolean) {
    setDraft((current) =>
      current
        ? {
            ...current,
            tvSelections: {
              ...current.tvSelections,
              [tvId]: all ? current.exercises.map((item) => item.key) : [],
            },
          }
        : current
    );
  }

  // ---------------- Save ----------------

  async function save() {
    if (!draft || !branchId) {
      return;
    }

    setError("");

    const parsed = parseTimers(draft.timers);

    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }

    if (draft.mode === "SCHEDULE") {
      if (!draft.scheduleId) {
        setError("Select a workout schedule.");
        return;
      }

      if (draft.exercises.length === 0) {
        setError("Add at least one exercise.");
        return;
      }
    }

    const selectedTvIds = Object.keys(draft.tvSelections);

    if (draft.mode === "SCHEDULE") {
      for (const tvId of selectedTvIds) {
        if (draft.tvSelections[tvId].length === 0) {
          const name = tvs.find((tv) => tv.id === tvId)?.name ?? "A selected TV";
          setError(`${name} needs at least one exercise.`);
          return;
        }
      }
    }

    const body = {
      branchId,
      dateKey: draft.dateKey,
      mode: draft.mode,
      scheduleId: draft.mode === "SCHEDULE" ? draft.scheduleId : null,
      title: draft.title.trim() || null,
      subtitle: draft.subtitle.trim() || null,
      description: draft.description.trim() || null,
      intensity: draft.intensity || null,
      ...parsed.values,
      nextSessionStartsAt: fromLocalInput(draft.nextSession),
      exercises:
        draft.mode === "SCHEDULE"
          ? draft.exercises.map((exercise) =>
              exercise.videoId
                ? { videoId: exercise.videoId }
                : { exerciseName: exercise.name }
            )
          : [],
      tvs: selectedTvIds.map((tvDeviceId) => ({
        tvDeviceId,
        ...(draft.mode === "SCHEDULE"
          ? {
              exerciseSortOrders: draft.exercises.flatMap((exercise, index) =>
                draft.tvSelections[tvDeviceId].includes(exercise.key) ? [index] : []
              ),
            }
          : {}),
      })),
    };

    try {
      setSaving(true);

      await api(
        draft.id ? `/api/workout-broadcasts/${draft.id}` : "/api/workout-broadcasts",
        { method: draft.id ? "PUT" : "POST", body: JSON.stringify(body) }
      );

      setSelectedDate(draft.dateKey);
      setDraft(null);
      await loadMonth(true);
      notify(draft.id ? "Broadcast updated." : "Broadcast created.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  function previewDraft() {
    if (!draft) {
      return;
    }

    const firstTvId = Object.keys(draft.tvSelections)[0];
    const tvName = tvs.find((tv) => tv.id === firstTvId)?.name;
    const result = previewFromDraft(draft, firstTvId, tvName);

    if (typeof result === "string") {
      setError(result);
      return;
    }

    setPreview(result);
  }

  // ---------------- Render helpers ----------------

  const libraryMatches = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();

    return videos
      .filter((video) => !query || video.name.toLowerCase().includes(query))
      .slice(0, 30);
  }, [videos, librarySearch]);

  const scheduleOptions = useMemo(() => {
    if (!draft) {
      return [];
    }

    const pool = showAllSchedules ? schedules : schedulesByDate.get(draft.dateKey) ?? [];
    const options = pool.slice();
    const selected = schedules.find((item) => item.id === draft.scheduleId);

    if (selected && !options.some((item) => item.id === selected.id)) {
      options.unshift(selected);
    }

    return options;
  }, [draft, schedules, schedulesByDate, showAllSchedules]);

  // ---------------- UI ----------------

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-lime-400">
              <Tv size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                TV Broadcasting
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Workout Broadcasts</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Branch-wise broadcasts built from centralized schedules, or timer only.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value);
                setError("");
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadMonth()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-700 hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => openCreate(selectedDate)}
              disabled={!branchId}
              className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={17} />
              New Broadcast
            </button>
          </div>
        </div>

        {error && !draft && (
          <Banner tone="error" onClose={() => setError("")}>
            {error}
          </Banner>
        )}
        {success && (
          <Banner tone="success" onClose={() => setSuccess("")}>
            {success}
          </Banner>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Calendar */}
          <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-semibold">
                  {new Intl.DateTimeFormat("en-IN", {
                    month: "long",
                    year: "numeric",
                  }).format(month)}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">Broadcast calendar</p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMonth(new Date());
                    setSelectedDate(todayKey);
                  }}
                  className="rounded-md px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonth((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
                  }
                  className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonth((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
                  }
                  className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-zinc-800">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-600"
                >
                  {day}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex min-h-[580px] items-center justify-center">
                <Loader2 className="animate-spin text-lime-400" size={26} />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((date) => {
                  const key = ymd(date);
                  const inMonth = date.getMonth() === month.getMonth();
                  const selected = key === selectedDate;
                  const items = broadcastsByDate.get(key) ?? [];
                  const scheduleCount = schedulesByDate.get(key)?.length ?? 0;

                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className={`min-h-[105px] border-b border-r border-zinc-800 p-2 text-left transition ${
                        selected ? "bg-lime-400/[0.06]" : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                            key === todayKey
                              ? "bg-lime-400 text-black"
                              : selected
                              ? "border border-lime-400/40 text-lime-400"
                              : inMonth
                              ? "text-zinc-300"
                              : "text-zinc-700"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {scheduleCount > 0 && (
                          <span className="text-[10px] text-zinc-600">
                            {scheduleCount} schedule{scheduleCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {items.slice(0, 3).map((broadcast) => (
                          <div
                            key={broadcast.id}
                            className={`truncate rounded border px-1.5 py-1 text-[10px] ${
                              STATUS_STYLE[broadcast.status]
                            }`}
                          >
                            {broadcast.title ||
                              (broadcast.mode === "TIMER_ONLY" ? "Timer Only" : "Workout")}
                          </div>
                        ))}
                        {items.length > 3 && (
                          <div className="px-1 text-[10px] text-zinc-600">
                            +{items.length - 3} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Selected day */}
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-semibold">{formatDay(selectedDate)}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {activeBranch?.name ?? "No branch selected"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCreate(selectedDate)}
                disabled={!branchId}
                className="rounded-lg bg-lime-400 p-2 text-black hover:bg-lime-300 disabled:opacity-40"
              >
                <Plus size={17} />
              </button>
            </div>

            <div className="max-h-[680px] space-y-3 overflow-y-auto p-4">
              {dayBroadcasts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center">
                  <CalendarDays size={28} className="mx-auto mb-3 text-zinc-700" />
                  <p className="text-sm font-medium text-zinc-400">No broadcasts</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Create a broadcast for this date.
                  </p>
                  <button
                    type="button"
                    onClick={() => openCreate(selectedDate)}
                    disabled={!branchId}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-lime-400 px-3 py-2 text-xs font-semibold text-black hover:bg-lime-300 disabled:opacity-40"
                  >
                    <Plus size={14} />
                    New Broadcast
                  </button>
                </div>
              ) : (
                dayBroadcasts.map((broadcast) => (
                  <BroadcastCard
                    key={broadcast.id}
                    broadcast={broadcast}
                    busy={busyId === broadcast.id}
                    onEdit={() => openEdit(broadcast)}
                    onPreview={(tvId) => openPreview(broadcast, tvId)}
                    onControl={(action) => void control(broadcast, action)}
                    onDelete={() => void remove(broadcast)}
                  />
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Form */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {draft.id ? "Edit Broadcast" : "New Broadcast"}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Branch: {activeBranch?.name ?? "Unknown"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={saving}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[calc(100vh-190px)] overflow-y-auto">
              {error && (
                <div className="mx-6 mt-4">
                  <Banner tone="error" onClose={() => setError("")}>
                    {error}
                  </Banner>
                </div>
              )}

              <div className="grid gap-6 p-6 lg:grid-cols-[290px_minmax(0,1fr)]">
                {/* Left column */}
                <div className="space-y-5">
                  <Field label="Broadcast date">
                    <input
                      type="date"
                      style={{ colorScheme: "dark" }}
                      value={draft.dateKey}
                      onChange={(event) => patch({ dateKey: event.target.value })}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Broadcast mode">
                    <div className="grid grid-cols-2 gap-2">
                      <ModeButton
                        active={draft.mode === "SCHEDULE"}
                        locked={!!draft.id}
                        icon={<Film size={17} className="mb-2" />}
                        title="Schedule"
                        hint="Use a workout schedule"
                        onClick={() => chooseMode("SCHEDULE")}
                      />
                      <ModeButton
                        active={draft.mode === "TIMER_ONLY"}
                        locked={!!draft.id}
                        icon={<TimerReset size={17} className="mb-2" />}
                        title="Timer Only"
                        hint="Timer without exercises"
                        onClick={() => chooseMode("TIMER_ONLY")}
                      />
                    </div>
                  </Field>

                  {draft.mode === "SCHEDULE" && (
                    <Field label="Workout schedule">
                      <select
                        value={draft.scheduleId}
                        onChange={(event) => chooseSchedule(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select schedule</option>
                        {scheduleOptions.map((schedule) => (
                          <option key={schedule.id} value={schedule.id}>
                            {schedule.program.name}
                            {schedule.dateKey !== draft.dateKey
                              ? ` (${schedule.dateKey})`
                              : ""}
                          </option>
                        ))}
                      </select>

                      <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-zinc-500">
                        <input
                          type="checkbox"
                          checked={showAllSchedules}
                          onChange={(event) => setShowAllSchedules(event.target.checked)}
                          className="accent-lime-400"
                        />
                        Show schedules from other dates this month
                      </label>

                      {!showAllSchedules &&
                        (schedulesByDate.get(draft.dateKey) ?? []).length === 0 && (
                          <p className="mt-2 text-[11px] text-amber-400">
                            No schedule exists for this date.
                          </p>
                        )}

                      {draft.scheduleId && (
                        <p className="mt-2 text-[11px] text-zinc-600">
                          Details are copied into this broadcast. Editing them here never
                          changes the schedule.
                        </p>
                      )}
                    </Field>
                  )}

                  <Field label="TVs">
                    {tvs.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center">
                        <Monitor size={22} className="mx-auto mb-2 text-zinc-700" />
                        <p className="text-xs text-zinc-500">
                          No TVs are paired to this branch.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tvs.map((tv) => {
                          const selected = tv.id in draft.tvSelections;

                          return (
                            <button
                              key={tv.id}
                              type="button"
                              onClick={() => toggleTv(tv.id)}
                              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                                selected
                                  ? "border-lime-400/30 bg-lime-400/10"
                                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Checkbox checked={selected} />
                                <span className="text-xs font-medium text-zinc-300">
                                  {tv.name}
                                </span>
                              </div>
                              <span
                                title={tv.isOnline ? "Online" : "Offline"}
                                className={`h-1.5 w-1.5 rounded-full ${
                                  tv.isOnline ? "bg-lime-400" : "bg-zinc-700"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Field>
                </div>

                {/* Right column */}
                <div className="space-y-7">
                  <Section title="Broadcast Details">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Title">
                        <input
                          value={draft.title}
                          onChange={(event) => patch({ title: event.target.value })}
                          placeholder="Broadcast title"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Subtitle">
                        <input
                          value={draft.subtitle}
                          onChange={(event) => patch({ subtitle: event.target.value })}
                          placeholder="Optional subtitle"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Intensity">
                        <select
                          value={draft.intensity}
                          onChange={(event) =>
                            patch({ intensity: event.target.value as Intensity | "" })
                          }
                          className={inputClass}
                        >
                          <option value="">Not set</option>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </Field>
                      <Field label="Description">
                        <input
                          value={draft.description}
                          onChange={(event) => patch({ description: event.target.value })}
                          placeholder="Optional description"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section title="Timer Settings">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {TIMER_FIELDS.map((field) => (
                        <Field key={field.key} label={field.label}>
                          <div className="relative">
                            <input
                              type="number"
                              min={field.key === "sets" || field.key === "cycles" ? 1 : 0}
                              value={draft.timers[field.key]}
                              onChange={(event) =>
                                patch({
                                  timers: { ...draft.timers, [field.key]: event.target.value },
                                })
                              }
                              className={inputClass}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
                              {field.unit}
                            </span>
                          </div>
                        </Field>
                      ))}

                      <div className="sm:col-span-2 lg:col-span-3">
                        <Field label="Next Session Starts At">
                          <input
                            type="datetime-local"
                            style={{ colorScheme: "dark" }}
                            value={draft.nextSession}
                            onChange={(event) => patch({ nextSession: event.target.value })}
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </div>
                  </Section>

                  {draft.mode === "SCHEDULE" && (
                    <Section
                      title="Broadcast Exercises"
                      aside={`${draft.exercises.length} selected`}
                    >
                      {/* Library picker */}
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        {replacingKey && (
                          <div className="mb-2 flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
                            <span>Pick a library video to replace the selected exercise.</span>
                            <button
                              type="button"
                              onClick={() => setReplacingKey(null)}
                              className="font-semibold hover:text-amber-300"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        <input
                          value={librarySearch}
                          onChange={(event) => setLibrarySearch(event.target.value)}
                          placeholder="Search library by name..."
                          className={inputClass}
                        />

                        <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                          {libraryMatches.length === 0 ? (
                            <p className="px-2 py-4 text-center text-xs text-zinc-600">
                              No matching videos.
                            </p>
                          ) : (
                            libraryMatches.map((video) => (
                              <button
                                type="button"
                                key={video.id}
                                onClick={() => addExercise(exerciseFromVideo(video))}
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-zinc-800"
                              >
                                <span className="truncate text-xs text-zinc-300">
                                  {video.name}
                                </span>
                                <span className="ml-3 shrink-0 text-[10px] text-zinc-600">
                                  {replacingKey ? "Replace" : "Add"}
                                </span>
                              </button>
                            ))
                          )}
                        </div>

                        <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3">
                          <input
                            value={manualName}
                            onChange={(event) => setManualName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addManual();
                              }
                            }}
                            placeholder="Or type an exercise name (shows on TV without a video)"
                            className={inputClass}
                          />
                          <button
                            type="button"
                            onClick={addManual}
                            className="shrink-0 rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-300 hover:border-lime-400/40 hover:text-lime-300"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Current list */}
                      <div className="mt-3 space-y-2">
                        {draft.exercises.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-zinc-800 py-8 text-center text-xs text-zinc-600">
                            Select a schedule, or add exercises from the library.
                          </div>
                        ) : (
                          draft.exercises.map((exercise, index) => (
                            <div
                              key={exercise.key}
                              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                                replacingKey === exercise.key
                                  ? "border-amber-500/40 bg-amber-500/5"
                                  : "border-zinc-800 bg-zinc-950"
                              }`}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-semibold text-zinc-500">
                                {index + 1}
                              </span>

                              {exercise.thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={exercise.thumbnailUrl}
                                  alt=""
                                  className="h-9 w-14 shrink-0 rounded object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-zinc-800">
                                  <Film size={15} className="text-zinc-600" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-zinc-300">
                                  {exercise.name}
                                </p>
                                <p className="mt-0.5 text-[10px] text-zinc-600">
                                  {exercise.videoUrl ? "Library video" : "Name only"}
                                  {exercise.durationSeconds
                                    ? ` · ${exercise.durationSeconds}s`
                                    : ""}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-0.5">
                                <IconButton
                                  label="Replace from library"
                                  onClick={() => setReplacingKey(exercise.key)}
                                >
                                  <span className="px-1 text-[10px] font-medium">Replace</span>
                                </IconButton>
                                <IconButton
                                  label="Move up"
                                  disabled={index === 0}
                                  onClick={() => moveExercise(index, -1)}
                                >
                                  <ChevronUp size={15} />
                                </IconButton>
                                <IconButton
                                  label="Move down"
                                  disabled={index === draft.exercises.length - 1}
                                  onClick={() => moveExercise(index, 1)}
                                >
                                  <ChevronDown size={15} />
                                </IconButton>
                                <IconButton
                                  label="Remove"
                                  danger
                                  onClick={() => removeExercise(exercise.key)}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Section>
                  )}

                  {draft.mode === "SCHEDULE" &&
                    Object.keys(draft.tvSelections).length > 0 &&
                    draft.exercises.length > 0 && (
                      <Section title="TV Exercise Selection">
                        <div className="space-y-3">
                          {Object.keys(draft.tvSelections).map((tvId) => {
                            const tv = tvs.find((item) => item.id === tvId);
                            const selected = draft.tvSelections[tvId];

                            return (
                              <div
                                key={tvId}
                                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                              >
                                <div className="mb-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Monitor size={15} className="text-lime-400" />
                                    <span className="text-xs font-semibold text-zinc-300">
                                      {tv?.name ?? "TV"}
                                    </span>
                                    <span className="text-[10px] text-zinc-600">
                                      {selected.length} of {draft.exercises.length}
                                    </span>
                                  </div>
                                  <div className="flex gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setTvAll(tvId, true)}
                                      className="text-[10px] text-lime-400 hover:text-lime-300"
                                    >
                                      Select all
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setTvAll(tvId, false)}
                                      className="text-[10px] text-zinc-600 hover:text-zinc-400"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                  {draft.exercises.map((exercise, index) => {
                                    const checked = selected.includes(exercise.key);

                                    return (
                                      <button
                                        key={exercise.key}
                                        type="button"
                                        onClick={() => toggleTvExercise(tvId, exercise.key)}
                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left ${
                                          checked
                                            ? "border-lime-400/20 bg-lime-400/[0.06]"
                                            : "border-zinc-800 bg-zinc-900"
                                        }`}
                                      >
                                        <Checkbox checked={checked} small />
                                        <span className="truncate text-[11px] text-zinc-400">
                                          {index + 1}. {exercise.name}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Section>
                    )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/60 px-6 py-4">
              <button
                type="button"
                onClick={previewDraft}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white"
              >
                <Eye size={15} />
                Preview
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                  className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !branchId}
                  className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {draft.id ? "Update Broadcast" : "Create Broadcast"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {preview && <BroadcastPreview data={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------
// Day card
// ------------------------------------------------------------------

function BroadcastCard({
  broadcast,
  busy,
  onEdit,
  onPreview,
  onControl,
  onDelete,
}: {
  broadcast: Broadcast;
  busy: boolean;
  onEdit: () => void;
  onPreview: (tvId?: string) => void;
  onControl: (action: "start" | "pause" | "resume" | "stop") => void;
  onDelete: () => void;
}) {
  const running = isRunning(broadcast.status);
  const editable = broadcast.status === "SCHEDULED" || broadcast.status === "DRAFT";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {broadcast.mode === "TIMER_ONLY" ? (
              <TimerReset size={14} className="shrink-0 text-lime-400" />
            ) : (
              <Film size={14} className="shrink-0 text-lime-400" />
            )}
            <span className="truncate text-sm font-medium text-white">
              {broadcast.title || "Workout Broadcast"}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {broadcast.mode === "SCHEDULE"
              ? `${broadcast.exercises.length} exercise${
                  broadcast.exercises.length !== 1 ? "s" : ""
                }`
              : "Timer only"}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${
            STATUS_STYLE[broadcast.status]
          }`}
        >
          {broadcast.status}
        </span>
      </div>

      <div className="mb-3 space-y-1.5">
        {broadcast.tvs.length === 0 ? (
          <p className="text-[11px] text-amber-400">No TV selected yet.</p>
        ) : (
          broadcast.tvs.map((tv) => (
            <div
              key={tv.id}
              className="flex items-center justify-between rounded-md bg-zinc-900 px-2.5 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-2 text-xs text-zinc-300">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    tv.tvDevice.isOnline ? "bg-lime-400" : "bg-zinc-700"
                  }`}
                />
                <span className="truncate">{tv.tvDevice.name}</span>
              </span>
              <button
                type="button"
                onClick={() => onPreview(tv.tvDeviceId)}
                className="shrink-0 text-[10px] text-zinc-500 hover:text-lime-400"
              >
                Preview
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {editable && (
          <CardButton onClick={onEdit} disabled={busy}>
            <Edit3 size={13} />
            Edit
          </CardButton>
        )}

        <CardButton onClick={() => onPreview()}>
          <Eye size={13} />
          Preview
        </CardButton>

        {editable && (
          <CardButton primary onClick={() => onControl("start")} disabled={busy}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            Start
          </CardButton>
        )}

        {broadcast.status === "LIVE" && (
          <CardButton onClick={() => onControl("pause")} disabled={busy}>
            <Pause size={13} />
            Pause
          </CardButton>
        )}

        {broadcast.status === "PAUSED" && (
          <CardButton primary onClick={() => onControl("resume")} disabled={busy}>
            <Play size={13} />
            Resume
          </CardButton>
        )}

        {running && (
          <CardButton danger onClick={() => onControl("stop")} disabled={busy}>
            <Square size={13} />
            Stop
          </CardButton>
        )}
      </div>

      {running && (
        <p className="mt-2 text-[10px] text-zinc-600">
          Running broadcasts can't be edited. Stop it first.
        </p>
      )}

      {!running && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={12} />
          Delete broadcast
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Preview: runs the real plan engine, the same one the TV follows
// ------------------------------------------------------------------

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function BroadcastPreview({ data, onClose }: { data: PreviewData; onClose: () => void }) {
  const built = useMemo(() => {
    try {
      return {
        plan: buildPlan(
          {
            broadcastId: "preview",
            version: 1,
            status: "LIVE",
            mode: data.mode,
            title: data.title,
            subtitle: data.subtitle,
            nextSessionStartsAt: null,
            timers: data.timers,
            exercises: data.exercises,
            run: { startedAt: 0, pausedAt: null, pausedTotalMs: 0 },
          },
          0
        ),
        problem: "",
      };
    } catch (previewError) {
      return {
        plan: null,
        problem:
          previewError instanceof PlanError
            ? previewError.message
            : "Unable to build the preview.",
      };
    }
  }, [data]);

  const plan = built.plan;
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!plan || !playing) {
      return;
    }

    const timer = setInterval(
      () => setElapsed((current) => Math.min(plan.totalMs, current + 100 * speed)),
      100
    );

    return () => clearInterval(timer);
  }, [plan, playing, speed]);

  const position = plan
    ? phaseAt(plan, { startedAt: 0, pausedAt: null, pausedTotalMs: 0 }, elapsed)
    : null;

  const running = position && (position.state === "RUNNING" || position.state === "PAUSED");
  const phase = running ? position.phase : null;
  const exercise =
    plan && phase && phase.exerciseIndex !== null
      ? plan.exercises[phase.exerciseIndex]
      : null;
  const showVideo =
    !!exercise?.videoUrl && (phase?.type === "WORK" || phase?.type === "DEMONSTRATION");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="font-semibold">Broadcast Preview</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {data.heading}. This runs the same timeline the TV follows.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {!plan ? (
          <div className="p-8 text-center text-sm text-red-400">{built.problem}</div>
        ) : (
          <div className="space-y-4 p-5">
            {/* Simulated TV screen */}
            <div className="relative aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-black">
              {showVideo && exercise?.videoUrl && (
                <video
                  key={`${exercise.id}-${phase?.index}`}
                  src={exercise.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain"
                />
              )}

              <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-lime-400">
                    Fuel TV
                  </p>
                  <p className="mt-1 text-sm font-bold">{data.title}</p>
                  {data.subtitle && (
                    <p className="text-xs text-zinc-400">{data.subtitle}</p>
                  )}
                </div>
                {phase && (
                  <div className="text-right text-[11px] text-zinc-300">
                    {phase.set !== null && (
                      <p>
                        Set {phase.set}/{plan.sets} · Cycle {phase.cycle}/{plan.cycles}
                      </p>
                    )}
                    {plan.exercises.length > 0 && phase.exerciseIndex !== null && (
                      <p className="text-zinc-500">
                        Exercise {phase.exerciseIndex + 1}/{plan.exercises.length}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {position?.state === "DONE" ? (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-lime-700 bg-lime-950 text-3xl text-lime-400">
                      ✓
                    </div>
                    <p className="mt-4 text-xs font-black tracking-[0.25em] text-lime-400">
                      WORKOUT COMPLETED
                    </p>
                  </>
                ) : phase && running ? (
                  <div className={showVideo ? "rounded-2xl bg-black/55 px-8 py-4" : ""}>
                    <p className="text-xs font-black tracking-[0.3em] text-lime-400">
                      {PHASE_LABEL[phase.type]}
                    </p>
                    <p className="mt-2 text-6xl font-black tabular-nums">
                      {clock(position.remainingMs)}
                    </p>
                    {exercise && (
                      <p className="mt-2 text-lg font-bold text-zinc-100">{exercise.name}</p>
                    )}
                  </div>
                ) : null}
              </div>

              {running && position.nextPhase && (
                <div className="absolute bottom-3 left-4 rounded-md bg-black/60 px-2.5 py-1 text-[10px] text-zinc-400">
                  Next: {PHASE_LABEL[position.nextPhase.type]}
                  {position.nextPhase.exerciseIndex !== null &&
                  position.nextPhase.exerciseIndex !== phase?.exerciseIndex
                    ? ` · ${plan.exercises[position.nextPhase.exerciseIndex]?.name ?? ""}`
                    : ""}
                </div>
              )}
            </div>

            {/* Transport */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (elapsed >= plan.totalMs) {
                    setElapsed(0);
                  }
                  setPlaying((current) => !current);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-xs font-semibold text-black hover:bg-lime-300"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
                {playing ? "Pause" : "Play"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setElapsed(0);
                  setPlaying(true);
                }}
                className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white"
              >
                Restart
              </button>

              <div className="flex items-center gap-1">
                {[1, 5, 20].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSpeed(value)}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${
                      speed === value
                        ? "bg-zinc-700 text-white"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {value}x
                  </button>
                ))}
              </div>

              <span className="ml-auto text-xs tabular-nums text-zinc-500">
                {clock(elapsed)} / {clock(plan.totalMs)}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={plan.totalMs}
              step={1000}
              value={elapsed}
              onChange={(event) => setElapsed(Number(event.target.value))}
              className="w-full accent-lime-400"
            />

            {/* Phase strip */}
            <div className="flex h-2 gap-px overflow-hidden rounded-full">
              {plan.phases.map((item) => (
                <div
                  key={item.index}
                  title={`${PHASE_LABEL[item.type]} · ${item.durationMs / 1000}s`}
                  style={{ flexGrow: item.durationMs }}
                  className={
                    item.index === phase?.index
                      ? "bg-lime-400"
                      : item.type === "WORK"
                      ? "bg-zinc-500"
                      : "bg-zinc-800"
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Small presentational pieces
// ------------------------------------------------------------------

function Banner({
  tone,
  onClose,
  children,
}: {
  tone: "error" | "success";
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mb-4 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-red-500/20 bg-red-500/10 text-red-400"
          : "border-lime-400/20 bg-lime-400/10 text-lime-400"
      }`}
    >
      <span>{children}</span>
      <button type="button" onClick={onClose} className="shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-lime-400" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {aside && <span className="ml-auto text-xs text-zinc-600">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Checkbox({ checked, small }: { checked: boolean; small?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded border ${
        small ? "h-4 w-4" : "h-5 w-5"
      } ${checked ? "border-lime-400 bg-lime-400 text-black" : "border-zinc-700"}`}
    >
      {checked && <Check size={small ? 10 : 12} />}
    </span>
  );
}

function ModeButton({
  active,
  locked,
  icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  locked: boolean;
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked && !active}
      className={`rounded-lg border p-3 text-left transition ${
        active
          ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 disabled:opacity-40"
      } ${locked ? "cursor-default" : ""}`}
    >
      {icon}
      <span className="block text-xs font-semibold">{title}</span>
      <span className="mt-1 block text-[10px] text-zinc-600">{hint}</span>
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 text-zinc-500 disabled:opacity-20 ${
        danger ? "hover:bg-red-500/10 hover:text-red-400" : "hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function CardButton({
  onClick,
  disabled,
  primary,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium disabled:opacity-50 ${
        primary
          ? "bg-lime-400 font-semibold text-black hover:bg-lime-300"
          : danger
          ? "border border-red-500/30 text-red-400 hover:bg-red-500/10"
          : "border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
