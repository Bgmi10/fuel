"use client";

import {
  Activity,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  Film,
  ImageIcon,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Video,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api, errorMessage, formatDuration, runPool } from "@/src/lib/tv/client";
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

const UPLOAD_CONCURRENCY = 3;

interface LibraryVideo {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  isActive: boolean;
  createdAt: string;
  _count: { programItems: number };
}

type QueueStatus = "waiting" | "reading" | "uploading" | "saving" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  name: string;
  status: QueueStatus;
  error?: string;
}

// ------------------------------------------------------------------
// Upload helpers
// ------------------------------------------------------------------

async function uploadFile(file: Blob, fileName: string): Promise<string> {
  const form = new FormData();
  form.append("file", file, fileName);

  const response = await fetch("/api/upload", { method: "POST", body: form });

  let payload: { url?: unknown; message?: string; error?: string } | null = null;

  try {
    payload = await response.json();
  } catch {
    /* non-JSON response */
  }

  if (!response.ok || typeof payload?.url !== "string") {
    throw new Error(payload?.message ?? payload?.error ?? "File upload failed.");
  }

  return payload.url;
}

/** Duration plus a JPEG frame for the thumbnail. A missing frame is not an error. */
function readVideoMeta(
  file: File
): Promise<{ durationSeconds: number; thumbnail: Blob | null }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (duration: number, thumbnail: Blob | null) => {
      if (finished) {
        return;
      }
      finished = true;
      if (timer) {
        clearTimeout(timer);
      }
      URL.revokeObjectURL(objectUrl);
      resolve({ durationSeconds: duration, thumbnail });
    };

    video.onerror = () => {
      if (finished) {
        return;
      }
      finished = true;
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read the selected video."));
    };

    video.onloadedmetadata = () => {
      const duration = Math.ceil(video.duration);

      if (!Number.isFinite(duration) || duration <= 0) {
        finished = true;
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read the video duration."));
        return;
      }

      // Some codecs never fire "seeked"; don't hang the upload on a thumbnail.
      timer = setTimeout(() => finish(duration, null), 8000);

      video.onseeked = () => {
        try {
          const width = Math.min(640, video.videoWidth || 640);
          const height = Math.round((width * (video.videoHeight || 360)) / (video.videoWidth || 640));
          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
          canvas.toBlob((blob) => finish(duration, blob), "image/jpeg", 0.8);
        } catch {
          finish(duration, null);
        }
      };

      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.src = objectUrl;
  });
}

const nameFromFile = (fileName: string) =>
  fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

