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
  XCircle,
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

type BulkVideoStatus =
  | "waiting"
  | "reading"
  | "uploading"
  | "saving"
  | "success"
  | "error";

type BulkVideoItem = {
  id: string;
  file: File;
  name: string;
  status: BulkVideoStatus;
  error?: string;
};

export default function WorkoutVideosPage() {
  /*
   * ------------------------------------
   * Refs
   * ------------------------------------
   */

  const videoInputRef =
    useRef<HTMLInputElement | null>(null);

  const thumbnailInputRef =
    useRef<HTMLInputElement | null>(null);

  const bulkVideoInputRef =
    useRef<HTMLInputElement | null>(null);

  /*
   * ------------------------------------
   * Video library
   * ------------------------------------
   */

  const [videos, setVideos] =
    useState<WorkoutVideo[]>([]);

  /*
   * ------------------------------------
   * Single upload
   * ------------------------------------
   */

  const [name, setName] = useState("");

  const [videoUrl, setVideoUrl] =
    useState("");

  const [
    videoPreviewUrl,
    setVideoPreviewUrl,
  ] = useState("");

  const [
    thumbnailUrl,
    setThumbnailUrl,
  ] = useState("");

  const [
    durationSeconds,
    setDurationSeconds,
  ] = useState<number | null>(null);

  /*
   * ------------------------------------
   * Bulk upload
   * ------------------------------------
   */

  const [
    bulkVideos,
    setBulkVideos,
  ] = useState<BulkVideoItem[]>([]);

  const [
    isBulkUploading,
    setIsBulkUploading,
  ] = useState(false);

  /*
   * ------------------------------------
   * Loading states
   * ------------------------------------
   */

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isUploadingVideo,
    setIsUploadingVideo,
  ] = useState(false);

  const [
    isUploadingThumbnail,
    setIsUploadingThumbnail,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    updatingId,
    setUpdatingId,
  ] = useState<string | null>(null);

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(null);

  /*
   * ------------------------------------
   * Messages
   * ------------------------------------
   */

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * ------------------------------------
   * Summary
   * ------------------------------------
   */

  const activeCount = useMemo(
    () =>
      videos.filter(
        (video) => video.isActive
      ).length,
    [videos]
  );

  const totalDuration = useMemo(
    () =>
      videos.reduce(
        (total, video) =>
          total +
          (video.durationSeconds ?? 0),
        0
      ),
    [videos]
  );

  const bulkSuccessCount =
    useMemo(
      () =>
        bulkVideos.filter(
          (item) =>
            item.status === "success"
        ).length,
      [bulkVideos]
    );

  const bulkErrorCount =
    useMemo(
      () =>
        bulkVideos.filter(
          (item) =>
            item.status === "error"
        ).length,
      [bulkVideos]
    );

  const bulkCompletedCount =
    bulkSuccessCount +
    bulkErrorCount;

  /*
   * ------------------------------------
   * Load videos
   * ------------------------------------
   */

  const loadVideos =
    useCallback(async () => {
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
          (await response.json()) as
            WorkoutVideosResponse;

        if (
          !response.ok ||
          !payload.success
        ) {
          throw new Error(
            payload.message ||
              "Unable to load workout videos."
          );
        }

        setVideos(
          payload.videos ?? []
        );
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

  /*
   * ------------------------------------
   * Clean preview blob
   * ------------------------------------
   */

  useEffect(() => {
    return () => {
      if (
        videoPreviewUrl.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          videoPreviewUrl
        );
      }
    };
  }, [videoPreviewUrl]);

  /*
   * ------------------------------------
   * Upload file to S3 API
   * ------------------------------------
   */

  async function uploadFile(
    file: File
  ): Promise<string> {
    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response =
      await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

    let payload: any;

    try {
      payload =
        await response.json();
    } catch {
      throw new Error(
        `Upload server returned an invalid response (${response.status}).`
      );
    }

    if (
      !response.ok ||
      !payload?.url
    ) {
      throw new Error(
        payload?.message ||
          "File upload failed."
      );
    }

    if (
      typeof payload.url !==
        "string"
    ) {
      throw new Error(
        "Invalid upload URL returned."
      );
    }

    return payload.url;
  }

  /*
   * ------------------------------------
   * Create workout video DB record
   * ------------------------------------
   */

  async function createWorkoutVideo({
    name,
    videoUrl,
    durationSeconds,
    thumbnailUrl = null,
  }: {
    name: string;
    videoUrl: string;
    durationSeconds: number;
    thumbnailUrl?: string | null;
  }): Promise<WorkoutVideo> {
    const response =
      await fetch(
        "/api/workout-videos",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
            videoUrl,
            thumbnailUrl,
            durationSeconds,
          }),
        }
      );

    const payload =
      (await response.json()) as
        WorkoutVideosResponse;

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

    return payload.video;
  }

  /*
   * ==================================================
   * SINGLE VIDEO UPLOAD
   * ==================================================
   */

  async function handleVideoUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "video/"
      )
    ) {
      setError(
        "Please select a valid video file."
      );

      event.target.value = "";

      return;
    }

    try {
      setIsUploadingVideo(true);

      setError("");
      setSuccess("");

      const localPreviewUrl =
        URL.createObjectURL(
          file
        );

      if (
        videoPreviewUrl.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          videoPreviewUrl
        );
      }

      setVideoPreviewUrl(
        localPreviewUrl
      );

      /*
       * Upload and duration detection
       * happen in parallel.
       */

      const [
        uploadedUrl,
        duration,
      ] = await Promise.all([
        uploadFile(file),

        getVideoDuration(file),
      ]);

      setVideoUrl(
        uploadedUrl
      );

      setDurationSeconds(
        duration
      );

      if (!name.trim()) {
        setName(
          file.name
            .replace(
              /\.[^/.]+$/,
              ""
            )
            .replace(
              /[-_]+/g,
              " "
            )
            .trim()
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

      setDurationSeconds(
        null
      );
    } finally {
      setIsUploadingVideo(
        false
      );

      event.target.value = "";
    }
  }

  /*
   * ------------------------------------
   * Thumbnail upload
   * ------------------------------------
   */

  async function handleThumbnailUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid thumbnail image."
      );

      event.target.value = "";

      return;
    }

    try {
      setIsUploadingThumbnail(
        true
      );

      setError("");
      setSuccess("");

      const uploadedUrl =
        await uploadFile(file);

      setThumbnailUrl(
        uploadedUrl
      );
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
      setIsUploadingThumbnail(
        false
      );

      event.target.value = "";
    }
  }

  /*
   * ------------------------------------
   * Save single video
   * ------------------------------------
   */

  async function handleCreateVideo(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(
        "Workout video name is required."
      );

      return;
    }

    if (!videoUrl) {
      setError(
        "Upload a workout video first."
      );

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

      const video =
        await createWorkoutVideo(
          {
            name: name.trim(),
            videoUrl,
            thumbnailUrl:
              thumbnailUrl ||
              null,
            durationSeconds,
          }
        );

      setVideos(
        (current) => [
          video,
          ...current,
        ]
      );

      setSuccess(
        `${video.name} was added to the workout library.`
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

  /*
   * ==================================================
   * BULK VIDEO UPLOAD
   * ==================================================
   */

  async function handleBulkVideoUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const input =
      event.currentTarget;

    const files =
      Array.from(
        input.files ?? []
      );

    /*
     * Allows selecting the same
     * files again later.
     */
    input.value = "";

    if (!files.length) {
      return;
    }

    /*
     * Validate selected files.
     */
    const validFiles =
      files.filter(
        (file) =>
          file.type.startsWith(
            "video/"
          )
      );

    if (
      validFiles.length === 0
    ) {
      setError(
        "Please select valid video files."
      );

      return;
    }

    /*
     * Create upload queue.
     *
     * Filename automatically becomes
     * workout name.
     */
    const items: BulkVideoItem[] =
      validFiles.map(
        (file) => ({
          id:
            crypto.randomUUID(),

          file,

          name:
            getWorkoutNameFromFile(
              file.name
            ),

          status:
            "waiting",
        })
      );

    setBulkVideos(items);

    setIsBulkUploading(
      true
    );

    setError("");
    setSuccess("");

    /*
     * IMPORTANT
     *
     * Every file runs at the SAME TIME.
     *
     * Video 1 ─┐
     * Video 2 ─┼─ Promise.all()
     * Video 3 ─┤
     * Video 4 ─┘
     */
    const results =
      await Promise.all(
        items.map(
          async (
            item
          ): Promise<{
            success: boolean;
            video?: WorkoutVideo;
          }> => {
            try {
              /*
               * ------------------------
               * Read duration
               * ------------------------
               */

              updateBulkVideo(
                item.id,
                {
                  status:
                    "reading",
                  error:
                    undefined,
                }
              );

              const duration =
                await getVideoDuration(
                  item.file
                );

              /*
               * ------------------------
               * Upload to S3
               * ------------------------
               */

              updateBulkVideo(
                item.id,
                {
                  status:
                    "uploading",
                }
              );

              const uploadedUrl =
                await uploadFile(
                  item.file
                );

              /*
               * ------------------------
               * Save to database
               * ------------------------
               */

              updateBulkVideo(
                item.id,
                {
                  status:
                    "saving",
                }
              );

              const video =
                await createWorkoutVideo(
                  {
                    name:
                      item.name,

                    videoUrl:
                      uploadedUrl,

                    durationSeconds:
                      duration,

                    /*
                     * Bulk uploads don't
                     * require thumbnail.
                     */
                    thumbnailUrl:
                      null,
                  }
                );

              /*
               * ------------------------
               * Complete
               * ------------------------
               */

              updateBulkVideo(
                item.id,
                {
                  status:
                    "success",
                  error:
                    undefined,
                }
              );

              return {
                success: true,
                video,
              };
            } catch (
              uploadError
            ) {
              console.error(
                `Bulk upload failed for ${item.file.name}:`,
                uploadError
              );

              updateBulkVideo(
                item.id,
                {
                  status:
                    "error",

                  error:
                    uploadError instanceof
                    Error
                      ? uploadError.message
                      : "Upload failed.",
                }
              );

              /*
               * Catch inside each task
               * so one failure doesn't
               * reject Promise.all().
               */

              return {
                success: false,
              };
            }
          }
        )
      );

    /*
     * Get all successful
     * database records.
     */

    const uploadedVideos =
      results
        .filter(
          (
            result
          ): result is {
            success: true;
            video: WorkoutVideo;
          } =>
            result.success &&
            !!result.video
        )
        .map(
          (result) =>
            result.video
        );

    /*
     * Add them to library
     * without another GET.
     */

    if (
      uploadedVideos.length >
      0
    ) {
      setVideos(
        (current) => [
          ...uploadedVideos,
          ...current,
        ]
      );
    }

    const failedCount =
      items.length -
      uploadedVideos.length;

    if (
      failedCount === 0
    ) {
      setSuccess(
        `${uploadedVideos.length} videos uploaded successfully.`
      );
    } else {
      setSuccess(
        `${uploadedVideos.length} of ${items.length} videos uploaded successfully.`
      );
    }

    setIsBulkUploading(
      false
    );
  }

  /*
   * ------------------------------------
   * Update individual bulk status
   * ------------------------------------
   */

  function updateBulkVideo(
    id: string,
    changes: Partial<BulkVideoItem>
  ) {
    setBulkVideos(
      (current) =>
        current.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  ...changes,
                }
              : item
        )
    );
  }

  /*
   * ------------------------------------
   * Clear bulk upload results
   * ------------------------------------
   */

  function clearBulkUploads() {
    if (
      isBulkUploading
    ) {
      return;
    }

    setBulkVideos([]);
  }

  /*
   * ==================================================
   * VIDEO ACTIONS
   * ==================================================
   */

  async function toggleVideoStatus(
    video: WorkoutVideo
  ) {
    try {
      setUpdatingId(
        video.id
      );

      setError("");

      const response =
        await fetch(
          `/api/workout-videos/${video.id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  isActive:
                    !video.isActive,
                }
              ),
          }
        );

      const payload =
        (await response.json()) as
          WorkoutVideosResponse;

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

      setVideos(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              payload.video!.id
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
      setUpdatingId(
        null
      );
    }
  }

  /*
   * ------------------------------------
   * Delete video
   * ------------------------------------
   */

  async function deleteVideo(
    video: WorkoutVideo
  ) {
    const confirmed =
      window.confirm(
        `Delete "${video.name}" from the workout library?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        video.id
      );

      setError("");
      setSuccess("");

      const response =
        await fetch(
          `/api/workout-videos/${video.id}`,
          {
            method:
              "DELETE",
          }
        );

      const payload =
        (await response.json()) as
          WorkoutVideosResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.message ||
            "Unable to delete the video."
        );
      }

      setVideos(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              video.id
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
      setDeletingId(
        null
      );
    }
  }

  /*
   * ------------------------------------
   * Reset single upload form
   * ------------------------------------
   */

  function resetForm() {
    if (
      videoPreviewUrl.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        videoPreviewUrl
      );
    }

    setName("");

    setVideoUrl("");

    setVideoPreviewUrl("");

    setThumbnailUrl("");

    setDurationSeconds(
      null
    );

    if (
      videoInputRef.current
    ) {
      videoInputRef.current.value =
        "";
    }

    if (
      thumbnailInputRef.current
    ) {
      thumbnailInputRef.current.value =
        "";
    }
  }

  /*
   * ==================================================
   * UI
   * ==================================================
   */

  return (
    <div className="min-h-full bg-neutral-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}

        <header className="flex flex-col gap-5 border-b border-neutral-800 pb-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
              <Video
                size={25}
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Workout Video
                Library
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Upload and
                manage workout
                videos used in
                Fuel TV programs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bulk hidden input */}

            <input
              ref={
                bulkVideoInputRef
              }
              type="file"
              accept="video/*"
              multiple
              onChange={
                handleBulkVideoUpload
              }
              className="hidden"
            />

            {/* Bulk Upload */}

            <button
              type="button"
              onClick={() =>
                bulkVideoInputRef.current?.click()
              }
              disabled={
                isBulkUploading
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-bold text-neutral-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBulkUploading ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  Uploading...
                </>
              ) : (
                <>
                  <Upload
                    size={17}
                  />

                  Bulk Upload
                </>
              )}
            </button>

            {/* Refresh */}

            <button
              type="button"
              onClick={() =>
                void loadVideos()
              }
              disabled={
                isLoading
              }
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
          </div>
        </header>

        {/* Summary cards */}

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Videos"
            value={String(
              videos.length
            )}
            icon={
              <Film
                size={20}
              />
            }
          />

          <SummaryCard
            label="Active Videos"
            value={String(
              activeCount
            )}
            icon={
              <Activity
                size={20}
              />
            }
          />

          <SummaryCard
            label="Total Duration"
            value={formatDuration(
              totalDuration
            )}
            icon={
              <Clock3
                size={20}
              />
            }
          />
        </section>

        {/* Error */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Success */}

        {success && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2
              size={18}
            />

            {success}
          </div>
        )}

        {/* ==================================================
            BULK UPLOAD PANEL
        ================================================== */}

        {bulkVideos.length >
          0 && (
          <section className="mt-7 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex flex-col gap-4 border-b border-neutral-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Upload
                    size={18}
                    className="text-lime-400"
                  />

                  <h2 className="font-semibold">
                    Bulk Upload
                  </h2>
                </div>

                <p className="mt-1 text-sm text-neutral-500">
                  Uploading all
                  selected videos
                  in parallel.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {
                      bulkCompletedCount
                    }
                    /
                    {
                      bulkVideos.length
                    }
                  </p>

                  <p className="text-xs text-neutral-500">
                    completed
                  </p>
                </div>

                {!isBulkUploading && (
                  <button
                    type="button"
                    onClick={
                      clearBulkUploads
                    }
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-400 transition hover:border-neutral-600 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Progress */}

            <div className="border-b border-neutral-800 px-5 py-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">
                  Overall
                  progress
                </span>

                <span className="font-medium text-neutral-300">
                  {
                    bulkSuccessCount
                  }{" "}
                  successful
                  {bulkErrorCount >
                    0 &&
                    ` • ${bulkErrorCount} failed`}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-lime-400 transition-all duration-300"
                  style={{
                    width:
                      bulkVideos.length >
                      0
                        ? `${
                            (bulkCompletedCount /
                              bulkVideos.length) *
                            100
                          }%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* Upload queue */}

            <div className="max-h-[420px] space-y-2 overflow-y-auto p-4">
              {bulkVideos.map(
                (item) => (
                  <div
                    key={
                      item.id
                    }
                    className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-neutral-500">
                      <Film
                        size={18}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-200">
                        {
                          item.name
                        }
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="truncate text-xs text-neutral-600">
                          {
                            item.file
                              .name
                          }
                        </span>

                        <span className="shrink-0 text-xs text-neutral-700">
                          •
                        </span>

                        <span className="shrink-0 text-xs text-neutral-600">
                          {formatFileSize(
                            item.file
                              .size
                          )}
                        </span>
                      </div>

                      {item.error && (
                        <p className="mt-1 text-xs text-red-400">
                          {
                            item.error
                          }
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <BulkStatus
                        status={
                          item.status
                        }
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* ==================================================
            SINGLE UPLOAD + LIBRARY
        ================================================== */}

        <div className="mt-7 grid gap-7 xl:grid-cols-[420px_minmax(0,1fr)]">
          {/* Single Upload */}

          <form
            onSubmit={
              handleCreateVideo
            }
            className="h-fit rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
          >
            <div>
              <h2 className="text-lg font-semibold">
                Add Workout
                Video
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Upload a single
                video with an
                optional custom
                thumbnail.
              </p>
            </div>

            {/* Name */}

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Workout name
              </label>

              <input
                value={name}
                onChange={(
                  event
                ) => {
                  setName(
                    event.target
                      .value
                  );

                  setError("");
                }}
                maxLength={
                  120
                }
                placeholder="Example: Jumping Jacks"
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
              />
            </div>

            {/* Video */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Workout video
              </label>

              <input
                ref={
                  videoInputRef
                }
                type="file"
                accept="video/*"
                onChange={
                  handleVideoUpload
                }
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  videoInputRef.current?.click()
                }
                disabled={
                  isUploadingVideo
                }
                className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-neutral-950 px-5 text-center transition hover:border-lime-400/70 disabled:opacity-50"
              >
                {isUploadingVideo ? (
                  <>
                    <Loader2
                      size={25}
                      className="animate-spin text-lime-400"
                    />

                    <span className="mt-3 text-sm text-neutral-400">
                      Uploading
                      video...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload
                      size={25}
                      className="text-lime-400"
                    />

                    <span className="mt-3 text-sm font-medium text-neutral-200">
                      Select
                      workout
                      video
                    </span>

                    <span className="mt-1 text-xs text-neutral-600">
                      MP4 or
                      supported
                      video format
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Preview */}

            {videoPreviewUrl && (
              <div className="mt-5 overflow-hidden rounded-xl border border-neutral-800 bg-black">
                <video
                  src={
                    videoPreviewUrl
                  }
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

            {/* Thumbnail */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Thumbnail

                <span className="ml-2 text-xs text-neutral-600">
                  Optional
                </span>
              </label>

              <input
                ref={
                  thumbnailInputRef
                }
                type="file"
                accept="image/*"
                onChange={
                  handleThumbnailUpload
                }
                className="hidden"
              />

              {thumbnailUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-neutral-800">
                  <img
                    src={
                      thumbnailUrl
                    }
                    alt="Workout thumbnail"
                    className="aspect-video w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setThumbnailUrl(
                        ""
                      )
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
                  disabled={
                    isUploadingThumbnail
                  }
                  className="flex h-20 w-full items-center justify-center gap-3 rounded-xl border border-neutral-700 bg-neutral-950 text-sm text-neutral-400 transition hover:border-neutral-600 hover:text-white disabled:opacity-50"
                >
                  {isUploadingThumbnail ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <ImageIcon
                      size={18}
                    />
                  )}

                  {isUploadingThumbnail
                    ? "Uploading thumbnail..."
                    : "Upload thumbnail"}
                </button>
              )}
            </div>

            {/* Submit */}

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
                  <Plus
                    size={18}
                  />

                  Add to
                  Library
                </>
              )}
            </button>
          </form>

          {/* ==================================================
              LIBRARY
          ================================================== */}

          <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="border-b border-neutral-800 px-5 py-4">
              <h2 className="font-semibold">
                Video Library
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Videos
                available for
                workout program
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
            ) : videos.length ===
              0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-neutral-600">
                  <Video
                    size={30}
                  />
                </div>

                <h3 className="mt-5 font-semibold">
                  No workout
                  videos
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                  Upload your
                  first workout
                  video to begin
                  creating Fuel TV
                  programs.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 p-5 md:grid-cols-2">
                {videos.map(
                  (video) => (
                    <article
                      key={
                        video.id
                      }
                      className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
                    >
                      <div className="relative aspect-video bg-black">
                        {video.thumbnailUrl ? (
                          <img
                            src={
                              video.thumbnailUrl
                            }
                            alt={
                              video.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <video
                            src={
                              video.videoUrl
                            }
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
                            video.durationSeconds ??
                              0
                          )}
                        </span>
                      </div>

                      <div className="p-4">
                        <h3 className="truncate font-semibold">
                          {
                            video.name
                          }
                        </h3>

                        <p className="mt-1 text-xs text-neutral-600">
                          Added{" "}
                          {formatDate(
                            video.createdAt
                          )}
                        </p>

                        <div className="mt-4 flex gap-2">
                          <a
                            href={
                              video.videoUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:border-lime-400 hover:text-lime-400"
                          >
                            <Eye
                              size={
                                15
                              }
                            />

                            Preview
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              void toggleVideoStatus(
                                video
                              )
                            }
                            disabled={
                              updatingId ===
                              video.id
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 transition hover:border-neutral-500 hover:text-white disabled:opacity-50"
                            title={
                              video.isActive
                                ? "Disable video"
                                : "Enable video"
                            }
                          >
                            {updatingId ===
                            video.id ? (
                              <Loader2
                                size={
                                  15
                                }
                                className="animate-spin"
                              />
                            ) : video.isActive ? (
                              <EyeOff
                                size={
                                  15
                                }
                              />
                            ) : (
                              <Eye
                                size={
                                  15
                                }
                              />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void deleteVideo(
                                video
                              )
                            }
                            disabled={
                              deletingId ===
                              video.id
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-950 text-red-400 transition hover:border-red-800 hover:bg-red-950/40 disabled:opacity-50"
                            title="Delete video"
                          >
                            {deletingId ===
                            video.id ? (
                              <Loader2
                                size={
                                  15
                                }
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={
                                  15
                                }
                              />
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/*
 * ==================================================
 * BULK STATUS
 * ==================================================
 */

function BulkStatus({
  status,
}: {
  status: BulkVideoStatus;
}) {
  if (
    status === "success"
  ) {
    return (
      <span className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-emerald-400">
        <CheckCircle2
          size={15}
        />

        Uploaded
      </span>
    );
  }

  if (
    status === "error"
  ) {
    return (
      <span className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-red-400">
        <XCircle
          size={15}
        />

        Failed
      </span>
    );
  }

  if (
    status === "waiting"
  ) {
    return (
      <span className="whitespace-nowrap text-xs text-neutral-500">
        Waiting
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-lime-400">
      <Loader2
        size={14}
        className="animate-spin"
      />

      {status ===
        "reading" &&
        "Reading"}

      {status ===
        "uploading" &&
        "Uploading"}

      {status ===
        "saving" &&
        "Saving"}
    </span>
  );
}

/*
 * ==================================================
 * SUMMARY CARD
 * ==================================================
 */

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

/*
 * ==================================================
 * VIDEO DURATION
 * ==================================================
 */

function getVideoDuration(
  file: File
): Promise<number> {
  return new Promise(
    (resolve, reject) => {
      const video =
        document.createElement(
          "video"
        );

      const objectUrl =
        URL.createObjectURL(
          file
        );

      video.preload =
        "metadata";

      video.onloadedmetadata =
        () => {
          const duration =
            Math.ceil(
              video.duration
            );

          URL.revokeObjectURL(
            objectUrl
          );

          if (
            !Number.isFinite(
              duration
            ) ||
            duration <= 0
          ) {
            reject(
              new Error(
                "Unable to read the video duration."
              )
            );

            return;
          }

          resolve(
            duration
          );
        };

      video.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "Unable to read the selected video."
          )
        );
      };

      video.src =
        objectUrl;
    }
  );
}

/*
 * ==================================================
 * FILE NAME -> WORKOUT NAME
 * ==================================================
 */

function getWorkoutNameFromFile(
  fileName: string
) {
  return fileName
    .replace(
      /\.[^/.]+$/,
      ""
    )
    .replace(
      /[-_]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

/*
 * ==================================================
 * FILE SIZE
 * ==================================================
 */

function formatFileSize(
  bytes: number
) {
  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  const kb =
    bytes / 1024;

  if (
    kb < 1024
  ) {
    return `${kb.toFixed(
      1
    )} KB`;
  }

  const mb =
    kb / 1024;

  return `${mb.toFixed(
    1
  )} MB`;
}

/*
 * ==================================================
 * DURATION FORMAT
 * ==================================================
 */

function formatDuration(
  totalSeconds: number
) {
  if (
    !totalSeconds
  ) {
    return "0:00";
  }

  const hours =
    Math.floor(
      totalSeconds /
        3600
    );

  const minutes =
    Math.floor(
      (totalSeconds %
        3600) /
        60
    );

  const seconds =
    totalSeconds %
    60;

  if (
    hours > 0
  ) {
    return `${hours}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      seconds
    ).padStart(
      2,
      "0"
    )}`;
  }

  return `${minutes}:${String(
    seconds
  ).padStart(
    2,
    "0"
  )}`;
}

/*
 * ==================================================
 * DATE FORMAT
 * ==================================================
 */

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "recently";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle:
        "medium",
    }
  ).format(date);
}