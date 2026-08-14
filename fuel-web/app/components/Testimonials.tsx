"use client";

import {
  useState,
} from "react";

import Marquee from "react-fast-marquee";

import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const testimonials = [
  {
    name: "RANJITH P",
    profile:
      "https://lh3.googleusercontent.com/a/ACg8ocI9bOfU8tD7FkhLTHHjVF0Nbfkt4i5-V_7uVaLu_8wT3uCvzA=w49-h49-p-rp-mo-br100",
    time: "2 months ago",
    text:
      "I've been working out at Fuel gym, it's been a really positive experience. The gym is always clean, the equipment is in excellent condition, and the overall vibe keeps me motivated to show up every day. The trainers are friendly, supportive, and genuinely care about helping members reach their fitness goals. Everyone, from the staff to the members, creates a welcoming atmosphere. Whether you're just starting your fitness journey or have been training for years, this is a great place to work out. Definitely recommend giving it a try!",
  },

  {
    name: "Sakthi Priya Narayanan",
    profile:
      "https://lh3.googleusercontent.com/a/ACg8ocL3Cn7vXf8XJVv61GdVDSVRtw7hz8hYm-gylQkZYX9u-Bc5=w49-h49-p-rp-mo-br100",
    time: "4 months ago",
    text:
      "It’s been 3 months since I joined Fuel Gym and honestly, I didn’t expect to enjoy going to the gym this much since it’s my first one.",
  },

  {
    name: "Surya Jeeva",
    profile:
      "https://lh3.googleusercontent.com/a-/ALV-UjUBjPGdGkt8_lWkBOyjo52G4r-eWgE-itTybiBuKQKHdO3NmfJO=w49-h49-p-rp-mo-br100",
    time: "4 months ago",
    text:
      "Their team of five is really good. For a beginner like me there should be proper guidance to motivate and build up. So I was in search of a gym to get joined and by looking at Google reviews I wanted to join here at Fuel Gym.",
  },

  {
    name: "O B VISHNU",
    profile:
      "https://lh3.googleusercontent.com/a/ACg8ocI-PAFQgTQgg3x2TbtuuKV-quXOWA38NcjYeqi5LXJdSW5SRA=w49-h49-p-rp-mo-ba12-br100",
    time: "2 months ago",
    text:
      "My first shot at any gym. Functional training was more practical and hence tried. Great experience. Seemed easy from outside but actually tough and really efficient. Coaches are very supportive and motivating here.",
  },

  {
    name: "Yamini Sekar",
    profile:
      "https://lh3.googleusercontent.com/a/ACg8ocIlfm_8Y2ycftsDzYEYtlWGsvyqJv9sm9cIaWSxiPL4Dlioew=w49-h49-p-rp-mo-br100",
    time: "6 months ago",
    text:
      "Hello Fuel team!! I would like to take this opportunity to sincerely thank the Fuel Gym team. A month ago, my daughter introduced me to this gym and encouraged me to join.",
  },

  {
    name: "Swetha Rawal",
    profile:
      "https://lh3.googleusercontent.com/a/ACg8ocL3leedpETZKzyWoBKU_J8UisJiTYhemx_mz1-6vgJRvAXB7A=w49-h49-p-rp-mo-br100",
    time: "2 months ago",
    text:
      "Really good experience, great guidance. The trainers are knowledgeable, supportive, and always motivate me to push my limits. The workouts are also well planned.",
  },

  {
    name: "Karthick Rock",
    profile:
      "https://lh3.googleusercontent.com/a-/ALV-UjWnc8qczqhhRsLwQSKE-kTEXB4s-xSYZJ0G9HXmdYc7onN8zD_L=w49-h49-p-rp-mo-br100",
    time: "8 months ago",
    text:
      "Fuel Gym is truly the BEST functional training gym, offering best functional workouts, strength training, and body transformation. I have reduced from 87 kg to 71 kg — 16 kg — delivering real, healthy, and long-lasting results.",
  },

  {
    name: "Esther Grace",
    profile:
      "https://lh3.googleusercontent.com/a-/ALV-UjU_ofCcdQiOPz7jLXCng-bW07dfKqSa9WZTa2JvAVcg88cdDly8Uw=w49-h49-p-rp-mo-br100",
    time: "5 months ago",
    text:
      "Joining Fitness Yoga was one of the best decisions for my health in Fuel Yoga online classes. After regular sessions, I feel stronger, more flexible, and mentally relaxed. Nithya ma'am guides everyone with patience and is very supportive and motivating. It’s perfect for improving stamina, body strength, and overall well-being.",
  },

  {
    name: "Meganathan Vinayagam",
    profile:
      "https://lh3.googleusercontent.com/a/ACg8ocI2l-ktj84nOpOJn1b9dgX8VBh-Ok5dU-UYUcGoBlUKOpy2=w49-h49-p-rp-mo-br100",
    time: "7 months ago",
    text:
      "One of the best gyms I’ve trained at. It's not a normal gym with heavy workout — it's a functional training method and each and every day it's interesting. The trainers are knowledgeable, supportive, and guide properly for both beginners and experienced people. Clean environment, good equipment, and motivating atmosphere.",
  },

  {
    name: "Poornima Pradeep",
    profile:
      "https://lh3.googleusercontent.com/a-/ALV-UjUbAhDmru6B1ptMnzFJfFo0fXQK6tTpB85_S2shbiN-LzvjUcJo=w49-h49-p-rp-mo-br100",
    time: "7 months ago",
    text:
      "I have been going to Fuel Gym for the past 6 months and I’ve lost 5 kilos. I also have spinal issues, and the trainers take excellent care and guide me very carefully according to my condition.",
  },

  {
    name: "Rachna",
    profile:
      "https://lh3.googleusercontent.com/a/ACg8ocItLQmmJtyIC5oh0owNa5PxdS8eYIle7Ql6Ll7Uh5TrR1PS0wU=w49-h49-p-rp-mo-br100",
    time: "7 months ago",
    text:
      "Fuel gym isn't like any other regular gym. This place has not only made my fitness journey incredible but also provided mental peace and stability. I've been coming here since the past two years.",
  },

  {
    name: "Anamika Agarwal",
    profile:
      "https://lh3.googleusercontent.com/a-/ALV-UjXJZ-jhY6k63omW6aQle-kiC27iIDwgj_t0FmuOB8tDX0QAtTs=w49-h49-p-rp-mo-ba12-br100",
    time: "7 months ago",
    text:
      "Fuel Gym Chennai keeps me motivated every single day. Amazing trainers, great workout plans, and a friendly crowd. If you’re looking for real results and a positive vibe, this is the place to be! Absolutely love it.",
  },

  {
    name: "Gokul",
    profile:
      "https://lh3.googleusercontent.com/a-/ALV-UjWIdCarcrCJwPKxT8cfaLQG9COtt_K1RYHcDcP5qjvPZG5xNv7z=w49-h49-p-rp-mo-br100",
    time: "9 months ago",
    text:
      "Fuel Gym is unlike any regular gym — it’s a place where every session pushes you beyond your limits. The workouts are always dynamic, challenging, and fun.",
  },

  {
    name: "Sweety Khivesara",
    profile:
      "https://lh3.googleusercontent.com/a-/ALV-UjUDr_YTtRj7Gjf-I3352JipVzI0zytKFzphu9bCzk5mSVUt5bcB=w49-h49-p-rp-mo-br100",
    time: "9 months ago",
    text:
      "Started as a beginner being so skeptical whether gym and functional training were out of my reach, but honestly with the help of Coach Arif sir, Naren sir and Raghav sir it doesn't feel tough or monotonous.",
  },

  {
    name: "JAYANTHI B L",
    profile:
      "https://lh3.googleusercontent.com/a-/ALV-UjUxcfRSiO_Ze3sQaXlN2vpozWULdTVHclf7_6NknXn6Etqykye-=w49-h49-p-rp-mo-br100",
    time: "7 months ago",
    text:
      "As a yoga teacher, I'd like to share my thoughts about the functional training in this gym. I joined this gym to improve my strength and stability. Initially it was very tough for me to complete the required duration.",
  },
];

