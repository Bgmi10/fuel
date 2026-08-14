"use client";

import Image from "next/image";
import { useState } from "react";

import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  Dumbbell,
  GraduationCap,
  MapPin,
  MonitorSmartphone,
  Target,
  Users,
  Eye,
  Check,
} from "lucide-react";

import { Header } from "../components/Header";
import Footer from "../components/Footer";
import { ContactForm } from "../components/Contactus";

// --------------------------------------------------
// COMPANY STATS
// --------------------------------------------------

const companyStats = [
  {
    icon: CalendarDays,
    value: "2022",
    label: "Established",
  },
  {
    icon: MapPin,
    value: "Chennai",
    label: "Tamil Nadu, India",
  },
  {
    icon: Building2,
    value: "Fitness",
    label: "Wellness & Education",
  },
  {
    icon: Users,
    value: "2,000+",
    label: "Lives Impacted",
  },
];

// --------------------------------------------------
// BUSINESS VERTICALS
// --------------------------------------------------

const businessVerticals = [
  "Functional Training",
  "Yoga",
  "Nutrition Coaching",
  "HYROX Performance Training",
  "Fitness Education & Academy",
  "Corporate Wellness",
];

const affiliations = [
  "Registered Skill India Training Academy",
  "Registered Yoga Alliance Continuing Education Provider (YACEP)",
  "Official HYROX Training Club",
];

const certifications = [
  "NASM Certified Professionals",
  "ACE Certified Professionals",
  "INFS Certified Professionals",
];

// --------------------------------------------------
// INFRASTRUCTURE
// --------------------------------------------------

const trainingFacilities = [
  "Fully equipped Functional Training Studio",
  "Dedicated Yoga Studio",
  "Fully equipped Aerial Yoga Studio",
  "Practical coaching and performance training area",
  "Classroom facilities for workshops, seminars, and coach education programmes",
];

const technologyInfrastructure = [
  "Custom-developed Workout Display System designed specifically for Fuel, enabling coaches to deliver structured training programmes consistently across all sessions.",

  "Custom-developed Mobile Application for member and academy student registration, attendance, programme access, progress tracking, communication, and engagement.",

  "Custom-developed Management Platform for managing memberships, academy students, scheduling, attendance, billing, and day-to-day operations through a single integrated system.",

  "Online learning capabilities to support continuing education, workshops, and remote learning initiatives.",
];

// --------------------------------------------------
// JOURNEY
// --------------------------------------------------

const journey = [
  {
    year: "2022",
    description:
      "Fuel Gym & Yoga was established with the vision of delivering evidence-based fitness coaching through personalised training and community-driven wellness.",
  },
  {
    year: "2023",
    description:
      "Successfully grew to over 100 active members within the first year and collaborated with Decathlon for fitness events and community engagement initiatives.",
  },
  {
    year: "2024",
    description:
      "Expanded services by launching Yoga programmes and online fitness and wellness coaching, making Fuel accessible to a wider audience.",
  },
  {
    year: "2025",
    description:
      "Established Fuel Academy to support the education and development of aspiring fitness professionals. Became an Official HYROX Training Club and expanded into structured performance training.",
  },
  {
    year: "2026",
    description:
      "Introduced Fuel Tribe, a running and endurance community, expanded coach education initiatives, and began strategic expansion across Chennai with a long-term vision of serving fitness professionals throughout India.",
  },
];

// --------------------------------------------------
// REUSABLE DECORATION
// --------------------------------------------------

const CornerAccent = () => {
  return (
    <div
      className="
        absolute
        w-24
        h-24
        border-l-[3px]
        border-t-[3px]
        border-lime-400
        opacity-70
        rotate-45
        pointer-events-none
      "
    />
  );
};

// --------------------------------------------------
// PAGE
// --------------------------------------------------

