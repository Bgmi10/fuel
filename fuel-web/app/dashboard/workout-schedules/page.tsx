"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Edit3,
  Film,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { toDateKey } from "@/src/lib/tv/date-key";
import {
  TIMER_FIELDS,
  api,
  emptyTimers,
  errorMessage,
  formatDay,
  fromLocalInput,
  monthCells,
  parseTimers,
  timersToForm,
  toLocalInput,
  ymd,
  type TimerForm,
  type Timers,
} from "@/src/lib/tv/client";
import {
  Banner,
  Field,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
  inputClass,
} from "@/src/components/tv/ui";

type Intensity = "LOW" | "MEDIUM" | "HIGH";

interface LibraryVideo {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

interface Program {
  id: string;
  name: string;
  subtitle: string | null;
  intensity: Intensity | null;
  isActive: boolean;
  items: { sortOrder: number; video: LibraryVideo }[];
}

interface Schedule extends Timers {
  id: string;
  dateKey: string;
  programId: string;
  nextSessionStartsAt: string | null;
  program: { name: string; intensity: Intensity | null };
  exercises: {
    id: string;
    sortOrder: number;
    videoId: string | null;
    exerciseName: string | null;
    video: LibraryVideo | null;
  }[];
  _count: { broadcasts: number };
}

/** One exercise row in the form. */
interface DraftExercise {
  key: string;
  videoId: string | null;
  name: string;
  thumbnailUrl: string | null;
}

interface Draft {
  id: string | null;
  dateKey: string;
  programId: string;
  timers: TimerForm;
  nextSession: string;
  exercises: DraftExercise[];
}

const fromVideo = (video: LibraryVideo): DraftExercise => ({
  key: crypto.randomUUID(),
  videoId: video.id,
  name: video.name,
  thumbnailUrl: video.thumbnailUrl,
});

const secondsLabel = (value: number | null) => (value === null ? "—" : `${value}s`);

export default function WorkoutSchedulesPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [manualName, setManualName] = useState("");

  const cells = useMemo(() => monthCells(month), [month]);
  const rangeFrom = ymd(cells[0]);
  const rangeTo = ymd(cells[cells.length - 1]);
  const todayKey = toDateKey();

