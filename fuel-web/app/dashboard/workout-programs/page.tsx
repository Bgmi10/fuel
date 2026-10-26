"use client";

import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  EyeOff,
  Film,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api, errorMessage, formatDuration } from "@/src/lib/tv/client";
import {
  Banner,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  inputClass,
} from "@/src/components/tv/ui";

type Intensity = "LOW" | "MEDIUM" | "HIGH";

interface LibraryVideo {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  isActive: boolean;
}

interface Program {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  intensity: Intensity | null;
  isActive: boolean;
  items: { id: string; sortOrder: number; video: LibraryVideo }[];
  _count: { schedules: number };
}

interface Draft {
  id: string | null;
  name: string;
  subtitle: string;
  description: string;
  intensity: Intensity | "";
  videoIds: string[];
}

const blankDraft = (): Draft => ({
  id: null,
  name: "",
  subtitle: "",
  description: "",
  intensity: "",
  videoIds: [],
});

const INTENSITY_STYLE: Record<Intensity, string> = {
  LOW: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  MEDIUM: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  HIGH: "border-red-400/20 bg-red-400/10 text-red-300",
};

export default function WorkoutProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [videoSearch, setVideoSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [programList, videoList] = await Promise.all([
        api<Program[]>("/api/workout-programs"),
        api<LibraryVideo[]>("/api/workout-videos?active=true&limit=500"),
      ]);

      setPrograms(programList);
      setVideos(videoList);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Every video we know by id, including disabled ones already inside a program. */
  const videoById = useMemo(() => {
    const map = new Map<string, LibraryVideo>();

    for (const program of programs) {
      for (const item of program.items) {
        map.set(item.video.id, item.video);
      }
    }
    for (const video of videos) {
      map.set(video.id, video);
    }

    return map;
  }, [programs, videos]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return programs.filter(
      (program) =>
        !query ||
        program.name.toLowerCase().includes(query) ||
        program.subtitle?.toLowerCase().includes(query)
    );
  }, [programs, search]);

  const libraryMatches = useMemo(() => {
    const query = videoSearch.trim().toLowerCase();
    return videos.filter((video) => !query || video.name.toLowerCase().includes(query));
  }, [videos, videoSearch]);

  function openEditor(program: Program | null) {
    setModalError("");
    setVideoSearch("");
    setDraft(
      program
        ? {
            id: program.id,
            name: program.name,
            subtitle: program.subtitle ?? "",
            description: program.description ?? "",
            intensity: program.intensity ?? "",
            videoIds: program.items
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => item.video.id),
          }
        : blankDraft()
    );
  }

  function patch(changes: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...changes } : current));
  }

  function move(index: number, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const target = index + direction;

      if (target < 0 || target >= current.videoIds.length) {
        return current;
      }

      const videoIds = current.videoIds.slice();
      [videoIds[index], videoIds[target]] = [videoIds[target], videoIds[index]];

      return { ...current, videoIds };
    });
  }

  async function save() {
    if (!draft) {
      return;
    }

    if (!draft.name.trim()) {
      setModalError("Enter a program title.");
      return;
    }

    if (draft.videoIds.length === 0) {
      setModalError("Select at least one exercise.");
      return;
    }

    const body = {
      name: draft.name.trim(),
      subtitle: draft.subtitle.trim() || null,
      description: draft.description.trim() || null,
      intensity: draft.intensity || null,
      videoIds: draft.videoIds,
    };

    try {
      setSaving(true);
      setModalError("");

      await api(draft.id ? `/api/workout-programs/${draft.id}` : "/api/workout-programs", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });

      setDraft(null);
      setSuccess(draft.id ? "Program updated." : "Program created.");
      await load();
    } catch (saveError) {
      setModalError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(program: Program) {
    try {
      setBusyId(program.id);
      setError("");
      await api(`/api/workout-programs/${program.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !program.isActive }),
      });
      await load();
    } catch (toggleError) {
      setError(errorMessage(toggleError));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(program: Program) {
    if (!window.confirm(`Delete "${program.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setBusyId(program.id);
      setError("");
      setSuccess("");
      await api(`/api/workout-programs/${program.id}`, { method: "DELETE" });
      await load();
      setSuccess("Program deleted.");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusyId(null);
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="min-h-full bg-zinc-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          icon={<Layers size={25} />}
          title="Workout Programs"
          description="Reusable programs built from your video library. Schedules start from these."
          actions={
            <PrimaryButton onClick={() => openEditor(null)}>
              <Plus size={17} />
              Create Program
            </PrimaryButton>
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

        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search programs..."
            className={`${inputClass} pl-9`}
          />
        </div>

        {loading && programs.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-lime-400" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Layers size={34} />}
            title={search ? "No matching programs" : "No workout programs"}
            hint={
              search
                ? "Try a different search."
                : "Create a program from your library, then schedule it on the calendar."
            }
            action={
              !search && (
                <PrimaryButton onClick={() => openEditor(null)}>
                  <Plus size={16} />
                  Create Program
                </PrimaryButton>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((program) => {
              const open = expanded.has(program.id);
              const totalSeconds = program.items.reduce(
                (sum, item) => sum + (item.video.durationSeconds ?? 0),
                0
              );
              const used = program._count.schedules > 0;

              return (
                <div
                  key={program.id}
                  className={`overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 ${
                    program.isActive ? "" : "opacity-70"
                  }`}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(program.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400">
                        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>

                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold">{program.name}</span>
                          {program.intensity && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                INTENSITY_STYLE[program.intensity]
                              }`}
                            >
                              {program.intensity}
                            </span>
                          )}
                          {!program.isActive && (
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                              Disabled
                            </span>
                          )}
                        </span>
                        {program.subtitle && (
                          <span className="mt-1 block truncate text-xs text-zinc-500">
                            {program.subtitle}
                          </span>
                        )}
                        <span className="mt-1.5 block text-[11px] text-zinc-500">
                          {program.items.length} exercise{program.items.length !== 1 ? "s" : ""} ·{" "}
                          {formatDuration(totalSeconds)} of video · scheduled{" "}
                          {program._count.schedules}×
                        </span>
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-2">
                      <SecondaryButton onClick={() => openEditor(program)}>
                        <Edit3 size={14} />
                        Edit
                      </SecondaryButton>
                      <SecondaryButton
                        onClick={() => void toggleActive(program)}
                        disabled={busyId === program.id}
                      >
                        {program.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                        {program.isActive ? "Disable" : "Enable"}
                      </SecondaryButton>
                      <SecondaryButton
                        danger
                        onClick={() => void remove(program)}
                        disabled={busyId === program.id || used}
                      >
                        <Trash2 size={14} />
                        Delete
                      </SecondaryButton>
                    </div>
                  </div>

                  {used && open && (
                    <p className="border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-600">
                      Used by schedules, so it can be disabled but not deleted.
                    </p>
                  )}

                  {open && (
                    <div className="border-t border-zinc-800 bg-black/20 p-4">
                      {program.description && (
                        <p className="mb-4 text-sm leading-6 text-zinc-400">
                          {program.description}
                        </p>
                      )}

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {program.items
                          .slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((item, index) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs text-zinc-400">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm text-zinc-200">{item.video.name}</p>
                                <p className="text-[10px] text-zinc-600">
                                  {formatDuration(item.video.durationSeconds)}
                                  {!item.video.isActive && (
                                    <span className="ml-2 text-red-400">Disabled</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {draft && (
        <Modal
          wide
          title={draft.id ? "Edit Workout Program" : "Create Workout Program"}
          subtitle="Exercises play in the order listed. The same video can be added more than once."
          onClose={() => setDraft(null)}
          closeDisabled={saving}
          footer={
            <>
              <span className="mr-auto text-xs text-zinc-600">
                {draft.videoIds.length} exercise{draft.videoIds.length !== 1 ? "s" : ""}
              </span>
              <SecondaryButton onClick={() => setDraft(null)} disabled={saving}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={() => void save()} loading={saving}>
                {draft.id ? "Update Program" : "Create Program"}
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
            <div className="space-y-4">
              <Field label="Title">
                <input
                  value={draft.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  placeholder="Example: Morning Strength"
                  className={inputClass}
                />
              </Field>
              <Field label="Subtitle">
                <input
                  value={draft.subtitle}
                  onChange={(event) => patch({ subtitle: event.target.value })}
                  placeholder="Example: Full body workout"
                  className={inputClass}
                />
              </Field>
              <Field label="Intensity">
                <select
                  value={draft.intensity}
                  onChange={(event) => patch({ intensity: event.target.value as Intensity | "" })}
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </Field>
              <Field label="Description">
                <textarea
                  value={draft.description}
                  onChange={(event) => patch({ description: event.target.value })}
                  rows={4}
                  placeholder="Describe the workout program..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <div>
                <p className="mb-2 text-xs font-medium text-zinc-400">Selected exercises</p>

                {draft.videoIds.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center text-xs text-zinc-600">
                    Pick exercises from the library.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draft.videoIds.map((videoId, index) => {
                      const video = videoById.get(videoId);

                      return (
                        <div
                          key={`${videoId}-${index}`}
                          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[11px] text-zinc-500">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                            {video?.name ?? "Unknown video"}
                            {video && !video.isActive && (
                              <span className="ml-2 text-red-400">Disabled: remove it</span>
                            )}
                          </span>
                          <MiniButton
                            label="Move up"
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                          >
                            <ChevronUp size={15} />
                          </MiniButton>
                          <MiniButton
                            label="Move down"
                            disabled={index === draft.videoIds.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            <ChevronDown size={15} />
                          </MiniButton>
                          <MiniButton
                            label="Remove"
                            danger
                            onClick={() =>
                              patch({
                                videoIds: draft.videoIds.filter((_, position) => position !== index),
                              })
                            }
                          >
                            <X size={15} />
                          </MiniButton>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">Workout library</p>

              <div className="relative mb-3">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                />
                <input
                  value={videoSearch}
                  onChange={(event) => setVideoSearch(event.target.value)}
                  placeholder="Search exercises..."
                  className={`${inputClass} pl-9`}
                />
              </div>

              <div className="max-h-[480px] divide-y divide-zinc-900 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
                {libraryMatches.length === 0 ? (
                  <p className="px-4 py-10 text-center text-xs text-zinc-600">
                    No active exercises found.
                  </p>
                ) : (
                  libraryMatches.map((video) => {
                    const count = draft.videoIds.filter((id) => id === video.id).length;

                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => patch({ videoIds: [...draft.videoIds, video.id] })}
                        className="flex w-full items-center gap-3 p-3 text-left hover:bg-zinc-900/70"
                      >
                        {video.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={video.thumbnailUrl}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-zinc-900 text-zinc-700">
                            <Film size={15} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-zinc-300">
                            {video.name}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {formatDuration(video.durationSeconds)}
                          </span>
                        </span>
                        {count > 0 && (
                          <span className="rounded-full bg-lime-400/10 px-2 py-0.5 text-[10px] font-semibold text-lime-400">
                            ×{count}
                          </span>
                        )}
                        <Plus size={15} className="shrink-0 text-zinc-600" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MiniButton({
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
      className={`rounded p-1 text-zinc-600 disabled:opacity-20 ${
        danger ? "hover:bg-red-500/10 hover:text-red-400" : "hover:bg-zinc-900 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
