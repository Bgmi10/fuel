
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
  useCallback,
  useEffect,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type ScheduleSubLabel = {
  label: string;
  times: string[];
};

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
  title: string | null;
  description: string | null;
  eyebrow: string | null;
  heroTitle: string | null;
  intro: unknown;
  closing: string | null;
  tagline: string | null;
  benefits: unknown;
  idealFor: unknown;
  schedules: ServiceSchedule[];
};

/* =========================================================
   HELPERS
========================================================= */

const normalizeSubLabels = (
  value: unknown
): ScheduleSubLabel[] => {
  let parsed: any = value;

  // Support JSON strings from older API responses.
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return parsed.trim()
        ? [{ label: "Times", times: [parsed.trim()] }]
        : [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  // New format:
  // [{ label: "Morning", times: ["6:00 AM"] }]
  if (
    parsed.some(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        !Array.isArray(item)
    )
  ) {
    return parsed.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        return [];
      }

      const entry = item as {
        label?: unknown;
        times?: unknown;
      };

      const label =
        typeof entry.label === "string"
          ? entry.label
          : "";

      const times = Array.isArray(entry.times)
        ? entry.times
            .filter(
              (time): time is string =>
                typeof time === "string" ||
                typeof time === "number"
            )
            .map(String)
            .map((time) => time.trim())
            .filter(Boolean)
        : [];

      return [
        {
          label,
          times,
        },
      ];
    });
  }

  // Legacy format:
  // ["6:00 AM", "7:00 AM"]
  // Keep old data editable without losing its timings.
  const legacyTimes = parsed
    .filter(
      (time) =>
        typeof time === "string" ||
        typeof time === "number"
    )
    .map(String)
    .map((time) => time.trim())
    .filter(Boolean);

  return legacyTimes.length
    ? [{ label: "Times", times: legacyTimes }]
    : [];
};

const parseTextareaValue = (
  value: unknown
): string => {
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
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
};

