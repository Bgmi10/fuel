"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Film,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";

type Branch = {
  id: string;
  name: string;
};

type ProgramVideo = {
  id: string;
  name: string;
  durationSeconds: number | null;
};

type ProgramItem = {
  id: string;
  sortOrder: number;
  video: ProgramVideo;
};

type WorkoutProgram = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  items: ProgramItem[];
};

type AssignmentStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

type WorkoutAssignment = {
  id: string;
  programId: string;
  branchId: string;
  scheduledAt: string;
  status: AssignmentStatus;
  createdAt: string;

  branch: Branch;
  program: WorkoutProgram;
};

type ProgramsResponse = {
  success: boolean;
  programs?: WorkoutProgram[];
  message?: string;
};

type BranchesResponse = {
  success?: boolean;
  branches?: Branch[];
  message?: string;
};

type AssignmentsResponse = {
  success: boolean;
  assignments?: WorkoutAssignment[];
  assignment?: WorkoutAssignment;
  message?: string;
};

function extractBranches(
  payload: BranchesResponse | Branch[]
): Branch[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.branches ?? [];
}

export default function WorkoutSchedulesPage() {
  const [programs, setPrograms] =
    useState<WorkoutProgram[]>([]);

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [assignments, setAssignments] =
    useState<WorkoutAssignment[]>([]);

  const [programId, setProgramId] =
    useState("");

  const [selectedBranchIds, setSelectedBranchIds] =
    useState<Set<string>>(
      () => new Set()
    );

  const [scheduledAt, setScheduledAt] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

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
        (program) =>
          program.id === programId
      ) ?? null,
    [activePrograms, programId]
  );

  const selectedProgramDuration = useMemo(
    () =>
      selectedProgram?.items.reduce(
        (total, item) =>
          total +
          (item.video.durationSeconds ?? 0),
        0
      ) ?? 0,
    [selectedProgram]
  );

  const upcomingCount = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          assignment.status ===
            "SCHEDULED" &&
          new Date(
            assignment.scheduledAt
          ).getTime() >= Date.now()
      ).length,
    [assignments]
  );

  const liveCount = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          assignment.status === "LIVE"
      ).length,
    [assignments]
  );

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [
        programsResponse,
        branchesResponse,
        assignmentsResponse,
      ] = await Promise.all([
        fetch("/api/workout-programs", {
          cache: "no-store",
        }),

        fetch("/api/branches", {
          cache: "no-store",
        }),

        fetch(
          "/api/workout-program-assignments",
          {
            cache: "no-store",
          }
        ),
      ]);

      const programsPayload =
        (await programsResponse.json()) as ProgramsResponse;

      const branchesPayload =
        (await branchesResponse.json()) as
          | BranchesResponse
          | Branch[];

      const assignmentsPayload =
        (await assignmentsResponse.json()) as AssignmentsResponse;

      if (
        !programsResponse.ok ||
        !programsPayload.success
      ) {
        throw new Error(
          programsPayload.message ||
            "Unable to load workout programs."
        );
      }

      if (!branchesResponse.ok) {
        throw new Error(
          !Array.isArray(branchesPayload)
            ? branchesPayload.message
            : "Unable to load branches."
        );
      }

      if (
        !assignmentsResponse.ok ||
        !assignmentsPayload.success
      ) {
        throw new Error(
          assignmentsPayload.message ||
            "Unable to load schedules."
        );
      }

      setPrograms(
        programsPayload.programs ?? []
      );

      setBranches(
        extractBranches(branchesPayload)
      );

      setAssignments(
        assignmentsPayload.assignments ??
          []
      );
    } catch (loadError) {
      console.error(
        "Load broadcast schedules error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load broadcast schedules."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function toggleBranch(
    branchId: string
  ) {
    setSelectedBranchIds(
      (current) => {
        const next = new Set(current);

        if (next.has(branchId)) {
          next.delete(branchId);
        } else {
          next.add(branchId);
        }

        return next;
      }
    );

    setError("");
  }

  function toggleAllBranches() {
    if (
      selectedBranchIds.size ===
      branches.length
    ) {
      setSelectedBranchIds(
        new Set()
      );
    } else {
      setSelectedBranchIds(
        new Set(
          branches.map(
            (branch) => branch.id
          )
        )
      );
    }

    setError("");
  }

  async function createSchedule(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!programId) {
      setError(
        "Select a workout program."
      );

      return;
    }

    if (
      selectedBranchIds.size === 0
    ) {
      setError(
        "Select at least one branch."
      );

      return;
    }

    if (!scheduledAt) {
      setError(
        "Select the broadcast date and time."
      );

      return;
    }

    const localDate =
      new Date(scheduledAt);

    if (
      Number.isNaN(localDate.getTime())
    ) {
      setError(
        "Select a valid broadcast time."
      );

      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        "/api/workout-program-assignments",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            programId,

            branchIds: Array.from(
              selectedBranchIds
            ),

            scheduledAt:
              localDate.toISOString(),
          }),
        }
      );

      const payload =
        (await response.json()) as AssignmentsResponse;

      if (
        !response.ok ||
        !payload.success ||
        !payload.assignments
      ) {
        throw new Error(
          payload.message ||
            "Unable to create broadcast schedule."
        );
      }

      setAssignments((current) =>
        [
          ...current,
          ...payload.assignments!,
        ].sort(
          (first, second) =>
            new Date(
              first.scheduledAt
            ).getTime() -
            new Date(
              second.scheduledAt
            ).getTime()
        )
      );

      setSuccess(
        `${payload.assignments.length} branch schedule${
          payload.assignments.length === 1
            ? ""
            : "s"
        } created successfully.`
      );

      setProgramId("");
      setSelectedBranchIds(
        new Set()
      );
      setScheduledAt("");
    } catch (saveError) {
      console.error(
        "Create schedule error:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to create broadcast schedule."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelSchedule(
    assignment: WorkoutAssignment
  ) {
    const confirmed =
      window.confirm(
        `Cancel "${assignment.program.name}" for ${assignment.branch.name}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(
        assignment.id
      );

      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/workout-program-assignments/${assignment.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status: "CANCELLED",
          }),
        }
      );

      const payload =
        (await response.json()) as AssignmentsResponse;

      if (
        !response.ok ||
        !payload.success ||
        !payload.assignment
      ) {
        throw new Error(
          payload.message ||
            "Unable to cancel the schedule."
        );
      }

      setAssignments((current) =>
        current.map((item) =>
          item.id ===
          payload.assignment!.id
            ? payload.assignment!
            : item
        )
      );

      setSuccess(
        "Broadcast schedule cancelled."
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to cancel the schedule."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-full bg-neutral-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-neutral-800 pb-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
              <CalendarClock size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Broadcast Schedule
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Assign workout programs to gym
                branches and schedule their release.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                isLoading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Upcoming"
            value={String(upcomingCount)}
            icon={<CalendarClock size={20} />}
          />

          <SummaryCard
            label="Currently Live"
            value={String(liveCount)}
            icon={<Send size={20} />}
          />

          <SummaryCard
            label="Assigned Branches"
            value={String(
              new Set(
                assignments
                  .filter(
                    (assignment) =>
                      assignment.status !==
                      "CANCELLED"
                  )
                  .map(
                    (assignment) =>
                      assignment.branchId
                  )
              ).size
            )}
            icon={<Building2 size={20} />}
          />
        </section>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 size={18} />
            {success}
          </div>
        ) : null}

        <div className="mt-7 grid gap-7 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={createSchedule}
            className="h-fit rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
          >
            <h2 className="text-lg font-semibold">
              Schedule Program
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Select the workout, branches and
              release time.
            </p>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Workout program
              </label>

              <select
                value={programId}
                onChange={(event) => {
                  setProgramId(
                    event.target.value
                  );
                  setError("");
                }}
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 text-sm text-white outline-none focus:border-lime-400"
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

            {selectedProgram ? (
              <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {selectedProgram.name}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {
                        selectedProgram
                          .items.length
                      }{" "}
                      videos
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-semibold text-lime-400">
                    <Clock3 size={16} />
                    {formatDuration(
                      selectedProgramDuration
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-300">
                  Branches
                </label>

                <button
                  type="button"
                  onClick={
                    toggleAllBranches
                  }
                  className="text-xs font-semibold text-lime-400 hover:text-lime-300"
                >
                  {selectedBranchIds.size ===
                  branches.length
                    ? "Clear all"
                    : "Select all"}
                </button>
              </div>

              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                {branches.map((branch) => {
                  const selected =
                    selectedBranchIds.has(
                      branch.id
                    );

                  return (
                    <button
                      type="button"
                      key={branch.id}
                      onClick={() =>
                        toggleBranch(
                          branch.id
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                        selected
                          ? "border-lime-700 bg-lime-950/30 text-lime-300"
                          : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          selected
                            ? "border-lime-400 bg-lime-400 text-neutral-950"
                            : "border-neutral-600"
                        }`}
                      >
                        {selected ? (
                          <Check
                            size={14}
                          />
                        ) : null}
                      </span>

                      <Building2
                        size={16}
                      />

                      <span className="text-sm font-medium">
                        {branch.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-xs text-neutral-600">
                {selectedBranchIds.size}{" "}
                branch
                {selectedBranchIds.size === 1
                  ? ""
                  : "es"}{" "}
                selected
              </p>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Broadcast date and time
              </label>

              <input
                type="datetime-local"
                value={scheduledAt}
                style={{
                    colorScheme: "dark"
                }}
                min={getMinimumDateTime()}
                onChange={(event) => {
                  setScheduledAt(
                    event.target.value
                  );
                  setError("");
                }}
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 text-sm text-white outline-none focus:border-lime-400"
              />

              <p className="mt-2 text-xs text-neutral-600">
                Time is based on your local
                timezone.
              </p>
            </div>

            <button
              type="submit"
              disabled={
                isSaving ||
                !programId ||
                selectedBranchIds.size ===
                  0 ||
                !scheduledAt
              }
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime-400 text-sm font-bold text-neutral-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Scheduling
                </>
              ) : (
                <>
                  <Send size={18} />
                  Publish Schedule
                </>
              )}
            </button>
          </form>

          <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="border-b border-neutral-800 px-5 py-4">
              <h2 className="font-semibold">
                Scheduled Broadcasts
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Branch-specific workout program
                releases.
              </p>
            </div>

            {isLoading ? (
              <div className="flex min-h-80 items-center justify-center">
                <Loader2
                  size={28}
                  className="animate-spin text-lime-400"
                />
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <CalendarClock
                  size={32}
                  className="text-neutral-600"
                />

                <h3 className="mt-4 font-semibold">
                  No broadcasts scheduled
                </h3>

                <p className="mt-2 text-sm text-neutral-600">
                  Schedule a workout program for
                  one or more branches.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {assignments.map(
                  (assignment) => {
                    const duration =
                      assignment.program.items.reduce(
                        (total, item) =>
                          total +
                          (item.video
                            .durationSeconds ??
                            0),
                        0
                      );

                    return (
                      <article
                        key={assignment.id}
                        className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-lime-400">
                            <CalendarClock
                              size={21}
                            />
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="font-semibold">
                                {
                                  assignment
                                    .program
                                    .name
                                }
                              </h3>

                              <StatusBadge
                                status={
                                  assignment.status
                                }
                              />
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-500">
                              <span className="flex items-center gap-2">
                                <Building2
                                  size={15}
                                />

                                {
                                  assignment
                                    .branch.name
                                }
                              </span>

                              <span className="flex items-center gap-2">
                                <Clock3
                                  size={15}
                                />

                                {formatDateTime(
                                  assignment.scheduledAt
                                )}
                              </span>

                              <span className="flex items-center gap-2">
                                <Film
                                  size={15}
                                />

                                {
                                  assignment
                                    .program
                                    .items
                                    .length
                                }{" "}
                                videos ·{" "}
                                {formatDuration(
                                  duration
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {assignment.status ===
                        "SCHEDULED" ? (
                          <button
                            type="button"
                            disabled={
                              updatingId ===
                              assignment.id
                            }
                            onClick={() =>
                              void cancelSchedule(
                                assignment
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-xl border border-red-950 px-4 py-2 text-sm font-medium text-red-400 transition hover:border-red-800 hover:bg-red-950/30 disabled:opacity-50"
                          >
                            {updatingId ===
                            assignment.id ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <XCircle
                                size={16}
                              />
                            )}

                            Cancel
                          </button>
                        ) : null}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          {label}
        </span>

        <span className="text-neutral-600">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: AssignmentStatus;
}) {
  const styles: Record<
    AssignmentStatus,
    string
  > = {
    DRAFT:
      "border-neutral-700 bg-neutral-900 text-neutral-400",

    SCHEDULED:
      "border-blue-900 bg-blue-950/40 text-blue-300",

    LIVE:
      "border-lime-800 bg-lime-950/40 text-lime-300",

    COMPLETED:
      "border-emerald-900 bg-emerald-950/40 text-emerald-300",

    CANCELLED:
      "border-red-950 bg-red-950/40 text-red-400",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function getMinimumDateTime() {
  const date = new Date();

  date.setMinutes(
    date.getMinutes() -
      date.getTimezoneOffset() + 1
  );

  return date
    .toISOString()
    .slice(0, 16);
}

function formatDateTime(
  value: string
) {
  const date = new Date(value);

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function formatDuration(
  totalSeconds: number
) {
  if (!totalSeconds) {
    return "0:00";
  }

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    seconds
  ).padStart(2, "0")}`;
}