export default function AboutPage() {
  const [isContactOpen, setIsContactOpen] =
    useState(false);

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <Header
        setIsContactOpen={
          setIsContactOpen
        }
      />

      {/* ==================================================
          ABOUT FUEL
      ================================================== */}

      <section
        className="
          relative
          min-h-screen
          flex
          items-center
          overflow-hidden
          pt-28
          pb-20
        "
      >
        {/* Background glow */}

        <div
          className="
            absolute
            top-1/4
            left-[-250px]
            w-[500px]
            h-[500px]
            rounded-full
            bg-lime-400/[0.06]
            blur-[150px]
            pointer-events-none
          "
        />

        <div className="absolute right-[-30px] top-[-30px] opacity-50">
          <CornerAccent />
        </div>

        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            w-full
            px-6
            md:px-10
            lg:px-12
          "
        >
          <div
            className="
              grid
              lg:grid-cols-[1.05fr_0.95fr]
              gap-14
              lg:gap-20
              items-center
            "
          >
            {/* LEFT CONTENT */}

            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px w-12 bg-lime-400" />

                <p
                  className="
                    text-lime-400
                    text-xs
                    md:text-sm
                    font-bold
                    uppercase
                    tracking-[0.3em]
                  "
                >
                  Who We Are
                </p>
              </div>

              <h1
                className="
                  text-5xl
                  sm:text-6xl
                  lg:text-7xl
                  font-black
                  uppercase
                  tracking-tight
                  leading-[0.95]
                "
              >
                About{" "}
                <span className="text-lime-400">
                  Fuel
                </span>
              </h1>

              <div
                className="
                  mt-10
                  space-y-6
                  text-neutral-300
                  text-[15px]
                  md:text-base
                  leading-7
                  max-w-3xl
                "
              >
                <p>
                  Fuel Gym & Yoga is a
                  fitness, wellness, and
                  education company
                  headquartered in Chennai,
                  India. Established in 2022,
                  Fuel was founded with the
                  vision of delivering
                  evidence-based fitness
                  coaching while building
                  healthier communities
                  through education,
                  innovation, and
                  professional excellence.
                </p>

                <p>
                  What began as a functional
                  training and yoga studio
                  has evolved into a
                  comprehensive fitness
                  ecosystem that integrates
                  coaching, wellness,
                  performance training, and
                  professional education.
                  Today, Fuel has positively
                  impacted over 2,000
                  individuals and serves
                  more than 400 active
                  members through
                  personalised coaching,
                  group programmes, and
                  specialised training
                  services.
                </p>

                <p>
                  As a registered Skill India
                  Training Academy and a
                  Yoga Alliance Continuing
                  Education Provider
                  (YACEP), Fuel is committed
                  to developing fitness and
                  wellness professionals
                  through structured
                  education, continuing
                  education programmes, and
                  practical learning
                  experiences.
                </p>

                <p>
                  Fuel is also proud to be
                  an Official HYROX Training
                  Club, delivering
                  performance-focused
                  training aligned with
                  global fitness standards.
                </p>
              </div>
            </div>

            {/* RIGHT IMAGE */}

            <div
              className="
                relative
                lg:ml-auto
                w-full
                max-w-[520px]
              "
            >
              <div
                className="
                  absolute
                  -inset-5
                  bg-lime-400/10
                  blur-[70px]
                  rounded-full
                "
              />

              <div
                className="
                  relative
                  h-[500px]
                  md:h-[620px]
                  rounded-[36px]
                  overflow-hidden
                  border
                  border-white/10
                  bg-neutral-900
                  [clip-path:polygon(15%_0,100%_8%,100%_90%,87%_100%,0_100%,0_20%)]
                "
              >
                <Image
                  src="/about/about-fuel.jpg"
                  alt="Fuel Gym"
                  fill
                  priority
                  className="
                    object-cover
                    grayscale
                    brightness-[0.65]
                  "
                />

                <div
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-t
                    from-black
                    via-transparent
                    to-black/20
                  "
                />

                <div
                  className="
                    absolute
                    left-7
                    bottom-8
                  "
                >
                  <p
                    className="
                      text-lime-400
                      text-xs
                      tracking-[0.25em]
                      uppercase
                    "
                  >
                    Fuel Gym & Yoga
                  </p>

                  <p
                    className="
                      mt-2
                      text-2xl
                      font-black
                      uppercase
                    "
                  >
                    Building Better
                    <br />
                    Humans Every Day
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          COMPANY AT A GLANCE
      ================================================== */}

      <section
        className="
          relative
          py-24
          md:py-32
          border-y
          border-white/[0.06]
          bg-neutral-950
        "
      >
        <div
          className="
            max-w-7xl
            mx-auto
            px-6
            md:px-10
            lg:px-12
          "
        >
          <div className="text-center">
            <p
              className="
                text-lime-400
                text-xs
                font-bold
                uppercase
                tracking-[0.35em]
              "
            >
              Fuel Gym & Yoga
            </p>

            <h2
              className="
                mt-4
                text-4xl
                md:text-6xl
                font-black
                uppercase
              "
            >
              Company At A{" "}
              <span className="text-lime-400">
                Glance
              </span>
            </h2>
          </div>

          {/* STATS */}

          <div
            className="
              mt-14
              grid
              grid-cols-2
              lg:grid-cols-4
              border
              border-white/10
              rounded-3xl
              overflow-hidden
            "
          >
            {companyStats.map(
              (item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className={`
                      group
                      relative
                      p-7
                      md:p-9
                      text-center
                      bg-black/40
                      hover:bg-lime-400/[0.04]
                      transition-colors

                      ${
                        index !==
                        companyStats.length -
                          1
                          ? "lg:border-r lg:border-white/10"
                          : ""
                      }

                      ${
                        index < 2
                          ? "border-b lg:border-b-0 border-white/10"
                          : ""
                      }
                    `}
                  >
                    <div
                      className="
                        mx-auto
                        w-12
                        h-12
                        rounded-2xl
                        bg-lime-400/10
                        border
                        border-lime-400/20
                        flex
                        items-center
                        justify-center
                      "
                    >
                      <Icon
                        size={22}
                        className="text-lime-400"
                      />
                    </div>

                    <p
                      className="
                        mt-5
                        text-2xl
                        md:text-3xl
                        font-black
                      "
                    >
                      {item.value}
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        md:text-sm
                        text-neutral-500
                      "
                    >
                      {item.label}
                    </p>
                  </div>
                );
              }
            )}
          </div>

          {/* DETAILS */}

          <div
            className="
              mt-12
              grid
              md:grid-cols-3
              gap-5
            "
          >
            <InfoCard
              title="Business Verticals"
              icon={Dumbbell}
              items={
                businessVerticals
              }
            />

            <InfoCard
              title="Registrations & Affiliations"
              icon={BookOpenCheck}
              items={affiliations}
            />

            <InfoCard
              title="Faculty Certifications"
              icon={GraduationCap}
              items={certifications}
            />
          </div>
        </div>
      </section>

      {/* ==================================================
          INFRASTRUCTURE
      ================================================== */}

      <section
        className="
          relative
          py-24
          md:py-32
          overflow-hidden
        "
      >
        {/* Background image */}

        <div className="absolute inset-0">
          <Image
            src="/about/infrastructure.jpg"
            alt="Fuel infrastructure"
            fill
            className="
              object-cover
              grayscale
              opacity-30
            "
          />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-r
              from-black
              via-black/95
              to-black/60
            "
          />
        </div>

        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            px-6
            md:px-10
            lg:px-12
          "
        >
          <div className="max-w-4xl">
            <p
              className="
                text-lime-400
                text-xs
                tracking-[0.3em]
                uppercase
                font-bold
              "
            >
              Built To Perform
            </p>

            <h2
              className="
                mt-4
                text-4xl
                md:text-6xl
                font-black
                uppercase
              "
            >
              Infrastructure
            </h2>

            <p
              className="
                mt-7
                text-neutral-300
                leading-8
                max-w-3xl
              "
            >
              Fuel Gym & Yoga has
              established an
              infrastructure that supports
              fitness coaching,
              professional education, and
              efficient operational
              management. Our facilities
              and technology are designed
              to deliver a seamless
              experience for members,
              coaches, and academy students
              while ensuring consistency
              in programme delivery.
            </p>
          </div>

          <div
            className="
              mt-14
              grid
              lg:grid-cols-2
              gap-6
            "
          >
            {/* TRAINING */}

            <InfrastructureCard
              icon={Dumbbell}
              title="Training Facilities"
              items={trainingFacilities}
            />

            {/* TECH */}

            <InfrastructureCard
              icon={MonitorSmartphone}
              title="Technology Infrastructure"
              items={
                technologyInfrastructure
              }
            />
          </div>
        </div>
      </section>

      {/* ==================================================
          JOURNEY
      ================================================== */}

      <section
        className="
          relative
          py-24
          md:py-32
          bg-neutral-950
          border-y
          border-white/[0.06]
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            inset-0
            opacity-20
          "
        >
          <Image
            src="/about/journey.jpg"
            alt=""
            fill
            className="
              object-cover
              grayscale
            "
          />

          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            px-6
            md:px-10
            lg:px-12
          "
        >
          <div className="text-center">
            <p
              className="
                text-lime-400
                uppercase
                tracking-[0.3em]
                text-xs
                font-bold
              "
            >
              From 2022 To Today
            </p>

            <h2
              className="
                mt-4
                text-4xl
                md:text-6xl
                font-black
                uppercase
              "
            >
              Our{" "}
              <span className="text-lime-400">
                Journey
              </span>
            </h2>
          </div>

          {/* DESKTOP TIMELINE */}

          <div
            className="
              hidden
              lg:grid
              grid-cols-5
              mt-20
            "
          >
            {journey.map(
              (item, index) => (
                <div
                  key={item.year}
                  className="
                    relative
                    px-5
                    pt-9
                  "
                >
                  {/* LINE */}

                  <div
                    className="
                      absolute
                      top-0
                      left-0
                      right-0
                      h-[3px]
                      bg-lime-400
                    "
                  />

                  {/* NODE */}

                  <div
                    className="
                      absolute
                      top-[-8px]
                      left-0
                      w-[18px]
                      h-[18px]
                      rounded-full
                      bg-black
                      border-[4px]
                      border-lime-400
                    "
                  />

                  <p
                    className="
                      text-lime-400
                      text-2xl
                      font-black
                    "
                  >
                    {item.year}
                  </p>

                  <p
                    className="
                      mt-4
                      text-sm
                      leading-6
                      text-neutral-400
                    "
                  >
                    {
                      item.description
                    }
                  </p>

                  {index !==
                    journey.length - 1 && (
                    <div
                      className="
                        absolute
                        top-0
                        right-0
                        h-10
                        w-[3px]
                        bg-lime-400
                      "
                    />
                  )}
                </div>
              )
            )}
          </div>

          {/* MOBILE TIMELINE */}

          <div
            className="
              lg:hidden
              mt-16
              relative
            "
          >
            <div
              className="
                absolute
                top-0
                bottom-0
                left-[7px]
                w-[2px]
                bg-lime-400/40
              "
            />

            <div className="space-y-10">
              {journey.map((item) => (
                <div
                  key={item.year}
                  className="
                    relative
                    pl-10
                  "
                >
                  <div
                    className="
                      absolute
                      left-0
                      top-2
                      w-4
                      h-4
                      rounded-full
                      bg-lime-400
                      shadow-[0_0_20px_rgba(163,230,53,0.6)]
                    "
                  />

                  <p
                    className="
                      text-2xl
                      font-black
                      text-lime-400
                    "
                  >
                    {item.year}
                  </p>

                  <p
                    className="
                      mt-3
                      text-neutral-400
                      leading-7
                    "
                  >
                    {
                      item.description
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          EDUCATION
      ================================================== */}

      <section
        className="
          relative
          py-24
          md:py-32
          overflow-hidden
        "
      >
        <div
          className="
            max-w-7xl
            mx-auto
            px-6
            md:px-10
            lg:px-12
          "
        >
          <div
            className="
              grid
              lg:grid-cols-2
              gap-14
              lg:gap-20
              items-center
            "
          >
            {/* IMAGE */}

            <div
              className="
                relative
                h-[500px]
                md:h-[650px]
                rounded-[36px]
                overflow-hidden
              "
            >
              <Image
                src="/about/education.jpg"
                alt="Fuel Academy"
                fill
                className="
                  object-cover
                  grayscale
                  brightness-50
                "
              />

              <div
                className="
                  absolute
                  inset-0
                  bg-gradient-to-t
                  from-black
                  via-transparent
                  to-transparent
                "
              />

              <div
                className="
                  absolute
                  bottom-8
                  left-8
                  right-8
                "
              >
                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    px-4
                    py-2
                    rounded-full
                    bg-lime-400
                    text-black
                    text-xs
                    font-bold
                    uppercase
                    tracking-widest
                  "
                >
                  <GraduationCap
                    size={16}
                  />

                  Fuel Academy
                </div>
              </div>
            </div>

            {/* CONTENT */}

            <div>
              <p
                className="
                  text-lime-400
                  uppercase
                  tracking-[0.3em]
                  text-xs
                  font-bold
                "
              >
                Fuel Academy
              </p>

              <h2
                className="
                  mt-4
                  text-4xl
                  md:text-5xl
                  lg:text-6xl
                  font-black
                  uppercase
                  leading-[1.05]
                "
              >
                Education &
                <span className="text-lime-400">
                  {" "}
                  Professional
                  Development
                </span>
              </h2>

              <div
                className="
                  mt-8
                  space-y-5
                  text-neutral-400
                  leading-7
                "
              >
                <p>
                  Education is one of the
                  core pillars of Fuel Gym
                  & Yoga. Through Fuel
                  Academy, we are committed
                  to developing
                  knowledgeable, skilled,
                  and industry-ready
                  fitness and wellness
                  professionals by
                  combining structured
                  learning with practical
                  application.
                </p>

                <p>
                  As a registered Skill
                  India Training Academy,
                  Fuel is authorised to
                  deliver skill development
                  programmes that equip
                  aspiring fitness
                  professionals with the
                  knowledge, confidence,
                  and practical experience
                  required to build
                  successful careers in the
                  fitness industry.
                </p>

                <p>
                  Fuel is also recognised
                  as a Yoga Alliance
                  Continuing Education
                  Provider (YACEP),
                  supporting the ongoing
                  professional development
                  of yoga teachers and
                  fitness professionals.
                </p>

                <p>
                  Guided by internationally
                  certified professionals,
                  Fuel Academy aims to
                  bridge the gap between
                  theoretical knowledge and
                  practical coaching while
                  empowering the next
                  generation of fitness
                  professionals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          VISION + MISSION
      ================================================== */}

      <section
        className="
          relative
          py-24
          md:py-32
          bg-neutral-950
          border-t
          border-white/[0.06]
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            top-1/2
            left-1/2
            -translate-x-1/2
            -translate-y-1/2

            w-[700px]
            h-[700px]

            bg-lime-400/[0.04]
            blur-[180px]
            rounded-full
          "
        />

        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            px-6
            md:px-10
            lg:px-12
          "
        >
          <div className="text-center max-w-3xl mx-auto">
            <p
              className="
                text-lime-400
                text-xs
                font-bold
                uppercase
                tracking-[0.3em]
              "
            >
              What Drives Us
            </p>

            <h2
              className="
                mt-4
                text-4xl
                md:text-6xl
                font-black
                uppercase
              "
            >
              Vision &{" "}
              <span className="text-lime-400">
                Mission
              </span>
            </h2>
          </div>

          <div
            className="
              mt-14
              grid
              lg:grid-cols-2
              gap-6
            "
          >
            {/* VISION */}

            <div
              className="
                group
                relative
                rounded-[32px]
                border
                border-white/10
                bg-black/60
                p-8
                md:p-10
                overflow-hidden
                hover:border-lime-400/30
                transition
              "
            >
              <div
                className="
                  absolute
                  top-0
                  left-0
                  right-0
                  h-[3px]
                  bg-gradient-to-r
                  from-lime-400
                  to-transparent
                "
              />

              <div
                className="
                  w-14
                  h-14
                  rounded-2xl
                  bg-lime-400/10
                  border
                  border-lime-400/20
                  flex
                  items-center
                  justify-center
                "
              >
                <Eye
                  className="text-lime-400"
                  size={25}
                />
              </div>

              <p
                className="
                  mt-7
                  text-xs
                  text-lime-400
                  uppercase
                  tracking-[0.3em]
                  font-bold
                "
              >
                Vision
              </p>

              <h3
                className="
                  mt-3
                  text-2xl
                  md:text-3xl
                  font-black
                  leading-tight
                "
              >
                Building India's Most
                Trusted Fitness Ecosystem.
              </h3>

              <p
                className="
                  mt-6
                  text-neutral-400
                  leading-7
                "
              >
                To become one of India's
                most trusted fitness,
                wellness, and education
                organisations by creating
                an ecosystem that transforms
                lives through scientific
                coaching, professional
                education, and community
                engagement.
              </p>
            </div>

            {/* MISSION */}

            <div
              className="
                group
                relative
                rounded-[32px]
                border
                border-white/10
                bg-black/60
                p-8
                md:p-10
                overflow-hidden
                hover:border-lime-400/30
                transition
              "
            >
              <div
                className="
                  absolute
                  top-0
                  left-0
                  right-0
                  h-[3px]
                  bg-gradient-to-r
                  from-lime-400
                  to-transparent
                "
              />

              <div
                className="
                  w-14
                  h-14
                  rounded-2xl
                  bg-lime-400/10
                  border
                  border-lime-400/20
                  flex
                  items-center
                  justify-center
                "
              >
                <Target
                  className="text-lime-400"
                  size={25}
                />
              </div>

              <p
                className="
                  mt-7
                  text-xs
                  text-lime-400
                  uppercase
                  tracking-[0.3em]
                  font-bold
                "
              >
                Mission
              </p>

              <h3
                className="
                  mt-3
                  text-2xl
                  md:text-3xl
                  font-black
                  leading-tight
                "
              >
                Empowering People Through
                Knowledge And Performance.
              </h3>

              <p
                className="
                  mt-6
                  text-neutral-400
                  leading-7
                "
              >
                To empower individuals and
                fitness professionals
                through world-class
                coaching, evidence-based
                education, and innovative
                wellness solutions.
              </p>

              <p
                className="
                  mt-4
                  text-neutral-400
                  leading-7
                "
              >
                We are committed to
                improving the standards of
                the fitness industry by
                developing knowledgeable
                professionals, promoting
                lifelong learning, and
                delivering programmes that
                create sustainable health
                outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT MODAL */}

      <ContactForm
        open={isContactOpen}
        setOpen={setIsContactOpen}
      />

      <Footer />
    </main>
  );
}