/** Read, upload and register one video. */
async function ingestVideo(
  file: File,
  name: string,
  customThumbnail: File | null,
  onStage: (stage: "reading" | "uploading" | "saving") => void
): Promise<LibraryVideo> {
  onStage("reading");
  const meta = await readVideoMeta(file);

  onStage("uploading");

  const thumbnailSource = customThumbnail ?? meta.thumbnail;

  const [videoUrl, thumbnailUrl] = await Promise.all([
    uploadFile(file, file.name),
    thumbnailSource
      ? uploadFile(
          thumbnailSource,
          customThumbnail ? customThumbnail.name : `${nameFromFile(file.name) || "thumbnail"}.jpg`
        ).catch(() => null) // a failed thumbnail should not lose the video
      : Promise.resolve(null),
  ]);

  onStage("saving");

  return api<LibraryVideo>("/api/workout-videos", {
    method: "POST",
    body: JSON.stringify({
      name,
      videoUrl,
      thumbnailUrl,
      durationSeconds: meta.durationSeconds,
    }),
  });
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function WorkoutLibraryPage() {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const bulkInput = useRef<HTMLInputElement | null>(null);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LibraryVideo | null>(null);
  const [previewing, setPreviewing] = useState<LibraryVideo | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Debounce the search box into the query that hits the server.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ limit: "500" });
      if (query) {
        params.set("q", query);
      }
      if (filter !== "all") {
        params.set("active", filter === "active" ? "true" : "false");
      }

      setVideos(await api<LibraryVideo[]>(`/api/workout-videos?${params.toString()}`));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [query, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: videos.length,
      active: videos.filter((video) => video.isActive).length,
      duration: videos.reduce((sum, video) => sum + (video.durationSeconds ?? 0), 0),
    }),
    [videos]
  );

  // ---------------- Bulk upload ----------------

  function patchItem(id: string, changes: Partial<QueueItem>) {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  }

  async function startBulk(files: File[]) {
    const valid = files.filter((file) => file.type.startsWith("video/"));

    if (valid.length === 0) {
      setError("Please select video files.");
      return;
    }

    const items: QueueItem[] = valid.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: nameFromFile(file.name) || "Workout video",
      status: "waiting",
    }));

    setQueue(items);
    setBulkRunning(true);
    setError("");
    setSuccess("");

    let uploaded = 0;

    await runPool(items, UPLOAD_CONCURRENCY, async (item) => {
      try {
        await ingestVideo(item.file, item.name, null, (stage) =>
          patchItem(item.id, { status: stage })
        );
        uploaded += 1;
        patchItem(item.id, { status: "done" });
      } catch (uploadError) {
        patchItem(item.id, { status: "error", error: errorMessage(uploadError) });
      }
    });

    setBulkRunning(false);
    setSuccess(`${uploaded} of ${items.length} videos uploaded.`);
    await load();
  }

  // ---------------- Row actions ----------------

  async function toggleActive(video: LibraryVideo) {
    try {
      setBusyId(video.id);
      setError("");
      await api(`/api/workout-videos/${video.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !video.isActive }),
      });
      await load();
    } catch (toggleError) {
      setError(errorMessage(toggleError));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(video: LibraryVideo) {
    if (!window.confirm(`Delete "${video.name}" from the library?`)) {
      return;
    }

    try {
      setBusyId(video.id);
      setError("");
      setSuccess("");
      await api(`/api/workout-videos/${video.id}`, { method: "DELETE" });
      await load();
      setSuccess(`${video.name} was removed.`);
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusyId(null);
    }
  }

  const done = queue.filter((item) => item.status === "done" || item.status === "error").length;
  const failed = queue.filter((item) => item.status === "error").length;

  return (
    <div className="min-h-full bg-zinc-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          icon={<Video size={25} />}
          title="Workout Video Library"
          description="Upload and manage the videos used in workout programs and broadcasts."
          actions={
            <>
              <input
                ref={bulkInput}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  if (files.length > 0) {
                    void startBulk(files);
                  }
                }}
              />
              <PrimaryButton onClick={() => setAdding(true)}>
                <Plus size={17} />
                Add Video
              </PrimaryButton>
              <SecondaryButton
                onClick={() => bulkInput.current?.click()}
                disabled={bulkRunning}
              >
                {bulkRunning ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Bulk Upload
              </SecondaryButton>
              <SecondaryButton onClick={() => void load()} disabled={loading}>
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </SecondaryButton>
            </>
          }
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Videos shown" value={String(stats.total)} icon={<Film size={20} />} />
          <Stat label="Active" value={String(stats.active)} icon={<Activity size={20} />} />
          <Stat
            label="Total duration"
            value={formatDuration(stats.duration)}
            icon={<Clock3 size={20} />}
          />
        </section>

        <div className="mt-6">
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
        </div>

        {queue.length > 0 && (
          <section className="mb-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-semibold">Bulk upload</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {UPLOAD_CONCURRENCY} at a time. {done}/{queue.length} finished
                  {failed > 0 ? `, ${failed} failed` : ""}.
                </p>
              </div>
              {!bulkRunning && (
                <button
                  type="button"
                  onClick={() => setQueue([])}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="h-1.5 bg-zinc-800">
              <div
                className="h-full bg-lime-400 transition-all"
                style={{ width: `${(done / queue.length) * 100}%` }}
              />
            </div>

            <div className="max-h-72 space-y-1.5 overflow-y-auto p-4">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200">{item.name}</p>
                    {item.error && <p className="mt-0.5 text-xs text-red-400">{item.error}</p>}
                  </div>
                  <QueueBadge status={item.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search videos by name..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            {(["all", "active", "inactive"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                  filter === value ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {loading && videos.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-lime-400" />
          </div>
        ) : videos.length === 0 ? (
          <EmptyState
            icon={<Video size={34} />}
            title={query || filter !== "all" ? "No matching videos" : "No workout videos yet"}
            hint={
              query || filter !== "all"
                ? "Try a different search or filter."
                : "Upload your first workout video to start building programs."
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {videos.map((video) => (
              <article
                key={video.id}
                className={`overflow-hidden rounded-2xl border bg-zinc-900/50 ${
                  video.isActive ? "border-zinc-800" : "border-zinc-800 opacity-60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setPreviewing(video)}
                  className="group relative block aspect-video w-full bg-black"
                >
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt={video.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-700">
                      <ImageIcon size={32} />
                    </div>
                  )}

                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                    <Play size={34} className="text-white" />
                  </span>

                  {!video.isActive && (
                    <span className="absolute left-3 top-3 rounded-full border border-zinc-600 bg-zinc-900/90 px-2.5 py-1 text-xs text-zinc-400">
                      Disabled
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 text-xs font-semibold">
                    {formatDuration(video.durationSeconds)}
                  </span>
                </button>

                <div className="p-4">
                  <h3 className="truncate font-semibold">{video.name}</h3>
                  <p className="mt-1 text-xs text-zinc-600">
                    {video._count.programItems > 0
                      ? `Used in ${video._count.programItems} program slot${
                          video._count.programItems !== 1 ? "s" : ""
                        }`
                      : "Not used in any program"}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(video)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-lime-400 hover:text-lime-400"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    <IconAction
                      title={video.isActive ? "Disable video" : "Enable video"}
                      busy={busyId === video.id}
                      onClick={() => void toggleActive(video)}
                    >
                      {video.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                    </IconAction>
                    <IconAction
                      title="Delete video"
                      danger
                      busy={busyId === video.id}
                      onClick={() => void remove(video)}
                    >
                      <Trash2 size={15} />
                    </IconAction>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {adding && (
        <AddVideoModal
          onClose={() => setAdding(false)}
          onAdded={async (name) => {
            setAdding(false);
            setSuccess(`${name} was added to the library.`);
            await load();
          }}
        />
      )}

      {editing && (
        <EditVideoModal
          video={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            setSuccess("Video updated.");
            await load();
          }}
        />
      )}

      {previewing && (
        <Modal title={previewing.name} onClose={() => setPreviewing(null)} wide>
          <video
            src={previewing.videoUrl}
            controls
            autoPlay
            className="aspect-video w-full rounded-lg bg-black"
          />
        </Modal>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Modals
// ------------------------------------------------------------------

function AddVideoModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) {
      setError("Choose a video file.");
      return;
    }

    const finalName = name.trim() || nameFromFile(file.name);

    if (!finalName) {
      setError("Enter a workout name.");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const video = await ingestVideo(file, finalName, thumbnail, (next) =>
        setStage({ reading: "Reading video...", uploading: "Uploading...", saving: "Saving..." }[next])
      );

      await onAdded(video.name);
    } catch (submitError) {
      setError(errorMessage(submitError));
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Add Workout Video"
      subtitle="A thumbnail is generated automatically unless you choose one."
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={() => void submit()} loading={busy}>
            {busy ? stage || "Working..." : "Add to Library"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <Banner tone="error" onClose={() => setError("")}>
            {error}
          </Banner>
        )}

        <Field label="Video file">
          <input
            type="file"
            accept="video/*"
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              setFile(chosen);
              if (chosen && !name.trim()) {
                setName(nameFromFile(chosen.name));
              }
            }}
            className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-white"
          />
        </Field>

        <Field label="Workout name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="Example: Jumping Jacks"
            className={inputClass}
          />
        </Field>

        <Field label="Thumbnail (optional)">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setThumbnail(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-white"
          />
        </Field>
      </div>
    </Modal>
  );
}

function EditVideoModal({
  video,
  onClose,
  onSaved,
}: {
  video: LibraryVideo;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(video.name);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(video.thumbnailUrl);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function replaceThumbnail(file: File) {
    try {
      setUploading(true);
      setError("");
      setThumbnailUrl(await uploadFile(file, file.name));
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      setError("Enter a workout name.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      await api(`/api/workout-videos/${video.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), thumbnailUrl }),
      });
      await onSaved();
    } catch (saveError) {
      setError(errorMessage(saveError));
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit Video"
      subtitle="Programs and schedules show the new name. Broadcasts already created keep theirs until edited."
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={() => void save()} loading={busy} disabled={uploading}>
            Save changes
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <Banner tone="error" onClose={() => setError("")}>
            {error}
          </Banner>
        )}

        <Field label="Workout name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            className={inputClass}
          />
        </Field>

        <Field label="Thumbnail">
          <div className="space-y-3">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt=""
                className="aspect-video w-full rounded-lg border border-zinc-800 object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-700">
                <ImageIcon size={30} />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(event) => {
                  const chosen = event.target.files?.[0];
                  event.target.value = "";
                  if (chosen) {
                    void replaceThumbnail(chosen);
                  }
                }}
                className="block min-w-0 flex-1 text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-white"
              />
              {uploading && <Loader2 size={16} className="animate-spin text-lime-400" />}
              {thumbnailUrl && !uploading && (
                <button
                  type="button"
                  onClick={() => setThumbnailUrl(null)}
                  className="shrink-0 text-xs text-zinc-500 hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------
// Small pieces
// ------------------------------------------------------------------

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">{label}</span>
        <span className="text-zinc-600">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function IconAction({
  title,
  danger,
  busy,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={busy}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-50 ${
        danger
          ? "border-red-950 text-red-400 hover:border-red-800 hover:bg-red-950/40"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
      }`}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : children}
    </button>
  );
}

function QueueBadge({ status }: { status: QueueStatus }) {
  if (status === "done") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
        <CheckCircle2 size={15} />
        Uploaded
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
        <XCircle size={15} />
        Failed
      </span>
    );
  }

  if (status === "waiting") {
    return <span className="text-xs text-zinc-500">Waiting</span>;
  }

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium capitalize text-lime-400">
      <Loader2 size={14} className="animate-spin" />
      {status}
    </span>
  );
}
