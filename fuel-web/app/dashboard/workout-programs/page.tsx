"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Film,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";

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
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: WorkoutProgramItem[];

  _count: {
    assignments: number;
  };
};

type SelectedVideo = {
  selectionId: string;
  video: WorkoutVideo;
};

type VideosResponse = {
  success: boolean;
  videos?: WorkoutVideo[];
  message?: string;
};

type ProgramsResponse = {
  success: boolean;
  programs?: WorkoutProgram[];
  program?: WorkoutProgram;
  message?: string;
};

function createSelectionId(
  videoId: string
) {
  return `${videoId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function WorkoutProgramsPage() {
  const [videos, setVideos] =
    useState<WorkoutVideo[]>([]);

  const [programs, setPrograms] =
    useState<WorkoutProgram[]>([]);

  const [selectedVideos, setSelectedVideos] =
    useState<SelectedVideo[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const activeVideos = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return videos.filter((video) => {
      if (!video.isActive) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return video.name
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [searchTerm, videos]);

  const activeProgramsCount = useMemo(
    () =>
      programs.filter(
        (program) => program.isActive
      ).length,
    [programs]
  );

  const selectedDuration = useMemo(
    () =>
      selectedVideos.reduce(
        (total, item) =>
          total +
          (item.video.durationSeconds ?? 0),
        0
      ),
    [selectedVideos]
  );

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [
        videosResponse,
        programsResponse,
      ] = await Promise.all([
        fetch("/api/workout-videos", {
          cache: "no-store",
        }),

        fetch("/api/workout-programs", {
          cache: "no-store",
        }),
      ]);

      const videosPayload =
        (await videosResponse.json()) as VideosResponse;

      const programsPayload =
        (await programsResponse.json()) as ProgramsResponse;

      if (
        !videosResponse.ok ||
        !videosPayload.success
      ) {
        throw new Error(
          videosPayload.message ||
            "Unable to load workout videos."
        );
      }

      if (
        !programsResponse.ok ||
        !programsPayload.success
      ) {
        throw new Error(
          programsPayload.message ||
            "Unable to load workout programs."
        );
      }

      setVideos(videosPayload.videos ?? []);
      setPrograms(
        programsPayload.programs ?? []
      );
    } catch (loadError) {
      console.error(
        "Load workout program data error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load workout programs."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function addVideo(video: WorkoutVideo) {
    setSelectedVideos((current) => [
      ...current,
      {
        selectionId: createSelectionId(
          video.id
        ),
        video,
      },
    ]);

    setError("");
  }

  function removeVideo(
    selectionId: string
  ) {
    setSelectedVideos((current) =>
      current.filter(
        (item) =>
          item.selectionId !== selectionId
      )
    );
  }

  function moveVideo(
    currentIndex: number,
    direction: "UP" | "DOWN"
  ) {
    setSelectedVideos((current) => {
      const next = [...current];

      const targetIndex =
        direction === "UP"
          ? currentIndex - 1
          : currentIndex + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= next.length
      ) {
        return current;
      }

      const currentItem =
        next[currentIndex];

      next[currentIndex] =
        next[targetIndex];

      next[targetIndex] =
        currentItem;

      return next;
    });
  }

  async function createProgram(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(
        "Workout program name is required."
      );

      return;
    }

    if (selectedVideos.length === 0) {
      setError(
        "Add at least one video to the program."
      );

      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        "/api/workout-programs",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),

            description:
              description.trim() || null,

            items: selectedVideos.map(
              (item) => ({
                videoId: item.video.id,
              })
            ),
          }),
        }
      );

      const payload =
        (await response.json()) as ProgramsResponse;

      if (
        !response.ok ||
        !payload.success ||
        !payload.program
      ) {
        throw new Error(
          payload.message ||
            "Unable to create workout program."
        );
      }

      setPrograms((current) => [
        payload.program!,
        ...current,
      ]);

      setSuccess(
        `${payload.program.name} was created successfully.`
      );

      resetBuilder();
    } catch (saveError) {
      console.error(
        "Create workout program error:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to create workout program."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleProgramStatus(
    program: WorkoutProgram
  ) {
    try {
      setUpdatingId(program.id);
      setError("");

      const response = await fetch(
        `/api/workout-programs/${program.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            isActive: !program.isActive,
          }),
        }
      );

      const payload =
        (await response.json()) as ProgramsResponse;

      if (
        !response.ok ||
        !payload.success ||
        !payload.program
      ) {
        throw new Error(
          payload.message ||
            "Unable to update workout program."
        );
      }

      setPrograms((current) =>
        current.map((item) =>
          item.id === payload.program!.id
            ? payload.program!
            : item
        )
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update workout program."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteProgram(
    program: WorkoutProgram
  ) {
    const confirmed = window.confirm(
      `Delete "${program.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(program.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/workout-programs/${program.id}`,
        {
          method: "DELETE",
        }
      );

      const payload =
        (await response.json()) as ProgramsResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
            "Unable to delete workout program."
        );
      }

      setPrograms((current) =>
        current.filter(
          (item) => item.id !== program.id
        )
      );

      setSuccess(
        `${program.name} was deleted.`
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete workout program."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function resetBuilder() {
    setName("");
    setDescription("");
    setSelectedVideos([]);
    setSearchTerm("");
  }

  return (
    <div className="min-h-full bg-neutral-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-neutral-800 pb-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
              <ListChecks size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Workout Programs
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Build ordered video playlists for
                Fuel TV.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
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
            label="Total Programs"
            value={String(programs.length)}
            icon={<ListChecks size={20} />}
          />

          <SummaryCard
            label="Active Programs"
            value={String(
              activeProgramsCount
            )}
            icon={<Eye size={20} />}
          />

          <SummaryCard
            label="Library Videos"
            value={String(
              videos.filter(
                (video) => video.isActive
              ).length
            )}
            icon={<Film size={20} />}
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

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
          <form
            onSubmit={createProgram}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/50"
          >
            <div className="border-b border-neutral-800 px-6 py-5">
              <h2 className="text-lg font-semibold">
                Create Program
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Arrange the videos in the order they
                should play.
              </p>
            </div>

            <div className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Program name
                  </label>

                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setError("");
                    }}
                    placeholder="Morning Full Body"
                    maxLength={120}
                    className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Total duration
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-4">
                    <Clock3
                      size={17}
                      className="text-lime-400"
                    />

                    <span className="text-sm font-semibold">
                      {formatDuration(
                        selectedDuration
                      )}
                    </span>

                    <span className="text-xs text-neutral-600">
                      {selectedVideos.length} videos
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Description
                  <span className="ml-2 text-xs text-neutral-600">
                    Optional
                  </span>
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={3}
                  maxLength={500}
                  placeholder="Describe this workout program"
                  className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
                />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Playback order
                    </h3>

                    <p className="mt-1 text-sm text-neutral-500">
                      Videos play from top to bottom.
                    </p>
                  </div>

                  {selectedVideos.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedVideos([])
                      }
                      className="text-xs font-medium text-red-400 hover:text-red-300"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>

                {selectedVideos.length === 0 ? (
                  <div className="mt-4 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-700 bg-neutral-950 px-6 text-center">
                    <Video
                      size={30}
                      className="text-neutral-600"
                    />

                    <h4 className="mt-4 font-medium">
                      No videos selected
                    </h4>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600">
                      Select videos from the library
                      displayed on the right.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {selectedVideos.map(
                      (item, index) => (
                        <div
                          key={item.selectionId}
                          className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-950 p-3"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-sm font-bold text-lime-400">
                            {index + 1}
                          </div>

                          <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
                            {item.video
                              .thumbnailUrl ? (
                              <img
                                src={
                                  item.video
                                    .thumbnailUrl
                                }
                                alt={
                                  item.video.name
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <video
                                src={
                                  item.video
                                    .videoUrl
                                }
                                preload="metadata"
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {item.video.name}
                            </p>

                            <p className="mt-1 text-xs text-neutral-600">
                              {formatDuration(
                                item.video
                                  .durationSeconds ??
                                  0
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() =>
                                moveVideo(
                                  index,
                                  "UP"
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:opacity-20"
                            >
                              <ArrowUp size={16} />
                            </button>

                            <button
                              type="button"
                              disabled={
                                index ===
                                selectedVideos.length -
                                  1
                              }
                              onClick={() =>
                                moveVideo(
                                  index,
                                  "DOWN"
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:opacity-20"
                            >
                              <ArrowDown
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removeVideo(
                                  item.selectionId
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-950/40"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  isSaving ||
                  !name.trim() ||
                  selectedVideos.length === 0
                }
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime-400 text-sm font-bold text-neutral-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Saving Program
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Workout Program
                  </>
                )}
              </button>
            </div>
          </form>

          <section className="h-fit overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="border-b border-neutral-800 px-5 py-4">
              <h2 className="font-semibold">
                Video Library
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Select a video to add it to the
                program.
              </p>

              <div className="relative mt-4">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
                />

                <input
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Search videos"
                  className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-10 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
                />
              </div>
            </div>

            <div className="max-h-[720px] space-y-3 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex min-h-52 items-center justify-center">
                  <Loader2
                    size={25}
                    className="animate-spin text-lime-400"
                  />
                </div>
              ) : activeVideos.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-600">
                  No active videos found.
                </div>
              ) : (
                activeVideos.map((video) => (
                  <div
                    key={video.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-3"
                  >
                    <div className="flex gap-3">
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
                        {video.thumbnailUrl ? (
                          <img
                            src={
                              video.thumbnailUrl
                            }
                            alt={video.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <video
                            src={video.videoUrl}
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {video.name}
                        </p>

                        <p className="mt-1 text-xs text-neutral-600">
                          {formatDuration(
                            video.durationSeconds ??
                              0
                          )}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            addVideo(video)
                          }
                          className="mt-2 flex items-center gap-1.5 text-xs font-bold text-lime-400 hover:text-lime-300"
                        >
                          <Plus size={14} />
                          Add to Program
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
          <div className="border-b border-neutral-800 px-5 py-4">
            <h2 className="font-semibold">
              Existing Programs
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Programs available for branch
              scheduling.
            </p>
          </div>

          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2
                size={28}
                className="animate-spin text-lime-400"
              />
            </div>
          ) : programs.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <ListChecks
                size={32}
                className="text-neutral-600"
              />

              <h3 className="mt-4 font-semibold">
                No workout programs
              </h3>

              <p className="mt-2 text-sm text-neutral-600">
                Create your first ordered video
                playlist above.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
              {programs.map((program) => {
                const programDuration =
                  program.items.reduce(
                    (total, item) =>
                      total +
                      (item.video
                        .durationSeconds ?? 0),
                    0
                  );

                return (
                  <article
                    key={program.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {program.name}
                          </h3>

                          <StatusBadge
                            active={
                              program.isActive
                            }
                          />
                        </div>

                        {program.description ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-500">
                            {program.description}
                          </p>
                        ) : null}
                      </div>

                      <ListChecks
                        size={20}
                        className="shrink-0 text-lime-400"
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <ProgramStat
                        label="Videos"
                        value={String(
                          program.items.length
                        )}
                      />

                      <ProgramStat
                        label="Duration"
                        value={formatDuration(
                          programDuration
                        )}
                      />

                      <ProgramStat
                        label="Branches"
                        value={String(
                          program._count
                            .assignments
                        )}
                      />
                    </div>

                    <div className="mt-5 border-t border-neutral-800 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                        Playback order
                      </p>

                      <div className="mt-3 space-y-2">
                        {program.items
                          .slice(0, 4)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-neutral-800 text-[10px] text-neutral-400">
                                {
                                  item.sortOrder
                                }
                              </span>

                              <span className="min-w-0 flex-1 truncate text-neutral-400">
                                {
                                  item.video
                                    .name
                                }
                              </span>
                            </div>
                          ))}

                        {program.items.length >
                        4 ? (
                          <p className="text-xs text-neutral-600">
                            +
                            {program.items
                              .length - 4}{" "}
                            more videos
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void toggleProgramStatus(
                            program
                          )
                        }
                        disabled={
                          updatingId ===
                          program.id
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:border-lime-400 hover:text-lime-400 disabled:opacity-50"
                      >
                        {updatingId ===
                        program.id ? (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        ) : program.isActive ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}

                        {program.isActive
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteProgram(
                            program
                          )
                        }
                        disabled={
                          deletingId ===
                          program.id
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-950 text-red-400 transition hover:border-red-800 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        {deletingId ===
                        program.id ? (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
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

function ProgramStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-neutral-900 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
        active
          ? "border-emerald-900 bg-emerald-950/40 text-emerald-400"
          : "border-neutral-700 bg-neutral-900 text-neutral-500"
      }`}
    >
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
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

  const seconds = totalSeconds % 60;

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