// ==================================================
// INFO CARD
// ==================================================

function InfoCard({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: string[];
  icon: React.ElementType;
}) {
  return (
    <div
      className="
        relative
        rounded-3xl
        border
        border-white/10
        bg-black/50
        p-7
        overflow-hidden
        hover:border-lime-400/25
        transition
      "
    >
      <div
        className="
          absolute
          top-0
          left-0
          w-24
          h-[2px]
          bg-lime-400
        "
      />

      <div
        className="
          w-11
          h-11
          rounded-xl
          bg-lime-400/10
          flex
          items-center
          justify-center
        "
      >
        <Icon
          size={20}
          className="text-lime-400"
        />
      </div>

      <h3
        className="
          mt-5
          text-xl
          font-bold
        "
      >
        {title}
      </h3>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="
              flex
              items-start
              gap-3
            "
          >
            <Check
              size={15}
              className="
                mt-1
                shrink-0
                text-lime-400
              "
            />

            <p
              className="
                text-sm
                leading-6
                text-neutral-400
              "
            >
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================================================
// INFRASTRUCTURE CARD
// ==================================================

function InfrastructureCard({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: string[];
  icon: React.ElementType;
}) {
  return (
    <div
      className="
        rounded-[30px]
        border
        border-white/10
        bg-black/70
        backdrop-blur-xl
        p-7
        md:p-9
      "
    >
      <div
        className="
          flex
          items-center
          gap-4
        "
      >
        <div
          className="
            w-12
            h-12
            rounded-xl
            bg-lime-400
            text-black
            flex
            items-center
            justify-center
          "
        >
          <Icon size={22} />
        </div>

        <h3
          className="
            text-xl
            md:text-2xl
            font-black
          "
        >
          {title}
        </h3>
      </div>

      <div className="mt-7 space-y-4">
        {items.map((item) => (
          <div
            key={item}
            className="
              flex
              gap-3
              items-start
            "
          >
            <div
              className="
                mt-2
                w-2
                h-2
                rounded-full
                bg-lime-400
                shrink-0
              "
            />

            <p
              className="
                text-sm
                md:text-[15px]
                text-neutral-400
                leading-6
              "
            >
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}