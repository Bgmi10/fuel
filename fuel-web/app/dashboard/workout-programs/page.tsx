"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type WorkoutVideo = {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  isActive?: boolean;
};

type WorkoutProgramItem = {
  id: string;
  videoId: string;
  sortOrder: number;
  video: WorkoutVideo | null;
};

type WorkoutProgram = {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  intensity: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: WorkoutProgramItem[];
  _count?: {
    assignments: number;
    schedules: number;
  };
};

type ProgramForm = {
  name: string;
  subtitle: string;
  description: string;
  intensity: string;
  items: string[];
};

const initialForm: ProgramForm = {
  name: "",
  subtitle: "",
  description: "",
  intensity: "",
  items: [],
};

export default function WorkoutProgramsPage() {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [videos, setVideos] = useState<WorkoutVideo[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [videoError, setVideoError] = useState("");

  const [search, setSearch] = useState("");
  const [videoSearch, setVideoSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] =
    useState<WorkoutProgram | null>(null);

  const [form, setForm] = useState<ProgramForm>(initialForm);

  const [expandedPrograms, setExpandedPrograms] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    loadPrograms();
    loadVideos();
  }, []);

  async function loadPrograms() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/workout-programs", {
        method: "GET",
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to load workout programs"
        );
      }

      if (!Array.isArray(payload)) {
        throw new Error("Invalid workout programs response");
      }

      setPrograms(payload);
    } catch (err) {
      console.error("loadPrograms error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load workout programs"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadVideos() {
    try {
      setLoadingVideos(true);
      setVideoError("");

      const response = await fetch("/api/workout-videos", {
        method: "GET",
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to load workout videos"
        );
      }

      /*
       * Keep compatibility with the existing workout-videos
       * response shape.
       */
      const videoList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.videos)
          ? payload.videos
          : [];

      setVideos(videoList);
    } catch (err) {
      console.error("loadVideos error:", err);

      setVideoError(
        err instanceof Error
          ? err.message
          : "Failed to load workout videos"
      );
    } finally {
      setLoadingVideos(false);
    }
  }

  function openCreateModal() {
    setEditingProgram(null);
    setForm(initialForm);
    setError("");
    setShowModal(true);
  }

  function openEditModal(program: WorkoutProgram) {
    setEditingProgram(program);

    setForm({
      name: program.name || "",
      subtitle: program.subtitle || "",
      description: program.description || "",
      intensity: program.intensity || "",
      items: program.items
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => item.videoId),
    });

    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingProgram(null);
    setForm(initialForm);
  }

  function toggleProgram(programId: string) {
    setExpandedPrograms((current) => ({
      ...current,
      [programId]: !current[programId],
    }));
  }

  function toggleVideo(videoId: string) {
    setForm((current) => {
      const alreadySelected = current.items.includes(videoId);

      if (alreadySelected) {
        return {
          ...current,
          items: current.items.filter((id) => id !== videoId),
        };
      }

      return {
        ...current,
        items: [...current.items, videoId],
      };
    });
  }

  function removeSelectedVideo(videoId: string) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((id) => id !== videoId),
    }));
  }

  function moveVideoUp(index: number) {
    if (index <= 0) return;

    setForm((current) => {
      const items = [...current.items];

      [items[index - 1], items[index]] = [
        items[index],
        items[index - 1],
      ];

      return {
        ...current,
        items,
      };
    });
  }

  function moveVideoDown(index: number) {
    if (index >= form.items.length - 1) return;

    setForm((current) => {
      const items = [...current.items];

      [items[index], items[index + 1]] = [
        items[index + 1],
        items[index],
      ];

      return {
        ...current,
        items,
      };
    });
  }

  async function saveProgram() {
    if (!form.name.trim()) {
      setError("Program title is required.");
      return;
    }

    if (form.items.length === 0) {
      setError("Select at least one exercise/video.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const body = {
        name: form.name.trim(),
        title: form.name.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        intensity: form.intensity.trim(),
        items: form.items.map((videoId) => ({
          videoId,
        })),
      };

      const response = await fetch(
        editingProgram
          ? `/api/workout-programs/${editingProgram.id}`
          : "/api/workout-programs",
        {
          method: editingProgram ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const payload = await response.json();

      /*
       * IMPORTANT:
       *
       * POST /api/workout-programs returns the program directly.
       * PATCH /api/workout-programs/[id] also returns the program directly.
       *
       * Therefore we DO NOT use:
       *
       * payload.program
       *
       * and we DO NOT require:
       *
       * payload.success
       */

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            (editingProgram
              ? "Failed to update workout program"
              : "Failed to create workout program")
        );
      }

      const savedProgram = payload as WorkoutProgram;

      if (!savedProgram?.id) {
        throw new Error("Invalid workout program response");
      }

      if (editingProgram) {
        setPrograms((current) =>
          current.map((program) =>
            program.id === savedProgram.id
              ? savedProgram
              : program
          )
        );
      } else {
        setPrograms((current) => [
          savedProgram,
          ...current,
        ]);
      }

      closeModal();
    } catch (err) {
      console.error("saveProgram error:", err);

      setError(
        err instanceof Error
          ? err.message
          : editingProgram
            ? "Failed to update workout program"
            : "Failed to create workout program"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProgram(program: WorkoutProgram) {
    const hasAssignments =
      (program._count?.assignments ?? 0) > 0;

    const hasSchedules =
      (program._count?.schedules ?? 0) > 0;

    if (hasAssignments || hasSchedules) {
      setError(
        hasSchedules
          ? "This program cannot be deleted because it is used by existing schedules."
          : "This program cannot be deleted because it has existing assignments."
      );

      return;
    }

    const confirmed = window.confirm(
      `Delete "${program.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleting(program.id);
      setError("");

      const response = await fetch(
        `/api/workout-programs/${program.id}`,
        {
          method: "DELETE",
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to delete workout program"
        );
      }

      setPrograms((current) =>
        current.filter((item) => item.id !== program.id)
      );
    } catch (err) {
      console.error("deleteProgram error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete workout program"
      );
    } finally {
      setDeleting(null);
    }
  }

  const filteredPrograms = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return programs;
    }

    return programs.filter((program) => {
      return (
        program.name.toLowerCase().includes(query) ||
        program.subtitle?.toLowerCase().includes(query) ||
        program.description?.toLowerCase().includes(query) ||
        program.intensity?.toLowerCase().includes(query)
      );
    });
  }, [programs, search]);

  const filteredVideos = useMemo(() => {
    const query = videoSearch.trim().toLowerCase();

    const activeVideos = videos.filter(
      (video) => video.isActive !== false
    );

    if (!query) {
      return activeVideos;
    }

    return activeVideos.filter((video) => {
      const title =
        video.title ||
        video.name ||
        "";

      return title.toLowerCase().includes(query);
    });
  }, [videos, videoSearch]);

  const selectedVideos = useMemo(() => {
    return form.items
      .map((videoId) =>
        videos.find((video) => video.id === videoId)
      )
      .filter(
        (video): video is WorkoutVideo =>
          Boolean(video)
      );
  }, [form.items, videos]);

  function getVideoTitle(video: WorkoutVideo) {
    return video.title || video.name || "Untitled Exercise";
  }

  function formatDate(date: string) {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(date));
    } catch {
      return date;
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Workout Programs
            </h1>

            <p className="mt-1 text-sm text-zinc-400">
              Create centralized workout programs from your exercise
              library.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-semibold text-black transition hover:bg-lime-300"
          >
            <Plus size={17} />
            Create Program
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-red-300 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search programs..."
              className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-lime-400/60"
            />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading workout programs...
            </div>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
              <Plus
                size={22}
                className="text-zinc-500"
              />
            </div>

            <h2 className="text-base font-medium text-white">
              No workout programs
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Create a centralized program using your workout
              library.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-black hover:bg-lime-300"
            >
              <Plus size={16} />
              Create Program
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPrograms.map((program) => {
              const expanded =
                expandedPrograms[program.id] ?? false;

              return (
                <div
                  key={program.id}
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
                >
                  {/* Program header */}
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        toggleProgram(program.id)
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400">
                        {expanded ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-white">
                            {program.name}
                          </h2>

                          {!program.isActive && (
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                              Inactive
                            </span>
                          )}
                        </div>

                        {program.subtitle && (
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {program.subtitle}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                          <span>
                            {program.items.length}{" "}
                            {program.items.length === 1
                              ? "exercise"
                              : "exercises"}
                          </span>

                          <span className="text-zinc-700">
                            •
                          </span>

                          <span>
                            {program._count?.schedules ?? 0}{" "}
                            {(
                              program._count?.schedules ?? 0
                            ) === 1
                              ? "schedule"
                              : "schedules"}
                          </span>

                          {program.intensity && (
                            <>
                              <span className="text-zinc-700">
                                •
                              </span>

                              <span>
                                {program.intensity}
                              </span>
                            </>
                          )}

                          <span className="text-zinc-700">
                            •
                          </span>

                          <span>
                            {formatDate(program.createdAt)}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(program)
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
                      >
                        <Edit size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteProgram(program)
                        }
                        disabled={
                          deleting === program.id ||
                          (program._count?.schedules ?? 0) >
                            0 ||
                          (program._count?.assignments ?? 0) >
                            0
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deleting === program.id ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expanded && (
                    <div className="border-t border-zinc-800 bg-black/20 px-4 py-4">
                      {program.description && (
                        <div className="mb-4">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                            Description
                          </p>

                          <p className="text-sm leading-6 text-zinc-400">
                            {program.description}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                          Exercises
                        </p>

                        {program.items.length === 0 ? (
                          <p className="text-sm text-zinc-600">
                            No exercises added.
                          </p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {program.items
                              .sort(
                                (a, b) =>
                                  a.sortOrder -
                                  b.sortOrder
                              )
                              .map((item, index) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3"
                                >
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-medium text-zinc-400">
                                    {index + 1}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm text-zinc-200">
                                      {item.video
                                        ? getVideoTitle(
                                            item.video
                                          )
                                        : "Video unavailable"}
                                    </p>

                                    {item.video &&
                                      item.video.isActive ===
                                        false && (
                                        <p className="mt-0.5 text-[10px] text-red-400">
                                          Inactive
                                        </p>
                                      )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0c0c0f] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editingProgram
                    ? "Edit Workout Program"
                    : "Create Workout Program"}
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Build the centralized program from your workout
                  library.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-white disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal content */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.2fr]">
                {/* Left - details */}
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                        Title
                      </label>

                      <input
                        type="text"
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Example: Morning Strength"
                        className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-lime-400/60"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                        Subtitle
                      </label>

                      <input
                        type="text"
                        value={form.subtitle}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            subtitle: event.target.value,
                          }))
                        }
                        placeholder="Example: Full body workout"
                        className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-lime-400/60"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                        Intensity Level
                      </label>

                      <select
                        value={form.intensity}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            intensity: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-lime-400/60"
                      >
                        <option value="">
                          Select intensity
                        </option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">
                          Medium
                        </option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                        Description
                      </label>

                      <textarea
                        value={form.description}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            description:
                              event.target.value,
                          }))
                        }
                        placeholder="Describe the workout program..."
                        rows={5}
                        className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-lime-400/60"
                      />
                    </div>
                  </div>

                  {/* Selected exercises */}
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-zinc-300">
                          Selected Exercises
                        </p>

                        <p className="mt-0.5 text-[11px] text-zinc-600">
                          Order matters for the program.
                        </p>
                      </div>

                      <span className="rounded-full bg-lime-400/10 px-2 py-1 text-[11px] font-medium text-lime-400">
                        {form.items.length}
                      </span>
                    </div>

                    {selectedVideos.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center">
                        <p className="text-xs text-zinc-600">
                          Select exercises from the library.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {form.items.map(
                          (videoId, index) => {
                            const video = videos.find(
                              (item) =>
                                item.id === videoId
                            );

                            if (!video) {
                              return null;
                            }

                            return (
                              <div
                                key={videoId}
                                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2"
                              >
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[11px] text-zinc-500">
                                  {index + 1}
                                </div>

                                <p className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                                  {getVideoTitle(
                                    video
                                  )}
                                </p>

                                <button
                                  type="button"
                                  onClick={() =>
                                    moveVideoUp(
                                      index
                                    )
                                  }
                                  disabled={
                                    index === 0
                                  }
                                  className="rounded p-1 text-zinc-600 hover:bg-zinc-900 hover:text-white disabled:opacity-20"
                                >
                                  <ChevronUp
                                    size={15}
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    moveVideoDown(
                                      index
                                    )
                                  }
                                  disabled={
                                    index ===
                                    form.items.length -
                                      1
                                  }
                                  className="rounded p-1 text-zinc-600 hover:bg-zinc-900 hover:text-white disabled:opacity-20"
                                >
                                  <ChevronDown
                                    size={15}
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeSelectedVideo(
                                      videoId
                                    )
                                  }
                                  className="rounded p-1 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right - video library */}
                <div className="min-h-[400px]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-zinc-300">
                        Workout Library
                      </p>

                      <p className="mt-0.5 text-[11px] text-zinc-600">
                        Select active exercises/videos.
                      </p>
                    </div>

                    {loadingVideos && (
                      <Loader2
                        size={15}
                        className="animate-spin text-zinc-500"
                      />
                    )}
                  </div>

                  <div className="relative mb-3">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                    />

                    <input
                      type="text"
                      value={videoSearch}
                      onChange={(event) =>
                        setVideoSearch(
                          event.target.value
                        )
                      }
                      placeholder="Search exercises..."
                      className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-lime-400/60"
                    />
                  </div>

                  {videoError && (
                    <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                      {videoError}
                    </div>
                  )}

                  <div className="max-h-[520px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
                    {loadingVideos ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2
                          size={18}
                          className="animate-spin text-zinc-600"
                        />
                      </div>
                    ) : filteredVideos.length === 0 ? (
                      <div className="px-4 py-12 text-center">
                        <p className="text-xs text-zinc-600">
                          No active exercises found.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-900">
                        {filteredVideos.map(
                          (video) => {
                            const selected =
                              form.items.includes(
                                video.id
                              );

                            return (
                              <button
                                key={video.id}
                                type="button"
                                onClick={() =>
                                  toggleVideo(
                                    video.id
                                  )
                                }
                                className={`flex w-full items-center gap-3 p-3 text-left transition ${
                                  selected
                                    ? "bg-lime-400/5"
                                    : "hover:bg-zinc-900/70"
                                }`}
                              >
                                <div
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                                    selected
                                      ? "border-lime-400 bg-lime-400 text-black"
                                      : "border-zinc-700 bg-zinc-900 text-transparent"
                                  }`}
                                >
                                  ✓
                                </div>

                                {video.thumbnailUrl ? (
                                  <img
                                    src={
                                      video.thumbnailUrl
                                    }
                                    alt=""
                                    className="h-10 w-14 shrink-0 rounded object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-zinc-900 text-[9px] text-zinc-700">
                                    VIDEO
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`truncate text-xs font-medium ${
                                      selected
                                        ? "text-lime-300"
                                        : "text-zinc-300"
                                    }`}
                                  >
                                    {getVideoTitle(
                                      video
                                    )}
                                  </p>

                                  {video.description && (
                                    <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                                      {
                                        video.description
                                      }
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex flex-col-reverse gap-2 border-t border-zinc-800 bg-zinc-950/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-zinc-600">
                {form.items.length}{" "}
                {form.items.length === 1
                  ? "exercise"
                  : "exercises"}{" "}
                selected
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-4 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveProgram}
                  disabled={
                    saving ||
                    !form.name.trim() ||
                    form.items.length === 0
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 text-xs font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving && (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  )}

                  {editingProgram
                    ? "Update Program"
                    : "Create Program"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}