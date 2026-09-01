"use client";

import Image from "next/image";
import { BookTrialForm } from "@/app/components/BookTrialForm";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

import {
  Branch,
  Coupon,
  Service,
  ServicePackage,
} from "@prisma/client";

import {
  CalendarDays,
  Check,
  Clock3,
} from "lucide-react";

import { useBranch } from "@/app/contexts/BranchContext";

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

  subCategoryId: string;

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
  description: string | null;

  image: string | null;

  sortOrder: number;
  isActive: boolean;

  schedules: ServiceSchedule[];

  createdAt: string;
  updatedAt: string;
};

type PackageWithCoupons =
  ServicePackage & {
    coupons: Coupon[];
  };

type ServiceWithBranches =
  Service & {
    branches: Branch[];

    websiteContent:
      | WebsiteContent
      | null;

    subCategories:
      ServiceSubCategory[];

    packages:
      PackageWithCoupons[];
  };

// =====================================================
// HELPERS
// =====================================================

function asStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item === "string"
  );
}

function asScheduleTimes(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item === "string"
  );
}

// =====================================================
// PAGE
// =====================================================

export default function ServicePage() {
  const params =
    useParams<{
      serviceId: string;
    }>();

  const searchParams =
    useSearchParams();

  const router =
    useRouter();

  const {
    selectedBranch,
  } = useBranch();

  // ===================================================
  // MODALS
  // ===================================================

  const [
    isBookTrialOpen,
    setIsBookTrialOpen,
  ] = useState(false);

  const [
    isContactOpen,
    setIsContactOpen,
  ] = useState(false);

  const [
    open,
    setOpen,
  ] = useState(false);

  // ===================================================
  // SERVICE STATE
  // ===================================================

  const [
    service,
    setService,
  ] =
    useState<ServiceWithBranches | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    selectedPackage,
    setSelectedPackage,
  ] =
    useState<PackageWithCoupons | null>(
      null
    );

  // ===================================================
  // URL PARAMS
  // ===================================================

  const serviceId =
    params.serviceId;

  const serviceNameFromUrl =
    searchParams.get("name") ||
    "";

  const branchIdFromUrl =
    searchParams.get(
      "branchId"
    ) || "";

  const branchId =
    branchIdFromUrl ||
    selectedBranch?.id ||
    "";

  // ===================================================
  // FETCH SERVICE
  // ===================================================

  useEffect(() => {
    const fetchService =
      async () => {
        if (
          !branchId ||
          !serviceId
        ) {
          setLoading(false);
          return;
        }

        try {
          setLoading(true);

          const res =
            await fetch(
              `/api/services?branchId=${encodeURIComponent(
                branchId
              )}`,
              {
                cache: "no-store",
              }
            );

          if (!res.ok) {
            throw new Error(
              "Unable to load service"
            );
          }

          const data =
            await res.json();

          const found =
            (
              data.services ||
              []
            ).find(
              (
                item: ServiceWithBranches
              ) =>
                item.id ===
                serviceId
            ) || null;

          setService(found);
        } catch (error) {
          console.error(
            "Service fetch error:",
            error
          );

          setService(null);
        } finally {
          setLoading(false);
        }
      };

    fetchService();
  }, [
    branchId,
    serviceId,
  ]);

  // ===================================================
  // WEBSITE CONTENT
  // ===================================================

  const websiteContent =
    service?.websiteContent;

  const intro =
    asStringArray(
      websiteContent?.intro
    );

  const benefits =
    asStringArray(
      websiteContent?.benefits
    );

  const idealFor =
    asStringArray(
      websiteContent?.idealFor
    );

  // ===================================================
  // ACTIVE SUBCATEGORIES
  // ===================================================

  const subCategories =
    service?.subCategories
      ?.filter(
        (subCategory) =>
          subCategory.isActive
      )
      .sort(
        (a, b) =>
          a.sortOrder -
          b.sortOrder
      ) || [];

  // ===================================================
  // ACTIVE PACKAGES
  // ===================================================

  const packages =
    service?.packages?.filter(
      (pkg) =>
        pkg.isActive
    ) || [];

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Header
          setIsContactOpen={
            setIsContactOpen
          }
        />

        <div
          className="
            min-h-[80vh]
            flex
            items-center
            justify-center
          "
        >
          <div
            className="
              w-12
              h-12
              rounded-full
              border-2
              border-lime-400
              border-t-transparent
              animate-spin
            "
          />
        </div>

        <ContactForm
          open={
            isContactOpen
          }
          setOpen={
            setIsContactOpen
          }
        />

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
        <Header
          setIsContactOpen={
            setIsContactOpen
          }
        />

        <section
          className="
            min-h-[80vh]
            flex
            flex-col
            items-center
            justify-center
            px-6
            text-center
            pt-24
          "
        >
          <h1
            className="
              text-3xl
              md:text-4xl
              font-black
              uppercase
            "
          >
            Service Not Available
          </h1>

          <p
            className="
              text-neutral-500
              mt-3
            "
          >
            {serviceNameFromUrl
              ? `${serviceNameFromUrl} is currently unavailable.`
              : "This training program is currently unavailable."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="
              mt-8
              bg-lime-400
              text-black
              font-bold
              px-6
              py-3
              rounded-xl
              cursor-pointer
              hover:bg-lime-300
              transition
            "
          >
            Back to Home
          </button>
        </section>

        <ContactForm
          open={
            isContactOpen
          }
          setOpen={
            setIsContactOpen
          }
        />

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
  // PAGE
  // ===================================================

  return (
    <main
      className="
        min-h-screen
        bg-black
        text-white
        overflow-hidden
      "
    >
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <Header
        setIsContactOpen={
          setIsContactOpen
        }
      />

      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      <section
        className="
          relative
          min-h-[70vh]
          md:min-h-[75vh]
          flex
          items-end
          overflow-hidden
        "
      >
        <Image
          src={heroImage}
          alt={service.name}
          fill
          priority
          className="
            object-cover
          "
        />

        {/* DARK OVERLAY */}

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-t
            from-black
            via-black/45
            to-black/20
          "
        />

        {/* LEFT GRADIENT */}

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-r
            from-black/90
            via-black/35
            to-transparent
          "
        />

        {/* HERO CONTENT */}

        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            w-full
            px-6
            md:px-10
            pb-12
            md:pb-16
          "
        >
          {/* EYEBROW */}

          {websiteContent?.eyebrow && (
            <p
              className="
                text-lime-400
                text-xs
                tracking-[0.3em]
                uppercase
                font-bold
              "
            >
              {websiteContent.eyebrow}
            </p>
          )}

          {/* SERVICE NAME */}

          <h1
            className="
              mt-4
              max-w-5xl
              text-5xl
              md:text-7xl
              lg:text-8xl
              font-black
              uppercase
              tracking-tight
              leading-[0.92]
            "
          >
            {service.name}
          </h1>

          {/* HERO TITLE */}

          {websiteContent?.heroTitle && (
            <p
              className="
                mt-5
                max-w-3xl
                text-lg
                md:text-2xl
                text-neutral-300
                font-medium
                leading-relaxed
              "
            >
              {
                websiteContent.heroTitle
              }
            </p>
          )}

          {/* BRANCH */}

          <div
            className="
              mt-6
              inline-flex
              items-center
              gap-2
              px-4
              py-2
              rounded-full
              bg-black/40
              border
              border-white/10
              backdrop-blur-lg
              text-sm
              text-neutral-300
            "
          >
            <span
              className="
                w-2
                h-2
                bg-lime-400
                rounded-full
              "
            />

            {selectedBranch
              ?.name ||
              service.branches?.[0]
                ?.name ||
              "Fuel Gym"}
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* ABOUT PROGRAM */}
      {/* ================================================= */}

      <section
        className="
          max-w-7xl
          mx-auto
          px-6
          md:px-10
          py-16
          md:py-20
        "
      >
        <div
          className="
            grid
            lg:grid-cols-[0.75fr_1.25fr]
            gap-10
            lg:gap-20
          "
        >
          {/* TITLE */}

          <div>
            <p
              className="
                text-lime-400
                text-xs
                tracking-[0.3em]
                uppercase
                font-bold
              "
            >
              The Program
            </p>

            <h2
              className="
                mt-4
                text-4xl
                md:text-5xl
                font-black
                uppercase
                tracking-tight
                leading-[1.05]
              "
            >
              {websiteContent
                ?.eyebrow ||
                service.name}

              <br />

              <span
                className="
                  text-neutral-500
                "
              >
                At Fuel
              </span>
            </h2>
          </div>

          {/* INTRO */}

          <div
            className="
              space-y-5
            "
          >
            {intro.length > 0 ? (
              intro.map(
                (
                  paragraph,
                  index
                ) => (
                  <p
                    key={index}
                    className="
                      text-neutral-300
                      text-base
                      md:text-lg
                      leading-8
                    "
                  >
                    {paragraph}
                  </p>
                )
              )
            ) : (
              <p
                className="
                  text-neutral-500
                  text-base
                  md:text-lg
                  leading-8
                "
              >
                Explore our{" "}
                {service.name}{" "}
                program at Fuel
                Gym.
              </p>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* SUB CATEGORIES + SCHEDULES */}
        {/* ================================================= */}

        {subCategories.length >
          0 && (
          <div
            className="
              mt-16
              space-y-8
            "
          >
            {subCategories.map(
              (
                subCategory
              ) => {
                const schedules =
                  subCategory.schedules
                    ?.filter(
                      (
                        schedule
                      ) =>
                        schedule.label
                    )
                    .sort(
                      (
                        a,
                        b
                      ) =>
                        a.sortOrder -
                        b.sortOrder
                    ) || [];

                return (
                  <div
                    key={
                      subCategory.id
                    }
                    className="
                      rounded-3xl
                      border
                      border-white/[0.08]
                      bg-neutral-950
                      p-6
                      md:p-8
                    "
                  >
                    {/* SUB CATEGORY HEADER */}

                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <div
                        className="
                          w-10
                          h-10
                          rounded-xl
                          bg-white/[0.05]
                          border
                          border-white/10
                          flex
                          items-center
                          justify-center
                          shrink-0
                        "
                      >
                        <CalendarDays
                          size={
                            18
                          }
                          className="
                            text-lime-400
                          "
                        />
                      </div>

                      <h3
                        className="
                          text-xl
                          md:text-2xl
                          font-black
                          uppercase
                        "
                      >
                        {
                          subCategory.name
                        }
                      </h3>
                    </div>

                    {/* DESCRIPTION */}

                    {subCategory.description && (
                      <p
                        className="
                          mt-5
                          text-neutral-400
                          leading-7
                        "
                      >
                        {
                          subCategory.description
                        }
                      </p>
                    )}

                    {/* SUBCATEGORY IMAGE */}

                    {subCategory.image && (
                      <div
                        className="
                          relative
                          mt-6
                          h-48
                          md:h-64
                          overflow-hidden
                          rounded-2xl
                        "
                      >
                        <Image
                          src={
                            subCategory.image
                          }
                          alt={
                            subCategory.name
                          }
                          fill
                          className="
                            object-cover
                          "
                        />

                        <div
                          className="
                            absolute
                            inset-0
                            bg-gradient-to-t
                            from-black/70
                            via-black/10
                            to-transparent
                          "
                        />
                      </div>
                    )}

                    {/* SCHEDULES */}

                    {schedules.length >
                      0 && (
                      <div
                        className="
                          mt-7
                          grid
                          md:grid-cols-2
                          gap-4
                        "
                      >
                        {schedules.map(
                          (
                            schedule
                          ) => {
                            const times =
                              asScheduleTimes(
                                schedule.times
                              );

                            return (
                              <div
                                key={
                                  schedule.id
                                }
                                className="
                                  rounded-2xl
                                  border
                                  border-white/[0.07]
                                  bg-black/50
                                  p-5
                                "
                              >
                                {/* LABEL */}

                                <div
                                  className="
                                    flex
                                    items-center
                                    gap-2
                                  "
                                >
                                  <Clock3
                                    size={
                                      15
                                    }
                                    className="
                                      text-lime-400
                                    "
                                  />

                                  <p
                                    className="
                                      text-sm
                                      font-bold
                                      text-white
                                    "
                                  >
                                    {
                                      schedule.label
                                    }
                                  </p>
                                </div>

                                {/* TIMES */}

                                {times.length >
                                  0 && (
                                  <div
                                    className="
                                      mt-4
                                      flex
                                      flex-wrap
                                      gap-2
                                    "
                                  >
                                    {times.map(
                                      (
                                        time,
                                        index
                                      ) => (
                                        <span
                                          key={`${schedule.id}-${index}`}
                                          className="
                                            px-3
                                            py-1.5
                                            rounded-lg
                                            border
                                            border-white/10
                                            bg-white/[0.035]
                                            text-xs
                                            text-neutral-300
                                          "
                                        >
                                          {
                                            time
                                          }
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* CLOSING */}
        {/* ================================================= */}

        {websiteContent?.closing && (
          <div
            className="
              mt-12
              border-l-2
              border-lime-400
              pl-6
              md:pl-8
              max-w-5xl
            "
          >
            <p
              className="
                text-lg
                md:text-xl
                text-neutral-300
                leading-8
              "
            >
              {
                websiteContent.closing
              }
            </p>
          </div>
        )}

        {/* ================================================= */}
        {/* TAGLINE */}
        {/* ================================================= */}

        {websiteContent?.tagline && (
          <div
            className="
              mt-12
              rounded-3xl
              border
              border-white/10
              bg-neutral-950
              px-6
              md:px-10
              py-8
              text-center
            "
          >
            <p
              className="
                text-2xl
                md:text-3xl
                font-black
                uppercase
                tracking-tight
                text-white
              "
            >
              {
                websiteContent.tagline
              }
            </p>
          </div>
        )}

        {/* ================================================= */}
        {/* BENEFITS + IDEAL FOR */}
        {/* ================================================= */}

        {(benefits.length >
          0 ||
          idealFor.length >
            0) && (
          <div
            className="
              mt-16
              grid
              md:grid-cols-2
              gap-5
            "
          >
            {/* BENEFITS */}

            {benefits.length >
              0 && (
              <div
                className="
                  rounded-3xl
                  border
                  border-white/[0.08]
                  bg-neutral-950
                  p-7
                  md:p-8
                "
              >
                <p
                  className="
                    text-xs
                    text-lime-400
                    uppercase
                    tracking-[0.25em]
                    font-bold
                  "
                >
                  Benefits
                </p>

                <h3
                  className="
                    mt-3
                    text-2xl
                    font-black
                    uppercase
                  "
                >
                  What You&apos;ll
                  Gain
                </h3>

                <div
                  className="
                    mt-6
                    space-y-4
                  "
                >
                  {benefits.map(
                    (
                      benefit,
                      index
                    ) => (
                      <div
                        key={`${benefit}-${index}`}
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <div
                          className="
                            mt-0.5
                            w-5
                            h-5
                            shrink-0
                            rounded-full
                            border
                            border-lime-400/30
                            bg-lime-400/10
                            flex
                            items-center
                            justify-center
                          "
                        >
                          <Check
                            size={
                              12
                            }
                            className="
                              text-lime-400
                            "
                          />
                        </div>

                        <span
                          className="
                            text-neutral-300
                            text-sm
                            md:text-base
                          "
                        >
                          {
                            benefit
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* IDEAL FOR */}

            {idealFor.length >
              0 && (
              <div
                className="
                  rounded-3xl
                  border
                  border-white/[0.08]
                  bg-neutral-950
                  p-7
                  md:p-8
                "
              >
                <p
                  className="
                    text-xs
                    text-lime-400
                    uppercase
                    tracking-[0.25em]
                    font-bold
                  "
                >
                  Who It&apos;s For
                </p>

                <h3
                  className="
                    mt-3
                    text-2xl
                    font-black
                    uppercase
                  "
                >
                  Perfect For
                </h3>

                <div
                  className="
                    mt-6
                    flex
                    flex-wrap
                    gap-3
                  "
                >
                  {idealFor.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={`${item}-${index}`}
                        className="
                          rounded-full
                          border
                          border-white/10
                          bg-black
                          px-4
                          py-2
                          text-sm
                          text-neutral-300
                        "
                      >
                        {item}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================= */}
      {/* BOOK FREE TRIAL CTA */}
      {/* ================================================= */}

      <section
        className="
          relative
          bg-black
          px-6
          md:px-10
          pb-16
          md:pb-20
        "
      >
        <div
          className="
            relative
            max-w-7xl
            mx-auto
            overflow-hidden
            rounded-[28px]
            border
            border-lime-400/20
            bg-neutral-950
            px-6
            md:px-10
            lg:px-12
            py-9
            md:py-11
          "
        >
          {/* GREEN GLOW */}

          <div
            className="
              absolute
              -top-24
              -right-20
              w-[300px]
              h-[300px]
              rounded-full
              bg-lime-400/[0.08]
              blur-[100px]
              pointer-events-none
            "
          />

          {/* SMALL ACCENT */}

          <div
            className="
              absolute
              top-0
              left-10
              w-20
              h-[3px]
              bg-lime-400
            "
          />

          <div
            className="
              relative
              z-10
              flex
              flex-col
              lg:flex-row
              lg:items-center
              lg:justify-between
              gap-7
            "
          >
            {/* CONTENT */}

            <div
              className="
                max-w-3xl
              "
            >
              <p
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.3em]
                  text-lime-400
                "
              >
                Ready To Start?
              </p>

              <h2
                className="
                  mt-3
                  text-3xl
                  md:text-4xl
                  lg:text-5xl
                  font-black
                  uppercase
                  tracking-tight
                  leading-tight
                  text-white
                "
              >
                Experience{" "}
                <span
                  className="
                    text-lime-400
                  "
                >
                  {service.name}
                </span>{" "}
                At Fuel
              </h2>

              <p
                className="
                  mt-4
                  max-w-2xl
                  text-sm
                  md:text-base
                  leading-7
                  text-neutral-400
                "
              >
                Book a free trial
                session and
                experience our
                structured
                training, expert
                coaching and FUEL
                community before
                choosing your
                membership.
              </p>
            </div>

            {/* CTA */}

            <button
              type="button"
              onClick={() =>
                setIsBookTrialOpen(
                  true
                )
              }
              className="
                shrink-0
                min-w-[190px]
                h-13
                px-7
                rounded-xl
                bg-lime-400
                text-black
                text-sm
                font-black
                uppercase
                tracking-wide
                cursor-pointer
                shadow-[0_0_30px_rgba(163,230,53,0.18)]
                hover:bg-lime-300
                hover:scale-[1.02]
                hover:shadow-[0_0_40px_rgba(163,230,53,0.28)]
                transition-all
                duration-300
              "
            >
              Book Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* PACKAGES */}
      {/* ================================================= */}

      <section
        className="
          border-t
          border-neutral-900
          bg-neutral-950
          py-16
          md:py-20
          px-6
        "
      >
        <div
          className="
            max-w-7xl
            mx-auto
          "
        >
          {/* PACKAGE HEADING */}

          <div
            className="
              max-w-3xl
            "
          >
            <p
              className="
                text-lime-400
                text-xs
                tracking-[0.3em]
                uppercase
                font-bold
              "
            >
              Membership Options
            </p>

            <h2
              className="
                mt-4
                text-4xl
                md:text-5xl
                font-black
                uppercase
                tracking-tight
              "
            >
              Choose Your{" "}
              <span
                className="
                  text-lime-400
                "
              >
                Package
              </span>
            </h2>

            <p
              className="
                mt-4
                text-neutral-500
                leading-7
              "
            >
              Select the membership
              option that works best
              for your training goals.
            </p>
          </div>

          {/* PACKAGE CARDS */}

          {packages.length >
          0 ? (
            <div
              className="
                mt-10
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-3
                gap-6
              "
            >
              {packages.map(
                (pkg) => {
                  const hasDiscount =
                    !!pkg.originalPrice &&
                    pkg.originalPrice >
                      pkg.price;

                  const publicCoupons =
                    pkg.coupons?.filter(
                      (
                        coupon
                      ) =>
                        coupon.isActive &&
                        !coupon.isPrivate
                    ) || [];

                  return (
                    <div
                      key={
                        pkg.id
                      }
                      className="
                        group
                        relative
                        rounded-3xl
                        border
                        border-neutral-800
                        bg-neutral-900/70
                        p-7
                        overflow-hidden
                        transition
                        duration-300
                        hover:border-neutral-600
                        hover:-translate-y-1
                      "
                    >
                      {/* PACKAGE NAME */}

                      <h3
                        className="
                          text-2xl
                          font-black
                        "
                      >
                        {
                          pkg.name
                        }
                      </h3>

                      {/* DURATION */}

                      <p
                        className="
                          mt-2
                          text-sm
                          text-neutral-500
                        "
                      >
                        {
                          pkg.durationInDays
                        }{" "}
                        Days
                        Membership
                      </p>

                      {/* SESSION BASED */}

                      {pkg.usageType ===
                        "SESSION_BASED" &&
                        pkg.totalSessions && (
                          <p
                            className="
                              mt-1
                              text-xs
                              text-lime-400
                              font-semibold
                            "
                          >
                            {
                              pkg.totalSessions
                            }{" "}
                            Sessions
                          </p>
                        )}

                      {/* PRICE */}

                      <div
                        className="
                          mt-7
                          flex
                          items-end
                          gap-3
                        "
                      >
                        <span
                          className="
                            text-4xl
                            md:text-5xl
                            font-black
                          "
                        >
                          ₹
                          {(
                            pkg.price /
                            100
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </span>

                        {hasDiscount && (
                          <span
                            className="
                              mb-1
                              text-neutral-600
                              line-through
                            "
                          >
                            ₹
                            {(
                              (pkg.originalPrice ||
                                0) /
                              100
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        )}
                      </div>

                      {/* DESCRIPTION */}

                      <p
                        className="
                          mt-6
                          min-h-[60px]
                          text-sm
                          leading-6
                          text-neutral-400
                        "
                      >
                        {pkg.description ||
                          `Join our ${service.name} program and start your training journey at Fuel Gym.`}
                      </p>

                      {/* COUPONS */}

                      {publicCoupons.length >
                        0 && (
                        <div
                          className="
                            mt-6
                            space-y-2
                          "
                        >
                          {publicCoupons.map(
                            (
                              coupon
                            ) => (
                              <div
                                key={
                                  coupon.id
                                }
                                className="
                                  rounded-xl
                                  border
                                  border-lime-400/20
                                  bg-lime-400/5
                                  px-4
                                  py-3
                                "
                              >
                                <p
                                  className="
                                    text-xs
                                    text-neutral-500
                                  "
                                >
                                  Offer
                                </p>

                                <p
                                  className="
                                    mt-1
                                    font-bold
                                    tracking-wider
                                    text-lime-300
                                  "
                                >
                                  {
                                    coupon.code
                                  }
                                </p>

                                {/* DISCOUNT */}

                                {coupon.discountPercent && (
                                  <p
                                    className="
                                      mt-1
                                      text-xs
                                      text-neutral-400
                                    "
                                  >
                                    {
                                      coupon.discountPercent
                                    }
                                    % off
                                  </p>
                                )}

                                {coupon.discountFlatAmount && (
                                  <p
                                    className="
                                      mt-1
                                      text-xs
                                      text-neutral-400
                                    "
                                  >
                                    ₹
                                    {(
                                      coupon.discountFlatAmount /
                                      100
                                    ).toLocaleString(
                                      "en-IN"
                                    )}{" "}
                                    off
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* CTA */}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackage(
                            pkg
                          );

                          setOpen(
                            true
                          );
                        }}
                        className="
                          mt-8
                          w-full
                          h-12
                          rounded-xl
                          bg-lime-400
                          text-black
                          font-bold
                          cursor-pointer
                          hover:bg-lime-300
                          transition
                        "
                      >
                        Choose Package
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div
              className="
                mt-10
                rounded-3xl
                border
                border-neutral-800
                bg-neutral-900/50
                px-6
                py-14
                text-center
              "
            >
              <h3
                className="
                  text-2xl
                  font-bold
                "
              >
                Packages Coming
                Soon
              </h3>

              <p
                className="
                  mt-3
                  text-neutral-500
                "
              >
                Membership packages
                for this service are
                currently unavailable.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* SUBSCRIBE MODAL */}
      {/* ================================================= */}

      {selectedPackage && (
        <SubscribeModal
          open={open}
          setOpen={setOpen}
          selectedPackage={
            selectedPackage
          }
          service={service}
        />
      )}

      {/* ================================================= */}
      {/* BOOK TRIAL */}
      {/* ================================================= */}

      <BookTrialForm
        open={isBookTrialOpen}
        setOpen={
          setIsBookTrialOpen
        }
      />

      {/* ================================================= */}
      {/* CONTACT */}
      {/* ================================================= */}

      <ContactForm
        open={isContactOpen}
        setOpen={
          setIsContactOpen
        }
      />

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <Footer />
    </main>
  );
}
