"use client";

import {
  ChevronDown,
  MapPin,
  Menu,
  X,
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

  const [open, setOpen] = useState(false);
  const [mobileMenu, setMobileMenu] =
    useState(false);

  const {
    branches,
    selectedBranch,
    setSelectedBranch,
    loading,
  } = useBranch();

  // =========================================
  // CLOSE MOBILE MENU
  // =========================================

  const closeMobileMenu = () => {
    setMobileMenu(false);
  };

  // =========================================
  // SCROLL TO PRICING
  // =========================================

  const goToPricing = () => {
    closeMobileMenu();

    if (pathname === "/") {
      const section =
        document.getElementById("pricing");

      section?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    router.push("/#pricing");
  };

  // =========================================
  // NAVIGATION
  // =========================================

  const navItems = [
    {
      label: "Home",
      action: () => {
        closeMobileMenu();
        router.push("/");
      },
    },

    {
      label: "About Us",
      action: () => {
        closeMobileMenu();
        router.push("/about");
      },
    },

    {
      label: "Services",
      action: goToPricing,
    },

    {
      label: "Academy",
      action: () => {
        closeMobileMenu();
        router.push("/academy");
      },
    },

    {
      label: "Blogs",
      action: () => {
        closeMobileMenu();
        router.push("/blogs");
      },
    },

    {
      label: "Enquiry",
      action: () => {
        closeMobileMenu();
        setIsContactOpen(true);
      },
    },
  ];

  return (
    <>
      {/* ===================================== */}
      {/* HEADER */}
      {/* ===================================== */}

      <header
        className="
          absolute
          top-0
          left-0
          z-50
          w-full
        "
      >
        {/* HEADER GRADIENT */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-b
            from-black/90
            via-black/35
            to-transparent
          "
        />

        {/* ===================================== */}
        {/* HEADER INNER */}
        {/* ===================================== */}

        <div
          className="
            relative
            mx-auto
            flex
            h-[70px]
            max-w-[1500px]
            items-center
            px-4
            sm:h-[76px]
            sm:px-5
            md:h-[82px]
            md:px-8
            lg:px-7
          "
        >
          {/* ================================= */}
          {/* MOBILE HAMBURGER */}
          {/* ================================= */}

          <button
            type="button"
            aria-label="Open menu"
            onClick={() =>
              setMobileMenu(true)
            }
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              border
              border-white/10
              bg-white/[0.06]
              text-white
              backdrop-blur-xl
              transition
              hover:bg-white/10

              lg:hidden
            "
          >
            <Menu size={21} />
          </button>

          {/* ================================= */}
          {/* DESKTOP NAVIGATION */}
          {/* ================================= */}

          <nav
            className="
              absolute
              left-[585px]
              top-1/2
              hidden
              -translate-x-1/2
              -translate-y-1/2
              items-center
              gap-6
              text-[14px]
              tracking-wide
              xl:gap-8
              xl:text-[15px]

              lg:flex
            "
          >
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="
                  group
                  relative
                  cursor-pointer
                  whitespace-nowrap
                  text-neutral-300
                  transition
                  duration-300
                  hover:text-white
                "
              >
                {item.label}

                <span
                  className="
                    absolute
                    -bottom-2
                    left-0
                    h-[2px]
                    w-0
                    bg-lime-400
                    transition-all
                    duration-300
                    group-hover:w-full
                  "
                />
              </button>
            ))}
          </nav>

          {/* ================================= */}
          {/* RIGHT SIDE */}
          {/* ================================= */}

          <div
            className="
              ml-auto
              flex
              items-center
              gap-2
              sm:gap-3
            "
          >
            {/* ================================= */}
            {/* MOBILE BRANCH SELECTOR */}
            {/* ================================= */}

            <div
              className="
                relative

                md:hidden
              "
            >
              <button
                type="button"
                onClick={() =>
                  setOpen(!open)
                }
                aria-label="Select branch"
                className="
                  flex
                  h-10
                  max-w-[150px]
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-white/10
                  bg-white/[0.06]
                  px-2.5
                  backdrop-blur-xl
                  transition
                  hover:bg-white/10

                  sm:h-11
                  sm:max-w-[180px]
                  sm:px-3
                "
              >
                {/* LOCATION ICON */}

                <div
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-lime-400/10

                    sm:h-8
                    sm:w-8
                  "
                >
                  <MapPin
                    size={14}
                    className="text-lime-400"
                  />
                </div>

                {/* BRANCH */}

                <div
                  className="
                    min-w-0
                    text-left
                  "
                >
                  <p
                    className="
                      hidden
                      text-[8px]
                      leading-none
                      text-neutral-500

                      sm:block
                    "
                  >
                    Selected Branch
                  </p>

                  <p
                    className="
                      max-w-[85px]
                      truncate
                      text-[11px]
                      font-medium
                      text-white

                      sm:mt-1
                      sm:max-w-[110px]
                      sm:text-[12px]
                    "
                  >
                    {loading
                      ? "Loading..."
                      : selectedBranch?.name ||
                        "Select Branch"}
                  </p>
                </div>

                <ChevronDown
                  size={14}
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

              {/* MOBILE BRANCH DROPDOWN */}

              {open && (
                <div
                  className="
                    absolute
                    right-0
                    top-[calc(100%+8px)]
                    z-[60]
                    w-[250px]
                    overflow-hidden
                    rounded-2xl
                    border
                    border-white/10
                    bg-neutral-950/95
                    shadow-2xl
                    backdrop-blur-2xl

                    sm:w-[280px]
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
                              mb-1
                              flex
                              w-full
                              items-center
                              gap-3
                              rounded-xl
                              border
                              px-3
                              py-3
                              text-left
                              transition-all
                              duration-200

                              ${
                                active
                                  ? `
                                    border-lime-400/20
                                    bg-lime-400/10
                                  `
                                  : `
                                    border-transparent
                                    hover:bg-white/5
                                  `
                              }
                            `}
                          >
                            <div
                              className={`
                                h-2
                                w-2
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
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ================================= */}
            {/* DESKTOP BRANCH SELECTOR */}
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
                  flex
                  h-11
                  w-[210px]
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-white/10
                  bg-white/[0.05]
                  px-3
                  backdrop-blur-xl
                  transition-all
                  duration-300
                  hover:border-white/20
                  hover:bg-white/10

                  lg:w-[160px]
                "
              >
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-lime-400/10
                  "
                >
                  <MapPin
                    size={15}
                    className="text-lime-400"
                  />
                </div>

                <div
                  className="
                    min-w-0
                    flex-1
                    text-left
                  "
                >
                  <p
                    className="
                      text-[9px]
                      leading-none
                      text-neutral-500
                    "
                  >
                    Selected Branch
                  </p>

                  <p
                    className="
                      mt-1
                      truncate
                      text-[12px]
                      font-medium
                      text-white

                      lg:text-[13px]
                    "
                  >
                    {loading
                      ? "Loading..."
                      : selectedBranch?.name ||
                        "Select Branch"}
                  </p>
                </div>

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

              {open && (
                <div
                  className="
                    absolute
                    right-0
                    top-[calc(100%+10px)]
                    z-[60]
                    w-[300px]
                    overflow-hidden
                    rounded-2xl
                    border
                    border-white/10
                    bg-neutral-950/95
                    shadow-2xl
                    backdrop-blur-2xl
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
                              mb-1
                              w-full
                              rounded-xl
                              border
                              px-4
                              py-3.5
                              text-left
                              transition-all
                              duration-300

                              ${
                                active
                                  ? `
                                    border-lime-400/20
                                    bg-lime-400/10
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
                                  h-2
                                  w-2
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
            {/* DESKTOP BOOK TRIAL */}
            {/* ================================= */}

            <button
              type="button"
              onClick={goToPricing}
              className="
                hidden
                h-11
                w-[160px]
                items-center
                justify-center
                rounded-xl
                bg-lime-400
                text-sm
                font-semibold
                tracking-wide
                text-black
                shadow-[0_0_25px_rgba(198,255,0,0.25)]
                transition-all
                duration-300
                hover:bg-lime-300
                hover:shadow-[0_0_35px_rgba(198,255,0,0.45)]

                md:flex
              "
            >
              Book Trial
            </button>
          </div>
        </div>
      </header>

      {/* ===================================== */}
      {/* MOBILE OVERLAY */}
      {/* ===================================== */}

      {mobileMenu && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            bg-black/60
            backdrop-blur-sm

            lg:hidden
          "
          onClick={closeMobileMenu}
        />
      )}

      {/* ===================================== */}
      {/* MOBILE SIDE DRAWER */}
      {/* ===================================== */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-[110]
          flex
          h-full
          w-[82%]
          max-w-[340px]
          flex-col
          bg-neutral-950
          shadow-2xl
          transition-transform
          duration-300
          ease-out

          lg:hidden

          ${
            mobileMenu
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* DRAWER HEADER */}

        <div
          className="
            flex
            h-[70px]
            shrink-0
            items-center
            justify-between
            border-b
            border-white/10
            px-5
          "
        >
          <span
            className="
              text-sm
              font-semibold
              tracking-widest
              text-white
            "
          >
            MENU
          </span>

          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMobileMenu}
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              border
              border-white/10
              text-neutral-300
              transition
              hover:bg-white/10
              hover:text-white
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}

        <nav
          className="
            flex
            flex-1
            flex-col
            overflow-y-auto
            px-4
            py-6
          "
        >
          {navItems.map(
            (item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="
                  group
                  flex
                  w-full
                  items-center
                  justify-between
                  border-b
                  border-white/5
                  px-3
                  py-4
                  text-left
                  text-base
                  font-medium
                  text-neutral-300
                  transition
                  hover:text-lime-400
                "
              >
                <span>
                  {item.label}
                </span>

                <span
                  className="
                    text-neutral-600
                    transition
                    group-hover:translate-x-1
                    group-hover:text-lime-400
                  "
                >
                  →
                </span>
              </button>
            )
          )}
        </nav>

        {/* DRAWER FOOTER */}

        <div
          className="
            shrink-0
            border-t
            border-white/10
            p-4
          "
        >
          <button
            type="button"
            onClick={goToPricing}
            className="
              flex
              h-12
              w-full
              items-center
              justify-center
              rounded-xl
              bg-lime-400
              text-sm
              font-semibold
              tracking-wide
              text-black
              shadow-[0_0_25px_rgba(198,255,0,0.2)]
              transition
              hover:bg-lime-300
            "
          >
            Book Trial
          </button>
        </div>
      </aside>
    </>
  );
};
