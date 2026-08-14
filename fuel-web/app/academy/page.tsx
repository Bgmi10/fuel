"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Sparkles,
} from "lucide-react";

import { Header } from "../components/Header";
import Footer from "../components/Footer";
import { ContactForm } from "../components/Contactus";

export default function AcademyPage() {
  const [
    isContactOpen,
    setIsContactOpen,
  ] = useState(false);

  return (
    <main
      className="
        min-h-screen
        bg-black
        text-white
        overflow-hidden
      "
    >
      <Header
        setIsContactOpen={
          setIsContactOpen
        }
      />

      <section
        className="
          relative
          min-h-screen
          flex
          items-center
          justify-center
          overflow-hidden
          pt-28
          pb-16
        "
      >
        {/* -------------------------------- */}
        {/* BACKGROUND IMAGE */}
        {/* -------------------------------- */}

        <div className="absolute inset-0">
          <Image
            src="/about/education.jpg"
            alt="Fuel Academy"
            fill
            priority
            className="
              object-cover
              grayscale
              scale-105
            "
          />

          {/* DARK OVERLAY */}

          <div
            className="
              absolute
              inset-0
              bg-black/75
            "
          />

          {/* LEFT/RIGHT DARK FADE */}

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-r
              from-black
              via-black/60
              to-black/90
            "
          />

          {/* BOTTOM FADE */}

          <div
            className="
              absolute
              inset-x-0
              bottom-0
              h-[300px]
              bg-gradient-to-t
              from-black
              to-transparent
            "
          />
        </div>

        {/* -------------------------------- */}
        {/* DECORATIVE GLOW */}
        {/* -------------------------------- */}

        <div
          className="
            absolute
            top-1/2
            left-1/2
            -translate-x-1/2
            -translate-y-1/2

            w-[600px]
            h-[600px]

            rounded-full

            bg-lime-400/[0.06]
            blur-[160px]

            pointer-events-none
          "
        />

        {/* -------------------------------- */}
        {/* DECORATIVE LINES */}
        {/* -------------------------------- */}

        <div
          className="
            absolute
            top-28
            right-10

            hidden
            md:block

            w-24
            h-24

            border-t-2
            border-r-2
            border-lime-400/60
          "
        />

        <div
          className="
            absolute
            bottom-20
            left-10

            hidden
            md:block

            w-20
            h-20

            border-b-2
            border-l-2
            border-lime-400/50
          "
        />

        {/* -------------------------------- */}
        {/* CONTENT */}
        {/* -------------------------------- */}

        <div
          className="
            relative
            z-10

            max-w-5xl
            mx-auto

            px-6
            md:px-10

            text-center
          "
        >
          {/* BADGE */}

          <div
            className="
              inline-flex
              items-center
              gap-2

              px-4
              py-2

              rounded-full

              border
              border-lime-400/20

              bg-lime-400/10
              backdrop-blur-xl

              text-lime-300

              text-xs
              md:text-sm

              font-semibold
              tracking-[0.18em]
              uppercase
            "
          >
            <GraduationCap
              size={17}
            />

            Fuel Academy
          </div>

          {/* HEADING */}

          <h1
            className="
              mt-8

              text-5xl
              sm:text-6xl
              md:text-7xl
              lg:text-[88px]

              font-black

              uppercase

              tracking-tight

              leading-[0.9]
            "
          >
            Learn.
            <br />

            <span
              className="
                text-lime-400
              "
            >
              Train.
            </span>

            <br />

            Transform.
          </h1>

          {/* COMING SOON */}

          <div
            className="
              mt-10

              flex
              items-center
              justify-center
              gap-4
            "
          >
            <div
              className="
                h-px
                w-10
                md:w-20
                bg-gradient-to-r
                from-transparent
                to-lime-400
              "
            />

            <p
              className="
                text-xl
                md:text-3xl

                font-black

                uppercase

                tracking-[0.25em]

                text-white
              "
            >
              Coming Soon
            </p>

            <div
              className="
                h-px
                w-10
                md:w-20
                bg-gradient-to-l
                from-transparent
                to-lime-400
              "
            />
          </div>

          {/* DESCRIPTION */}

          <p
            className="
              mt-7

              max-w-2xl
              mx-auto

              text-sm
              md:text-lg

              leading-7
              md:leading-8

              text-neutral-400
            "
          >
            Fuel Academy is being built
            to develop the next generation
            of fitness and wellness
            professionals through
            evidence-based education,
            practical coaching and
            industry-focused learning.
          </p>

          {/* FEATURES */}

          <div
            className="
              mt-10

              flex
              flex-wrap

              items-center
              justify-center

              gap-3
            "
          >
            <div
              className="
                flex
                items-center
                gap-2

                px-4
                py-2.5

                rounded-full

                border
                border-white/10

                bg-white/[0.04]
                backdrop-blur-md

                text-sm
                text-neutral-300
              "
            >
              <BookOpen
                size={16}
                className="text-lime-400"
              />

              Professional Education
            </div>

            <div
              className="
                flex
                items-center
                gap-2

                px-4
                py-2.5

                rounded-full

                border
                border-white/10

                bg-white/[0.04]
                backdrop-blur-md

                text-sm
                text-neutral-300
              "
            >
              <GraduationCap
                size={16}
                className="text-lime-400"
              />

              Coach Development
            </div>

            <div
              className="
                flex
                items-center
                gap-2

                px-4
                py-2.5

                rounded-full

                border
                border-white/10

                bg-white/[0.04]
                backdrop-blur-md

                text-sm
                text-neutral-300
              "
            >
              <Sparkles
                size={16}
                className="text-lime-400"
              />

              Practical Learning
            </div>
          </div>

          {/* CTA */}

          <button
            type="button"
            onClick={() =>
              setIsContactOpen(true)
            }
            className="
              group

              mt-10

              inline-flex
              items-center
              justify-center
              gap-3

              h-13

              px-8

              rounded-xl

              bg-lime-400
              text-black

              font-bold

              cursor-pointer

              shadow-[0_0_30px_rgba(163,230,53,0.20)]

              hover:bg-lime-300
              hover:shadow-[0_0_50px_rgba(163,230,53,0.35)]

              transition-all
              duration-300
            "
          >
            Enquire About Academy

            <ArrowRight
              size={18}
              className="
                transition-transform
                duration-300
                group-hover:translate-x-1
              "
            />
          </button>
        </div>

        {/* -------------------------------- */}
        {/* BOTTOM STATUS */}
        {/* -------------------------------- */}

        <div
          className="
            absolute

            bottom-8
            left-1/2
            -translate-x-1/2

            z-10

            flex
            items-center
            gap-2

            text-[11px]
            md:text-xs

            uppercase

            tracking-[0.25em]

            text-neutral-600

            whitespace-nowrap
          "
        >
          <span
            className="
              w-2
              h-2

              rounded-full

              bg-lime-400

              shadow-[0_0_10px_rgba(163,230,53,0.8)]

              animate-pulse
            "
          />

          Programme Launch In Progress
        </div>
      </section>

      {/* CONTACT FORM */}

      <ContactForm
        open={isContactOpen}
        setOpen={
          setIsContactOpen
        }
      />

      <Footer />
    </main>
  );
}