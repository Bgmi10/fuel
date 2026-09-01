"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useBranch } from "../contexts/BranchContext";

import {
  Branch,
  Coupon,
  Service,
  ServicePackage,
} from "@prisma/client";

type PackageWithCoupons = ServicePackage & {
  coupons: Coupon[];
};

type ServiceWithBranches = Service & {
  branches: Branch[];
  packages: PackageWithCoupons[];
};

export const Pricing = () => {
  const router = useRouter();

  const { selectedBranch } = useBranch();

  const [services, setServices] = useState<ServiceWithBranches[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // FETCH SERVICES
  // =========================================================

  useEffect(() => {
    const fetchServices = async () => {
      if (!selectedBranch?.id) {
        setServices([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(
          `/api/services?branchId=${selectedBranch.id}`
        );

        if (!res.ok) {
          throw new Error("Unable to fetch services");
        }

        const data = await res.json();

        setServices(data.services || []);
      } catch (error) {
        console.error("Error fetching services:", error);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [selectedBranch?.id]);

  // =========================================================
  // FILTER SERVICES BY SELECTED BRANCH
  // =========================================================

  const branchServices = useMemo(() => {
    if (!selectedBranch) {
      return [];
    }

    return services.filter((service) =>
      service.branches?.some(
        (branch) => branch.id === selectedBranch.id
      )
    );
  }, [services, selectedBranch]);

  // =========================================================
  // OPEN SERVICE DETAILS
  // =========================================================

  const openService = (service: ServiceWithBranches) => {
    if (!selectedBranch?.id) {
      return;
    }

    const params = new URLSearchParams();

    params.set("name", service.name);
    params.set("branchId", selectedBranch.id);

    router.push(
      `/services/${service.id}?${params.toString()}`
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <section
      id="pricing"
      className="
        relative
        overflow-hidden
        bg-black
        px-5
        py-16
        md:px-6
        md:py-20
      "
    >
      {/* =====================================================
          BACKGROUND GLOW
      ===================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-0
          h-[500px]
          w-[700px]
          -translate-x-1/2
          rounded-full
          bg-lime-400/[0.035]
          blur-[140px]
        "
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          relative
          mx-auto
          max-w-4xl
          text-center
        "
      >
        {/* SMALL LABEL */}

        <div
          className="
            mb-3
            flex
            items-center
            justify-center
            gap-4
          "
        >
          <div
            className="
              h-px
              w-14
              bg-lime-400/40
            "
          />

          <p
            className="
              text-sm
              font-semibold
              uppercase
              tracking-[0.08em]
              text-lime-400
              md:text-base
            "
          >
            Services
          </p>

          <div
            className="
              h-px
              w-14
              bg-lime-400/40
            "
          />
        </div>

        {/* TITLE */}

        <h2
          className="
            text-3xl
            font-black
            uppercase
            tracking-tight
            text-white
            md:text-4xl
            lg:text-5xl
          "
        >
          World Of{" "}
          <span className="text-lime-400">
            Fuel
          </span>
        </h2>

        {/* ACCENT */}

        <div
          className="
            mx-auto
            mt-4
            h-[3px]
            w-12
            rounded-full
            bg-lime-400
          "
        />
      </div>

      {/* =====================================================
          NO BRANCH SELECTED
      ===================================================== */}

      {!selectedBranch && !loading && (
        <div
          className="
            relative
            mt-16
            text-center
          "
        >
          <h3
            className="
              text-xl
              font-bold
              text-white
            "
          >
            Select a Branch
          </h3>

          <p
            className="
              mt-2
              text-sm
              text-neutral-500
            "
          >
            Select a branch to view available programs.
          </p>
        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <div
          className="
            relative
            mt-14
            flex
            justify-center
          "
        >
          <div
            className="
              h-9
              w-9
              animate-spin
              rounded-full
              border-2
              border-lime-400
              border-t-transparent
            "
          />
        </div>
      )}

      {/* =====================================================
          SERVICE CARDS
      ===================================================== */}

      {!loading && branchServices.length > 0 && (
        <div
          className="
            relative
            mx-auto
            mt-10
            grid
            max-w-[1300px]
            grid-cols-1
            gap-4
            sm:grid-cols-2
            md:gap-5
            lg:grid-cols-3
            xl:grid-cols-4
          "
        >
          {branchServices.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => openService(service)}
              aria-label={`Explore ${service.name}`}
              className="
                group
                relative
                h-[280px]
                cursor-pointer
                overflow-hidden
                rounded-2xl
                border
                border-white/[0.08]
                bg-neutral-950
                text-left
                transition-all
                duration-500
                hover:-translate-y-1
                hover:border-neutral-600
                hover:shadow-[0_18px_45px_rgba(0,0,0,0.45)]
                sm:h-[295px]
                md:h-[305px]
                lg:h-[320px]
                xl:h-[330px]
              "
            >
              {/* =================================================
                  THUMBNAIL IMAGE FROM DATABASE
              ================================================= */}

              {service.thumbnailImage ? (
                <Image
                  src={service.thumbnailImage}
                  alt={service.name}
                  fill
                  sizes="
                    (max-width: 640px) 100vw,
                    (max-width: 1024px) 50vw,
                    (max-width: 1280px) 33vw,
                    25vw
                  "
                  className="
                    object-cover
                    transition-all
                    duration-700
                    group-hover:scale-[1.03]
                    group-hover:brightness-[0.75]
                    group-hover:grayscale-[35%]
                  "
                />
              ) : (
                <div
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-br
                    from-neutral-800
                    via-neutral-950
                    to-black
                  "
                />
              )}

              {/* =================================================
                  DARK GRADIENT
              ================================================= */}

              <div
                className="
                  absolute
                  inset-0
                  bg-gradient-to-t
                  from-black
                  via-black/30
                  to-black/5
                "
              />

              {/* =================================================
                  HOVER OVERLAY
              ================================================= */}

              <div
                className="
                  absolute
                  inset-0
                  bg-white/0
                  transition-colors
                  duration-500
                  group-hover:bg-white/[0.045]
                "
              />

              {/* =================================================
                  CONTENT
              ================================================= */}

              <div
                className="
                  absolute
                  inset-x-0
                  bottom-0
                  p-4
                  md:p-5
                "
              >
                {/* SERVICE NAME */}

                <h3
                  className="
                    text-lg
                    font-black
                    uppercase
                    leading-tight
                    text-white
                    lg:text-xl
                    xl:text-[22px]
                  "
                >
                  {service.name}
                </h3>

                {/* CTA */}

                <div
                  className="
                    mt-3
                    flex
                    items-center
                    justify-between
                  "
                >
                  <span
                    className="
                      text-[11px]
                      text-neutral-400
                      transition-colors
                      duration-300
                      group-hover:text-neutral-200
                      md:text-xs
                    "
                  >
                    Explore Program
                  </span>

                  {/* ARROW */}

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-neutral-600
                      bg-transparent
                      text-lg
                      text-neutral-300
                      transition-all
                      duration-300
                      group-hover:translate-x-1
                      group-hover:border-neutral-400
                      group-hover:bg-white/[0.06]
                      group-hover:text-white
                    "
                  >
                    →
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* =====================================================
          EMPTY STATE
      ===================================================== */}

      {!loading &&
        selectedBranch &&
        branchServices.length === 0 && (
          <div
            className="
              relative
              mt-16
              text-center
            "
          >
            <h3
              className="
                text-xl
                font-bold
                text-white
              "
            >
              Programs Coming Soon
            </h3>

            <p
              className="
                mt-2
                text-sm
                text-neutral-500
              "
            >
              Training programs are currently
              unavailable for this branch.
            </p>
          </div>
        )}
    </section>
  );
};
