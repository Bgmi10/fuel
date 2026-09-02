"use client";

import { Parallax } from "react-scroll-parallax";

const About = () => {
  return (
    <section
      id="about"
      className="
        relative
        bg-black
        md:py-24
        sm: -mt-[90px]
        overflow-hidden
      "
    >
      {/* BACKGROUND GLOW */}
      <div
        className="
          absolute
          top-1/2
          left-1/2
          -translate-x-1/2
          -translate-y-1/2
          w-[600px]
          h-[400px]
          bg-lime-400/[0.04]
          blur-[140px]
          rounded-full
          pointer-events-none
        "
      />

      <div
        className="
          relative
          max-w-6xl
          mx-auto
          px-6
          md:px-10
        "
      >
        <div
          className="
            relative
            min-h-[430px]
            md:min-h-[500px]
            flex
            items-center
            justify-center
          "
        >
          {/* IMAGES */}

          <div
            className="
              flex
              items-center
              justify-center
              gap-4
              md:gap-6
              w-full
            "
          >
            {/* LEFT IMAGE */}

            <Parallax
              scale={[1, 0.9]}
              opacity={[1, 0.7]}
              speed={-6}
            >
              <img
                src="/fuel-functional-about.webp"
                alt="Fuel training"
                className="
                  w-[220px]
                  sm:w-[280px]
                  md:w-[360px]
                  lg:w-[430px]
                  aspect-[4/5]
                  object-cover
                  rounded-2xl
                  grayscale
                  brightness-[0.65]
                  shadow-[0_20px_60px_rgba(0,0,0,0.6)]
                "
              />
            </Parallax>

            {/* RIGHT IMAGE */}

            <Parallax
              scale={[1, 0.88]}
              opacity={[1, 0.65]}
              speed={-10}
            >
              <img
                src="/fuel-yoga-about.webp"
                alt="Fuel workout"
                className="
                  w-[220px]
                  sm:w-[280px]
                  md:w-[360px]
                  lg:w-[430px]
                  aspect-[4/5]
                  object-cover
                  rounded-2xl
                  grayscale
                  brightness-[0.65]
                  shadow-[0_20px_60px_rgba(0,0,0,0.6)]
                "
              />
            </Parallax>
          </div>

          {/* DARK OVERLAY */}

          <div
            className="
              absolute
              inset-0
              bg-black/20
              pointer-events-none
            "
          />

          {/* CENTER CONTENT */}

          <div
            className="
              absolute
              inset-0
              z-20
              flex
              items-center
              justify-center
              px-4
              md:px-6
              pointer-events-none
            "
          >
            <div
              className="
                max-w-4xl
                mx-auto
                text-center
                bg-black/70
                backdrop-blur-md
                border
                border-white/10
                rounded-[28px]
                px-6
                md:px-10
                py-7
                md:py-9
                shadow-[0_20px_80px_rgba(0,0,0,0.55)]
              "
            >
              {/* MAIN HEADING */}

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
  Why Choose{" "}
  <span className="text-lime-400">
    Fuel
  </span>
</h2>

              {/* CONTENT */}

              <p
                className="
                  mt-5
                  max-w-3xl
                  mx-auto
                  text-sm
                  md:text-base
                  text-neutral-400
                  leading-7
                "
              >
                At FUEL, every session is designed to make you
                stronger, fitter, and more confident. Experience
                Functional Training, HIIT, Yoga, Zumba, and HYROX —
                all under one roof, with expert guidance and a
                community that keeps you moving.
              </p>

              {/* ACCENT */}

              <div
                className="
                  mt-6
                  mx-auto
                  h-[3px]
                  w-14
                  bg-lime-400
                "
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;