  // Programs and the library change rarely; schedules follow the visible month.
  useEffect(() => {
    Promise.all([
      api<Program[]>("/api/workout-programs"),
      api<LibraryVideo[]>("/api/workout-videos?active=true&limit=500"),
    ])
      .then(([programList, videoList]) => {
        setPrograms(programList);
        setVideos(videoList);
      })
      .catch((loadError) => setError(errorMessage(loadError)));
  }, []);

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setSchedules(
        await api<Schedule[]>(`/api/workout-schedules?from=${rangeFrom}&to=${rangeTo}`)
      );
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      map.set(schedule.dateKey, [...(map.get(schedule.dateKey) ?? []), schedule]);
    }
    return map;
  }, [schedules]);

  const daySchedules = schedulesByDate.get(selectedDate) ?? [];
  const activePrograms = programs.filter((program) => program.isActive);

  const libraryMatches = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();

    return videos
      .filter((video) => !query || video.name.toLowerCase().includes(query))
      .slice(0, 30);
  }, [videos, librarySearch]);

  // ---------------- Form ----------------

  function programExercises(programId: string): DraftExercise[] {
    const program = programs.find((item) => item.id === programId);

    return (program?.items ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => fromVideo(item.video));
  }

  function openCreate(dateKey: string) {
    setModalError("");
    setLibrarySearch("");
    setManualName("");
    setDraft({
      id: null,
      dateKey,
      programId: "",
      timers: emptyTimers(),
      nextSession: "",
      exercises: [],
    });
  }

  function openEdit(schedule: Schedule) {
    setModalError("");
    setLibrarySearch("");
    setManualName("");
    setDraft({
      id: schedule.id,
      dateKey: schedule.dateKey,
      programId: schedule.programId,
      timers: timersToForm(schedule),
      nextSession: toLocalInput(schedule.nextSessionStartsAt),
      exercises: schedule.exercises
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((exercise) =>
          exercise.video
            ? { ...fromVideo(exercise.video), key: exercise.id }
            : {
                key: exercise.id,
                videoId: null,
                name: exercise.exerciseName ?? "Exercise",
                thumbnailUrl: null,
              }
        ),
    });
  }

  function patch(changes: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...changes } : current));
  }

  function chooseProgram(programId: string) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      // Pre-fill only when nothing has been chosen yet; never overwrite someone's list.
      return {
        ...current,
        programId,
        exercises:
          current.exercises.length === 0 && programId
            ? programExercises(programId)
            : current.exercises,
      };
    });
  }

  function addExercise(exercise: DraftExercise) {
    setDraft((current) =>
      current ? { ...current, exercises: [...current.exercises, exercise] } : current
    );
  }

  function addManual() {
    const name = manualName.trim();

    if (!name) {
      return;
    }

    addExercise({ key: crypto.randomUUID(), videoId: null, name, thumbnailUrl: null });
    setManualName("");
  }

  function move(index: number, direction: -1 | 1) {
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

  async function save() {
    if (!draft) {
      return;
    }

    if (!draft.programId) {
      setModalError("Select a workout program.");
      return;
    }

    if (draft.exercises.length === 0) {
      setModalError("Add at least one exercise.");
      return;
    }

    const parsed = parseTimers(draft.timers);

    if ("error" in parsed) {
      setModalError(parsed.error);
      return;
    }

    const body = {
      dateKey: draft.dateKey,
      programId: draft.programId,
      ...parsed.values,
      nextSessionStartsAt: fromLocalInput(draft.nextSession),
      exercises: draft.exercises.map((exercise) =>
        exercise.videoId ? { videoId: exercise.videoId } : { exerciseName: exercise.name }
      ),
    };

    try {
      setSaving(true);
      setModalError("");

      await api(draft.id ? `/api/workout-schedules/${draft.id}` : "/api/workout-schedules", {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });

      setSelectedDate(draft.dateKey);
      setDraft(null);
      setSuccess(draft.id ? "Schedule updated." : "Schedule created.");
      await loadSchedules();
    } catch (saveError) {
      setModalError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function remove(schedule: Schedule) {
    const note =
      schedule._count.broadcasts > 0
        ? ` ${schedule._count.broadcasts} broadcast(s) already use it; they keep their own copy.`
        : "";

    if (
      !window.confirm(`Delete the "${schedule.program.name}" schedule for ${schedule.dateKey}?${note}`)
    ) {
      return;
    }

    try {
      setDeletingId(schedule.id);
      setError("");
      setSuccess("");
      await api(`/api/workout-schedules/${schedule.id}`, { method: "DELETE" });
      await loadSchedules();
      setSuccess("Schedule deleted.");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          icon={<CalendarDays size={25} />}
          title="Workout Schedule"
          description="Plan programs, exercises and timers once. Branches build their broadcasts from these."
          actions={
            <>
              <SecondaryButton
                onClick={() => {
                  setMonth(new Date());
                  setSelectedDate(todayKey);
                }}
              >
                Today
              </SecondaryButton>
              <SecondaryButton onClick={() => void loadSchedules()} disabled={loading}>
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </SecondaryButton>
              <PrimaryButton onClick={() => openCreate(selectedDate)}>
                <Plus size={17} />
                New Schedule
              </PrimaryButton>
            </>
          }
        />

        {error && (
          <Banner tone="error" onClose={() => setError("")}>
            {error}
          </Banner>
        )}
        {success && (
          <Banner tone="success" onClose={() => setSuccess("")}>
            {success}
          </Banner>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
                    month
                  )}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">Centralized schedule calendar</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMonth((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setMonth((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-zinc-800">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {loading && schedules.length === 0 ? (
              <div className="flex min-h-[500px] items-center justify-center">
                <Loader2 size={24} className="animate-spin text-lime-400" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((date) => {
                  const key = ymd(date);
                  const inMonth = date.getMonth() === month.getMonth();
                  const items = schedulesByDate.get(key) ?? [];

                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className={`min-h-[105px] border-b border-r border-zinc-800 p-2 text-left transition ${
                        inMonth ? "bg-zinc-900/30" : "bg-zinc-950/50"
                      } ${
                        key === selectedDate
                          ? "ring-1 ring-inset ring-lime-400/70"
                          : "hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                            key === todayKey
                              ? "bg-lime-400 text-zinc-950"
                              : inMonth
                              ? "text-zinc-300"
                              : "text-zinc-700"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {items.length > 0 && (
                          <span className="rounded-full bg-lime-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-lime-300">
                            {items.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1">
                        {items.slice(0, 2).map((schedule) => (
                          <div
                            key={schedule.id}
                            className="truncate rounded-md border border-lime-400/10 bg-lime-400/5 px-1.5 py-1 text-[10px] text-lime-200"
                          >
                            {schedule.program.name}
                          </div>
                        ))}
                        {items.length > 2 && (
                          <div className="px-1.5 text-[10px] text-zinc-500">
                            +{items.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <div className="border-b border-zinc-800 px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Selected date</p>
              <h2 className="mt-1 text-lg font-semibold">{formatDay(selectedDate)}</h2>
            </div>

            <div className="space-y-3 p-4">
              {daySchedules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 px-4 py-8 text-center">
                  <CalendarDays size={28} className="mx-auto text-zinc-600" />
                  <p className="mt-3 text-sm font-medium text-zinc-300">
                    No schedule for this date
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Create one before branches can broadcast it.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <PrimaryButton onClick={() => openCreate(selectedDate)}>
                      <Plus size={15} />
                      Create Schedule
                    </PrimaryButton>
                  </div>
                </div>
              ) : (
                daySchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{schedule.program.name}</h3>
                        {schedule.program.intensity && (
                          <p className="mt-1 text-xs text-lime-300">{schedule.program.intensity}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(schedule)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          disabled={deletingId === schedule.id}
                          onClick={() => void remove(schedule)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                        >
                          {deletingId === schedule.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <Mini label="Exercises" value={String(schedule.exercises.length)} />
                      <Mini label="Sets" value={schedule.sets === null ? "—" : String(schedule.sets)} />
                      <Mini label="Cycles" value={schedule.cycles === null ? "—" : String(schedule.cycles)} />
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                      <Clock3 size={14} />
                      Work {secondsLabel(schedule.workSeconds)} · Rest{" "}
                      {secondsLabel(schedule.restSeconds)}
                    </div>

                    <ol className="mt-3 space-y-1 border-t border-zinc-800 pt-3">
                      {schedule.exercises
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((exercise, index) => (
                          <li key={exercise.id} className="truncate text-[11px] text-zinc-500">
                            {index + 1}. {exercise.video?.name ?? exercise.exerciseName}
                          </li>
                        ))}
                    </ol>

                    {schedule._count.broadcasts > 0 && (
                      <p className="mt-3 text-[10px] text-zinc-600">
                        Used by {schedule._count.broadcasts} broadcast
                        {schedule._count.broadcasts !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      {draft && (
        <Modal
          wide
          title={draft.id ? "Edit Workout Schedule" : "New Workout Schedule"}
          subtitle="Branches copy this when they create a broadcast. Later changes here never alter existing broadcasts."
          onClose={() => setDraft(null)}
          closeDisabled={saving}
          footer={
            <>
              <SecondaryButton onClick={() => setDraft(null)} disabled={saving}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={() => void save()} loading={saving}>
                {draft.id ? "Update Schedule" : "Create Schedule"}
              </PrimaryButton>
            </>
          }
        >
          {modalError && (
            <Banner tone="error" onClose={() => setModalError("")}>
              {modalError}
            </Banner>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-5">
              <Field label="Schedule date">
                <input
                  type="date"
                  style={{ colorScheme: "dark" }}
                  value={draft.dateKey}
                  onChange={(event) => patch({ dateKey: event.target.value })}
                  className={inputClass}
                />
              </Field>

              <Field label="Workout program">
                <select
                  value={draft.programId}
                  onChange={(event) => chooseProgram(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select program</option>
                  {activePrograms.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                  {/* An existing schedule may point at a program that is now disabled. */}
                  {draft.programId &&
                    !activePrograms.some((program) => program.id === draft.programId) && (
                      <option value={draft.programId}>
                        {programs.find((program) => program.id === draft.programId)?.name ??
                          "Current program"}{" "}
                        (disabled)
                      </option>
                    )}
                </select>

                {draft.programId && (
                  <button
                    type="button"
                    onClick={() => patch({ exercises: programExercises(draft.programId) })}
                    className="mt-2 w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-lime-400/40 hover:text-lime-300"
                  >
                    Replace list with the program's exercises
                  </button>
                )}
              </Field>

              <Section title="Timer Settings">
                <div className="grid grid-cols-2 gap-3">
                  {TIMER_FIELDS.map((field) => (
                    <Field key={field.key} label={field.label}>
                      <input
                        type="number"
                        min={field.key === "sets" || field.key === "cycles" ? 1 : 0}
                        value={draft.timers[field.key]}
                        placeholder={field.unit}
                        onChange={(event) =>
                          patch({ timers: { ...draft.timers, [field.key]: event.target.value } })
                        }
                        className={inputClass}
                      />
                    </Field>
                  ))}
                </div>
              </Section>

              <Field label="Next session starts at">
                <input
                  type="datetime-local"
                  style={{ colorScheme: "dark" }}
                  value={draft.nextSession}
                  onChange={(event) => patch({ nextSession: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>

            <Section title="Schedule Exercises" aside={`${draft.exercises.length} selected`}>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <input
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="Search library exercises..."
                  className={inputClass}
                />

                <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                  {libraryMatches.length === 0 ? (
                    <p className="px-2 py-5 text-center text-xs text-zinc-600">
                      No matching videos.
                    </p>
                  ) : (
                    libraryMatches.map((video) => (
                      <button
                        type="button"
                        key={video.id}
                        onClick={() => addExercise(fromVideo(video))}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-zinc-800"
                      >
                        <span className="truncate text-xs text-zinc-300">{video.name}</span>
                        <Plus size={14} className="shrink-0 text-zinc-600" />
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
                    placeholder="Or type a name (shows on TV without a video)"
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

              <div className="mt-4 space-y-2">
                {draft.exercises.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center">
                    <Film size={25} className="mx-auto text-zinc-700" />
                    <p className="mt-3 text-sm text-zinc-400">No exercises selected</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Choose a program, add library videos, or type names.
                    </p>
                  </div>
                ) : (
                  draft.exercises.map((exercise, index) => (
                    <div
                      key={exercise.key}
                      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-400">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-200">{exercise.name}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
                          {exercise.videoId ? "Library video" : "Name only"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          title="Move up"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          disabled={index === draft.exercises.length - 1}
                          onClick={() => move(index, 1)}
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20"
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          type="button"
                          title="Remove"
                          onClick={() =>
                            patch({
                              exercises: draft.exercises.filter((item) => item.key !== exercise.key),
                            })
                          }
                          className="rounded-md p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-900 p-2">
      <p className="text-[10px] uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
