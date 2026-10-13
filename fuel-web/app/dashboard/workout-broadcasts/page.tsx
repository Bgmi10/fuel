"use client";

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  Film,
  Loader2,
  Monitor,
  Play,
  Plus,
  RefreshCw,
  Search,
  TimerReset,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Branch = {
  id: string;
  name: string;
  tvDevices?: TvDevice[];
};

type TvDevice = {
  id: string;
  name: string;
  isOnline: boolean;
  branchId: string;
};

type WorkoutVideo = {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  isActive: boolean;
};

type ScheduleExercise = {
  id: string;
  videoId: string | null;
  exerciseName: string | null;
  sortOrder: number;
  video: WorkoutVideo | null;
};

type WorkoutProgram = {
  id: string;
  name: string;
  subtitle?: string | null;
  description: string | null;
  intensity?: string | null;
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

type BroadcastMode = "SCHEDULE" | "TIMER_ONLY";

type BroadcastStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

type BroadcastExercise = {
  id: string;
  videoId: string | null;
  exerciseName: string | null;
  sortOrder: number;
  video: WorkoutVideo | null;
};

type BroadcastTVExercise = {
  id: string;
  exerciseId: string;
  sortOrder: number;
};

type BroadcastTV = {
  id: string;
  tvDeviceId: string;
  tvDevice: TvDevice;
  exercises: BroadcastTVExercise[];
};

type WorkoutBroadcast = {
  id: string;
  branchId: string;
  date: string;
  scheduleId: string | null;

  mode: BroadcastMode;
  status: BroadcastStatus;

  title: string | null;
  subtitle: string | null;
  description: string | null;
  intensity: string | null;

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

  schedule?: WorkoutSchedule | null;
  exercises: BroadcastExercise[];
  tvs: BroadcastTV[];
};

type BranchesResponse =
  | Branch[]
  | {
      success?: boolean;
      branches?: Branch[];
      message?: string;
      error?: string;
    };

type TimerValues = {
  demonstrationSeconds: string;
  warmupSeconds: string;
  prepareSeconds: string;
  workSeconds: string;
  restSeconds: string;
  sets: string;
  cycles: string;
  restBetweenCycleSeconds: string;
  coolDownSeconds: string;
  nextSessionStartsAt: string;
};

const emptyTimers: TimerValues = {
  demonstrationSeconds: "",
  warmupSeconds: "",
  prepareSeconds: "",
  workSeconds: "",
  restSeconds: "",
  sets: "",
  cycles: "",
  restBetweenCycleSeconds: "",
  coolDownSeconds: "",
  nextSessionStartsAt: "",
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function dateOnly(dateString: string) {
  const date = new Date(dateString);

  return dateKey(date);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatTime(dateString: string | null) {
  if (!dateString) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function timerFromSchedule(
  schedule: WorkoutSchedule | null
): TimerValues {
  if (!schedule) {
    return { ...emptyTimers };
  }

  return {
    demonstrationSeconds:
      schedule.demonstrationSeconds?.toString() ?? "",
    warmupSeconds: schedule.warmupSeconds?.toString() ?? "",
    prepareSeconds: schedule.prepareSeconds?.toString() ?? "",
    workSeconds: schedule.workSeconds?.toString() ?? "",
    restSeconds: schedule.restSeconds?.toString() ?? "",
    sets: schedule.sets?.toString() ?? "",
    cycles: schedule.cycles?.toString() ?? "",
    restBetweenCycleSeconds:
      schedule.restBetweenCycleSeconds?.toString() ?? "",
    coolDownSeconds:
      schedule.coolDownSeconds?.toString() ?? "",
    nextSessionStartsAt: toDateTimeLocal(
      schedule.nextSessionStartsAt
    ),
  };
}

function timerFromBroadcast(
  broadcast: WorkoutBroadcast
): TimerValues {
  return {
    demonstrationSeconds:
      broadcast.demonstrationSeconds?.toString() ?? "",
    warmupSeconds: broadcast.warmupSeconds?.toString() ?? "",
    prepareSeconds: broadcast.prepareSeconds?.toString() ?? "",
    workSeconds: broadcast.workSeconds?.toString() ?? "",
    restSeconds: broadcast.restSeconds?.toString() ?? "",
    sets: broadcast.sets?.toString() ?? "",
    cycles: broadcast.cycles?.toString() ?? "",
    restBetweenCycleSeconds:
      broadcast.restBetweenCycleSeconds?.toString() ?? "",
    coolDownSeconds:
      broadcast.coolDownSeconds?.toString() ?? "",
    nextSessionStartsAt: toDateTimeLocal(
      broadcast.nextSessionStartsAt
    ),
  };
}

function timersToPayload(timers: TimerValues) {
  const integerOrNull = (value: string) => {
    if (!value.trim()) {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return null;
    }

    return Math.max(0, Math.round(parsed));
  };

  return {
    demonstrationSeconds: integerOrNull(
      timers.demonstrationSeconds
    ),
    warmupSeconds: integerOrNull(timers.warmupSeconds),
    prepareSeconds: integerOrNull(timers.prepareSeconds),
    workSeconds: integerOrNull(timers.workSeconds),
    restSeconds: integerOrNull(timers.restSeconds),
    sets: integerOrNull(timers.sets),
    cycles: integerOrNull(timers.cycles),
    restBetweenCycleSeconds: integerOrNull(
      timers.restBetweenCycleSeconds
    ),
    coolDownSeconds: integerOrNull(
      timers.coolDownSeconds
    ),
    nextSessionStartsAt: fromDateTimeLocal(
      timers.nextSessionStartsAt
    ),
  };
}

function getCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const firstDay = new Date(year, monthIndex, 1);
  const startDay = firstDay.getDay();

  const daysInMonth = new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();

  const previousMonthDays = new Date(
    year,
    monthIndex,
    0
  ).getDate();

  const cells: Date[] = [];

  for (let index = startDay - 1; index >= 0; index--) {
    cells.push(
      new Date(
        year,
        monthIndex - 1,
        previousMonthDays - index
      )
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, monthIndex, day));
  }

  while (cells.length < 42) {
    cells.push(
      new Date(
        year,
        monthIndex + 1,
        cells.length - daysInMonth - startDay + 1
      )
    );
  }

  return cells;
}

function statusClasses(status: BroadcastStatus) {
  switch (status) {
    case "LIVE":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "SCHEDULED":
      return "bg-lime-400/10 text-lime-400 border-lime-400/20";
    case "COMPLETED":
      return "bg-blue-400/10 text-blue-400 border-blue-400/20";
    case "CANCELLED":
      return "bg-zinc-700/30 text-zinc-500 border-zinc-700";
    default:
      return "bg-yellow-400/10 text-yellow-400 border-yellow-400/20";
  }
}

function extractBranches(payload: BranchesResponse) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.branches ?? [];
}

/**
 * API response helpers
 *
 * The current centralized schedule APIs return:
 *
 * GET /api/workout-schedules
 * -> WorkoutSchedule[]
 *
 * GET /api/workout-schedules/[id]
 * -> WorkoutSchedule
 *
 * We still support the older wrapped shape as a fallback.
 */

function extractSchedules(payload: unknown): WorkoutSchedule[] {
  if (Array.isArray(payload)) {
    return payload as WorkoutSchedule[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const record = payload as Record<
      string,
      unknown
    >;

    if (Array.isArray(record.schedules)) {
      return record.schedules as WorkoutSchedule[];
    }
  }

  return [];
}

function extractSchedule(
  payload: unknown
): WorkoutSchedule | null {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    const record = payload as Record<
      string,
      unknown
    >;

    if (
      record.schedule &&
      typeof record.schedule === "object"
    ) {
      return record.schedule as WorkoutSchedule;
    }

    if (typeof record.id === "string") {
      return payload as WorkoutSchedule;
    }
  }

  return null;
}

function extractApiError(
  payload: unknown,
  fallback: string
) {
  if (
    payload &&
    typeof payload === "object"
  ) {
    const record = payload as Record<
      string,
      unknown
    >;

    if (typeof record.error === "string") {
      return record.error;
    }

    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return fallback;
}

function extractBroadcasts(
  payload: unknown
): WorkoutBroadcast[] {
  if (Array.isArray(payload)) {
    return payload as WorkoutBroadcast[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const record = payload as Record<
      string,
      unknown
    >;

    if (Array.isArray(record.broadcasts)) {
      return record.broadcasts as WorkoutBroadcast[];
    }
  }

  return [];
}

function extractBroadcast(
  payload: unknown
): WorkoutBroadcast | null {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    const record = payload as Record<
      string,
      unknown
    >;

    if (
      record.broadcast &&
      typeof record.broadcast === "object"
    ) {
      return record.broadcast as WorkoutBroadcast;
    }

    if (typeof record.id === "string") {
      return payload as WorkoutBroadcast;
    }
  }

  return null;
}

export default function WorkoutBroadcastsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [schedules, setSchedules] = useState<WorkoutSchedule[]>(
    []
  );
  const [broadcasts, setBroadcasts] = useState<
    WorkoutBroadcast[]
  >([]);

  const [selectedBranchId, setSelectedBranchId] =
    useState("");

  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date()
  );

  const [selectedDate, setSelectedDate] = useState(
    () => dateKey(new Date())
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] =
    useState<WorkoutBroadcast | null>(null);

  const [formMode, setFormMode] =
    useState<BroadcastMode>("SCHEDULE");

  const [selectedScheduleId, setSelectedScheduleId] =
    useState("");

  const [selectedSchedule, setSelectedSchedule] =
    useState<WorkoutSchedule | null>(null);

  const [broadcastTitle, setBroadcastTitle] =
    useState("");
  const [broadcastSubtitle, setBroadcastSubtitle] =
    useState("");
  const [broadcastDescription, setBroadcastDescription] =
    useState("");
  const [broadcastIntensity, setBroadcastIntensity] =
    useState("");

  const [timers, setTimers] =
    useState<TimerValues>(emptyTimers);

  const [broadcastExercises, setBroadcastExercises] =
    useState<ScheduleExercise[]>([]);

  const [selectedTvIds, setSelectedTvIds] = useState<
    string[]
  >([]);

  const [tvExerciseIds, setTvExerciseIds] = useState<
    Record<string, string[]>
  >({});

  const [previewBroadcast, setPreviewBroadcast] =
    useState<WorkoutBroadcast | null>(null);

  const activeBranch = useMemo(
    () =>
      branches.find(
        (branch) => branch.id === selectedBranchId
      ) ?? null,
    [branches, selectedBranchId]
  );

  const branchTvs = useMemo(
    () => activeBranch?.tvDevices ?? [],
    [activeBranch]
  );

  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth),
    [calendarMonth]
  );

  const broadcastsByDate = useMemo(() => {
    const map = new Map<string, WorkoutBroadcast[]>();

    for (const broadcast of broadcasts) {
      const key = dateOnly(broadcast.date);
      const existing = map.get(key) ?? [];

      existing.push(broadcast);
      map.set(key, existing);
    }

    return map;
  }, [broadcasts]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, WorkoutSchedule[]>();

    for (const schedule of schedules) {
      const key = dateOnly(schedule.date);
      const existing = map.get(key) ?? [];

      existing.push(schedule);
      map.set(key, existing);
    }

    return map;
  }, [schedules]);

  const selectedDateBroadcasts =
    broadcastsByDate.get(selectedDate) ?? [];

  const selectedDateSchedules =
    schedulesByDate.get(selectedDate) ?? [];

  const loadBranches = useCallback(async () => {
    const response = await fetch("/api/branches", {
      cache: "no-store",
    });

    const payload =
      (await response.json()) as BranchesResponse;

    if (!response.ok) {
      throw new Error(
        extractApiError(
          payload,
          "Unable to load branches."
        )
      );
    }

    const nextBranches = extractBranches(payload);

    setBranches(nextBranches);

    if (
      nextBranches.length > 0 &&
      !selectedBranchId
    ) {
      setSelectedBranchId(nextBranches[0].id);
    }

    return nextBranches;
  }, [selectedBranchId]);

  const loadBranchData = useCallback(
    async (branchId: string) => {
      if (!branchId) {
        return;
      }

      const monthStart = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        1
      );

      const monthEnd = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      const from = monthStart.toISOString();
      const to = monthEnd.toISOString();

      const [schedulesResponse, broadcastsResponse] =
        await Promise.all([
          fetch(
            `/api/workout-schedules?from=${encodeURIComponent(
              from
            )}&to=${encodeURIComponent(to)}`,
            {
              cache: "no-store",
            }
          ),
          fetch(
            `/api/workout-broadcasts?branchId=${encodeURIComponent(
              branchId
            )}&from=${encodeURIComponent(
              from
            )}&to=${encodeURIComponent(to)}`,
            {
              cache: "no-store",
            }
          ),
        ]);

      const schedulesPayload =
        await schedulesResponse.json();

      const broadcastsPayload =
        await broadcastsResponse.json();

      if (!schedulesResponse.ok) {
        throw new Error(
          extractApiError(
            schedulesPayload,
            "Unable to load workout schedules."
          )
        );
      }

      if (!broadcastsResponse.ok) {
        throw new Error(
          extractApiError(
            broadcastsPayload,
            "Unable to load broadcasts."
          )
        );
      }

      /*
       * IMPORTANT:
       * /api/workout-schedules currently returns the
       * schedule array directly.
       *
       * Previously this page was doing:
       *
       * schedulesPayload.schedules
       *
       * which resulted in [].
       */
      setSchedules(
        extractSchedules(schedulesPayload)
      );

      setBroadcasts(
        extractBroadcasts(broadcastsPayload)
      );
    },
    [calendarMonth]
  );

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const nextBranches = await loadBranches();

      const branchId =
        selectedBranchId || nextBranches[0]?.id;

      if (branchId) {
        await loadBranchData(branchId);
      } else {
        setSchedules([]);
        setBroadcasts([]);
      }
    } catch (loadError) {
      console.error(
        "Load workout broadcasts error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load workout broadcasts."
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    loadBranches,
    loadBranchData,
    selectedBranchId,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedBranchId) {
      return;
    }

    void loadBranchData(selectedBranchId).catch(
      (loadError) => {
        console.error(
          "Reload broadcast calendar error:",
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to reload broadcasts."
        );
      }
    );
  }, [calendarMonth, selectedBranchId, loadBranchData]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function changeMonth(offset: number) {
    setCalendarMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + offset,
          1
        )
    );
  }

  function selectCalendarDate(date: Date) {
    setSelectedDate(dateKey(date));
  }

  function openCreate(date = selectedDate) {
    clearMessages();

    setEditingBroadcast(null);
    setFormMode("SCHEDULE");
    setSelectedScheduleId("");
    setSelectedSchedule(null);

    setBroadcastTitle("");
    setBroadcastSubtitle("");
    setBroadcastDescription("");
    setBroadcastIntensity("");

    setTimers({ ...emptyTimers });

    setBroadcastExercises([]);

    setSelectedTvIds([]);
    setTvExerciseIds({});

    setSelectedDate(date);
    setIsFormOpen(true);
  }

  async function openEdit(
    broadcast: WorkoutBroadcast
  ) {
    clearMessages();
  
    try {
      setUpdatingId(broadcast.id);
  
      const broadcastResponse = await fetch(
        `/api/workout-broadcasts/${broadcast.id}`,
        {
          cache: "no-store",
        }
      );
  
      const broadcastPayload =
        await broadcastResponse.json();
  
      if (!broadcastResponse.ok) {
        throw new Error(
          extractApiError(
            broadcastPayload,
            "Unable to load broadcast."
          )
        );
      }
  
      const fullBroadcast =
        extractBroadcast(broadcastPayload);
  
      if (!fullBroadcast) {
        throw new Error(
          "Unable to load broadcast."
        );
      }
  
      /*
       * A broadcast stores only scheduleId as its source
       * reference. The broadcast GET endpoint intentionally
       * does not need to return the complete Schedule.
       *
       * When editing, load the centralized Schedule separately
       * so selectedSchedule contains:
       *
       * - program
       * - exercises
       * - timer values
       *
       * Broadcast values remain the editable snapshot.
       */
      let sourceSchedule: WorkoutSchedule | null =
        null;
  
      if (
        fullBroadcast.mode === "SCHEDULE" &&
        fullBroadcast.scheduleId
      ) {
        const scheduleResponse = await fetch(
          `/api/workout-schedules/${fullBroadcast.scheduleId}`,
          {
            cache: "no-store",
          }
        );
  
        const schedulePayload =
          await scheduleResponse.json();
  
        if (!scheduleResponse.ok) {
          throw new Error(
            extractApiError(
              schedulePayload,
              "Unable to load the source workout schedule."
            )
          );
        }
  
        sourceSchedule =
          extractSchedule(schedulePayload);
  
        if (!sourceSchedule) {
          throw new Error(
            "The source workout schedule could not be loaded."
          );
        }
      }
  
      setEditingBroadcast(fullBroadcast);
  
      setFormMode(fullBroadcast.mode);
  
      setSelectedScheduleId(
        fullBroadcast.scheduleId ?? ""
      );
  
      /*
       * IMPORTANT:
       *
       * Do not use fullBroadcast.schedule here.
       *
       * The broadcast API returns only a lightweight
       * schedule reference.
       *
       * Use the fully loaded centralized schedule instead.
       */
      setSelectedSchedule(sourceSchedule);
  
      setBroadcastTitle(
        fullBroadcast.title ?? ""
      );
  
      setBroadcastSubtitle(
        fullBroadcast.subtitle ?? ""
      );
  
      setBroadcastDescription(
        fullBroadcast.description ?? ""
      );
  
      setBroadcastIntensity(
        fullBroadcast.intensity ?? ""
      );
  
      /*
       * Timers come from the Broadcast because these
       * are the editable broadcast snapshot values.
       *
       * We must NOT replace them with Schedule timers
       * when editing an existing broadcast.
       */
      setTimers(
        timerFromBroadcast(fullBroadcast)
      );
  
      /*
       * Exercises also come from the Broadcast because
       * these are the copied/editable broadcast exercises.
       *
       * We must NOT overwrite them with Schedule exercises.
       */
      const exercises =
        fullBroadcast.exercises.map((exercise) => ({
          id: exercise.id,
          videoId: exercise.videoId,
          exerciseName: exercise.exerciseName,
          sortOrder: exercise.sortOrder,
          video: exercise.video,
        })) as ScheduleExercise[];
  
      setBroadcastExercises(exercises);
  
      const tvIds = fullBroadcast.tvs.map(
        (tv) => tv.tvDeviceId
      );
  
      setSelectedTvIds(tvIds);
  
      const nextTvExerciseIds: Record<
        string,
        string[]
      > = {};
  
      for (const tv of fullBroadcast.tvs) {
        nextTvExerciseIds[tv.tvDeviceId] =
          tv.exercises
            .slice()
            .sort(
              (first, second) =>
                first.sortOrder -
                second.sortOrder
            )
            .map((item) => item.exerciseId);
      }
  
      setTvExerciseIds(nextTvExerciseIds);
  
      /*
       * Keep the broadcast's own date.
       *
       * This is important because Broadcast.date is
       * branch-level data and may differ from the
       * centralized Schedule date.
       */
      setSelectedDate(
        dateOnly(fullBroadcast.date)
      );
  
      setIsFormOpen(true);
    } catch (loadError) {
      console.error(
        "Open broadcast error:",
        loadError
      );
  
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to open broadcast."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function loadSchedule(scheduleId: string) {
    setSelectedScheduleId(scheduleId);

    if (!scheduleId) {
      setSelectedSchedule(null);
      setBroadcastTitle("");
      setBroadcastSubtitle("");
      setBroadcastDescription("");
      setBroadcastIntensity("");
      setTimers({ ...emptyTimers });
      setBroadcastExercises([]);
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/workout-schedules/${scheduleId}`,
        {
          cache: "no-store",
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          extractApiError(
            payload,
            "Unable to load selected schedule."
          )
        );
      }

      /*
       * IMPORTANT:
       * /api/workout-schedules/[id] returns the
       * schedule object directly.
       *
       * Previously this page expected:
       *
       * payload.schedule
       */
      const schedule =
        extractSchedule(payload);

      if (!schedule) {
        throw new Error(
          "Unable to load selected schedule."
        );
      }

      setSelectedSchedule(schedule);

      setSelectedDate(dateOnly(schedule.date));

      setBroadcastTitle(
        schedule.program.name ?? ""
      );
      setBroadcastSubtitle(
        schedule.program.subtitle ?? ""
      );
      setBroadcastDescription(
        schedule.program.description ?? ""
      );
      setBroadcastIntensity(
        schedule.program.intensity ?? ""
      );

      setTimers(timerFromSchedule(schedule));

      setBroadcastExercises(
        schedule.exercises
          .slice()
          .sort(
            (first, second) =>
              first.sortOrder - second.sortOrder
          )
      );

      setSelectedTvIds([]);
      setTvExerciseIds({});
    } catch (loadError) {
      console.error(
        "Load schedule error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load schedule."
      );
    }
  }

  function toggleTv(tvId: string) {
    setSelectedTvIds((current) => {
      if (current.includes(tvId)) {
        const next = current.filter(
          (id) => id !== tvId
        );

        setTvExerciseIds((existing) => {
          const copy = { ...existing };
          delete copy[tvId];
          return copy;
        });

        return next;
      }

      setTvExerciseIds((existing) => ({
        ...existing,
        [tvId]: broadcastExercises.map(
          (exercise) => exercise.id
        ),
      }));

      return [...current, tvId];
    });
  }

  function toggleTvExercise(
    tvId: string,
    exerciseId: string
  ) {
    setTvExerciseIds((current) => {
      const selected = current[tvId] ?? [];

      const next = selected.includes(exerciseId)
        ? selected.filter(
            (id) => id !== exerciseId
          )
        : [...selected, exerciseId];

      return {
        ...current,
        [tvId]: next,
      };
    });
  }

  function selectAllTvExercises(tvId: string) {
    setTvExerciseIds((current) => ({
      ...current,
      [tvId]: broadcastExercises.map(
        (exercise) => exercise.id
      ),
    }));
  }

  function clearTvExercises(tvId: string) {
    setTvExerciseIds((current) => ({
      ...current,
      [tvId]: [],
    }));
  }

  
async function syncTvExerciseMappings(
    broadcastId: string,
    tvMappings: BroadcastTV[],
    savedExercises: BroadcastExercise[]
  ) {
    const orderedFormExercises = broadcastExercises
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);
  
    const orderedSavedExercises = savedExercises
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);
  
    for (const mapping of tvMappings) {
      const selectedFormIds =
        tvExerciseIds[mapping.tvDeviceId] ?? [];
  
      const exerciseIds = selectedFormIds
        .map((formExerciseId) => {
          const index = orderedFormExercises.findIndex(
            (exercise) => exercise.id === formExerciseId
          );
  
          return index >= 0
            ? orderedSavedExercises[index]?.id
            : undefined;
        })
        .filter((exerciseId): exerciseId is string =>
          Boolean(exerciseId)
        );
  
      const response = await fetch(
        `/api/workout-broadcasts/${mapping.id}/tvs/${mapping.tvDeviceId}/exercises`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ exerciseIds }),
        }
      );
  
      const payload = await response.json();
  
      if (!response.ok || payload?.success === false) {
        throw new Error(
          payload?.error ||
            payload?.message ||
            "Unable to save TV exercise selection."
        );
      }
    }
  
    void broadcastId;
  }
  

  async function saveBroadcast(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessages();

    if (!selectedBranchId) {
      setError("Select a branch.");
      return;
    }

    if (!selectedDate) {
      setError("Select a broadcast date.");
      return;
    }

    if (
      formMode === "SCHEDULE" &&
      !selectedScheduleId
    ) {
      setError("Select a workout schedule.");
      return;
    }

    if (
      formMode === "SCHEDULE" &&
      broadcastExercises.length === 0
    ) {
      setError(
        "The selected schedule has no exercises."
      );
      return;
    }

    try {
      setIsSaving(true);

      const date = new Date(
        `${selectedDate}T00:00:00`
      );

      if (Number.isNaN(date.getTime())) {
        throw new Error(
          "Select a valid broadcast date."
        );
      }

      const timerPayload =
        timersToPayload(timers);

      const exercisePayload =
        broadcastExercises.map(
          (exercise, index) => ({
            videoId: exercise.videoId,
            exerciseName: exercise.exerciseName,
            sortOrder: index,
          })
        );

      const tvs = selectedTvIds.map(
        (tvDeviceId) => ({
          tvDeviceId,
        })
      );

      const body = {
        branchId: selectedBranchId,
        date: date.toISOString(),
        scheduleId:
          formMode === "SCHEDULE"
            ? selectedScheduleId
            : null,
        mode: formMode,

        title:
          broadcastTitle.trim() || null,
        subtitle:
          broadcastSubtitle.trim() || null,
        description:
          broadcastDescription.trim() || null,
        intensity:
          broadcastIntensity.trim() || null,

        ...timerPayload,

        exercises:
          formMode === "SCHEDULE"
            ? exercisePayload
            : [],

        tvs,
      };

      const response = await fetch(
        editingBroadcast
          ? `/api/workout-broadcasts/${editingBroadcast.id}`
          : "/api/workout-broadcasts",
        {
          method: editingBroadcast
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          extractApiError(
            payload,
            "Unable to save broadcast."
          )
        );
      }

      const savedBroadcast =
        extractBroadcast(payload);

      if (!savedBroadcast) {
        throw new Error(
          "Broadcast was saved but the server returned an invalid response."
        );
      }

      if (
        selectedTvIds.length > 0 &&
        savedBroadcast.tvs
      ) {
        
await syncTvExerciseMappings(
    savedBroadcast.id,
    savedBroadcast.tvs,
    savedBroadcast.exercises
  );
  
      }

      setSuccess(
        editingBroadcast
          ? "Broadcast updated successfully."
          : "Broadcast created successfully."
      );

      setIsFormOpen(false);
      setEditingBroadcast(null);

      await loadBranchData(selectedBranchId);
    } catch (saveError) {
      console.error(
        "Save workout broadcast error:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save broadcast."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteBroadcast(
    broadcast: WorkoutBroadcast
  ) {
    if (broadcast.status === "LIVE") {
      setError(
        "A live broadcast cannot be deleted."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete this ${
        broadcast.mode === "SCHEDULE"
          ? "schedule"
          : "timer-only"
      } broadcast?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(broadcast.id);
      clearMessages();

      const response = await fetch(
        `/api/workout-broadcasts/${broadcast.id}`,
        {
          method: "DELETE",
        }
      );

      const payload = await response.json();

      if (!response.ok || payload?.success === false) {
        throw new Error(
          payload?.error ||
            payload?.message ||
            "Unable to delete broadcast."
        );
      }

      setSuccess(
        "Broadcast deleted successfully."
      );

      await loadBranchData(selectedBranchId);
    } catch (deleteError) {
      console.error(
        "Delete broadcast error:",
        deleteError
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete broadcast."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function startBroadcast(
    broadcast: WorkoutBroadcast
  ) {
    if (broadcast.tvs.length === 0) {
      setError(
        "Select at least one TV before starting the broadcast."
      );
      return;
    }

    try {
      setUpdatingId(broadcast.id);
      clearMessages();

      const response = await fetch(
        `/api/workout-broadcasts/${broadcast.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "LIVE",
          }),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          extractApiError(
            payload,
            "Unable to start broadcast."
          )
        );
      }

      setSuccess(
        "Broadcast started successfully."
      );

      await loadBranchData(selectedBranchId);
    } catch (startError) {
      console.error(
        "Start broadcast error:",
        startError
      );

      setError(
        startError instanceof Error
          ? startError.message
          : "Unable to start broadcast."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function renderTimerInput(
    label: string,
    key: keyof TimerValues,
    suffix = "sec"
  ) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          {label}
        </label>

        <div className="relative">
          <input
            type={
              key === "nextSessionStartsAt"
                ? "datetime-local"
                : "number"
            }
            min={
              key === "nextSessionStartsAt"
                ? undefined
                : 0
            }
            value={timers[key]}
            onChange={(event) =>
              setTimers((current) => ({
                ...current,
                [key]: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-lime-400"
          />

          {key !== "nextSessionStartsAt" && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
              {suffix}
            </span>
          )}
        </div>
      </div>
    );
  }

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

            <h1 className="text-2xl font-semibold tracking-tight">
              Workout Broadcasts
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Create branch-wise broadcasts from centralized
              workout schedules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBranchId}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                setSelectedDate(
                  dateKey(new Date())
                );
                clearMessages();
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
            >
              <option value="">
                Select branch
              </option>

              {branches.map((branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  isLoading
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => openCreate()}
              disabled={!selectedBranchId}
              className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={17} />
              New Broadcast
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-lime-400/20 bg-lime-400/10 px-4 py-3 text-sm text-lime-400">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Calendar */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-semibold">
                  {new Intl.DateTimeFormat(
                    "en-IN",
                    {
                      month: "long",
                      year: "numeric",
                    }
                  ).format(calendarMonth)}
                </h2>

                <p className="mt-0.5 text-xs text-zinc-500">
                  Broadcast calendar
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      new Date()
                    )
                  }
                  className="rounded-md px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-zinc-800">
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
                  className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-600"
                >
                  {day}
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="flex min-h-[580px] items-center justify-center">
                <Loader2
                  className="animate-spin text-lime-400"
                  size={26}
                />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {calendarDays.map((date, index) => {
                  const key = dateKey(date);
                  const isCurrentMonth =
                    date.getMonth() ===
                    calendarMonth.getMonth();

                  const isSelected =
                    key === selectedDate;

                  const isToday =
                    key ===
                    dateKey(new Date());

                  const dayBroadcasts =
                    broadcastsByDate.get(key) ?? [];

                  const daySchedules =
                    schedulesByDate.get(key) ?? [];

                  return (
                    <button
                      type="button"
                      key={`${key}-${index}`}
                      onClick={() =>
                        selectCalendarDate(date)
                      }
                      className={`min-h-[105px] border-b border-r border-zinc-800 p-2 text-left transition ${
                        isSelected
                          ? "bg-lime-400/[0.06]"
                          : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                            isToday
                              ? "bg-lime-400 text-black"
                              : isSelected
                              ? "border border-lime-400/40 text-lime-400"
                              : isCurrentMonth
                              ? "text-zinc-300"
                              : "text-zinc-700"
                          }`}
                        >
                          {date.getDate()}
                        </span>

                        {daySchedules.length > 0 && (
                          <span className="text-[10px] text-zinc-600">
                            {daySchedules.length} schedule
                            {daySchedules.length !== 1
                              ? "s"
                              : ""}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayBroadcasts
                          .slice(0, 3)
                          .map((broadcast) => (
                            <div
                              key={broadcast.id}
                              className={`truncate rounded border px-1.5 py-1 text-[10px] ${statusClasses(
                                broadcast.status
                              )}`}
                            >
                              {broadcast.title ||
                                (broadcast.mode ===
                                "TIMER_ONLY"
                                  ? "Timer Only"
                                  : "Workout Broadcast")}
                            </div>
                          ))}

                        {dayBroadcasts.length >
                          3 && (
                          <div className="px-1 text-[10px] text-zinc-600">
                            +
                            {dayBroadcasts.length -
                              3}{" "}
                            more
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
            <div className="border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">
                    {new Intl.DateTimeFormat(
                      "en-IN",
                      {
                        weekday: "long",
                        day: "2-digit",
                        month: "short",
                      }
                    ).format(
                      new Date(
                        `${selectedDate}T12:00:00`
                      )
                    )}
                  </h2>

                  <p className="mt-0.5 text-xs text-zinc-500">
                    {activeBranch?.name ||
                      "No branch selected"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openCreate(selectedDate)
                  }
                  disabled={!selectedBranchId}
                  className="rounded-lg bg-lime-400 p-2 text-black transition hover:bg-lime-300 disabled:opacity-40"
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>

            <div className="max-h-[650px] space-y-3 overflow-y-auto p-4">
              {selectedDateBroadcasts.length ===
              0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center">
                  <CalendarDays
                    size={28}
                    className="mx-auto mb-3 text-zinc-700"
                  />

                  <p className="text-sm font-medium text-zinc-400">
                    No broadcasts
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    Create a broadcast for this
                    date.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openCreate(selectedDate)
                    }
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-lime-400 px-3 py-2 text-xs font-semibold text-black hover:bg-lime-300"
                  >
                    <Plus size={14} />
                    New Broadcast
                  </button>
                </div>
              ) : (
                selectedDateBroadcasts.map(
                  (broadcast) => (
                    <div
                      key={broadcast.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            {broadcast.mode ===
                            "TIMER_ONLY" ? (
                              <TimerReset
                                size={14}
                                className="text-lime-400"
                              />
                            ) : (
                              <Film
                                size={14}
                                className="text-lime-400"
                              />
                            )}

                            <span className="truncate text-sm font-medium text-white">
                              {broadcast.title ||
                                "Workout Broadcast"}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-500">
                            {formatTime(
                              broadcast.date
                            )}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${statusClasses(
                            broadcast.status
                          )}`}
                        >
                          {broadcast.status}
                        </span>
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-zinc-900 px-2.5 py-2">
                          <span className="block text-zinc-600">
                            Mode
                          </span>
                          <span className="text-zinc-300">
                            {broadcast.mode ===
                            "SCHEDULE"
                              ? "Schedule"
                              : "Timer Only"}
                          </span>
                        </div>

                        <div className="rounded-md bg-zinc-900 px-2.5 py-2">
                          <span className="block text-zinc-600">
                            TVs
                          </span>
                          <span className="text-zinc-300">
                            {broadcast.tvs.length}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {broadcast.status !==
                          "COMPLETED" &&
                          broadcast.status !==
                            "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() =>
                                void openEdit(
                                  broadcast
                                )
                              }
                              disabled={
                                updatingId ===
                                broadcast.id
                              }
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-zinc-800 px-2 py-2 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white"
                            >
                              {updatingId ===
                              broadcast.id ? (
                                <Loader2
                                  size={13}
                                  className="animate-spin"
                                />
                              ) : (
                                <Edit3 size={13} />
                              )}
                              Edit
                            </button>
                          )}

                        <button
                          type="button"
                          onClick={() =>
                            setPreviewBroadcast(
                              broadcast
                            )
                          }
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-zinc-800 px-2 py-2 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white"
                        >
                          <Play size={13} />
                          Preview
                        </button>

                        {broadcast.status !==
                          "LIVE" &&
                          broadcast.status !==
                            "COMPLETED" &&
                          broadcast.status !==
                            "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() =>
                                void startBroadcast(
                                  broadcast
                                )
                              }
                              disabled={
                                updatingId ===
                                broadcast.id
                              }
                              className="rounded-md bg-lime-400 px-2.5 py-2 text-xs font-semibold text-black hover:bg-lime-300 disabled:opacity-50"
                            >
                              Start
                            </button>
                          )}
                      </div>

                      {broadcast.status !==
                        "LIVE" && (
                        <button
                          type="button"
                          onClick={() =>
                            void deleteBroadcast(
                              broadcast
                            )
                          }
                          disabled={
                            deletingId ===
                            broadcast.id
                          }
                          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                        >
                          {deletingId ===
                          broadcast.id ? (
                            <Loader2
                              size={12}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          Delete broadcast
                        </button>
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Create/Edit modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingBroadcast
                    ? "Edit Broadcast"
                    : "New Broadcast"}
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Branch:{" "}
                  {activeBranch?.name ||
                    "Unknown branch"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsFormOpen(false)
                }
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={saveBroadcast}
              className="max-h-[calc(100vh-140px)] overflow-y-auto"
            >
              <div className="grid gap-6 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                {/* Left */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      Broadcast date
                    </label>

                    <input
                      type="date"
                      style={{
                        colorScheme: "dark",
                      }}
                      value={selectedDate}
                      onChange={(event) =>
                        setSelectedDate(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      Broadcast mode
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            editingBroadcast
                          ) {
                            return;
                          }

                          setFormMode(
                            "SCHEDULE"
                          );
                        }}
                        className={`rounded-lg border p-3 text-left transition ${
                          formMode ===
                          "SCHEDULE"
                            ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                            : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                        } ${
                          editingBroadcast
                            ? "cursor-default"
                            : ""
                        }`}
                      >
                        <Film
                          size={17}
                          className="mb-2"
                        />
                        <span className="block text-xs font-semibold">
                          Schedule
                        </span>
                        <span className="mt-1 block text-[10px] text-zinc-600">
                          Use a workout schedule
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            editingBroadcast
                          ) {
                            return;
                          }

                          setFormMode(
                            "TIMER_ONLY"
                          );
                          setSelectedScheduleId(
                            ""
                          );
                          setSelectedSchedule(
                            null
                          );
                          setBroadcastExercises(
                            []
                          );
                        }}
                        className={`rounded-lg border p-3 text-left transition ${
                          formMode ===
                          "TIMER_ONLY"
                            ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                            : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                        } ${
                          editingBroadcast
                            ? "cursor-default"
                            : ""
                        }`}
                      >
                        <TimerReset
                          size={17}
                          className="mb-2"
                        />
                        <span className="block text-xs font-semibold">
                          Timer Only
                        </span>
                        <span className="mt-1 block text-[10px] text-zinc-600">
                          Timer without exercises
                        </span>
                      </button>
                    </div>
                  </div>

                  {formMode ===
                    "SCHEDULE" && (
                    <div>
                      <label className="mb-2 block text-xs font-medium text-zinc-400">
                        Workout schedule
                      </label>

                      <select
                        value={
                          selectedScheduleId
                        }
                        onChange={(event) =>
                          void loadSchedule(
                            event.target
                              .value
                          )
                        }
                        disabled={
                          !!editingBroadcast
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400 disabled:opacity-50"
                      >
                        <option value="">
                          Select schedule
                        </option>

                        {selectedDateSchedules.map(
                          (schedule) => (
                            <option
                              key={
                                schedule.id
                              }
                              value={
                                schedule.id
                              }
                            >
                              {
                                schedule
                                  .program
                                  .name
                              }
                            </option>
                          )
                        )}
                      </select>

                      {selectedDateSchedules.length ===
                        0 && (
                        <p className="mt-2 text-[11px] text-amber-400">
                          No centralized workout
                          schedule exists for this
                          date.
                        </p>
                      )}

                      {selectedSchedule && (
                        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                          <div className="flex items-center gap-2">
                            <Check
                              size={14}
                              className="text-lime-400"
                            />
                            <span className="text-xs font-medium text-zinc-300">
                              {
                                selectedSchedule.program?.name ?? "Untitled Program"
                              }
                            </span>
                          </div>

                          <p className="mt-1 text-[11px] text-zinc-600">
                            {
                              selectedSchedule
                                .exercises
                                .length
                            }{" "}
                            exercise
                            {selectedSchedule
                              .exercises
                              .length !== 1
                              ? "s"
                              : ""}{" "}
                            copied to this
                            broadcast.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      TVs
                    </label>

                    {branchTvs.length ===
                    0 ? (
                      <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center">
                        <Monitor
                          size={22}
                          className="mx-auto mb-2 text-zinc-700"
                        />
                        <p className="text-xs text-zinc-500">
                          No TV devices are
                          available for this
                          branch.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {branchTvs.map((tv) => {
                          const selected =
                            selectedTvIds.includes(
                              tv.id
                            );

                          return (
                            <button
                              key={tv.id}
                              type="button"
                              onClick={() =>
                                toggleTv(tv.id)
                              }
                              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                                selected
                                  ? "border-lime-400/30 bg-lime-400/10"
                                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                                    selected
                                      ? "border-lime-400 bg-lime-400 text-black"
                                      : "border-zinc-700"
                                  }`}
                                >
                                  {selected && (
                                    <Check
                                      size={12}
                                    />
                                  )}
                                </span>

                                <span className="text-xs font-medium text-zinc-300">
                                  {tv.name}
                                </span>
                              </div>

                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  tv.isOnline
                                    ? "bg-lime-400"
                                    : "bg-zinc-700"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className="space-y-6">
                  {/* Metadata */}
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-5 w-1 rounded-full bg-lime-400" />
                      <h3 className="text-sm font-semibold">
                        Broadcast Details
                      </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                          Title
                        </label>

                        <input
                          value={broadcastTitle}
                          onChange={(event) =>
                            setBroadcastTitle(
                              event.target
                                .value
                            )
                          }
                          placeholder="Broadcast title"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-lime-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                          Subtitle
                        </label>

                        <input
                          value={
                            broadcastSubtitle
                          }
                          onChange={(event) =>
                            setBroadcastSubtitle(
                              event.target
                                .value
                            )
                          }
                          placeholder="Optional subtitle"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-lime-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                          Intensity
                        </label>

                        <input
                          value={
                            broadcastIntensity
                          }
                          onChange={(event) =>
                            setBroadcastIntensity(
                              event.target
                                .value
                            )
                          }
                          placeholder="e.g. High"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-lime-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                          Description
                        </label>

                        <input
                          value={
                            broadcastDescription
                          }
                          onChange={(event) =>
                            setBroadcastDescription(
                              event.target
                                .value
                            )
                          }
                          placeholder="Optional description"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-lime-400"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Timers */}
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-5 w-1 rounded-full bg-lime-400" />
                      <h3 className="text-sm font-semibold">
                        Timer Settings
                      </h3>

                      {formMode ===
                        "SCHEDULE" &&
                        selectedSchedule && (
                          <span className="ml-auto text-[10px] text-zinc-600">
                            Copied from schedule —
                            editable here
                          </span>
                        )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {renderTimerInput(
                        "Demonstration",
                        "demonstrationSeconds"
                      )}

                      {renderTimerInput(
                        "Warm-up",
                        "warmupSeconds"
                      )}

                      {renderTimerInput(
                        "Prepare",
                        "prepareSeconds"
                      )}

                      {renderTimerInput(
                        "Work",
                        "workSeconds"
                      )}

                      {renderTimerInput(
                        "Rest",
                        "restSeconds"
                      )}

                      {renderTimerInput(
                        "Sets",
                        "sets",
                        "sets"
                      )}

                      {renderTimerInput(
                        "Cycles",
                        "cycles",
                        "cycles"
                      )}

                      {renderTimerInput(
                        "Rest Between Cycle",
                        "restBetweenCycleSeconds"
                      )}

                      {renderTimerInput(
                        "Cool Down",
                        "coolDownSeconds"
                      )}

                      <div className="sm:col-span-2 lg:col-span-3">
                        {renderTimerInput(
                          "Next Session Starts At",
                          "nextSessionStartsAt"
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Exercises */}
                  {formMode ===
                    "SCHEDULE" && (
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-1 rounded-full bg-lime-400" />
                          <h3 className="text-sm font-semibold">
                            Broadcast Exercises
                          </h3>
                        </div>

                        <span className="text-xs text-zinc-600">
                          {
                            broadcastExercises.length
                          }{" "}
                          selected
                        </span>
                      </div>

                      <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        {broadcastExercises.length ===
                        0 ? (
                          <div className="py-8 text-center text-xs text-zinc-600">
                            Select a schedule to
                            load exercises.
                          </div>
                        ) : (
                          broadcastExercises
                            .slice()
                            .sort(
                              (
                                first,
                                second
                              ) =>
                                first.sortOrder -
                                second.sortOrder
                            )
                            .map(
                              (
                                exercise,
                                index
                              ) => (
                                <div
                                  key={
                                    exercise.id
                                  }
                                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5"
                                >
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-semibold text-zinc-500">
                                    {index +
                                      1}
                                  </span>

                                  {exercise.video
                                    ?.thumbnailUrl ? (
                                    <img
                                      src={
                                        exercise
                                          .video
                                          .thumbnailUrl
                                      }
                                      alt=""
                                      className="h-9 w-14 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-9 w-14 items-center justify-center rounded bg-zinc-800">
                                      <Film
                                        size={15}
                                        className="text-zinc-600"
                                      />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-zinc-300">
                                      {exercise
                                        .video
                                        ?.name ||
                                        exercise.exerciseName ||
                                        "Unnamed exercise"}
                                    </p>

                                    {exercise.video
                                      ?.durationSeconds !=
                                      null && (
                                      <p className="mt-0.5 text-[10px] text-zinc-600">
                                        {
                                          exercise
                                            .video
                                            .durationSeconds
                                        }
                                        s
                                      </p>
                                    )}
                                  </div>

                                  <span className="text-[10px] text-zinc-600">
                                    Broadcast copy
                                  </span>
                                </div>
                              )
                            )
                        )}
                      </div>
                    </section>
                  )}

                  {/* TV exercise selection */}
                  {formMode ===
                    "SCHEDULE" &&
                    selectedTvIds.length > 0 &&
                    broadcastExercises.length >
                      0 && (
                      <section>
                        <div className="mb-3 flex items-center gap-2">
                          <div className="h-5 w-1 rounded-full bg-lime-400" />
                          <h3 className="text-sm font-semibold">
                            TV Exercise Selection
                          </h3>
                        </div>

                        <div className="space-y-3">
                          {selectedTvIds.map(
                            (tvId) => {
                              const tv =
                                branchTvs.find(
                                  (item) =>
                                    item.id ===
                                    tvId
                                );

                              if (!tv) {
                                return null;
                              }

                              const selected =
                                tvExerciseIds[
                                  tvId
                                ] ?? [];

                              return (
                                <div
                                  key={tvId}
                                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                                >
                                  <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Monitor
                                        size={
                                          15
                                        }
                                        className="text-lime-400"
                                      />

                                      <span className="text-xs font-semibold text-zinc-300">
                                        {tv.name}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          selectAllTvExercises(
                                            tvId
                                          )
                                        }
                                        className="text-[10px] text-lime-400 hover:text-lime-300"
                                      >
                                        Select all
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          clearTvExercises(
                                            tvId
                                          )
                                        }
                                        className="text-[10px] text-zinc-600 hover:text-zinc-400"
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {broadcastExercises.map(
                                      (
                                        exercise,
                                        index
                                      ) => {
                                        const checked =
                                          selected.includes(
                                            exercise.id
                                          );

                                        return (
                                          <button
                                            key={
                                              exercise.id
                                            }
                                            type="button"
                                            onClick={() =>
                                              toggleTvExercise(
                                                tvId,
                                                exercise.id
                                              )
                                            }
                                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                                              checked
                                                ? "border-lime-400/20 bg-lime-400/[0.06]"
                                                : "border-zinc-800 bg-zinc-900"
                                            }`}
                                          >
                                            <span
                                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                                checked
                                                  ? "border-lime-400 bg-lime-400 text-black"
                                                  : "border-zinc-700"
                                              }`}
                                            >
                                              {checked && (
                                                <Check
                                                  size={
                                                    10
                                                  }
                                                />
                                              )}
                                            </span>

                                            <span className="truncate text-[11px] text-zinc-400">
                                              {index +
                                                1}
                                              .{" "}
                                              {exercise
                                                .video
                                                ?.name ||
                                                exercise.exerciseName ||
                                                "Unnamed"}
                                            </span>
                                          </button>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </section>
                    )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/60 px-6 py-4">
                <div className="text-xs text-zinc-600">
                  {formMode === "SCHEDULE"
                    ? "Schedule data is copied into the broadcast. Changes here will not modify the original schedule."
                    : "Timer-only broadcasts do not require a workout schedule."}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setIsFormOpen(false)
                    }
                    className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSaving ||
                      !selectedBranchId
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        {editingBroadcast
                          ? "Update Broadcast"
                          : "Create Broadcast"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewBroadcast && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-semibold">
                  Broadcast Preview
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  {formatDate(
                    previewBroadcast.date
                  )}{" "}
                  ·{" "}
                  {formatTime(
                    previewBroadcast.date
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreviewBroadcast(null)
                }
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <div className="mb-2 flex items-center gap-2">
                  {previewBroadcast.mode ===
                  "TIMER_ONLY" ? (
                    <TimerReset
                      size={17}
                      className="text-lime-400"
                    />
                  ) : (
                    <Film
                      size={17}
                      className="text-lime-400"
                    />
                  )}

                  <span className="text-xs uppercase tracking-wider text-zinc-600">
                    {previewBroadcast.mode ===
                    "TIMER_ONLY"
                      ? "Timer Only"
                      : "Workout Session"}
                  </span>
                </div>

                <h3 className="text-xl font-semibold">
                  {previewBroadcast.title ||
                    "Workout Broadcast"}
                </h3>

                {previewBroadcast.subtitle && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {previewBroadcast.subtitle}
                  </p>
                )}

                {previewBroadcast.description && (
                  <p className="mt-3 text-sm leading-6 text-zinc-500">
                    {previewBroadcast.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-600">
                    Status
                  </span>
                  <span
                    className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] ${statusClasses(
                      previewBroadcast.status
                    )}`}
                  >
                    {previewBroadcast.status}
                  </span>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-600">
                    TVs
                  </span>
                  <span className="mt-1 block text-sm text-zinc-300">
                    {previewBroadcast.tvs.length}
                  </span>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-600">
                    Exercises
                  </span>
                  <span className="mt-1 block text-sm text-zinc-300">
                    {
                      previewBroadcast
                        .exercises.length
                    }
                  </span>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-600">
                    Intensity
                  </span>
                  <span className="mt-1 block truncate text-sm text-zinc-300">
                    {previewBroadcast.intensity ||
                      "—"}
                  </span>
                </div>
              </div>

              {previewBroadcast.exercises.length >
                0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Copy
                      size={14}
                      className="text-zinc-600"
                    />
                    <h3 className="text-xs font-semibold text-zinc-400">
                      Exercises
                    </h3>
                  </div>

                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {previewBroadcast.exercises
                      .slice()
                      .sort(
                        (first, second) =>
                          first.sortOrder -
                          second.sortOrder
                      )
                      .map(
                        (
                          exercise,
                          index
                        ) => (
                          <div
                            key={exercise.id}
                            className="flex items-center gap-3 rounded-lg bg-zinc-950 px-3 py-2"
                          >
                            <span className="text-[10px] text-zinc-700">
                              {index + 1}
                            </span>

                            <span className="text-xs text-zinc-400">
                              {exercise.video
                                ?.name ||
                                exercise.exerciseName ||
                                "Unnamed exercise"}
                            </span>
                          </div>
                        )
                      )}
                  </div>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  [
                    "Warm-up",
                    previewBroadcast.warmupSeconds,
                  ],
                  [
                    "Work",
                    previewBroadcast.workSeconds,
                  ],
                  [
                    "Rest",
                    previewBroadcast.restSeconds,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5"
                  >
                    <span className="text-xs text-zinc-600">
                      {label}
                    </span>
                    <span className="text-xs text-zinc-300">
                      {value != null
                        ? `${value}s`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}