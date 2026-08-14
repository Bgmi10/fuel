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

    // If user is on another page
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
          via-black/30
          to-transparent

          pointer-events-none
        "
      />

      <div
        className="
          relative

          flex
          items-center

          px-6
          md:pl-8
          md:pr-5

          py-4
        "
      >
        {/* -------------------------------- */}
        {/* LEFT */}
        {/* -------------------------------- */}

        <div
          className="
            shrink-0
            flex
            items-center
          "
        >
          {/*
          <img
            src="/logo.png"
            alt="Fuel Gym"
            className="h-14 w-auto"
          />
          */}
        </div>

        {/* -------------------------------- */}
        {/* CENTER NAVIGATION */}
        {/* -------------------------------- */}

        <nav
          className="
            hidden
            md:flex

            flex-1

            items-center
            justify-center

            gap-7
            lg:gap-9

            text-[15px]
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

        {/* -------------------------------- */}
        {/* RIGHT SIDE */}
        {/* -------------------------------- */}

        <div
          className="
            ml-auto

            flex
            items-center

            gap-3
          "
        >
          {/* ------------------------------ */}
          {/* BRANCH SELECTOR */}
          {/* ------------------------------ */}

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
                h-11

                px-4

                rounded-xl

                border
                border-white/10

                bg-white/5
                backdrop-blur-xl

                flex
                items-center
                gap-3

                cursor-pointer

                hover:bg-white/10

                transition-all
                duration-300
              "
            >
              {/* LOCATION ICON */}

              <div
                className="
                  w-8
                  h-8

                  rounded-full

                  bg-lime-400/15

                  flex
                  items-center
                  justify-center
                "
              >
                <MapPin
                  size={16}
                  className="
                    text-lime-400
                  "
                />
              </div>

              {/* BRANCH */}

              <div className="text-left">
                <p
                  className="
                    text-[11px]
                    text-neutral-500
                    leading-none
                  "
                >
                  Selected Branch
                </p>

                <p
                  className="
                    mt-1

                    text-sm
                    text-white
                    font-medium

                    max-w-[170px]

                    truncate
                  "
                >
                  {loading
                    ? "Loading..."
                    : selectedBranch
                        ?.name ||
                      "Select Branch"}
                </p>
              </div>

              {/* CHEVRON */}

              <ChevronDown
                size={16}
                className={`
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

            {/* ------------------------------ */}
            {/* BRANCH DROPDOWN */}
            {/* ------------------------------ */}

            {open && (
              <div
                className="
                  absolute

                  top-[120%]
                  right-0

                  w-[320px]

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
                          key={
                            branch.id
                          }
                          type="button"
                          onClick={() => {
                            setSelectedBranch(
                              branch
                            );

                            setOpen(
                              false
                            );
                          }}
                          className={`
                            w-full

                            text-left

                            p-4
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
                                font-medium

                                ${
                                  active
                                    ? "text-lime-400"
                                    : "text-white"
                                }
                              `}
                            >
                              {
                                branch.name
                              }
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

          {/* ------------------------------ */}
          {/* BOOK TRIAL */}
          {/* ------------------------------ */}

          <button
            type="button"
            onClick={goToPricing}
            className="
              bg-lime-400
              text-black

              font-semibold

              px-7
              lg:px-8
              py-2.5

              rounded-xl

              tracking-wide

              whitespace-nowrap

              cursor-pointer

              shadow-[0_0_25px_rgba(198,255,0,0.30)]

              hover:
              shadow-[0_0_40px_rgba(198,255,0,0.55)]

              hover:bg-lime-300

              hover:scale-[1.03]

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