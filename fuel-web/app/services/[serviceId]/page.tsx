
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Branch, Coupon, Service, ServicePackage } from "@prisma/client";
import { CalendarDays, Check, ChevronDown, Clock3 } from "lucide-react";

import { useBranch } from "@/app/contexts/BranchContext";
import { BookTrialForm } from "@/app/components/BookTrialForm";
import { SubscribeModal } from "@/app/components/SubscribeModal";
import { Header } from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { ContactForm } from "@/app/components/Contactus";

// =====================================================
// TYPES
// =====================================================

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
  createdAt: string;
  updatedAt: string;
};

type ServiceSchedule = {
  id: string;
  subCategoryId: string | null;
  websiteContentId?: string | null;
  label: string;
  times: unknown;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type ServiceSubCategory = {
  id: string;
  serviceId: string;
  name: string;
  tagline?: string | null;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  schedules: ServiceSchedule[];
  createdAt: string;
  updatedAt: string;
};

type PackageSubCategory = {
  subCategoryId: string;
};

type PackageWithCoupons = ServicePackage & {
  coupons: Coupon[];
  subCategories: PackageSubCategory[];
};

type ServiceWithBranches = Service & {
  branches: Branch[];
  websiteContent:
    | (WebsiteContent & {
        schedules: ServiceSchedule[];
      })
    | null;
  subCategories: ServiceSubCategory[];
  packages: PackageWithCoupons[];
};

type ScheduleSubLabel = {
  label: string;
  times: string[];
};

// =====================================================
// HELPERS
// =====================================================

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string => typeof item === "string"
  );
}

function asScheduleSubLabels(value: unknown): ScheduleSubLabel[] {
  if (!Array.isArray(value)) return [];

  // Support the old format: ["6:00 AM", "7:00 AM"]
  if (value.every((item) => typeof item === "string")) {
    const times = value.filter(
      (item): item is string => typeof item === "string"
    );

    return times.length ? [{ label: "", times }] : [];
  }

  // Support the new format:
  // [{ label: "Morning", times: ["6:00 AM", "7:00 AM"] }]
  return value
    .filter(
      (item): item is { label: unknown; times: unknown } =>
        !!item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        "label" in item &&
        "times" in item
    )
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : "",
      times: Array.isArray(item.times)
        ? item.times.filter(
            (time): time is string => typeof time === "string"
          )
        : [],
    }))
    .filter((item) => item.times.length > 0);
}

// =====================================================
// PAGE
// =====================================================

