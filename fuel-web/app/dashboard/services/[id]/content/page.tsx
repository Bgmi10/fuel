"use client";

import type { Service } from "@prisma/client";

import {
  ArrowLeft,
  Clock3,
  Globe,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

type ServiceSchedule = {
  id: string;
  websiteContentId: string | null;
  subCategoryId: string | null;
  label: string;
  times: unknown;
  sortOrder: number;
};

type WebsiteContent = {
  id: string;
  serviceId: string;

  // NEW FIELDS
  title: string | null;
  description: string | null;

  // EXISTING FIELDS
  eyebrow: string | null;
  heroTitle: string | null;
  intro: unknown;
  closing: string | null;
  tagline: string | null;
  benefits: unknown;
  idealFor: unknown;

  // NEW
  schedules: ServiceSchedule[];
};

type ScheduleForm = {
  label: string;
  times: string[];
};

const Page = () => {
  const params = useParams();
  const router = useRouter();

  const serviceId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [service, setService] =
    useState<Service | null>(null);

  const [content, setContent] =
    useState<WebsiteContent | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  /* =========================
     CONTENT STATE
  ========================= */

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [eyebrow, setEyebrow] =
    useState("");

  const [heroTitle, setHeroTitle] =
    useState("");

  const [intro, setIntro] =
    useState("");

  const [closing, setClosing] =
    useState("");

  const [tagline, setTagline] =
    useState("");

  const [benefits, setBenefits] =
    useState("");

  const [idealFor, setIdealFor] =
    useState("");

  /* =========================
     SCHEDULE STATE
  ========================= */

  const [schedules, setSchedules] =
    useState<ServiceSchedule[]>([]);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingSchedule, setEditingSchedule] =
    useState<ServiceSchedule | null>(null);

  const [label, setLabel] =
    useState("");

  const [times, setTimes] =
    useState<string[]>([""]);

  /* =========================
     HELPERS
  ========================= */

  const jsonToTextarea = (
    value: unknown
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    try {
      return JSON.stringify(
        value,
        null,
        2
      );
    } catch {
      return "";
    }
  };

  const textareaToJson = (
    value: string
  ) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  };

  /* =========================
     NORMALIZE TIMES
  ========================= */

  const normalizeTimes = (
    value: unknown
  ): string[] => {
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          String(item).trim()
        )
        .filter(Boolean);
    }

    if (typeof value === "string") {
      try {
        const parsed =
          JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed
            .map((item) =>
              String(item).trim()
            )
            .filter(Boolean);
        }
      } catch {
        if (value.trim()) {
          return [value.trim()];
        }
      }
    }

    return [];
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");

    setEyebrow("");
    setHeroTitle("");
    setIntro("");
    setClosing("");
    setTagline("");
    setBenefits("");
    setIdealFor("");

    setSchedules([]);
  };

  /* =========================
     FETCH DATA
  ========================= */

  const fetchData = async () => {
    if (!serviceId) {
      return;
    }

    try {
      setLoading(true);

      const [
        serviceResponse,
        contentResponse,
      ] = await Promise.all([
        fetch(
          `/api/services/${serviceId}`,
          {
            cache: "no-store",
          }
        ),

        fetch(
          `/api/services/${serviceId}/content`,
          {
            cache: "no-store",
          }
        ),
      ]);

      const serviceData =
        await serviceResponse.json();

      const contentData =
        await contentResponse.json();

      setService(
        serviceData.service || null
      );

      if (
        contentData.success &&
        contentData.content
      ) {
        const websiteContent =
          contentData.content as WebsiteContent;

        setContent(websiteContent);

        setTitle(
          websiteContent.title || ""
        );

        setDescription(
          websiteContent.description || ""
        );

        setEyebrow(
          websiteContent.eyebrow || ""
        );

        setHeroTitle(
          websiteContent.heroTitle || ""
        );

        setIntro(
          jsonToTextarea(
            websiteContent.intro
          )
        );

        setClosing(
          websiteContent.closing || ""
        );

        setTagline(
          websiteContent.tagline || ""
        );

        setBenefits(
          jsonToTextarea(
            websiteContent.benefits
          )
        );

        setIdealFor(
          jsonToTextarea(
            websiteContent.idealFor
          )
        );

        setSchedules(
          (
            websiteContent.schedules ||
            []
          )
            .slice()
            .sort(
              (
                a: ServiceSchedule,
                b: ServiceSchedule
              ) =>
                a.sortOrder -
                b.sortOrder
            )
        );
      } else {
        setContent(null);
        resetForm();
      }
    } catch (error) {
      console.error(error);

      alert(
        "Failed to load website content"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serviceId]);

  /* =========================
     SCHEDULE MODAL
  ========================= */

  const resetScheduleForm = () => {
    setLabel("");
    setTimes([""]);
    setEditingSchedule(null);
  };

  const closeScheduleModal = () => {
    if (actionLoading) {
      return;
    }

    setModalOpen(false);
    resetScheduleForm();
  };

  const openCreateSchedule = () => {
    resetScheduleForm();
    setModalOpen(true);
  };

  const openEditSchedule = (
    schedule: ServiceSchedule
  ) => {
    setEditingSchedule(schedule);

    setLabel(schedule.label);

    const scheduleTimes =
      normalizeTimes(
        schedule.times
      );

    setTimes(
      scheduleTimes.length > 0
        ? scheduleTimes
        : [""]
    );

    setModalOpen(true);
  };

  /* =========================
     TIME ACTIONS
  ========================= */

  const addTime = () => {
    setTimes((current) => [
      ...current,
      "",
    ]);
  };

  const removeTime = (
    index: number
  ) => {
    setTimes((current) => {
      if (current.length === 1) {
        return [""];
      }

      return current.filter(
        (_, currentIndex) =>
          currentIndex !== index
      );
    });
  };

  const updateTime = (
    index: number,
    value: string
  ) => {
    setTimes((current) =>
      current.map(
        (time, currentIndex) =>
          currentIndex === index
            ? value
            : time
      )
    );
  };

  /* =========================
     SAVE SCHEDULE
  ========================= */

  const saveSchedule = () => {
    const normalizedLabel =
      label.trim();

    const normalizedTimes =
      times
        .map((time) =>
          time.trim()
        )
        .filter(Boolean);

    if (!normalizedLabel) {
      alert(
        "Schedule label is required"
      );

      return;
    }

    if (
      normalizedTimes.length === 0
    ) {
      alert(
        "Add at least one schedule time"
      );

      return;
    }

    if (editingSchedule) {
      setSchedules((current) =>
        current.map(
          (schedule) =>
            schedule.id ===
            editingSchedule.id
              ? {
                  ...schedule,
                  label:
                    normalizedLabel,
                  times:
                    normalizedTimes,
                }
              : schedule
        )
      );
    } else {
      /*
       * Temporary client ID.
       * The actual database ID is created
       * when the complete website content
       * is saved.
       */
      const newSchedule: ServiceSchedule =
        {
          id: `temp-${Date.now()}`,
          websiteContentId:
            content?.id || null,
          subCategoryId: null,
          label:
            normalizedLabel,
          times:
            normalizedTimes,
          sortOrder:
            schedules.length,
        };

      setSchedules((current) => [
        ...current,
        newSchedule,
      ]);
    }

    closeScheduleModal();
  };

  /* =========================
     DELETE SCHEDULE
  ========================= */

  const deleteSchedule = (
    scheduleId: string
  ) => {
    const confirmed =
      window.confirm(
        "Delete this timing?"
      );

    if (!confirmed) {
      return;
    }

    setSchedules((current) =>
      current
        .filter(
          (schedule) =>
            schedule.id !== scheduleId
        )
        .map(
          (
            schedule,
            index
          ) => ({
            ...schedule,
            sortOrder: index,
          })
        )
    );
  };

  /* =========================
     SAVE CONTENT
  ========================= */

  const saveContent = async () => {
    if (!serviceId) {
      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        title:
          title.trim() || null,

        description:
          description.trim() || null,

        eyebrow:
          eyebrow.trim() || null,

        heroTitle:
          heroTitle.trim() || null,

        intro:
          textareaToJson(intro),

        closing:
          closing.trim() || null,

        tagline:
          tagline.trim() || null,

        benefits:
          textareaToJson(benefits),

        idealFor:
          textareaToJson(idealFor),

        schedules: schedules
          .map(
            (
              schedule,
              index
            ) => ({
              label:
                schedule.label.trim(),

              times:
                normalizeTimes(
                  schedule.times
                ),

              sortOrder: index,
            })
          )
          .filter(
            (schedule) =>
              schedule.label &&
              schedule.times.length > 0
          ),
      };

      const response =
        await fetch(
          `/api/services/${serviceId}/content`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      const data =
        await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Failed to save website content"
        );

        return;
      }

      setContent(
        data.content || null
      );

      await fetchData();

      alert(
        "Website content saved successfully"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to save website content"
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================
     DELETE CONTENT
  ========================= */

  const deleteContent = async () => {
    if (!serviceId) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete all website content for this service?"
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      const response =
        await fetch(
          `/api/services/${serviceId}/content`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Failed to delete content"
        );

        return;
      }

      setContent(null);
      resetForm();

      alert(
        "Website content deleted"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to delete website content"
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="p-6">
      {/* =========================
          HEADER
      ========================= */}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/services"
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition hover:border-neutral-700 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <p className="text-xs uppercase tracking-wider text-lime-400">
              Service Website
            </p>

            <h1 className="text-xl font-semibold text-white">
              {service?.name ||
                "Website Content"}
            </h1>
          </div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400">
          <Globe size={18} />
        </div>
      </div>

      {/* =========================
          LOADING
      ========================= */}

      {loading ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center text-sm text-neutral-500">
          Loading website content...
        </div>
      ) : (
        <div className="space-y-5">
          {/* =========================
              WEBSITE CONTENT
          ========================= */}

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Website Content
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Configure the public website
                content for this service.
              </p>
            </div>

            <div className="grid gap-5">
              {/* WEBSITE TITLE */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Website Title
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Example: Personal Training"
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Public-facing title for
                  this service. This is separate
                  from the internal service name.
                </p>
              </div>

              {/* EYEBROW */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Eyebrow
                </label>

                <input
                  value={eyebrow}
                  onChange={(event) =>
                    setEyebrow(
                      event.target.value
                    )
                  }
                  placeholder="Example: PREMIUM FITNESS"
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Small text displayed above
                  the main hero title.
                </p>
              </div>

              {/* HERO TITLE */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Hero Title
                </label>

                <input
                  value={heroTitle}
                  onChange={(event) =>
                    setHeroTitle(
                      event.target.value
                    )
                  }
                  placeholder="Example: Train Better. Live Stronger."
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Main headline displayed on
                  the service website.
                </p>
              </div>

              {/* INTRO */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Intro
                </label>

                <textarea
                  value={intro}
                  onChange={(event) =>
                    setIntro(
                      event.target.value
                    )
                  }
                  placeholder={`You can enter JSON, for example:

[
  "Professional trainers",
  "Modern equipment",
  "Flexible timings"
]`}
                  disabled={actionLoading}
                  className="min-h-[150px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  JSON is supported. Plain text
                  lines will automatically be
                  stored as an array.
                </p>
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Description / About
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Describe this service, what it offers, and what customers can expect..."
                  disabled={actionLoading}
                  className="min-h-[180px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Main website description or
                  About section for this service.
                </p>
              </div>

              {/* TAGLINE */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Tagline
                </label>

                <input
                  value={tagline}
                  onChange={(event) =>
                    setTagline(
                      event.target.value
                    )
                  }
                  placeholder="Example: Your fitness. Your journey."
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Short supporting statement
                  for the service.
                </p>
              </div>

              {/* BENEFITS */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Benefits
                </label>

                <textarea
                  value={benefits}
                  onChange={(event) =>
                    setBenefits(
                      event.target.value
                    )
                  }
                  placeholder={`[
  "Personalized coaching",
  "Flexible schedules",
  "Modern equipment",
  "Expert trainers"
]`}
                  disabled={actionLoading}
                  className="min-h-[150px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Enter a JSON array or one
                  benefit per line.
                </p>
              </div>

              {/* IDEAL FOR */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Ideal For
                </label>

                <textarea
                  value={idealFor}
                  onChange={(event) =>
                    setIdealFor(
                      event.target.value
                    )
                  }
                  placeholder={`[
  "Beginners",
  "Weight loss",
  "Strength training"
]`}
                  disabled={actionLoading}
                  className="min-h-[150px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Describe the types of
                  customers this service is
                  suitable for.
                </p>
              </div>

              {/* CLOSING */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Closing
                </label>

                <textarea
                  value={closing}
                  onChange={(event) =>
                    setClosing(
                      event.target.value
                    )
                  }
                  placeholder="Closing section text..."
                  disabled={actionLoading}
                  className="min-h-[130px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Final call-to-action or
                  closing message shown on the
                  website.
                </p>
              </div>

              {/* =========================
                  TIMINGS
              ========================= */}

              <div className="border-t border-neutral-800 pt-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock3
                        size={16}
                        className="text-lime-400"
                      />

                      <h3 className="text-sm font-medium text-white">
                        Timings
                      </h3>
                    </div>

                    <p className="mt-1 text-xs text-neutral-600">
                      Website-level timings for
                      this service.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      openCreateSchedule
                    }
                    disabled={
                      actionLoading
                    }
                    className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-black px-3 py-2 text-xs font-medium text-white transition hover:border-lime-400 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Add Timing
                  </button>
                </div>

                {schedules.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-800 bg-black/30 p-6 text-center">
                    <Clock3
                      size={20}
                      className="mx-auto text-neutral-600"
                    />

                    <p className="mt-2 text-sm text-neutral-500">
                      No timings configured.
                    </p>

                    <p className="mt-1 text-xs text-neutral-700">
                      Add a timing such as
                      &quot;Monday - Friday&quot;
                      or &quot;Morning&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800 overflow-hidden rounded-xl border border-neutral-800 bg-black">
                    {schedules.map(
                      (
                        schedule,
                        index
                      ) => {
                        const scheduleTimes =
                          normalizeTimes(
                            schedule.times
                          );

                        return (
                          <div
                            key={
                              schedule.id
                            }
                            className="flex flex-col gap-4 p-5 transition hover:bg-neutral-800/30 md:flex-row md:items-start md:justify-between"
                          >
                            <div className="flex min-w-0 gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                                <Clock3
                                  size={19}
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h2 className="text-lg font-semibold text-white">
                                    {
                                      schedule.label
                                    }
                                  </h2>

                                  <span className="rounded-full border border-zinc-700 bg-black px-2 py-1 text-[10px] text-neutral-500">
                                    #
                                    {index +
                                      1}
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {scheduleTimes.length >
                                  0 ? (
                                    scheduleTimes.map(
                                      (
                                        time,
                                        timeIndex
                                      ) => (
                                        <span
                                          key={`${schedule.id}-${timeIndex}`}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-xs font-medium text-neutral-200"
                                        >
                                          <Clock3
                                            size={
                                              12
                                            }
                                            className="text-lime-400"
                                          />

                                          {
                                            time
                                          }
                                        </span>
                                      )
                                    )
                                  ) : (
                                    <span className="text-xs text-neutral-600">
                                      No
                                      times
                                      configured
                                    </span>
                                  )}
                                </div>

                                <p className="mt-3 text-xs text-neutral-600">
                                  {
                                    scheduleTimes.length
                                  }{" "}
                                  {scheduleTimes.length ===
                                  1
                                    ? "time"
                                    : "times"}{" "}
                                  configured
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditSchedule(
                                    schedule
                                  )
                                }
                                disabled={
                                  actionLoading
                                }
                                className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteSchedule(
                                    schedule.id
                                  )
                                }
                                disabled={
                                  actionLoading
                                }
                                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {/* =========================
                  ACTIONS
              ========================= */}

              <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                {content ? (
                  <button
                    type="button"
                    onClick={
                      deleteContent
                    }
                    disabled={
                      actionLoading
                    }
                    className="flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Delete Content
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={
                    saveContent
                  }
                  disabled={
                    actionLoading
                  }
                  className="rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? "Saving..."
                    : content
                    ? "Update Website Content"
                    : "Save Website Content"}
                </button>
              </div>
            </div>
          </div>

          {/* =========================
              CONTENT STATUS
          ========================= */}

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">
                  Content Status
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  Current website content
                  configuration.
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  content
                    ? "border-green-500/20 bg-green-500/10 text-green-400"
                    : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                }`}
              >
                {content
                  ? "CONFIGURED"
                  : "NOT CONFIGURED"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          SCHEDULE MODAL
      ========================= */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingSchedule
                    ? "Edit Timing"
                    : "Add Timing"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Configure a timing label
                  and one or more available
                  times.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeScheduleModal
                }
                disabled={
                  actionLoading
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="overflow-y-auto px-5 py-5">
              <form
                className="space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveSchedule();
                }}
              >
                {/* LABEL */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Schedule Label
                  </label>

                  <input
                    value={label}
                    onChange={(event) =>
                      setLabel(
                        event.target.value
                      )
                    }
                    placeholder="Example: Morning Batch"
                    disabled={
                      actionLoading
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                  />

                  <p className="mt-1.5 text-xs text-neutral-600">
                    Use a clear name such as
                    Morning, Evening, Weekday
                    or Weekend.
                  </p>
                </div>

                {/* TIMES */}

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <label className="block text-sm text-neutral-400">
                        Available Times
                      </label>

                      <p className="mt-1 text-xs text-neutral-600">
                        Add every time offered
                        under this timing.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addTime}
                      disabled={
                        actionLoading
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-lime-400/20 bg-lime-400/10 px-3 py-1.5 text-xs font-medium text-lime-300 transition hover:bg-lime-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus size={13} />
                      Add Time
                    </button>
                  </div>

                  <div className="space-y-3">
                    {times.map(
                      (
                        time,
                        index
                      ) => (
                        <div
                          key={index}
                          className="flex items-center gap-2"
                        >
                          <div className="flex h-11 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-black text-neutral-600">
                            <Clock3
                              size={15}
                            />
                          </div>

                          <input
                            value={time}
                            onChange={(
                              event
                            ) =>
                              updateTime(
                                index,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Example: 6:00 AM"
                            disabled={
                              actionLoading
                            }
                            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeTime(
                                index
                              )
                            }
                            disabled={
                              actionLoading
                            }
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2
                              size={15}
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* PREVIEW */}

                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <div className="flex items-start gap-3">
                    <Clock3
                      size={17}
                      className="mt-0.5 shrink-0 text-lime-400"
                    />

                    <div>
                      <p className="text-sm font-medium text-white">
                        Schedule Preview
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {times
                          .map((time) =>
                            time.trim()
                          )
                          .filter(Boolean)
                          .map(
                            (
                              time,
                              index
                            ) => (
                              <span
                                key={
                                  index
                                }
                                className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300"
                              >
                                {time}
                              </span>
                            )
                          )}

                        {times.every(
                          (time) =>
                            !time.trim()
                        ) && (
                          <span className="text-xs text-neutral-600">
                            Times will
                            appear here.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MODAL ACTIONS */}

                <div className="flex justify-end gap-3 border-t border-zinc-800 pt-5">
                  <button
                    type="button"
                    onClick={
                      closeScheduleModal
                    }
                    disabled={
                      actionLoading
                    }
                    className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      actionLoading
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save size={15} />

                        {editingSchedule
                          ? "Update Timing"
                          : "Create Timing"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;