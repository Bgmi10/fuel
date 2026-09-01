"use client";

import type { Service } from "@prisma/client";

import {
  ArrowLeft,
  Globe,
  Trash2,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

type WebsiteContent = {
  id: string;
  serviceId: string;
  eyebrow: string | null;
  heroTitle: string | null;
  intro: unknown;
  closing: string | null;
  tagline: string | null;
  benefits: unknown;
  idealFor: unknown;
};

const Page = () => {
  const params = useParams();
  const router = useRouter();

  const serviceId =
    Array.isArray(params.id)
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
      /*
       * If valid JSON is not provided,
       * save each non-empty line as
       * an array item.
       */
      return trimmed
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }
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

      if (contentData.success) {
        const websiteContent =
          contentData.content || null;

        setContent(
          websiteContent
        );

        if (websiteContent) {
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
        }
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
     SAVE CONTENT
  ========================= */

  const saveContent =
    async () => {
      if (!serviceId) {
        return;
      }

      setActionLoading(true);

      try {
        const payload = {
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

              body:
                JSON.stringify(
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

  const deleteContent =
    async () => {
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

        setEyebrow("");
        setHeroTitle("");
        setIntro("");
        setClosing("");
        setTagline("");
        setBenefits("");
        setIdealFor("");

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
      {/* HEADER */}


      {/* LOADING */}

      {loading ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center text-sm text-neutral-500">
          Loading website content...
        </div>
      ) : (
        <div className="space-y-5">
          {/* PAGE INTRO */}

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
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
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
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
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
                  className="min-h-[150px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-lime-400"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  JSON is supported. Plain text
                  lines will automatically be
                  stored as an array.
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
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
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
                  className="min-h-[150px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-lime-400"
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
                  className="min-h-[150px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-lime-400"
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
                  className="min-h-[130px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                />

                <p className="mt-1.5 text-xs text-neutral-600">
                  Final call-to-action or
                  closing message shown on the
                  website.
                </p>
              </div>

              {/* ACTIONS */}

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

          {/* CONTENT STATUS */}

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
    </div>
  );
};

export default Page;
