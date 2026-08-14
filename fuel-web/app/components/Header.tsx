"use client";

import {
  ChevronDown,
  MapPin,
} from "lucide-react";

import { useState } from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { useBranch } from "../contexts/BranchContext";

type HeaderProps = {
  setIsContactOpen: (
    value: boolean
  ) => void;
};

export const Header = ({
  setIsContactOpen,
}: HeaderProps) => {
  const router = useRouter();

  const pathname = usePathname();

  const [open, setOpen] =
    useState(false);

  const {
    branches,
    selectedBranch,
    setSelectedBranch,
    loading,
  } = useBranch();

  // -----------------------------------------
  // SCROLL TO PRICING
  // -----------------------------------------

  const goToPricing = () => {
    if (pathname === "/") {
      const section =
        document.getElementById(
          "pricing"
        );

      section?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    router.push("/#pricing");
  };

  // -----------------------------------------
  // NAVIGATION
  // -----------------------------------------

  const navItems = [
    {
      label: "Home",
      action: () =>
        router.push("/"),
    },

    {
      label: "About Us",
      action: () =>
        router.push("/about"),
    },

    {
      label: "Services",
      action: goToPricing,
    },

    {
      label: "Academy",
      action: () =>
        router.push("/academy"),
    },

    {
      label: "Blogs",
      action: () =>
        router.push("/blogs"),
    },

    {
      label: "Enquiry",
      action: () =>
        setIsContactOpen(true),
    },
  ];

  return (
    <header
      className="
        absolute
        top-0
        left-0
        w-full
        z-50
      "
    >
      {/* HEADER GRADIENT */}

      <div
        className="
          absolute
          inset-0

          bg-gradient-to-b
          from-black/90
          via-black/35
          to-transparent

          pointer-events-none
        "
      />

      {/* ===================================== */}
      {/* HEADER INNER */}
      {/* ===================================== */}

      <div
        className="
          relative

          max-w-[1500px]
          mx-auto

          h-[82px]

          px-5
          sm:px-6
          md:px-8
          lg:px-7

          flex
          items-center
        "
      >
        {/* ===================================== */}
        {/* CENTER NAVIGATION */}
        {/* ===================================== */}

        <nav
          className="
            hidden
            lg:flex

            absolute

            left-[585px]
            top-1/2

            -translate-x-1/2
            -translate-y-1/2

            items-center

            gap-6
            xl:gap-8

            text-[14px]
            xl:text-[15px]

            tracking-wide
          "
        >
          {navItems.map(
            (item) => (
              <button
                key={item.label}
                type="button"
                onClick={
                  item.action
                }
                className="
                  relative

                  text-neutral-300

                  hover:text-white

                  transition
                  duration-300

                  group

                  cursor-pointer

                  whitespace-nowrap
                "
              >
                {item.label}

                {/* UNDERLINE */}

                <span
                  className="
                    absolute

                    left-0
                    -bottom-2

                    h-[2px]
                    w-0

                    bg-lime-400

                    transition-all
                    duration-300

                    group-hover:w-full
                  "
                />
              </button>
            )
          )}
        </nav>

        {/* ===================================== */}
        {/* RIGHT SIDE */}
        {/* ===================================== */}

        {/* ===================================== */}
{/* RIGHT SIDE */}
{/* ===================================== */}

<div
  className="
    ml-auto

    flex
    items-center

    gap-3
  "
>
  {/* ================================= */}
  {/* BRANCH SELECTOR */}
  {/* ================================= */}

  <div
    className="
      relative

      hidden
      md:block
    "
  >
    <button
      type="button"
      onClick={() =>
        setOpen(!open)
      }
      className="
        w-[210px]
        lg:w-[160px]

        h-11

        px-3

        rounded-xl

        border
        border-white/10

        bg-white/[0.05]
        backdrop-blur-xl

        flex
        items-center

        gap-2

        cursor-pointer

        hover:bg-white/10
        hover:border-white/20

        transition-all
        duration-300
      "
    >
      {/* LOCATION */}

      <div
        className="
          w-8
          h-8

          shrink-0

          rounded-full

          bg-lime-400/10

          flex
          items-center
          justify-center
        "
      >
        <MapPin
          size={15}
          className="
            text-lime-400
          "
        />
      </div>

      {/* BRANCH NAME */}

      <div
        className="
          flex-1

          min-w-0

          text-left
        "
      >
        <p
          className="
            text-[9px]
            text-neutral-500

            leading-none
          "
        >
          Selected Branch
        </p>

        <p
          className="
            mt-1

            text-[12px]
            lg:text-[13px]

            text-white

            font-medium

            truncate
          "
        >
          {loading
            ? "Loading..."
            : selectedBranch?.name ||
              "Select Branch"}
        </p>
      </div>

      {/* CHEVRON */}

      <ChevronDown
        size={15}
        className={`
          shrink-0

          text-neutral-400

          transition-transform
          duration-300

          ${
            open
              ? "rotate-180"
              : ""
          }
        `}
      />
    </button>

    {/* ================================= */}
    {/* BRANCH DROPDOWN */}
    {/* ================================= */}

    {open && (
      <div
        className="
          absolute

          top-[calc(100%+10px)]
          right-0

          w-[300px]

          bg-neutral-950/95
          backdrop-blur-2xl

          border
          border-white/10

          rounded-2xl

          overflow-hidden

          shadow-2xl
        "
      >
        <div className="p-2">
          {branches.map(
            (branch) => {
              const active =
                selectedBranch?.id ===
                branch.id;

              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    setSelectedBranch(
                      branch
                    );

                    setOpen(false);
                  }}
                  className={`
                    w-full

                    text-left

                    px-4
                    py-3.5

                    mb-1

                    rounded-xl

                    border

                    cursor-pointer

                    transition-all
                    duration-300

                    ${
                      active
                        ? `
                            bg-lime-400/10
                            border-lime-400/20
                          `
                        : `
                            border-transparent
                            hover:bg-white/5
                          `
                    }
                  `}
                >
                  <div
                    className="
                      flex
                      items-center

                      gap-3
                    "
                  >
                    <div
                      className={`
                        w-2
                        h-2

                        shrink-0

                        rounded-full

                        ${
                          active
                            ? "bg-lime-400"
                            : "bg-neutral-600"
                        }
                      `}
                    />

                    <p
                      className={`
                        text-sm
                        font-medium

                        ${
                          active
                            ? "text-lime-400"
                            : "text-white"
                        }
                      `}
                    >
                      {branch.name}
                    </p>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </div>
    )}
  </div>

  {/* ================================= */}
  {/* BOOK TRIAL */}
  {/* ================================= */}

  <button
    type="button"
    onClick={goToPricing}
    className="
      w-[210px]
      lg:w-[160px]

      h-11

      flex
      items-center
      justify-center

      rounded-xl

      bg-lime-400
      text-black

      text-sm
      font-semibold

      tracking-wide

      whitespace-nowrap

      cursor-pointer

      shadow-[0_0_25px_rgba(198,255,0,0.25)]

      hover:bg-lime-300

      hover:shadow-[0_0_35px_rgba(198,255,0,0.45)]

      transition-all
      duration-300
    "
  >
    Book Trial
  </button>
</div>
      </div>
    </header>
  );
};