const textareaToJson = (
  value: string
): unknown => {
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

const emptySubLabel = (): ScheduleSubLabel => ({
  label: "",
  times: [""],
});

/* =========================================================
   PAGE
========================================================= */

const Page = () => {
  const params = useParams();
  const router = useRouter();

  const rawId = params.id;

  const serviceId = Array.isArray(rawId)
    ? rawId[0]
    : rawId;

  const [service, setService] =
    useState<Service | null>(null);

  const [content, setContent] =
    useState<WebsiteContent | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  /* =======================================================
     WEBSITE CONTENT STATE
  ======================================================= */

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [closing, setClosing] = useState("");
  const [tagline, setTagline] = useState("");
  const [benefits, setBenefits] = useState("");
  const [idealFor, setIdealFor] = useState("");

  /* =======================================================
     SCHEDULE STATE

     Parent label:
       Weekdays

     Sub-labels:
       Morning -> multiple times
       Evening -> multiple times
  ======================================================= */

  const [schedules, setSchedules] =
    useState<ServiceSchedule[]>([]);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingSchedule, setEditingSchedule] =
    useState<ServiceSchedule | null>(null);

  const [label, setLabel] = useState("");

  const [subLabels, setSubLabels] =
    useState<ScheduleSubLabel[]>([
      emptySubLabel(),
    ]);

  /* =======================================================
     RESET FORMS
  ======================================================= */

  const resetForm = useCallback(() => {
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
  }, []);

  const resetScheduleForm = () => {
    setLabel("");
    setSubLabels([emptySubLabel()]);
    setEditingSchedule(null);
  };

  /* =======================================================
     FETCH CONTENT
  ======================================================= */

  const fetchData = useCallback(async () => {
    if (!serviceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        serviceResponse,
        contentResponse,
      ] = await Promise.all([
        fetch(`/api/services/${serviceId}`, {
          cache: "no-store",
        }),
        fetch(
          `/api/services/${serviceId}/content`,
          {
            cache: "no-store",
          }
        ),
      ]);

      if (
        !serviceResponse.ok ||
        !contentResponse.ok
      ) {
        throw new Error("Failed to fetch data");
      }

      const serviceData =
        await serviceResponse.json();

      const contentData =
        await contentResponse.json();

      setService(serviceData.service || null);

      if (
        contentData.success &&
        contentData.content
      ) {
        const websiteContent =
          contentData.content as WebsiteContent;

        setContent(websiteContent);

        setTitle(websiteContent.title || "");
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
          parseTextareaValue(
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
          parseTextareaValue(
            websiteContent.benefits
          )
        );

        setIdealFor(
          parseTextareaValue(
            websiteContent.idealFor
          )
        );

        setSchedules(
          (websiteContent.schedules || [])
            .slice()
            .sort(
              (a, b) =>
                a.sortOrder - b.sortOrder
            )
        );
      } else {
        setContent(null);
        resetForm();
      }
    } catch (error) {
      console.error(
        "Fetch website content error:",
        error
      );

      alert("Failed to load website content");
    } finally {
      setLoading(false);
    }
  }, [serviceId, resetForm]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /* =======================================================
     OPEN / CLOSE SCHEDULE MODAL
  ======================================================= */

  const closeScheduleModal = () => {
    if (actionLoading) return;

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

    const existingSubLabels =
      normalizeSubLabels(schedule.times);

    setSubLabels(
      existingSubLabels.length
        ? existingSubLabels.map((item) => ({
            label: item.label,
            times: item.times.length
              ? [...item.times]
              : [""],
          }))
        : [emptySubLabel()]
    );

    setModalOpen(true);
  };

  /* =======================================================
     SUB-LABEL ACTIONS
  ======================================================= */

  const addSubLabel = () => {
    setSubLabels((current) => [
      ...current,
      emptySubLabel(),
    ]);
  };

  const removeSubLabel = (index: number) => {
    setSubLabels((current) => {
      if (current.length === 1) {
        return [emptySubLabel()];
      }

      return current.filter(
        (_, currentIndex) =>
          currentIndex !== index
      );
    });
  };

  const updateSubLabelName = (
    index: number,
    value: string
  ) => {
    setSubLabels((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? { ...item, label: value }
          : item
      )
    );
  };

  /* =======================================================
     TIME ACTIONS

     Each sub-label maintains its own times.
  ======================================================= */

  const addTime = (subLabelIndex: number) => {
    setSubLabels((current) =>
      current.map((item, index) =>
        index === subLabelIndex
          ? {
              ...item,
              times: [...item.times, ""],
            }
          : item
      )
    );
  };

  const removeTime = (
    subLabelIndex: number,
    timeIndex: number
  ) => {
    setSubLabels((current) =>
      current.map((item, index) => {
        if (index !== subLabelIndex) {
          return item;
        }

        const nextTimes = item.times.filter(
          (_, currentTimeIndex) =>
            currentTimeIndex !== timeIndex
        );

        return {
          ...item,
          times: nextTimes.length
            ? nextTimes
            : [""],
        };
      })
    );
  };

  const updateTime = (
    subLabelIndex: number,
    timeIndex: number,
    value: string
  ) => {
    setSubLabels((current) =>
      current.map((item, index) =>
        index === subLabelIndex
          ? {
              ...item,
              times: item.times.map(
                (time, currentTimeIndex) =>
                  currentTimeIndex === timeIndex
                    ? value
                    : time
              ),
            }
          : item
      )
    );
  };

  /* =======================================================
     SAVE SCHEDULE LOCALLY

     The parent page saves the complete content.
     The schedule data uses the nested JSON structure.
  ======================================================= */

  const saveSchedule = () => {
    const normalizedLabel = label.trim();

    const normalizedSubLabels =
      subLabels
        .map((item) => ({
          label: item.label.trim(),
          times: item.times
            .map((time) => time.trim())
            .filter(Boolean),
        }))
        .filter(
          (item) =>
            item.label &&
            item.times.length > 0
        );

    if (!normalizedLabel) {
      alert("Schedule label is required");
      return;
    }

    if (!normalizedSubLabels.length) {
      alert(
        "Add at least one sub-label with a timing"
      );
      return;
    }

    const nestedTimes = normalizedSubLabels;

    if (editingSchedule) {
      setSchedules((current) =>
        current.map((schedule) =>
          schedule.id === editingSchedule.id
            ? {
                ...schedule,
                label: normalizedLabel,
                times: nestedTimes,
              }
            : schedule
        )
      );
    } else {
      const newSchedule: ServiceSchedule = {
        id: `temp-${Date.now()}`,
        websiteContentId: content?.id || null,
        subCategoryId: null,
        label: normalizedLabel,
        times: nestedTimes,
        sortOrder: schedules.length,
      };

      setSchedules((current) => [
        ...current,
        newSchedule,
      ]);
    }

    setModalOpen(false);
    resetScheduleForm();
  };

  /* =======================================================
     DELETE SCHEDULE
  ======================================================= */

  const deleteSchedule = (
    scheduleId: string
  ) => {
    const confirmed = window.confirm(
      "Delete this timing?"
    );

    if (!confirmed) return;

    setSchedules((current) =>
      current
        .filter(
          (schedule) =>
            schedule.id !== scheduleId
        )
        .map((schedule, index) => ({
          ...schedule,
          sortOrder: index,
        }))
    );
  };

  /* =======================================================
     SAVE WEBSITE CONTENT

     API must accept times as an array of objects.
  ======================================================= */

  const saveContent = async () => {
    if (!serviceId || actionLoading) return;

    setActionLoading(true);

    try {
      const payload = {
        title: title.trim() || null,
        description:
          description.trim() || null,
        eyebrow: eyebrow.trim() || null,
        heroTitle: heroTitle.trim() || null,
        intro: textareaToJson(intro),
        closing: closing.trim() || null,
        tagline: tagline.trim() || null,
        benefits: textareaToJson(benefits),
        idealFor: textareaToJson(idealFor),

        schedules: schedules
          .map((schedule, index) => ({
            label: schedule.label.trim(),

            // New format:
            // [
            //   { label: "Morning", times: [...] },
            //   { label: "Evening", times: [...] }
            // ]
            times: normalizeSubLabels(
              schedule.times
            )
              .map((item) => ({
                label: item.label.trim(),
                times: item.times
                  .map((time) => time.trim())
                  .filter(Boolean),
              }))
              .filter(
                (item) =>
                  item.label &&
                  item.times.length > 0
              ),

            sortOrder: index,
          }))
          .filter(
            (schedule) =>
              schedule.label &&
              schedule.times.length > 0
          ),
      };

      const response = await fetch(
        `/api/services/${serviceId}/content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Failed to save website content"
        );
        return;
      }

      setContent(data.content || null);

      await fetchData();

      alert("Website content saved successfully");
    } catch (error) {
      console.error(
        "Save website content error:",
        error
      );

      alert("Failed to save website content");
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     DELETE WEBSITE CONTENT
  ======================================================= */

  const deleteContent = async () => {
    if (!serviceId || actionLoading) return;

    const confirmed = window.confirm(
      "Delete all website content for this service?"
    );

    if (!confirmed) return;

    setActionLoading(true);

    try {
      const response = await fetch(
        `/api/services/${serviceId}/content`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Failed to delete content"
        );
        return;
      }

      setContent(null);
      resetForm();

      alert("Website content deleted");
    } catch (error) {
      console.error(
        "Delete website content error:",
        error
      );

      alert("Failed to delete website content");
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="p-6">
      {/* HEADER */}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/services")
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
              {service?.name || "Website Content"}
            </h1>
          </div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400">
          <Globe size={18} />
        </div>
      </div>

      {/* LOADING */}

      {loading ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center text-sm text-neutral-500">
          Loading website content...
        </div>
      ) : (
        <div className="space-y-5">
          {/* WEBSITE CONTENT FORM */}

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Website Content
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Configure the public website content
                for this service.
              </p>
            </div>

            <div className="grid gap-5">
              {/* TITLE */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Website Title
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Example: Personal Training"
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Public-facing title for this service.
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
                    setEyebrow(event.target.value)
                  }
                  placeholder="Example: PREMIUM FITNESS"
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />
              </div>

              {/* HERO TITLE */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Hero Title
                </label>

                <input
                  value={heroTitle}
                  onChange={(event) =>
                    setHeroTitle(event.target.value)
                  }
                  placeholder="Example: Train Better. Live Stronger."
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />
              </div>

              {/* INTRO */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Intro
                </label>

                <textarea
                  value={intro}
                  onChange={(event) =>
                    setIntro(event.target.value)
                  }
                  placeholder={`Enter JSON or plain text lines:\n\n[\n  "Professional trainers",\n  "Modern equipment",\n  "Flexible timings"\n]`}
                  disabled={actionLoading}
                  className="min-h-[150px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  JSON is supported. Plain text lines
                  are stored as an array.
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
                    setDescription(event.target.value)
                  }
                  placeholder="Describe this service, what it offers, and what customers can expect..."
                  disabled={actionLoading}
                  className="min-h-[180px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />
              </div>

              {/* TAGLINE */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Tagline
                </label>

                <input
                  value={tagline}
                  onChange={(event) =>
                    setTagline(event.target.value)
                  }
                  placeholder="Example: Your fitness. Your journey."
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />
              </div>

              {/* BENEFITS */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Benefits
                </label>

                <textarea
                  value={benefits}
                  onChange={(event) =>
                    setBenefits(event.target.value)
                  }
                  placeholder={`[\n  "Personalized coaching",\n  "Flexible schedules",\n  "Modern equipment"\n]`}
                  disabled={actionLoading}
                  className="min-h-[150px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Enter a JSON array or one benefit per line.
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
                    setIdealFor(event.target.value)
                  }
                  placeholder={`[\n  "Beginners",\n  "Weight loss",\n  "Strength training"\n]`}
                  disabled={actionLoading}
                  className="min-h-[150px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />
              </div>

              {/* CLOSING */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Closing
                </label>

                <textarea
                  value={closing}
                  onChange={(event) =>
                    setClosing(event.target.value)
                  }
                  placeholder="Closing section text..."
                  disabled={actionLoading}
                  className="min-h-[130px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />
              </div>

              {/* =================================================
                  TIMINGS
              ================================================= */}

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
                      Add a parent label, multiple sub-labels,
                      and timings for each sub-label.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openCreateSchedule}
                    disabled={actionLoading}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-neutral-700 bg-black px-3 py-2 text-xs font-medium text-white transition hover:border-lime-400 hover:text-lime-400 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Add Label
                  </button>
                </div>

                {schedules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-800 bg-black/30 p-6 text-center">
                    <Clock3
                      size={20}
                      className="mx-auto text-neutral-600"
                    />

                    <p className="mt-2 text-sm text-neutral-500">
                      No timings configured.
                    </p>

                    <p className="mt-1 text-xs text-neutral-700">
                      Example: Weekdays → Morning and Evening.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schedules.map(
                      (schedule, index) => {
                        const items =
                          normalizeSubLabels(
                            schedule.times
                          );

                        return (
                          <div
                            key={schedule.id}
                            className="overflow-hidden rounded-xl border border-neutral-800 bg-black"
                          >
                            {/* PARENT LABEL */}

                            <div className="flex flex-col gap-3 border-b border-neutral-800 bg-neutral-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
                                  <Clock3 size={18} />
                                </div>

                                <div className="min-w-0">
                                  <h3 className="break-words text-base font-semibold text-white">
                                    {schedule.label}
                                  </h3>

                                  <p className="mt-1 text-xs text-neutral-500">
                                    {items.length} sub-label
                                    {items.length === 1
                                      ? ""
                                      : "s"}
                                    {" · "}
                                    #{index + 1}
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditSchedule(schedule)
                                  }
                                  disabled={actionLoading}
                                  className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20 disabled:opacity-50"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteSchedule(schedule.id)
                                  }
                                  disabled={actionLoading}
                                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* SUB-LABELS AND TIMES */}

                            <div className="space-y-3 p-4">
                              {items.map(
                                (item, subIndex) => (
                                  <div
                                    key={`${schedule.id}-${subIndex}`}
                                    className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3"
                                  >
                                    <h4 className="mb-3 text-sm font-medium text-lime-300">
                                      {item.label ||
                                        `Sub-label ${subIndex + 1}`}
                                    </h4>

                                    <div className="flex flex-wrap gap-2">
                                      {item.times.map(
                                        (time, timeIndex) => (
                                          <span
                                            key={`${schedule.id}-${subIndex}-${timeIndex}`}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-xs font-medium text-neutral-200"
                                          >
                                            <Clock3
                                              size={12}
                                              className="text-lime-400"
                                            />

                                            {time}
                                          </span>
                                        )
                                      )}

                                      {item.times.length === 0 && (
                                        <span className="text-xs text-neutral-600">
                                          No times configured
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                {content ? (
                  <button
                    type="button"
                    onClick={deleteContent}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Delete Content
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={saveContent}
                  disabled={actionLoading}
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

          {/* CONTENT STATUS */}

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">
                  Content Status
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  Current website content configuration.
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

      {/* =====================================================
          SCHEDULE MODAL
      ===================================================== */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingSchedule
                    ? "Edit Schedule"
                    : "Add Schedule"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Configure a label with multiple sub-labels
                  and separate timings.
                </p>
              </div>

              <button
                type="button"
                onClick={closeScheduleModal}
                disabled={actionLoading}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
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
                {/* PARENT LABEL */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Label
                  </label>

                  <input
                    value={label}
                    onChange={(event) =>
                      setLabel(event.target.value)
                    }
                    placeholder="Example: Mon–Fri or Weekdays"
                    disabled={actionLoading}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                  />

                  <p className="mt-1.5 text-xs text-neutral-600">
                    The parent grouping for these timings.
                  </p>
                </div>

                {/* SUB-LABELS */}

                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white">
                        Sub-labels
                      </h3>

                      <p className="mt-1 text-xs text-neutral-500">
                        Each sub-label has its own timings.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addSubLabel}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-lime-400/20 bg-lime-400/10 px-3 py-2 text-xs font-medium text-lime-300 transition hover:bg-lime-400/20 disabled:opacity-50"
                    >
                      <Plus size={14} />
                      Add Sub-label
                    </button>
                  </div>

                  {subLabels.map(
                    (subLabel, subLabelIndex) => (
                      <div
                        key={subLabelIndex}
                        className="rounded-xl border border-zinc-800 bg-black p-4"
                      >
                        {/* SUB-LABEL HEADING */}

                        <div className="mb-4 flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400">
                            <Clock3 size={16} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <label className="mb-2 block text-sm text-neutral-400">
                              Sub-label {subLabelIndex + 1}
                            </label>

                            <input
                              value={subLabel.label}
                              onChange={(event) =>
                                updateSubLabelName(
                                  subLabelIndex,
                                  event.target.value
                                )
                              }
                              placeholder="Example: Morning"
                              disabled={actionLoading}
                              className="w-full rounded-xl border border-zinc-700 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeSubLabel(subLabelIndex)
                            }
                            disabled={
                              actionLoading ||
                              subLabels.length === 1
                            }
                            title="Remove sub-label"
                            className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* TIMES FOR THIS SUB-LABEL */}

                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <label className="text-sm text-neutral-400">
                              Timings
                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                addTime(subLabelIndex)
                              }
                              disabled={actionLoading}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-50"
                            >
                              <Plus size={13} />
                              Add Time
                            </button>
                          </div>

                          {subLabel.times.map(
                            (time, timeIndex) => (
                              <div
                                key={timeIndex}
                                className="flex items-center gap-2"
                              >
                                <div className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-neutral-900 text-neutral-600">
                                  <Clock3 size={15} />
                                </div>

                                <input
                                  value={time}
                                  onChange={(event) =>
                                    updateTime(
                                      subLabelIndex,
                                      timeIndex,
                                      event.target.value
                                    )
                                  }
                                  placeholder="Example: 6:00 AM"
                                  disabled={actionLoading}
                                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeTime(
                                      subLabelIndex,
                                      timeIndex
                                    )
                                  }
                                  disabled={actionLoading}
                                  title="Remove time"
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )
                          )}
                        </div>

                        {/* SUB-LABEL PREVIEW */}

                        <div className="mt-4 rounded-lg border border-zinc-800 bg-neutral-900/50 p-3">
                          <p className="mb-2 text-xs font-medium text-neutral-400">
                            Preview
                          </p>

                          <p className="mb-2 text-sm font-medium text-white">
                            {subLabel.label.trim() ||
                              "Unnamed sub-label"}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {subLabel.times
                              .map((time) => time.trim())
                              .filter(Boolean)
                              .map((time, index) => (
                                <span
                                  key={index}
                                  className="rounded-lg border border-zinc-700 bg-black px-2.5 py-1 text-xs text-neutral-300"
                                >
                                  {time}
                                </span>
                              ))}

                            {subLabel.times.every(
                              (time) => !time.trim()
                            ) && (
                              <span className="text-xs text-neutral-600">
                                Add timings to preview them.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* COMPLETE PREVIEW */}

                <div className="rounded-xl border border-lime-400/20 bg-lime-400/5 p-4">
                  <div className="flex items-start gap-3">
                    <Clock3
                      size={18}
                      className="mt-0.5 shrink-0 text-lime-400"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wider text-lime-400">
                        Schedule Preview
                      </p>

                      <h3 className="mt-1 break-words text-base font-semibold text-white">
                        {label.trim() || "Untitled Label"}
                      </h3>

                      <div className="mt-4 space-y-3">
                        {subLabels.map(
                          (item, index) => (
                            <div
                              key={index}
                              className="rounded-lg border border-neutral-800 bg-black/60 p-3"
                            >
                              <p className="mb-2 text-sm font-medium text-neutral-200">
                                {item.label.trim() ||
                                  `Sub-label ${index + 1}`}
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {item.times
                                  .map((time) => time.trim())
                                  .filter(Boolean)
                                  .map((time, timeIndex) => (
                                    <span
                                      key={timeIndex}
                                      className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
                                    >
                                      {time}
                                    </span>
                                  ))}

                                {item.times.every(
                                  (time) => !time.trim()
                                ) && (
                                  <span className="text-xs text-neutral-600">
                                    No timings added
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MODAL ACTIONS */}

                <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeScheduleModal}
                    disabled={actionLoading}
                    className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm text-white transition hover:bg-zinc-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:opacity-50"
                  >
                    <Save size={15} />

                    {editingSchedule
                      ? "Update Schedule"
                      : "Create Schedule"}
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
