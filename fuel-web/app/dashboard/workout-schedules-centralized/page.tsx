"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Film,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type WorkoutVideo = {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  isActive: boolean;
};

type WorkoutProgramItem = {
  id: string;
  sortOrder: number;
  video: WorkoutVideo;
};

type WorkoutProgram = {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  intensity: string | null;
  isActive: boolean;
  items: WorkoutProgramItem[];
};

type ScheduleExercise = {
  id: string;
  videoId: string | null;
  exerciseName: string | null;
  sortOrder: number;
  video: WorkoutVideo | null;
};

type WorkoutSchedule = {
  id: string;
  date: string;
  programId: string;

  demonstrationSeconds: number | null;
  warmupSeconds: number | null;
  prepareSeconds: number | null;
  workSeconds: number | null;
  restSeconds: number | null;
  sets: number | null;
  cycles: number | null;
  restBetweenCycleSeconds: number | null;
  coolDownSeconds: number | null;
  nextSessionStartsAt: string | null;

  program: WorkoutProgram;
  exercises: ScheduleExercise[];
};

type VideosResponse = {
  videos?: WorkoutVideo[];
  success?: boolean;
  message?: string;
  error?: string;
};

type ScheduleResponsePayload =
  | WorkoutSchedule
  | {
      schedule?: WorkoutSchedule;
      error?: string;
      message?: string;
      success?: boolean;
    };

type ExerciseDraft = {
  id: string;
  type: "VIDEO" | "MANUAL";
  videoId?: string;
  exerciseName?: string;
};

type TimerField = {
  key:
    | "demonstrationSeconds"
    | "warmupSeconds"
    | "prepareSeconds"
    | "workSeconds"
    | "restSeconds"
    | "sets"
    | "cycles"
    | "restBetweenCycleSeconds"
    | "coolDownSeconds";
  label: string;
};

