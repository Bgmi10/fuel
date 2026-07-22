"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Film,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

type WorkoutVideo = {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type WorkoutVideosResponse = {
  success: boolean;
  videos?: WorkoutVideo[];
  video?: WorkoutVideo;
  message?: string;
};

export default function WorkoutVideosPage() {
  const videoInputRef =
    useRef<HTMLInputElement | null>(null);

  const thumbnailInputRef =
    useRef<HTMLInputElement | null>(null);

  const [videos, setVideos] =
    useState<WorkoutVideo[]>([]);

  const [name, setName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] =
    useState("");

  const [thumbnailUrl, setThumbnailUrl] =
    useState("");

  const [durationSeconds, setDurationSeconds] =
    useState<number | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isUploadingVideo, setIsUploadingVideo] =
    useState(false);

  const [
    isUploadingThumbnail,
    setIsUploadingThumbnail,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeCount = useMemo(
    () =>
      videos.filter((video) => video.isActive)
        .length,
    [videos]
  );

  const totalDuration = useMemo(
    () =>
      videos.reduce(
        (total, video) =>
          total + (video.durationSeconds ?? 0),
        0
      ),
    [videos]
  );

  const loadVideos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        "/api/workout-videos",
        {
          cache: "no-store",
        }
      );

      const payload =
        (await response.json()) as WorkoutVideosResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
            "Unable to load workout videos."
        );
      }

      setVideos(payload.videos ?? []);
    } catch (loadError) {
      console.error(
        "Load workout videos error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load workout videos."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    return () => {
      if (
        videoPreviewUrl.startsWith("blob:")
      ) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  async function uploadFile(
    file: File
  ): Promise<string> {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok || !payload.url) {
      throw new Error(
        payload.message || "File upload failed."
      );
    }

    return payload.url as string;
  }

  async function handleVideoUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      event.target.value = "";
      return;
    }

    try {
      setIsUploadingVideo(true);
      setError("");
      setSuccess("");

      const localPreviewUrl =
        URL.createObjectURL(file);

      if (
        videoPreviewUrl.startsWith("blob:")
      ) {
        URL.revokeObjectURL(videoPreviewUrl);
      }

      setVideoPreviewUrl(localPreviewUrl);

      const [uploadedUrl, duration] =
        await Promise.all([
          uploadFile(file),
          getVideoDuration(file),
        ]);

      setVideoUrl(uploadedUrl);
      setDurationSeconds(duration);

      if (!name.trim()) {
        setName(
          file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]+/g, " ")
        );
      }
    } catch (uploadError) {
      console.error(
        "Workout video upload error:",
        uploadError
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload the video."
      );

      setVideoUrl("");
      setDurationSeconds(null);
    } finally {
      setIsUploadingVideo(false);
      event.target.value = "";
    }
  }

  async function handleThumbnailUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid thumbnail image."
      );

      event.target.value = "";
      return;
    }

    try {
      setIsUploadingThumbnail(true);
      setError("");
      setSuccess("");

      const uploadedUrl =
        await uploadFile(file);

      setThumbnailUrl(uploadedUrl);
    } catch (uploadError) {
      console.error(
        "Thumbnail upload error:",
        uploadError
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload the thumbnail."
      );
    } finally {
      setIsUploadingThumbnail(false);
      event.target.value = "";
    }
  }

  async function handleCreateVideo(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Workout video name is required.");
      return;
    }

    if (!videoUrl) {
      setError("Upload a workout video first.");
      return;
    }

    if (
      !durationSeconds ||
      durationSeconds <= 0
    ) {
      setError(
        "Unable to read the video duration."
      );

      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        "/api/workout-videos",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),
            videoUrl,
            thumbnailUrl:
              thumbnailUrl || null,
            durationSeconds,
          }),
        }
      );

      const payload =
        (await response.json()) as WorkoutVideosResponse;

      if (
        !response.ok ||
        !payload.success ||
        !payload.video
      ) {
        throw new Error(
          payload.message ||
            "Unable to save the workout video."
        );
      }

      setVideos((current) => [
        payload.video!,
        ...current,
      ]);

      setSuccess(
        `${payload.video.name} was added to the workout library.`
      );

      resetForm();
    } catch (saveError) {
      console.error(
        "Save workout video error:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the workout video."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleVideoStatus(
    video: WorkoutVideo
  ) {
    try {
      setUpdatingId(video.id);
      setError("");

      const response = await fetch(
        `/api/workout-videos/${video.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            isActive: !video.isActive,
          }),
        }
      );

      const payload =
        (await response.json()) as WorkoutVideosResponse;

      if (
        !response.ok ||
        !payload.success ||
        !payload.video
      ) {
        throw new Error(
          payload.message ||
            "Unable to update the video."
        );
      }

      setVideos((current) =>
        current.map((item) =>
          item.id === payload.video!.id
            ? payload.video!
            : item
        )
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update the video."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteVideo(
    video: WorkoutVideo
  ) {
    const confirmed = window.confirm(
      `Delete "${video.name}" from the workout library?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(video.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/workout-videos/${video.id}`,
        {
          method: "DELETE",
        }
      );

      const payload =
        (await response.json()) as WorkoutVideosResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
            "Unable to delete the video."
        );
      }

      setVideos((current) =>
        current.filter(
          (item) => item.id !== video.id
        )
      );

      setSuccess(
        `${video.name} was removed from the library.`
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the video."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function resetForm() {
    if (
      videoPreviewUrl.startsWith("blob:")
    ) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    setName("");
    setVideoUrl("");
    setVideoPreviewUrl("");
    setThumbnailUrl("");
    setDurationSeconds(null);

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }

    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  }

  return (
    <div className="min-h-full bg-neutral-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-neutral-800 pb-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
              <Video size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Workout Video Library
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Upload and manage workout videos used
                in Fuel TV programs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadVideos()}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                isLoading ? "animate-spin" : ""
              }
            />

            Refresh
          </button>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Videos"
            value={String(videos.length)}
            icon={<Film size={20} />}
          />

          <SummaryCard
            label="Active Videos"
            value={String(activeCount)}
            icon={<Activity size={20} />}
          />

          <SummaryCard
            label="Total Duration"
            value={formatDuration(totalDuration)}
            icon={<Clock3 size={20} />}
          />
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <div className="mt-7 grid gap-7 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={handleCreateVideo}
            className="h-fit rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
          >
            <div>
              <h2 className="text-lg font-semibold">
                Add Workout Video
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Upload a video and add it to the
                reusable workout library.
              </p>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Workout name
              </label>

              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                maxLength={120}
                placeholder="Example: Jumping Jacks"
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Workout video
              </label>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  videoInputRef.current?.click()
                }
                disabled={isUploadingVideo}
                className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-neutral-950 px-5 text-center transition hover:border-lime-400/70 disabled:opacity-50"
              >
                {isUploadingVideo ? (
                  <>
                    <Loader2
                      size={25}
                      className="animate-spin text-lime-400"
                    />

                    <span className="mt-3 text-sm text-neutral-400">
                      Uploading video...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload
                      size={25}
                      className="text-lime-400"
                    />

                    <span className="mt-3 text-sm font-medium text-neutral-200">
                      Select workout video
                    </span>

                    <span className="mt-1 text-xs text-neutral-600">
                      MP4 or supported video format
                    </span>
                  </>
                )}
              </button>
            </div>

            {videoPreviewUrl && (
              <div className="mt-5 overflow-hidden rounded-xl border border-neutral-800 bg-black">
                <video
                  src={videoPreviewUrl}
                  controls
                  preload="metadata"
                  className="aspect-video w-full object-contain"
                />

                <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950 px-4 py-3">
                  <span className="text-xs text-neutral-500">
                    Video duration
                  </span>

                  <span className="text-sm font-semibold text-lime-400">
                    {durationSeconds
                      ? formatDuration(
                          durationSeconds
                        )
                      : "Reading..."}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Thumbnail
                <span className="ml-2 text-xs text-neutral-600">
                  Optional
                </span>
              </label>

              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
              />

              {thumbnailUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-neutral-800">
                  <img
                    src={thumbnailUrl}
                    alt="Workout thumbnail"
                    className="aspect-video w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setThumbnailUrl("")
                    }
                    className="absolute right-3 top-3 rounded-lg bg-black/75 px-3 py-1.5 text-xs text-white"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    thumbnailInputRef.current?.click()
                  }
                  disabled={isUploadingThumbnail}
                  className="flex h-20 w-full items-center justify-center gap-3 rounded-xl border border-neutral-700 bg-neutral-950 text-sm text-neutral-400 transition hover:border-neutral-600 hover:text-white disabled:opacity-50"
                >
                  {isUploadingThumbnail ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <ImageIcon size={18} />
                  )}

                  {isUploadingThumbnail
                    ? "Uploading thumbnail..."
                    : "Upload thumbnail"}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={
                isSaving ||
                isUploadingVideo ||
                !name.trim() ||
                !videoUrl ||
                !durationSeconds
              }
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime-400 text-sm font-bold text-neutral-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Saving
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Add to Library
                </>
              )}
            </button>
          </form>

          <section className="overflow-scroll-y rounded-2xl border border-neutral-800 bg-neutral-900/50">
          
            <div className="border-b border-neutral-800 px-5 py-4">
              <h2 className="font-semibold">
                Video Library
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Videos available for workout program
                creation.
              </p>
            </div>

            {isLoading ? (
              <div className="flex min-h-80 items-center justify-center">
                <Loader2
                  size={28}
                  className="animate-spin text-lime-400"
                />
              </div>
            ) : videos.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-neutral-600">
                  <Video size={30} />
                </div>

                <h3 className="mt-5 font-semibold">
                  No workout videos
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                  Upload your first workout video to
                  begin creating Fuel TV programs.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 p-5 md:grid-cols-2 overflow-scroll-y">
                {videos.map((video) => (
                  <article
                    key={video.id}
                    className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
                  >
                    <div className="relative aspect-video bg-black">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          src={video.videoUrl}
                          controls
                          preload="metadata"
                          className="h-full w-full object-contain"
                        />
                      )}

                      <span
                        className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-medium ${
                          video.isActive
                            ? "border-emerald-800 bg-emerald-950/90 text-emerald-300"
                            : "border-neutral-700 bg-neutral-900/90 text-neutral-400"
                        }`}
                      >
                        {video.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>

                      <span className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 text-xs font-semibold text-white">
                        {formatDuration(
                          video.durationSeconds ?? 0
                        )}
                      </span>
                    </div>

                    <div className="p-4">
                      <h3 className="truncate font-semibold">
                        {video.name}
                      </h3>

                      <p className="mt-1 text-xs text-neutral-600">
                        Added{" "}
                        {formatDate(video.createdAt)}
                      </p>

                      <div className="mt-4 flex gap-2">
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:border-lime-400 hover:text-lime-400"
                        >
                          <Eye size={15} />
                          Preview
                        </a>

                        <button
                          type="button"
                          onClick={() =>
                            void toggleVideoStatus(video)
                          }
                          disabled={
                            updatingId === video.id
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 transition hover:border-neutral-500 hover:text-white disabled:opacity-50"
                          title={
                            video.isActive
                              ? "Disable video"
                              : "Enable video"
                          }
                        >
                          {updatingId === video.id ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : video.isActive ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void deleteVideo(video)
                          }
                          disabled={
                            deletingId === video.id
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-950 text-red-400 transition hover:border-red-800 hover:bg-red-950/40 disabled:opacity-50"
                          title="Delete video"
                        >
                          {deletingId === video.id ? (
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
                  </article>
                ))}
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

function getVideoDuration(
  file: File
): Promise<number> {
  return new Promise((resolve, reject) => {
    const video =
      document.createElement("video");

    const objectUrl =
      URL.createObjectURL(file);

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const duration = Math.ceil(video.duration);

      URL.revokeObjectURL(objectUrl);

      if (
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        reject(
          new Error(
            "Unable to read the video duration."
          )
        );

        return;
      }

      resolve(duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      reject(
        new Error(
          "Unable to read the selected video."
        )
      );
    };

    video.src = objectUrl;
  });
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
    return `${hours}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}