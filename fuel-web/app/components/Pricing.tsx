"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useBranch } from "../contexts/BranchContext";

import {
  Branch,
  Coupon,
  Service,
  ServicePackage,
} from "@prisma/client";

type PackageWithCoupons =
  ServicePackage & {
    coupons: Coupon[];
  };

type ServiceWithBranches = Service & {
  branches: Branch[];
  packages: PackageWithCoupons[];
};

type LaunchServiceConfig = {
  key: string;
  match: string[];
  image: string;
};

const LAUNCH_SERVICES: LaunchServiceConfig[] =
  [
    {
      key: "functional-training",
      match: [
        "functional training",
        "functional",
      ],
      image:
        "/functional-training.webp",
    },

    {
      key: "yoga",
      match: ["yoga"],
      image: "/yoga.webp",
    },

    {
      key: "zumba",
      match: ["zumba"],
      image: "/zumba.webp",
    },

    {
      key: "hyrox",
      match: ["hyrox"],
      image: "/hyrox.webp",
    },

    {
      key: "nutrition-coaching",
      match: [
        "nutrition coaching",
        "nutrition",
      ],
      image:
        "/nutrition-coaching.png",
    },
  ];

export const Pricing = () => {
  const router = useRouter();

  const { selectedBranch } =
    useBranch();

  const [services, setServices] =
    useState<
      ServiceWithBranches[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  // -----------------------------------------
  // FETCH SERVICES
  // -----------------------------------------

  useEffect(() => {
    const fetchServices =
      async () => {
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
            throw new Error(
              "Unable to fetch services"
            );
          }

          const data =
            await res.json();

          setServices(
            data.services || []
          );
        } catch (error) {
          console.error(
            "Error fetching services:",
            error
          );

          setServices([]);
        } finally {
          setLoading(false);
        }
      };

    fetchServices();
  }, [selectedBranch?.id]);

  // -----------------------------------------
  // FILTER SERVICES BY BRANCH
  // -----------------------------------------

  const branchServices =
    useMemo(() => {
      if (!selectedBranch) {
        return [];
      }

      return services.filter(
        (service) =>
          service.branches?.some(
            (branch) =>
              branch.id ===
              selectedBranch.id
          )
      );
    }, [
      services,
      selectedBranch,
    ]);

  // -----------------------------------------
  // ONLY LAUNCH SERVICES
  // -----------------------------------------

  const launchServices =
    useMemo(() => {
      return LAUNCH_SERVICES.flatMap(
        (config) => {
          const service =
            branchServices.find(
              (service) => {
                const serviceName =
                  service.name
                    ?.trim()
                    .toLowerCase() ||
                  "";

                return config.match.some(
                  (keyword) =>
                    serviceName.includes(
                      keyword.toLowerCase()
                    )
                );
              }
            );

          if (!service) {
            return [];
          }

          return [
            {
              service,
              config,
            },
          ];
        }
      );
    }, [branchServices]);

  // -----------------------------------------
  // OPEN SERVICE
  // -----------------------------------------

  const openService = (
    service: ServiceWithBranches
  ) => {
    if (!selectedBranch?.id) {
      return;
    }

    const params =
      new URLSearchParams();

    params.set(
      "name",
      service.name
    );

    params.set(
      "branchId",
      selectedBranch.id
    );

    router.push(
      `/services/${service.id}?${params.toString()}`
    );
  };

  return (
    <section
      id="pricing"
      className="
        relative
        bg-black
        py-16
        md:py-20
        px-5
        md:px-6
        overflow-hidden
      "
    >
      {/* BACKGROUND GLOW */}

      <div
        className="
          absolute
          top-0
          left-1/2
          -translate-x-1/2

          w-[700px]
          h-[500px]

          bg-lime-400/[0.035]
          blur-[140px]

          rounded-full

          pointer-events-none
        "
      />

      {/* ====================================== */}
      {/* HEADER */}
      {/* ====================================== */}

      <div
        className="
          relative
          text-center
          max-w-4xl
          mx-auto
        "
      >
        {/* SMALL DIVIDER */}

        <div
          className="
            flex
            items-center
            justify-center
            gap-4
            mb-3
          "
        >
          <div
            className="
              w-14
              h-px
              bg-white/40
            "
          />

          <p
            className="
              text-sm
              md:text-base

              uppercase
              tracking-[0.08em]

              text-neutral-300
            "
          >
            Services
          </p>

          <div
            className="
              w-14
              h-px
              bg-white/40
            "
          />
        </div>

        <h2
          className="
            text-3xl
            md:text-4xl
            lg:text-5xl

            font-black

            uppercase
            tracking-tight

            text-white
          "
        >
          What You Get At Fuel
        </h2>

        {/* SELECTED BRANCH */}

        {selectedBranch && (
          <div
            className="
              mt-5

              inline-flex
              items-center
              gap-2

              px-4
              py-2

              rounded-full

              border
              border-white/10

              bg-white/[0.04]
            "
          >
            <div
              className="
                w-1.5
                h-1.5

                rounded-full

                bg-lime-400
              "
            />

            <span
              className="
                text-xs
                text-neutral-400
              "
            >
              {selectedBranch.name}
            </span>
          </div>
        )}
      </div>

      {/* ====================================== */}
      {/* LOADING */}
      {/* ====================================== */}

      {loading && (
        <div
          className="
            mt-14
            flex
            justify-center
          "
        >
          <div
            className="
              w-9
              h-9

              rounded-full

              border-2
              border-lime-400
              border-t-transparent

              animate-spin
            "
          />
        </div>
      )}

      {/* ====================================== */}
      {/* SERVICE CARDS */}
      {/* ====================================== */}

      {/* ====================================== */}
{/* SERVICE CARDS */}
{/* ====================================== */}

{!loading &&
  launchServices.length > 0 && (
    <div
      className="
        relative
        max-w-[1300px]
        mx-auto
        mt-10

        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-5

        gap-4
        md:gap-5
      "
    >
      {launchServices.map(
        ({ service, config }) => (
          <button
            key={service.id}
            type="button"
            onClick={() =>
              openService(service)
            }
            className="
              group
              relative

             h-[280px]
sm:h-[295px]
md:h-[305px]
lg:h-[320px]
xl:h-[330px]

              rounded-2xl
              overflow-hidden

              text-left

              border
              border-white/[0.08]

              bg-neutral-950

              cursor-pointer

              transition-all
              duration-500

              hover:border-neutral-600
              hover:-translate-y-1

              hover:shadow-[0_18px_45px_rgba(0,0,0,0.45)]
            "
          >
            {/* IMAGE */}

            <Image
              src={config.image}
              alt={service.name}
              fill
              className="
                object-cover

                transition-all
                duration-700

                group-hover:scale-[1.03]
                group-hover:grayscale-[35%]
                group-hover:brightness-[0.75]
              "
            />

            {/* DARK GRADIENT */}

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

            {/* PREMIUM GRAY HOVER */}

            <div
              className="
                absolute
                inset-0

                bg-white/0
                group-hover:bg-white/[0.045]

                transition-colors
                duration-500
              "
            />

            {/* BRANCH */}

            <div
              className="
                absolute
                top-4
                left-4
              "
            >
              <span
                className="
                  inline-flex

                  px-3
                  py-1.5

                  rounded-full

                  bg-black/50
                  backdrop-blur-lg

                  border
                  border-white/10

                  text-[9px]
                  uppercase
                  tracking-[0.16em]

                  text-neutral-300
                "
              >
                {selectedBranch?.name}
              </span>
            </div>

            {/* CONTENT */}

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
                  lg:text-xl
                  xl:text-[22px]

                  font-black

                  uppercase

                  text-white

                  leading-tight
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
                    md:text-xs

                    text-neutral-400

                    group-hover:text-neutral-200

                    transition-colors
                    duration-300
                  "
                >
                  Explore Program
                </span>

                {/* ARROW */}

                <div
                  className="
                    w-9
                    h-9

                    rounded-full

                    bg-transparent

                    border
                    border-neutral-600

                    text-neutral-300

                    flex
                    items-center
                    justify-center

                    text-lg

                    transition-all
                    duration-300

                    group-hover:border-neutral-400
                    group-hover:bg-white/[0.06]
                    group-hover:text-white
                    group-hover:translate-x-1
                  "
                >
                  →
                </div>
              </div>
            </div>
          </button>
        )
      )}
    </div>
  )}

      {/* ====================================== */}
      {/* EMPTY */}
      {/* ====================================== */}

      {!loading &&
        launchServices.length ===
          0 && (
          <div
            className="
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
              Programs Coming
              Soon
            </h3>

            <p
              className="
                text-neutral-500
                mt-2
                text-sm
              "
            >
              Training programs
              are currently
              unavailable for this
              branch.
            </p>
          </div>
        )}
    </section>
  );
};