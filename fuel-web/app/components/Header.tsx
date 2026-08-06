"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import { useBranch } from "../contexts/BranchContext";
import { useRouter } from "next/navigation";


export const Header = ({
  setIsContactOpen,
}: {
  setIsContactOpen: (
    value: boolean
  ) => void;
}) => {
  const [open, setOpen] =
    useState(false);
    const router = useRouter();

  // 🔥 USING GLOBAL HOOK
  const {
    branches,
    selectedBranch,
    setSelectedBranch,
    loading,
  } = useBranch();

  return (
    <header className="absolute top-0 left-0 w-full z-20">

      {/* 🔥 Gradient Shadow */}
      <div
        className="absolute inset-0 
                   bg-gradient-to-b 
                   from-black/90 via-black/20 to-transparent 
                   pointer-events-none"
      />

      <div className="relative flex items-center justify-between px-6 md:px-12 py-4">

        {/* LEFT */}
        <div className="flex items-center gap-5">

          {/* LOGO */}
          <img
            src="/logo.png"
            alt="Fuel Gym Logo"
            className="h-16 w-auto"
          />

          {/* 🔥 BRANCH SELECTOR */}
         
        </div>

        {/* NAVIGATION */}
        <nav className="hidden md:flex items-center gap-10 text-[15px] tracking-wide">

          {[
            "About",
            "Services",
            "Pricing",
            "Contact",
          ].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="relative text-neutral-300 hover:text-white transition group"
            >
              {item}

              <span
                className="absolute left-0 -bottom-1 w-0 h-[2px] 
                           bg-lime-400 transition-all duration-300 
                           group-hover:w-full"
              />
            </a>
          ))}
          <button onClick={() => router.push('/blogs')}>Blogs</button>

        </nav>
        <div className="flex gap-2 items-center">
        <div className="relative hidden md:block">

<button
  onClick={() =>
    setOpen(!open)
  }
  className="h-11 px-4 rounded-xl border border-white/10
             bg-white/5 backdrop-blur-xl
             flex items-center gap-3
             hover:bg-white/10
             transition-all duration-300"
>
  <div className="w-8 h-8 rounded-full bg-lime-400/15 flex items-center justify-center">
    <MapPin
      size={16}
      className="text-lime-400"
    />
  </div>

  <div className="text-left">
    <p className="text-[11px] text-neutral-500 leading-none">
      Selected Branch
    </p>

    <p className="text-sm text-white font-medium max-w-[180px] truncate">
      {loading
        ? "Loading..."
        : selectedBranch?.name}
    </p>
  </div>

  <ChevronDown
    size={16}
    className={`text-neutral-400 transition-transform duration-300 ${
      open
        ? "rotate-180"
        : ""
    }`}
  />
</button>

{/* 🔥 DROPDOWN */}
{open && (
  <div
    className="absolute top-[120%] left-0 w-[320px]
               bg-neutral-950/95 backdrop-blur-2xl
               border border-white/10
               rounded-2xl overflow-hidden
               shadow-2xl"
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
              onClick={() => {
                setSelectedBranch(
                  branch
                );

                setOpen(
                  false
                );
              }}
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 mb-1
              
              ${
                active
                  ? "bg-lime-400/10 border border-lime-400/20"
                  : "hover:bg-white/5 border border-transparent"
              }
            `}
            >
              <div className="flex items-start gap-3">

                <div
                  className={`mt-1 w-2 h-2 rounded-full ${
                    active
                      ? "bg-lime-400"
                      : "bg-neutral-600"
                  }`}
                />

                <div className="flex-1">

                  <p
                    className={`font-medium ${
                      active
                        ? "text-lime-400"
                        : "text-white"
                    }`}
                  >
                    {
                      branch.name
                    }
                  </p>

                </div>

              </div>
            </button>
          );
        }
      )}

    </div>
  </div>
)}

</div>

        {/* CTA */}
        <button
          className="bg-lime-400 text-black font-semibold px-5 py-2.5 
                     rounded-xl tracking-wide
                     shadow-[0_0_25px_rgba(198,255,0,0.35)]
                     hover:shadow-[0_0_40px_rgba(198,255,0,0.6)]
                     hover:bg-lime-300
                     hover:scale-105
                     transition-all duration-300"
          onClick={() =>
            setIsContactOpen(true)
          }
        >
          Contact Us
        </button>
        </div>

      </div>
    </header>
  );
};