const TIMER_FIELDS: TimerField[] = [
  {
    key: "demonstrationSeconds",
    label: "Demonstration",
  },
  {
    key: "warmupSeconds",
    label: "Warm-up",
  },
  {
    key: "prepareSeconds",
    label: "Prepare",
  },
  {
    key: "workSeconds",
    label: "Work",
  },
  {
    key: "restSeconds",
    label: "Rest",
  },
  {
    key: "sets",
    label: "Sets",
  },
  {
    key: "cycles",
    label: "Cycles",
  },
  {
    key: "restBetweenCycleSeconds",
    label: "Rest Between Cycle",
  },
  {
    key: "coolDownSeconds",
    label: "Cool Down",
  },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getDateKey(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

function dateKeyToDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

/*
 * Keep a calendar date stable.
 *
 * The schedule is a date, not a timestamp.
 * Sending `2026-10-08T00:00:00` without a Z keeps
 * the selected local calendar date intact when parsed
 * by the server.
 */
function dateKeyToISO(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return "";
  }

  return `${year}-${pad(month)}-${pad(day)}T00:00:00`;
}

function dateTimeLocalToISO(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function isoToDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return "—";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function createExerciseId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const previousMonthDays = new Date(
    year,
    month,
    0
  ).getDate();

  const days: {
    date: Date;
    currentMonth: boolean;
  }[] = [];

  for (let index = firstWeekday - 1; index >= 0; index--) {
    days.push({
      date: new Date(
        year,
        month - 1,
        previousMonthDays - index
      ),
      currentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      date: new Date(year, month, day),
      currentMonth: true,
    });
  }

  while (days.length < 42) {
    const nextDay =
      days.length -
      firstWeekday -
      daysInMonth +
      1;

    days.push({
      date: new Date(
        year,
        month + 1,
        nextDay
      ),
      currentMonth: false,
    });
  }

  return days;
}

function getApiError(
  payload: unknown,
  fallback: string
) {
  if (
    payload &&
    typeof payload === "object"
  ) {
    const data = payload as {
      error?: unknown;
      message?: unknown;
    };

    if (
      typeof data.error === "string" &&
      data.error.trim()
    ) {
      return data.error;
    }

    if (
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return data.message;
    }
  }

  return fallback;
}

function getScheduleFromResponse(
  payload: unknown
): WorkoutSchedule | null {
  if (
    payload &&
    typeof payload === "object"
  ) {
    const data = payload as {
      id?: unknown;
      schedule?: unknown;
    };

    if (
      typeof data.id === "string"
    ) {
      return payload as WorkoutSchedule;
    }

    if (
      data.schedule &&
      typeof data.schedule === "object"
    ) {
      return data.schedule as WorkoutSchedule;
    }
  }

  return null;
}

export default function CentralizedWorkoutSchedulesPage() {
  const [videos, setVideos] = useState<WorkoutVideo[]>([]);
  const [programs, setPrograms] = useState<
    WorkoutProgram[]
  >([]);
  const [schedules, setSchedules] = useState<
    WorkoutSchedule[]
  >([]);

  const [monthDate, setMonthDate] = useState(
    new Date()
  );

  const [selectedDate, setSelectedDate] = useState(
    getDateKey(new Date())
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<
    string | null
  >(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] =
    useState<string | null>(null);

  const [programId, setProgramId] = useState("");

  const [exercises, setExercises] = useState<
    ExerciseDraft[]
  >([]);

  const [exerciseSearch, setExerciseSearch] =
    useState("");

  const [manualExerciseName, setManualExerciseName] =
    useState("");

  const [timerValues, setTimerValues] = useState<
    Record<string, string>
  >({});

  const [nextSessionStartsAt, setNextSessionStartsAt] =
    useState("");

  const activeVideos = useMemo(
    () => videos.filter((video) => video.isActive),
    [videos]
  );

  const activePrograms = useMemo(
    () =>
      programs.filter(
        (program) => program.isActive
      ),
    [programs]
  );

  const selectedProgram = useMemo(
    () =>
      activePrograms.find(
        (program) => program.id === programId
      ) ?? null,
    [activePrograms, programId]
  );

  const monthDays = useMemo(
    () => getMonthDays(monthDate),
    [monthDate]
  );

  const schedulesByDate = useMemo(() => {
    const map = new Map<
      string,
      WorkoutSchedule[]
    >();

    for (const schedule of schedules) {
      const key = getDateKey(schedule.date);

      if (!key) {
        continue;
      }

      const current = map.get(key) ?? [];
      current.push(schedule);
      map.set(key, current);
    }

    return map;
  }, [schedules]);

  const selectedDateSchedules =
    schedulesByDate.get(selectedDate) ?? [];

  const filteredVideos = useMemo(() => {
    const query = exerciseSearch
      .trim()
      .toLowerCase();

    if (!query) {
      return activeVideos;
    }

    return activeVideos.filter((video) =>
      video.name
        .toLowerCase()
        .includes(query)
    );
  }, [activeVideos, exerciseSearch]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [
        videosResponse,
        programsResponse,
        schedulesResponse,
      ] = await Promise.all([
        fetch("/api/workout-videos", {
          cache: "no-store",
        }),
        fetch("/api/workout-programs", {
          cache: "no-store",
        }),
        fetch("/api/workout-schedules", {
          cache: "no-store",
        }),
      ]);

      const videosPayload =
        (await videosResponse.json()) as VideosResponse;

      const programsPayload =
        await programsResponse.json();

      const schedulesPayload =
        await schedulesResponse.json();

      /*
       * Workout videos API uses the wrapped
       * { videos: [...] } response.
       */
      if (!videosResponse.ok) {
        throw new Error(
          getApiError(
            videosPayload,
            "Unable to load workout videos."
          )
        );
      }

      /*
       * Workout programs API returns the array
       * directly:
       *
       * [
       *   { ...program }
       * ]
       */
      if (!programsResponse.ok) {
        throw new Error(
          getApiError(
            programsPayload,
            "Unable to load workout programs."
          )
        );
      }

      /*
       * Workout schedules API also returns the
       * array directly:
       *
       * [
       *   { ...schedule }
       * ]
       */
      if (!schedulesResponse.ok) {
        throw new Error(
          getApiError(
            schedulesPayload,
            "Unable to load workout schedules."
          )
        );
      }

      setVideos(
        Array.isArray(videosPayload.videos)
          ? videosPayload.videos
          : []
      );

      setPrograms(
        Array.isArray(programsPayload)
          ? programsPayload
          : []
      );

      setSchedules(
        Array.isArray(schedulesPayload)
          ? schedulesPayload
          : []
      );
    } catch (loadError) {
      console.error(
        "Load centralized workout schedules error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load workout schedules."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resetBuilder() {
    setEditingScheduleId(null);
    setProgramId("");
    setExercises([]);
    setExerciseSearch("");
    setManualExerciseName("");
    setNextSessionStartsAt("");

    const defaults: Record<string, string> = {};

    for (const field of TIMER_FIELDS) {
      defaults[field.key] = "";
    }

    setTimerValues(defaults);
  }

  function openCreateModal(date = selectedDate) {
    resetBuilder();
    setSelectedDate(date);
    setIsModalOpen(true);
    setError("");
    setSuccess("");
  }

  function openEditModal(schedule: WorkoutSchedule) {
    setEditingScheduleId(schedule.id);
    setSelectedDate(getDateKey(schedule.date));
    setProgramId(schedule.programId);

    setExercises(
      schedule.exercises.map((exercise) => ({
        id: createExerciseId(),
        type: exercise.videoId
          ? "VIDEO"
          : "MANUAL",
        videoId: exercise.videoId ?? undefined,
        exerciseName:
          exercise.exerciseName ?? undefined,
      }))
    );

    const nextTimers: Record<string, string> = {};

    for (const field of TIMER_FIELDS) {
      const value =
        schedule[field.key] as number | null;

      nextTimers[field.key] =
        value === null ||
        value === undefined
          ? ""
          : String(value);
    }

    setTimerValues(nextTimers);

    setNextSessionStartsAt(
      isoToDateTimeLocal(
        schedule.nextSessionStartsAt
      )
    );

    setExerciseSearch("");
    setManualExerciseName("");
    setIsModalOpen(true);
    setError("");
    setSuccess("");
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    resetBuilder();
  }

  function updateTimer(
    key: string,
    value: string
  ) {
    setTimerValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function addVideoExercise(video: WorkoutVideo) {
    setExercises((current) => [
      ...current,
      {
        id: createExerciseId(),
        type: "VIDEO",
        videoId: video.id,
      },
    ]);

    setExerciseSearch("");
    setError("");
  }

  function addManualExercise() {
    const name = manualExerciseName.trim();

    if (!name) {
      setError(
        "Enter an exercise name before adding it."
      );
      return;
    }

    setExercises((current) => [
      ...current,
      {
        id: createExerciseId(),
        type: "MANUAL",
        exerciseName: name,
      },
    ]);

    setManualExerciseName("");
    setError("");
  }

  function removeExercise(id: string) {
    setExercises((current) =>
      current.filter(
        (exercise) => exercise.id !== id
      )
    );
  }

  function moveExercise(
    index: number,
    direction: "UP" | "DOWN"
  ) {
    setExercises((current) => {
      const next = [...current];

      const targetIndex =
        direction === "UP"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= next.length
      ) {
        return current;
      }

      const currentItem = next[index];

      next[index] = next[targetIndex];
      next[targetIndex] = currentItem;

      return next;
    });
  }

  function loadProgramExercises() {
    if (!selectedProgram) {
      setError(
        "Select a workout program first."
      );
      return;
    }

    setExercises(
      selectedProgram.items.map((item) => ({
        id: createExerciseId(),
        type: "VIDEO",
        videoId: item.video.id,
      }))
    );

    setError("");
  }

  async function saveSchedule(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedDate) {
      setError("Select a schedule date.");
      return;
    }

    if (!programId) {
      setError("Select a workout program.");
      return;
    }

    if (exercises.length === 0) {
      setError(
        "Add at least one exercise to the schedule."
      );
      return;
    }

    const parsedTimers: Record<
      string,
      number | null
    > = {};

    for (const field of TIMER_FIELDS) {
      const raw = timerValues[field.key];

      if (!raw.trim()) {
        parsedTimers[field.key] = null;
        continue;
      }

      const parsed = Number(raw);

      if (
        !Number.isInteger(parsed) ||
        parsed < 0
      ) {
        setError(
          `${field.label} must be a non-negative integer.`
        );
        return;
      }

      parsedTimers[field.key] = parsed;
    }

    const scheduleDateISO =
      dateKeyToISO(selectedDate);

    if (!scheduleDateISO) {
      setError("Select a valid schedule date.");
      return;
    }

    const nextSessionISO =
      dateTimeLocalToISO(nextSessionStartsAt);

    if (
      nextSessionStartsAt &&
      !nextSessionISO
    ) {
      setError(
        "Enter a valid next session start time."
      );
      return;
    }

    const payload = {
      date: scheduleDateISO,
      programId,

      demonstrationSeconds:
        parsedTimers.demonstrationSeconds,
      warmupSeconds: parsedTimers.warmupSeconds,
      prepareSeconds: parsedTimers.prepareSeconds,
      workSeconds: parsedTimers.workSeconds,
      restSeconds: parsedTimers.restSeconds,
      sets: parsedTimers.sets,
      cycles: parsedTimers.cycles,
      restBetweenCycleSeconds:
        parsedTimers.restBetweenCycleSeconds,
      coolDownSeconds:
        parsedTimers.coolDownSeconds,

      nextSessionStartsAt: nextSessionISO,

      exercises: exercises.map(
        (exercise) =>
          exercise.type === "VIDEO"
            ? {
                videoId: exercise.videoId,
              }
            : {
                exerciseName:
                  exercise.exerciseName,
              }
      ),
    };

    try {
      setIsSaving(true);

      const response = await fetch(
        editingScheduleId
          ? `/api/workout-schedules/${editingScheduleId}`
          : "/api/workout-schedules",
        {
          method: editingScheduleId
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responsePayload =
        (await response.json()) as ScheduleResponsePayload;

      if (!response.ok) {
        throw new Error(
          getApiError(
            responsePayload,
            "Unable to save workout schedule."
          )
        );
      }

      /*
       * POST /api/workout-schedules returns:
       *
       * {
       *   id: "...",
       *   date: "...",
       *   ...
       * }
       *
       * Some PATCH implementations may return:
       *
       * {
       *   schedule: { ... }
       * }
       *
       * Support both safely.
       */
      const savedSchedule =
        getScheduleFromResponse(
          responsePayload
        );

      if (!savedSchedule) {
        await loadData();
      } else {
        setSchedules((current) => {
          if (editingScheduleId) {
            return current.map((item) =>
              item.id === savedSchedule.id
                ? savedSchedule
                : item
            );
          }

          return [
            savedSchedule,
            ...current,
          ];
        });
      }

      setSuccess(
        editingScheduleId
          ? "Workout schedule updated successfully."
          : "Workout schedule created successfully."
      );

      setIsModalOpen(false);
      resetBuilder();
    } catch (saveError) {
      console.error(
        "Save centralized workout schedule error:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save workout schedule."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSchedule(
    schedule: WorkoutSchedule
  ) {
    const confirmed = window.confirm(
      `Delete the "${schedule.program.name}" schedule for ${formatDate(
        schedule.date
      )}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(schedule.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/workout-schedules/${schedule.id}`,
        {
          method: "DELETE",
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          getApiError(
            payload,
            "Unable to delete workout schedule."
          )
        );
      }

      setSchedules((current) =>
        current.filter(
          (item) => item.id !== schedule.id
        )
      );

      setSuccess(
        "Workout schedule deleted successfully."
      );
    } catch (deleteError) {
      console.error(
        "Delete centralized workout schedule error:",
        deleteError
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete workout schedule."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function goToPreviousMonth() {
    setMonthDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1
        )
    );
  }

  function goToNextMonth() {
    setMonthDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1
        )
    );
  }

  function goToToday() {
    const today = new Date();

    setMonthDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setSelectedDate(getDateKey(today));
  }

  const monthLabel = monthDate.toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );

  return (
    <div className="min-h-full bg-neutral-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-5 border-b border-neutral-800 pb-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
              <CalendarDays size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Workout Schedule
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Centrally schedule programs, exercises
                and timers before creating branch
                broadcasts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() =>
                openCreateModal(selectedDate)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-lime-300"
            >
              <Plus size={17} />
              New Schedule
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-300 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-lime-400/20 bg-lime-400/10 px-4 py-3 text-sm text-lime-300">
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-lime-300 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {monthLabel}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Centralized schedule calendar
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-neutral-800">
              {[
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
              ].map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="flex min-h-[500px] items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Loading schedules...
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {monthDays.map(
                  ({ date, currentMonth }, index) => {
                    const dateKey = getDateKey(date);
                    const daySchedules =
                      schedulesByDate.get(
                        dateKey
                      ) ?? [];

                    const isSelected =
                      dateKey === selectedDate;

                    const isToday =
                      dateKey ===
                      getDateKey(new Date());

                    return (
                      <button
                        type="button"
                        key={`${dateKey}-${index}`}
                        onClick={() => {
                          setSelectedDate(dateKey);

                          if (!currentMonth) {
                            setMonthDate(
                              new Date(
                                date.getFullYear(),
                                date.getMonth(),
                                1
                              )
                            );
                          }
                        }}
                        className={`min-h-[105px] border-b border-r border-neutral-800 p-2 text-left transition ${
                          currentMonth
                            ? "bg-neutral-900/30"
                            : "bg-neutral-950/50"
                        } ${
                          isSelected
                            ? "ring-1 ring-inset ring-lime-400/70"
                            : "hover:bg-neutral-800/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                              isToday
                                ? "bg-lime-400 text-neutral-950"
                                : currentMonth
                                ? "text-neutral-300"
                                : "text-neutral-700"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {daySchedules.length > 0 && (
                            <span className="rounded-full bg-lime-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-lime-300">
                              {daySchedules.length}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 space-y-1">
                          {daySchedules
                            .slice(0, 2)
                            .map((schedule) => (
                              <div
                                key={schedule.id}
                                className="truncate rounded-md border border-lime-400/10 bg-lime-400/5 px-1.5 py-1 text-[10px] text-lime-200"
                              >
                                {schedule.program.name}
                              </div>
                            ))}

                          {daySchedules.length > 2 && (
                            <div className="px-1.5 text-[10px] text-neutral-500">
                              +
                              {daySchedules.length -
                                2}{" "}
                              more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="border-b border-neutral-800 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Selected Date
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    {formatDate(
                      dateKeyToISO(selectedDate)
                    )}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                  title="Refresh"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>

            <div className="p-4">
              {selectedDateSchedules.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-neutral-700 px-4 py-8 text-center">
                  <CalendarDays
                    size={28}
                    className="mx-auto text-neutral-600"
                  />

                  <p className="mt-3 text-sm font-medium text-neutral-300">
                    No schedule for this date
                  </p>

                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    Create a centralized schedule
                    before creating a branch
                    broadcast.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openCreateModal(selectedDate)
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-lime-400 px-3 py-2 text-xs font-semibold text-neutral-950 hover:bg-lime-300"
                  >
                    <Plus size={15} />
                    Create Schedule
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateSchedules.map(
                    (schedule) => (
                      <div
                        key={schedule.id}
                        className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-white">
                              {schedule.program.name}
                            </h3>

                            {schedule.program
                              .intensity && (
                              <p className="mt-1 text-xs text-lime-300">
                                {
                                  schedule.program
                                    .intensity
                                }
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  schedule
                                )
                              }
                              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                              title="Edit"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              type="button"
                              disabled={
                                deletingId ===
                                schedule.id
                              }
                              onClick={() =>
                                void deleteSchedule(
                                  schedule
                                )
                              }
                              className="rounded-lg p-2 text-neutral-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId ===
                              schedule.id ? (
                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-neutral-900 p-2">
                            <p className="text-[10px] uppercase text-neutral-500">
                              Exercises
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {
                                schedule.exercises
                                  .length
                              }
                            </p>
                          </div>

                          <div className="rounded-lg bg-neutral-900 p-2">
                            <p className="text-[10px] uppercase text-neutral-500">
                              Sets
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {schedule.sets ??
                                "—"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                          <Clock3 size={14} />
                          Work:{" "}
                          {formatDuration(
                            schedule.workSeconds
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-200">
                Centralized scheduling
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                These schedules are independent of
                branch assignments. Broadcasts copy
                their data and can then be edited per
                branch.
              </p>
            </div>

            <div className="flex items-center gap-5 text-xs text-neutral-500">
              <span>
                Programs:{" "}
                <strong className="text-neutral-300">
                  {activePrograms.length}
                </strong>
              </span>

              <span>
                Videos:{" "}
                <strong className="text-neutral-300">
                  {activeVideos.length}
                </strong>
              </span>

              <span>
                Schedules:{" "}
                <strong className="text-neutral-300">
                  {schedules.length}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm lg:p-8">
          <div className="my-auto w-full max-w-5xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4 lg:px-6">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingScheduleId
                    ? "Edit Workout Schedule"
                    : "New Workout Schedule"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Build the centralized schedule
                  that broadcasts will copy from.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveSchedule}>
              <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.2fr] lg:p-6">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Schedule Date
                    </label>

                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) =>
                        setSelectedDate(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Workout Program
                    </label>

                    <select
                      value={programId}
                      onChange={(event) =>
                        setProgramId(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-sm text-white outline-none focus:border-lime-400"
                    >
                      <option value="">
                        Select program
                      </option>

                      {activePrograms.map(
                        (program) => (
                          <option
                            key={program.id}
                            value={program.id}
                          >
                            {program.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {selectedProgram && (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400">
                          <Film size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium">
                            {selectedProgram.name}
                          </p>

                          {selectedProgram.subtitle && (
                            <p className="mt-1 text-xs text-neutral-400">
                              {
                                selectedProgram.subtitle
                              }
                            </p>
                          )}

                          <p className="mt-2 text-xs text-neutral-500">
                            {
                              selectedProgram.items
                                .length
                            }{" "}
                            program videos
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          loadProgramExercises
                        }
                        className="mt-3 w-full rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 hover:border-lime-400/40 hover:text-lime-300"
                      >
                        Use Program Exercises
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Timer Settings
                      </label>

                      <Clock3
                        size={15}
                        className="text-neutral-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {TIMER_FIELDS.map(
                        (field) => (
                          <div key={field.key}>
                            <label className="mb-1.5 block text-xs text-neutral-400">
                              {field.label}
                            </label>

                            <input
                              type="number"
                              min="0"
                              value={
                                timerValues[
                                  field.key
                                ] ?? ""
                              }
                              onChange={(event) =>
                                updateTimer(
                                  field.key,
                                  event.target.value
                                )
                              }
                              placeholder="Seconds"
                              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Next Session Starts At
                    </label>

                    <input
                      type="datetime-local"
                      value={nextSessionStartsAt}
                      onChange={(event) =>
                        setNextSessionStartsAt(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-sm text-white outline-none focus:border-lime-400"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        Schedule Exercises
                      </h3>

                      <p className="mt-1 text-xs text-neutral-500">
                        Select library videos or add
                        manual exercise names.
                      </p>
                    </div>

                    <span className="rounded-full bg-lime-400/10 px-2.5 py-1 text-xs font-semibold text-lime-300">
                      {exercises.length}
                    </span>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
                      />

                      <input
                        value={exerciseSearch}
                        onChange={(event) =>
                          setExerciseSearch(
                            event.target.value
                          )
                        }
                        placeholder="Search library exercises..."
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-lime-400"
                      />
                    </div>

                    <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                      {filteredVideos.length ===
                      0 ? (
                        <p className="px-2 py-5 text-center text-xs text-neutral-600">
                          No matching videos.
                        </p>
                      ) : (
                        filteredVideos
                          .slice(0, 30)
                          .map((video) => (
                            <button
                              type="button"
                              key={video.id}
                              onClick={() =>
                                addVideoExercise(
                                  video
                                )
                              }
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-neutral-800"
                            >
                              <span className="truncate text-xs text-neutral-300">
                                {video.name}
                              </span>

                              <Plus
                                size={14}
                                className="shrink-0 text-neutral-600"
                              />
                            </button>
                          ))
                      )}
                    </div>

                    <div className="mt-3 border-t border-neutral-800 pt-3">
                      <div className="flex gap-2">
                        <input
                          value={manualExerciseName}
                          onChange={(event) =>
                            setManualExerciseName(
                              event.target.value
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter"
                            ) {
                              event.preventDefault();
                              addManualExercise();
                            }
                          }}
                          placeholder="Manual exercise name"
                          className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-xs text-white outline-none focus:border-lime-400"
                        />

                        <button
                          type="button"
                          onClick={
                            addManualExercise
                          }
                          className="rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 hover:border-lime-400/40 hover:text-lime-300"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {exercises.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-neutral-800 px-4 py-10 text-center">
                        <Film
                          size={25}
                          className="mx-auto text-neutral-700"
                        />

                        <p className="mt-3 text-sm text-neutral-400">
                          No exercises selected
                        </p>

                        <p className="mt-1 text-xs text-neutral-600">
                          Add videos from the library
                          or enter manual exercise
                          names.
                        </p>
                      </div>
                    ) : (
                      exercises.map(
                        (exercise, index) => {
                          const video =
                            exercise.videoId
                              ? videos.find(
                                  (item) =>
                                    item.id ===
                                    exercise.videoId
                                )
                              : null;

                          return (
                            <div
                              key={exercise.id}
                              className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-xs font-semibold text-neutral-400">
                                {index + 1}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-neutral-200">
                                  {video?.name ??
                                    exercise.exerciseName}
                                </p>

                                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-600">
                                  {video
                                    ? "Library Video"
                                    : "Manual Exercise"}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  disabled={
                                    index === 0
                                  }
                                  onClick={() =>
                                    moveExercise(
                                      index,
                                      "UP"
                                    )
                                  }
                                  className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-20"
                                >
                                  ↑
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    index ===
                                    exercises.length -
                                      1
                                  }
                                  onClick={() =>
                                    moveExercise(
                                      index,
                                      "DOWN"
                                    )
                                  }
                                  className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-20"
                                >
                                  ↓
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeExercise(
                                      exercise.id
                                    )
                                  }
                                  className="rounded-md p-1.5 text-neutral-600 hover:bg-red-500/10 hover:text-red-300"
                                >
                                  <Trash2
                                    size={14}
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-neutral-800 px-5 py-4 sm:flex-row sm:justify-end lg:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      {editingScheduleId
                        ? "Update Schedule"
                        : "Create Schedule"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}