type Testimonial =
  (typeof testimonials)[number];

const Card = ({
  testimonial,
}: {
  testimonial: Testimonial;
}) => {
  const [expanded, setExpanded] =
    useState(false);

  // Only show Read More when the review
  // has enough content to need expansion.
  const needsReadMore =
    testimonial.text.length > 180;

  return (
    <div
      className="
        group

        mx-3

        w-[330px]
        md:w-[360px]

        h-[270px]
        md:h-[280px]

        shrink-0

        bg-neutral-950

        border
        border-white/[0.08]

        rounded-2xl

        p-5

        flex
        flex-col

        overflow-hidden

        transition-all
        duration-300

        hover:bg-neutral-900
        hover:border-white/[0.14]
      "
    >
      {/* ================================= */}
      {/* TOP */}
      {/* ================================= */}

      <div
        className="
          flex

          items-start
          justify-between

          gap-4

          shrink-0
        "
      >
        <div
          className="
            flex
            items-center

            gap-3

            min-w-0
          "
        >
          {/* PROFILE IMAGE */}

          <img
            src={
              testimonial.profile
            }
            alt={
              testimonial.name
            }
            referrerPolicy="no-referrer"
            className="
              w-11
              h-11

              shrink-0

              rounded-full

              object-cover

              border
              border-white/10

              bg-neutral-900
            "
          />

          {/* REVIEWER */}

          <div
            className="
              min-w-0
            "
          >
            <p
              className="
                text-white

                font-bold

                text-sm

                truncate
              "
            >
              {
                testimonial.name
              }
            </p>

            <p
              className="
                mt-0.5

                text-neutral-500

                text-[11px]
              "
            >
              {
                testimonial.time
              }
            </p>
          </div>
        </div>

        {/* GOOGLE LABEL */}

        <div
          className="
            shrink-0

            text-[10px]
            md:text-[11px]

            font-semibold

            text-neutral-500

            whitespace-nowrap
          "
        >
          Google Review
        </div>
      </div>

      {/* ================================= */}
      {/* GOLD STARS */}
      {/* ================================= */}

      <div
        className="
          flex
          items-center

          gap-[2px]

          mt-4

          shrink-0

          text-[#FBBF24]

          text-[17px]

          drop-shadow-[0_0_8px_rgba(251,191,36,0.18)]
        "
        aria-label="5 out of 5 stars"
      >
        <span>★</span>
        <span>★</span>
        <span>★</span>
        <span>★</span>
        <span>★</span>
      </div>

      {/* ================================= */}
      {/* REVIEW CONTENT */}
      {/* ================================= */}

      <div
        className="
          relative

          mt-3

          flex-1

          min-h-0

          flex
          flex-col
        "
      >
        {/* REVIEW TEXT */}

        <div
          className={`
            flex-1
            min-h-0

            ${
              expanded
                ? `
                    overflow-y-auto
                    pr-2

                    scrollbar-thin
                    scrollbar-thumb-neutral-700
                    scrollbar-track-transparent
                  `
                : `
                    overflow-hidden
                  `
            }
          `}
        >
          <p
            className={`
              text-neutral-300

              text-sm

              leading-6

              ${
                !expanded
                  ? "line-clamp-4"
                  : ""
              }
            `}
          >
            “{testimonial.text}”
          </p>
        </div>

        {/* ================================= */}
        {/* READ MORE / SHOW LESS */}
        {/* ================================= */}

        {needsReadMore && (
          <div
            className="
              shrink-0

              pt-2

              bg-neutral-950

              group-hover:bg-neutral-900

              transition-colors
              duration-300
            "
          >
            <button
              type="button"
              onClick={() =>
                setExpanded(
                  (value) =>
                    !value
                )
              }
              className="
                flex
                items-center

                gap-1.5

                text-[11px]

                font-semibold

                text-neutral-400

                hover:text-white

                transition-colors

                cursor-pointer
              "
            >
              {expanded ? (
                <>
                  Show Less

                  <ChevronUp
                    size={14}
                  />
                </>
              ) : (
                <>
                  Read More

                  <ChevronDown
                    size={14}
                  />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const Testimonials = () => {
  return (
    <section
      className="
        relative

        bg-black

        py-14
        md:py-16

        overflow-hidden
      "
    >
      {/* ================================= */}
      {/* BACKGROUND GLOW */}
      {/* ================================= */}

      <div
        className="
          absolute

          top-1/2
          left-1/2

          -translate-x-1/2
          -translate-y-1/2

          w-[700px]
          h-[350px]

          bg-yellow-400/[0.02]

          blur-[160px]

          pointer-events-none
        "
      />

      {/* ================================= */}
      {/* HEADING */}
      {/* ================================= */}

      {/* HEADING */}

<div
  className="
    relative
    z-10
    text-center
    px-6
    mb-8
    md:mb-10
  "
>
  <p
    className="
      text-[12px]
      tracking-[0.6em]
      text-lime-400
      font-semibold
      mb-2
    "
  >
    TESTIMONIALS
  </p>

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
    THE FUEL{" "}
    <span className="text-lime-400">
      EFFECT
    </span>
  </h2>

  {/* TRUST RATING */}

  <div
    className="
      mt-4
      flex
      items-center
      justify-center
      gap-3
    "
  >
    <div
      className="
        flex
        items-center
        gap-[2px]
        text-[#FBBF24]
        text-lg
        drop-shadow-[0_0_8px_rgba(251,191,36,0.18)]
      "
    >
      <span>★</span>
      <span>★</span>
      <span>★</span>
      <span>★</span>
      <span>★</span>
    </div>

    <span
      className="
        text-sm
        text-neutral-500
      "
    >
      Trusted by our Fuel community
    </span>
  </div>
</div>

      {/* ================================= */}
      {/* LEFT FADE */}
      {/* ================================= */}

      <div
        className="
          absolute

          inset-y-0
          left-0

          w-12
          md:w-28

          bg-gradient-to-r
          from-black
          to-transparent

          z-20

          pointer-events-none
        "
      />

      {/* ================================= */}
      {/* RIGHT FADE */}
      {/* ================================= */}

      <div
        className="
          absolute

          inset-y-0
          right-0

          w-12
          md:w-28

          bg-gradient-to-l
          from-black
          to-transparent

          z-20

          pointer-events-none
        "
      />

      {/* ================================= */}
      {/* REVIEWS */}
      {/* ================================= */}

      <div
        className="
          relative
          z-10
        "
      >
        <Marquee
          speed={32}
          pauseOnHover
          gradient={false}
        >
          {testimonials.map(
            (
              testimonial,
              index
            ) => (
              <Card
                key={`${testimonial.name}-${index}`}
                testimonial={
                  testimonial
                }
              />
            )
          )}
        </Marquee>
      </div>
    </section>
  );
};