export default function ServicePage() {
  const params = useParams<{ serviceId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { selectedBranch } = useBranch();

  // ===================================================
  // MODALS
  // ===================================================

  const [isBookTrialOpen, setIsBookTrialOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [open, setOpen] = useState(false);

  // ===================================================
  // SERVICE STATE
  // ===================================================

  const [service, setService] = useState<ServiceWithBranches | null>(null);
  const [loading, setLoading] = useState(true);

  // ===================================================
  // ACCORDION STATE
  // ===================================================

  // Subcategories are collapsed by default to reduce page length.
  const [expandedSubCategories, setExpandedSubCategories] = useState<
    string[]
  >([]);

  const toggleSubCategory = (subCategoryId: string) => {
    setExpandedSubCategories((current) =>
      current.includes(subCategoryId)
        ? current.filter((id) => id !== subCategoryId)
        : [...current, subCategoryId]
    );
  };

  // ===================================================
  // PACKAGE SELECTION
  // ===================================================

  const [selectedPackage, setSelectedPackage] =
    useState<PackageWithCoupons | null>(null);

  const [selectedSubCategory, setSelectedSubCategory] =
    useState<ServiceSubCategory | null>(null);

  // ===================================================
  // URL PARAMS
  // ===================================================

  const serviceId = params.serviceId;
  const serviceNameFromUrl = searchParams.get("name") || "";
  const branchIdFromUrl = searchParams.get("branchId") || "";

  const branchId = branchIdFromUrl || selectedBranch?.id || "";

  // ===================================================
  // FETCH SERVICE
  // ===================================================

  useEffect(() => {
    const fetchService = async () => {
      if (!branchId || !serviceId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(
          `/api/services?branchId=${encodeURIComponent(branchId)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error("Unable to load service");
        }

        const data = await res.json();

        const found =
          (data.services || []).find(
            (item: ServiceWithBranches) => item.id === serviceId
          ) || null;

        setService(found);
      } catch (error) {
        console.error("Service fetch error:", error);
        setService(null);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [branchId, serviceId]);

  // ===================================================
  // WEBSITE CONTENT
  // ===================================================

  const websiteContent = service?.websiteContent;

  const intro = asStringArray(websiteContent?.intro);
  const benefits = asStringArray(websiteContent?.benefits);
  const idealFor = asStringArray(websiteContent?.idealFor);

  // ===================================================
  // ACTIVE SUBCATEGORIES
  // ===================================================

  const subCategories =
    service?.subCategories
      ?.filter((subCategory) => subCategory.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder) || [];

  // ===================================================
  // ACTIVE PACKAGES
  // ===================================================

  const packages = service?.packages?.filter((pkg) => pkg.isActive) || [];

  const hasSubCategories = subCategories.length > 0;

  // ===================================================
  // PACKAGE SELECTION HANDLERS
  // ===================================================

  const handleChoosePackage = (
    pkg: PackageWithCoupons,
    subCategory: ServiceSubCategory | null
  ) => {
    setSelectedPackage(pkg);
    setSelectedSubCategory(subCategory);
    setOpen(true);
  };

  const handleCloseSubscribeModal = (value: boolean) => {
    setOpen(value);

    if (!value) {
      setSelectedPackage(null);
      setSelectedSubCategory(null);
    }
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Header setIsContactOpen={setIsContactOpen} />

        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
        </div>

        <ContactForm open={isContactOpen} setOpen={setIsContactOpen} />
        <Footer />
      </main>
    );
  }

  // ===================================================
  // NOT FOUND
  // ===================================================

  if (!service) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Header setIsContactOpen={setIsContactOpen} />

        <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 pt-24 text-center">
          <h1 className="text-3xl font-black uppercase md:text-4xl">
            Service Not Available
          </h1>

          <p className="mt-3 text-neutral-500">
            {serviceNameFromUrl
              ? `${serviceNameFromUrl} is currently unavailable.`
              : "This training program is currently unavailable."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-8 rounded-xl bg-lime-400 px-6 py-3 font-bold text-black transition hover:bg-lime-300"
          >
            Back to Home
          </button>
        </section>

        <ContactForm open={isContactOpen} setOpen={setIsContactOpen} />
        <Footer />
      </main>
    );
  }

  // ===================================================
  // HERO IMAGE
  // ===================================================

  const heroImage =
    service.coverImage ||
    service.thumbnailImage ||
    "/service-placeholder.webp";

  // ===================================================
  // PACKAGE CARD
  // ===================================================

  const renderPackageCard = (
    pkg: PackageWithCoupons,
    subCategory: ServiceSubCategory | null
  ) => {
    const hasDiscount =
      !!pkg.originalPrice && pkg.originalPrice > pkg.price;

    const publicCoupons =
      pkg.coupons?.filter(
        (coupon) => coupon.isActive && !coupon.isPrivate
      ) || [];

    return (
      <div
        key={pkg.id}
        className="group relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/70 p-7 transition duration-300 hover:-translate-y-1 hover:border-neutral-600"
      >
        <h3 className="text-2xl font-black">{pkg.name}</h3>

        {subCategory && (
          <div className="mt-3 inline-flex rounded-full border border-lime-400/20 bg-lime-400/5 px-3 py-1 text-xs font-semibold text-lime-400">
            {subCategory.name}
          </div>
        )}

        <p className="mt-3 text-sm text-neutral-500">
          {pkg.durationInDays} Days Membership
        </p>

        {pkg.usageType === "SESSION_BASED" && pkg.totalSessions && (
          <p className="mt-1 text-xs font-semibold text-lime-400">
            {pkg.totalSessions} Sessions
          </p>
        )}

        <div className="mt-7 flex items-end gap-3">
          <span className="text-4xl font-black md:text-5xl">
            ₹{(pkg.price / 100).toLocaleString("en-IN")}
          </span>

          {hasDiscount && (
            <span className="mb-1 text-neutral-600 line-through">
              ₹{((pkg.originalPrice || 0) / 100).toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <p className="mt-6 min-h-[60px] text-sm leading-6 text-neutral-400">
          {pkg.description ||
            `Join our ${service.name} program and start your training journey at Fuel Gym.`}
        </p>

        {publicCoupons.length > 0 && (
          <div className="mt-6 space-y-2">
            {publicCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="rounded-xl border border-lime-400/20 bg-lime-400/5 px-4 py-3"
              >
                <p className="text-xs text-neutral-500">Offer</p>

                <p className="mt-1 font-bold tracking-wider text-lime-300">
                  {coupon.code}
                </p>

                {coupon.discountPercent && (
                  <p className="mt-1 text-xs text-neutral-400">
                    {coupon.discountPercent}% off
                  </p>
                )}

                {coupon.discountFlatAmount && (
                  <p className="mt-1 text-xs text-neutral-400">
                    ₹
                    {(coupon.discountFlatAmount / 100).toLocaleString(
                      "en-IN"
                    )}{" "}
                    off
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => handleChoosePackage(pkg, subCategory)}
          className="mt-8 h-12 w-full rounded-xl bg-lime-400 font-bold text-black transition hover:bg-lime-300"
        >
          Choose Package
        </button>
      </div>
    );
  };

  // ===================================================
  // SCHEDULE CARD
  // ===================================================

  const renderScheduleCard = (schedule: ServiceSchedule) => {
    const subLabels = asScheduleSubLabels(schedule.times);

    return (
      <div
        key={schedule.id}
        className="rounded-2xl border border-white/[0.07] bg-black/50 p-5"
      >
        <div className="flex items-center gap-2">
          <Clock3 size={15} className="text-lime-400" />

          <p className="text-sm font-bold text-white">
            {schedule.label}
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {subLabels.map((subLabel, index) => (
            <div key={`${schedule.id}-${index}`}>
              {subLabel.label && (
                <p className="mb-2 text-sm font-semibold text-lime-400">
                  {subLabel.label}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {subLabel.times.map((time, timeIndex) => (
                  <span
                    key={`${schedule.id}-${index}-${timeIndex}`}
                    className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-neutral-300"
                  >
                    {time}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      {/* HEADER */}
      <Header setIsContactOpen={setIsContactOpen} />

      {/* HERO */}
      <section className="relative flex min-h-[70vh] items-end overflow-hidden md:min-h-[75vh]">
        <Image
          src={heroImage}
          alt={service.name}
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/35 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 md:px-10 md:pb-16">
          {websiteContent?.eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-400">
              {websiteContent.eyebrow}
            </p>
          )}

          <h1 className="mt-4 max-w-5xl text-5xl font-black uppercase leading-[0.92] tracking-tight md:text-7xl lg:text-8xl">
            {service.name}
          </h1>

          {websiteContent?.heroTitle && (
            <p className="mt-5 max-w-3xl text-lg font-medium leading-relaxed text-neutral-300 md:text-2xl">
              {websiteContent.heroTitle}
            </p>
          )}

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-neutral-300 backdrop-blur-lg">
            <span className="h-2 w-2 rounded-full bg-lime-400" />
            {selectedBranch?.name || service.branches?.[0]?.name || "Fuel Gym"}
          </div>
        </div>
      </section>

      {/* ABOUT PROGRAM */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-400">
              The Program
            </p>

            <h2 className="mt-4 text-4xl font-black uppercase leading-[1.05] tracking-tight md:text-5xl">
              {websiteContent?.eyebrow || service.name}
              <br />
              <span className="text-neutral-500">At Fuel</span>
            </h2>
          </div>

          <div className="space-y-5">
            {intro.length > 0 ? (
              intro.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-base leading-8 text-neutral-300 md:text-lg"
                >
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-base leading-8 text-neutral-500 md:text-lg">
                Explore our {service.name} program at Fuel Gym.
              </p>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* SUBCATEGORY ACCORDIONS */}
        {/* ================================================= */}

        {hasSubCategories && (
          <div className="mt-16 space-y-4">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-400">
                Explore Programs
              </p>

              <h3 className="mt-3 text-3xl font-black uppercase md:text-4xl">
                Our <span className="text-lime-400">Programs</span>
              </h3>

              <p className="mt-3 text-sm leading-7 text-neutral-500 md:text-base">
                Select a program to view its details, training schedule,
                and available membership packages.
              </p>
            </div>

            {subCategories.map((subCategory) => {
              const isExpanded = expandedSubCategories.includes(
                subCategory.id
              );

              const schedules =
                subCategory.schedules
                  ?.filter((schedule) => schedule.label)
                  .sort((a, b) => a.sortOrder - b.sortOrder) || [];

              const subCategoryPackages = packages.filter((pkg) =>
                pkg.subCategories?.some(
                  (relation) =>
                    relation.subCategoryId === subCategory.id
                )
              );

              return (
                <div
                  key={subCategory.id}
                  className="overflow-hidden rounded-3xl border border-white/[0.08] bg-neutral-950"
                >
                  {/* ACCORDION HEADER */}
                  <button
                    type="button"
                    onClick={() => toggleSubCategory(subCategory.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`subcategory-content-${subCategory.id}`}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/[0.035] md:p-7"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                        <CalendarDays
                          size={19}
                          className="text-lime-400"
                        />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-lg font-black uppercase md:text-2xl">
                          {subCategory.name}
                        </h3>

                        {subCategory.tagline && (
                          <p className="mt-1 text-sm text-neutral-400">
                            {subCategory.tagline}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-neutral-500">
                          {subCategoryPackages.length}{" "}
                          {subCategoryPackages.length === 1
                            ? "package"
                            : "packages"}
                          {schedules.length > 0
                            ? ` · ${schedules.length} schedule${schedules.length === 1 ? "" : "s"}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <ChevronDown
                      size={22}
                      className={`shrink-0 text-lime-400 transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* ACCORDION CONTENT */}
                  {isExpanded && (
                    <div
                      id={`subcategory-content-${subCategory.id}`}
                      className="border-t border-white/[0.08] p-5 md:p-7"
                    >
                      {/* DESCRIPTION */}
                      {subCategory.description && (
                        <p className="leading-7 text-neutral-400">
                          {subCategory.description}
                        </p>
                      )}

                      {/* IMAGE */}
                      {subCategory.image && (
                        <div className="relative mt-6 h-48 overflow-hidden rounded-2xl md:h-64">
                          <Image
                            src={subCategory.image}
                            alt={subCategory.name}
                            fill
                            className="object-cover"
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        </div>
                      )}

                      {/* SCHEDULES */}
                      {schedules.length > 0 && (
                        <div className="mt-7">
                          <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-lime-400">
                            Training Schedule
                          </h4>

                          <div className="grid gap-4 md:grid-cols-2">
                            {schedules.map(renderScheduleCard)}
                          </div>
                        </div>
                      )}

                      {/* SUBCATEGORY PACKAGES */}
                      {subCategoryPackages.length > 0 ? (
                        <div className="mt-8">
                          <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400">
                            Membership Options
                          </p>

                          <h4 className="mt-3 text-2xl font-black uppercase md:text-3xl">
                            Choose Your{" "}
                            <span className="text-lime-400">Package</span>
                          </h4>

                          <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {subCategoryPackages.map((pkg) =>
                              renderPackageCard(pkg, subCategory)
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-8 rounded-2xl border border-neutral-800 bg-black/40 px-5 py-8 text-center">
                          <p className="text-lg font-bold">
                            Packages Coming Soon
                          </p>

                          <p className="mt-2 text-sm text-neutral-500">
                            Membership packages for this program are
                            currently unavailable.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ================================================= */}
        {/* SERVICE-LEVEL SCHEDULES */}
        {/* ================================================= */}

        {!hasSubCategories &&
          websiteContent?.schedules &&
          websiteContent.schedules.length > 0 && (
            <div className="mt-16">
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-400">
                  Schedule
                </p>

                <h3 className="mt-3 text-3xl font-black uppercase md:text-4xl">
                  Training <span className="text-lime-400">Timings</span>
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {websiteContent.schedules
                  .filter((schedule) => schedule.label)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(renderScheduleCard)}
              </div>
            </div>
          )}

        {/* CLOSING */}
        {websiteContent?.closing && (
          <div className="mt-12 max-w-5xl border-l-2 border-lime-400 pl-6 md:pl-8">
            <p className="text-lg leading-8 text-neutral-300 md:text-xl">
              {websiteContent.closing}
            </p>
          </div>
        )}

        {/* TAGLINE */}
        {websiteContent?.tagline && (
          <div className="mt-12 rounded-3xl border border-white/10 bg-neutral-950 px-6 py-8 text-center md:px-10">
            <p className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
              {websiteContent.tagline}
            </p>
          </div>
        )}

        {/* BENEFITS + IDEAL FOR */}
        {(benefits.length > 0 || idealFor.length > 0) && (
          <div className="mt-16 grid gap-5 md:grid-cols-2">
            {benefits.length > 0 && (
              <div className="rounded-3xl border border-white/[0.08] bg-neutral-950 p-7 md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400">
                  Benefits
                </p>

                <h3 className="mt-3 text-2xl font-black uppercase">
                  What You&apos;ll Gain
                </h3>

                <div className="mt-6 space-y-4">
                  {benefits.map((benefit, index) => (
                    <div
                      key={`${benefit}-${index}`}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-lime-400/30 bg-lime-400/10">
                        <Check size={12} className="text-lime-400" />
                      </div>

                      <span className="text-sm text-neutral-300 md:text-base">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {idealFor.length > 0 && (
              <div className="rounded-3xl border border-white/[0.08] bg-neutral-950 p-7 md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400">
                  Who It&apos;s For
                </p>

                <h3 className="mt-3 text-2xl font-black uppercase">
                  Perfect For
                </h3>

                <div className="mt-6 flex flex-wrap gap-3">
                  {idealFor.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-full border border-white/10 bg-black px-4 py-2 text-sm text-neutral-300"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================= */}
      {/* SERVICE-LEVEL PACKAGES */}
      {/* ================================================= */}

      {!hasSubCategories && (
        <section className="border-t border-neutral-900 bg-neutral-950 px-6 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-400">
                Membership Options
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase tracking-tight md:text-5xl">
                Choose Your{" "}
                <span className="text-lime-400">Package</span>
              </h2>

              <p className="mt-4 leading-7 text-neutral-500">
                Select the membership option that works best for your
                training goals.
              </p>
            </div>

            {packages.length > 0 ? (
              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {packages.map((pkg) => renderPackageCard(pkg, null))}
              </div>
            ) : (
              <div className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900/50 px-6 py-14 text-center">
                <h3 className="text-2xl font-bold">
                  Packages Coming Soon
                </h3>

                <p className="mt-3 text-neutral-500">
                  Membership packages for this service are currently
                  unavailable.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================================================= */}
      {/* BOOK FREE TRIAL CTA — NOW AFTER PACKAGES */}
      {/* ================================================= */}

      <section className="relative bg-black px-6 pb-16 md:px-10 md:pb-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-lime-400/20 bg-neutral-950 px-6 py-9 md:px-10 md:py-11 lg:px-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-[300px] w-[300px] rounded-full bg-lime-400/[0.08] blur-[100px]" />

          <div className="absolute left-10 top-0 h-[3px] w-20 bg-lime-400" />

          <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-400">
                Ready To Start?
              </p>

              <h2 className="mt-3 text-3xl font-black uppercase leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
                Experience{" "}
                <span className="text-lime-400">
                  {service.name}
                </span>{" "}
                At Fuel
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400 md:text-base">
                Book a free trial session and experience our structured
                training, expert coaching and FUEL community before
                choosing your membership.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsBookTrialOpen(true)}
              className="h-13 min-w-[190px] shrink-0 rounded-xl bg-lime-400 px-7 text-sm font-black uppercase tracking-wide text-black shadow-[0_0_30px_rgba(163,230,53,0.18)] transition-all duration-300 hover:scale-[1.02] hover:bg-lime-300 hover:shadow-[0_0_40px_rgba(163,230,53,0.28)]"
            >
              Book Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* SUBSCRIBE MODAL */}
      {/* ================================================= */}

      {selectedPackage && (
        <SubscribeModal
          open={open}
          setOpen={handleCloseSubscribeModal}
          selectedPackage={selectedPackage}
          service={service}
          subCategory={selectedSubCategory}
        />
      )}

      {/* BOOK TRIAL FORM */}
      <BookTrialForm
        open={isBookTrialOpen}
        setOpen={setIsBookTrialOpen}
      />

      {/* CONTACT */}
      <ContactForm
        open={isContactOpen}
        setOpen={setIsContactOpen}
      />

      {/* FOOTER */}
      <Footer />
    </main>
  );
}
