"use client";

import Image from "next/image";
import { BookTrialForm } from "@/app/components/BookTrialForm";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Branch,
  Coupon,
  Service,
  ServicePackage,
} from "@prisma/client";

import {
  CalendarDays,
  Check,
  Clock3,
} from "lucide-react";

import { useBranch } from "@/app/contexts/BranchContext";

import { SubscribeModal } from "@/app/components/SubscribeModal";
import { Header } from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { ContactForm } from "@/app/components/Contactus";

// =====================================================
// TYPES
// =====================================================

type PackageWithCoupons =
  ServicePackage & {
    coupons: Coupon[];
  };

type ServiceWithBranches = Service & {
  branches: Branch[];
  packages: PackageWithCoupons[];
};

type ScheduleGroup = {
  label: string;
  times: string[];
};

type ContentSection = {
  title: string;
  paragraphs?: string[];
  schedules?: ScheduleGroup[];
};

type ServiceContent = {
  image: string;

  eyebrow: string;

  heroTitle: string;

  intro: string[];

  sections?: ContentSection[];

  closing?: string;

  tagline?: string;

  benefits: string[];

  idealFor: string[];
};

// =====================================================
// SERVICE CONTENT
// =====================================================

const SERVICE_CONTENT = {
  // ===================================================
  // FUNCTIONAL TRAINING
  // ===================================================

  functional: {
    image:
      "/functional-training.webp",

    eyebrow:
      "Functional Training",

    heroTitle:
      "Move Better. Perform Better. Get Stronger.",

    intro: [
      "Functional Training focuses on real-life movements to improve your strength, mobility, balance, coordination, endurance, and overall fitness. It helps you move better, perform better, build strength, and support fat loss and body transformation.",

      "At FUEL, every 60-minute session is structured and coach-led. Your workout program is displayed on the Screen, making it easy to follow each exercise, while our highly certified coaches assist and guide you throughout the entire session. They help you understand the movements, maintain proper form, choose the right intensity, and progress safely according to your fitness level and goals.",
    ],

    sections: [
      {
        title: "Session Timings",

        schedules: [
          {
            label:
              "Monday – Friday | Morning",

            times: [
              "6:00 AM",
              "7:00 AM",
              "8:00 AM",
              "9:00 AM",
            ],
          },

          {
            label:
              "Monday – Friday | Evening",

            times: [
              "5:00 PM",
              "6:00 PM",
              "7:00 PM",
              "8:00 PM",
            ],
          },

          {
            label:
              "Saturday | Morning",

            times: [
              "7:00 AM",
              "8:00 AM",
            ],
          },

          {
            label: "Sunday",

            times: ["Rest Day"],
          },
        ],
      },
    ],

    closing:
      "Whether you are a beginner or an experienced fitness enthusiast, FUEL Functional Training gives you the right combination of structured workouts, expert coaching, and continuous support to help you become stronger, fitter, and more confident.",

    benefits: [
      "Improve strength and endurance",
      "Build mobility and balance",
      "Improve coordination",
      "Support fat loss and body transformation",
      "Structured 60-minute workouts",
      "Certified coach guidance",
    ],

    idealFor: [
      "Beginners",
      "Fat Loss",
      "Strength",
      "Mobility",
      "Body Transformation",
      "General Fitness",
    ],
  },

  // ===================================================
  // YOGA
  // ===================================================

  yoga: {
    image: "/yoga.webp",

    eyebrow: "Yoga",

    heroTitle:
      "Build Strength. Improve Mobility. Find Balance.",

    intro: [
      "Yoga at FUEL is designed for different lifestyles, experience levels, and training preferences. Our sessions are guided by certified coaches with a focus on proper posture, breathing, flexibility, mobility, strength, and overall well-being.",
    ],

    sections: [
      {
        title: "Offline Yoga",

        paragraphs: [
          "Our Offline Yoga sessions are guided by certified coaches in a supportive studio environment. You receive direct coach guidance throughout the session to improve your practice safely and effectively. Aerial Yoga is conducted on alternate days as part of our offline yoga schedule.",
        ],

        schedules: [
          {
            label:
              "Monday – Friday | Unisex",

            times: [
              "6:00 AM",
              "7:00 AM",
              "6:00 PM",
              "7:00 PM",
              "8:00 PM",
            ],
          },

          {
            label:
              "Monday – Friday | Women Only",

            times: ["10:15 AM"],
          },
        ],
      },

      {
        title: "Online Yoga",

        paragraphs: [
          "Our Online Yoga sessions offer live, interactive coaching with individual corrections and feedback. Coaches observe your practice and provide personalized guidance to help you improve your posture, alignment, technique, and overall practice — all from the comfort of your home.",
        ],

        schedules: [
          {
            label:
              "Monday, Wednesday & Friday | Unisex",

            times: [
              "6:00 AM",
              "7:00 AM",
              "6:00 PM",
              "7:00 PM",
              "8:00 PM",
            ],
          },

          {
            label:
              "Monday, Wednesday & Friday | Women Only",

            times: ["10:15 AM"],
          },

          {
            label:
              "Tuesday & Thursday",

            times: ["6:00 PM"],
          },
        ],
      },

      {
        title: "Yoga ₹599",

        paragraphs: [
          "Our ₹599 Yoga plan offers live, coach-led yoga sessions with structured instruction, making it a convenient and accessible way to maintain a regular yoga practice from anywhere.",
        ],

        schedules: [
          {
            label:
              "Monday – Friday | Unisex",

            times: [
              "5:00 AM",
              "6:00 AM",
              "9:00 AM",
            ],
          },
        ],
      },

      {
        title: "Weekend Schedule",

        schedules: [
          {
            label:
              "Saturday & Sunday",

            times: ["Rest Day"],
          },
        ],
      },
    ],

    closing:
      "At FUEL, choose the yoga experience that suits your goals and lifestyle — Offline Yoga, Interactive Online Yoga, Aerial Yoga, or Live Yoga ₹599 — all designed to help you build a consistent and healthier practice.",

    benefits: [
      "Improve flexibility and mobility",
      "Develop posture and alignment",
      "Improve strength and balance",
      "Live interactive coaching",
      "Aerial Yoga sessions",
      "Online and offline options",
    ],

    idealFor: [
      "Beginners",
      "Mobility",
      "Flexibility",
      "Recovery",
      "Stress Management",
      "Home Training",
    ],
  },

  // ===================================================
  // ZUMBA
  // ===================================================

  zumba: {
    image: "/zumba.webp",

    eyebrow: "Zumba",

    heroTitle:
      "Dance. Move. Sweat. Enjoy.",

    intro: [
      "Zumba is a fun and energetic dance-based workout that combines cardio, rhythmic movements, music, and easy-to-follow dance routines to improve your stamina, coordination, mobility, cardiovascular fitness, and overall well-being. It is an enjoyable way to stay active, burn calories, improve endurance, and make fitness a fun part of your routine.",

      "At FUEL, every session is structured and coach-led. Our experienced Zumba coaches guide and motivate you throughout the entire session, helping you follow the movements, maintain proper technique, and train at a suitable intensity. With energetic music and a motivating environment, every session is designed to keep you moving, engaged, and enjoying your workout.",
    ],

    closing:
      "Whether you are a beginner or an experienced fitness enthusiast, FUEL Zumba gives you the right combination of energetic workouts, expert coaching, music, and a motivating community to help you stay active, fit, and confident.",

    benefits: [
      "Improve cardiovascular fitness",
      "Build stamina and endurance",
      "Improve coordination",
      "Burn calories",
      "Energetic coach-led sessions",
      "Fun group environment",
    ],

    idealFor: [
      "Beginners",
      "Cardio Fitness",
      "Weight Management",
      "Stamina",
      "Dance Lovers",
      "Group Fitness",
    ],
  },

  // ===================================================
  // HYROX
  // ===================================================

  hyrox: {
    image: "/hyrox.webp",

    eyebrow:
      "HYROX Training",

    heroTitle:
      "Train For The Race. Prepare For The World Stage.",

    intro: [
      "HYROX is a global fitness race that combines running with functional workout stations, testing your strength, endurance, speed, power, and overall fitness. It is designed for anyone looking to challenge their limits and prepare for the demands of a HYROX race.",

      "At FUEL, our HYROX training is led by HYROX 365 Certified Coaches with structured, race-focused programming. Our one-on-one training provides personalized coaching based on your fitness level, race category, strengths, and areas for improvement.",

      "Your training is designed to develop the strength, endurance, running capacity, technique, pacing, and race strategy needed to perform at your best. Every session is focused on helping you build confidence and prepare effectively for race day.",

      "FUEL is a HYROX-affiliated gym and one of the leading HYROX training clubs in Chennai, providing a dedicated environment and expert coaching for athletes preparing for HYROX competitions.",

      "Whether you are preparing for your first HYROX or aiming to compete on the world stage, FUEL provides the expert coaching, structured training, and dedicated support to help you reach your race goals.",
    ],

    tagline:
      "FUEL HYROX — Train for the Race. Prepare for the World Stage.",

    benefits: [
      "HYROX race preparation",
      "Running capacity development",
      "Strength and endurance training",
      "Race pacing and strategy",
      "One-on-one coaching",
      "HYROX 365 Certified Coaches",
    ],

    idealFor: [
      "First-time HYROX Athletes",
      "Competitive Athletes",
      "Endurance",
      "Strength",
      "Race Preparation",
      "Performance",
    ],
  },

  // ===================================================
  // NUTRITION
  // ===================================================

  nutrition: {
    image:
      "/nutrition-coaching.png",

    eyebrow:
      "Nutrition Coaching",

    heroTitle:
      "Eat Better. Train Better. Live Better.",

    intro: [
      "Nutrition plays a vital role in achieving your fitness goals, whether your focus is fat loss, muscle gain, improved performance, better energy, or overall healthy living. Our Nutrition Coaching helps you understand how to fuel your body effectively and build sustainable eating habits.",

      "At FUEL, our nutrition guidance is designed around your individual goals, lifestyle, food preferences, daily routine, and fitness requirements. Rather than following a one-size-fits-all approach, you receive practical guidance that fits into your everyday life and helps you stay consistent.",

      "Our coaches help you understand what to eat, how much to eat, meal timing, hydration, and nutrition choices that support your training and lifestyle. We focus on creating realistic habits that you can maintain for the long term.",

      "Whether you are starting your fitness journey, working towards a body transformation, or looking to improve your training performance, FUEL Nutrition Coaching provides the knowledge, guidance, and accountability to help you make better food choices and progress towards your goals.",
    ],

    tagline:
      "FUEL Nutrition Coaching — Eat Better. Train Better. Live Better.",

    benefits: [
      "Personalised nutrition guidance",
      "Fat loss support",
      "Muscle gain support",
      "Better energy and recovery",
      "Meal timing guidance",
      "Sustainable eating habits",
    ],

    idealFor: [
      "Fat Loss",
      "Muscle Gain",
      "Body Transformation",
      "Performance",
      "Healthy Lifestyle",
      "Better Nutrition Habits",
    ],
  },
} satisfies Record<
  string,
  ServiceContent
>;

// =====================================================
// GET STATIC SERVICE CONTENT
// =====================================================

function getServiceContent(
  name: string
): ServiceContent | null {
  const normalized =
    name
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      "functional"
    )
  ) {
    return SERVICE_CONTENT.functional;
  }

  if (
    normalized.includes("yoga")
  ) {
    return SERVICE_CONTENT.yoga;
  }

  if (
    normalized.includes("zumba")
  ) {
    return SERVICE_CONTENT.zumba;
  }

  if (
    normalized.includes("hyrox")
  ) {
    return SERVICE_CONTENT.hyrox;
  }

  if (
    normalized.includes(
      "nutrition"
    )
  ) {
    return SERVICE_CONTENT.nutrition;
  }

  return null;
}

// =====================================================
// PAGE
// =====================================================

export default function ServicePage() {
  const params =
    useParams<{
      serviceId: string;
    }>();

  const searchParams =
    useSearchParams();

  const router =
    useRouter();

    const [
      isBookTrialOpen,
      setIsBookTrialOpen,
    ] = useState(false);

  const {
    selectedBranch,
  } = useBranch();

  const serviceId =
    params.serviceId;

  const serviceNameFromUrl =
    searchParams.get("name") ||
    "";

  const branchIdFromUrl =
    searchParams.get(
      "branchId"
    ) || "";

  const branchId =
    branchIdFromUrl ||
    selectedBranch?.id ||
    "";

  const [
    service,
    setService,
  ] =
    useState<ServiceWithBranches | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    selectedPackage,
    setSelectedPackage,
  ] =
    useState<PackageWithCoupons | null>(
      null
    );

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    isContactOpen,
    setIsContactOpen,
  ] =
    useState(false);

  // ===================================================
  // FETCH SERVICE + PACKAGES
  // ===================================================

  useEffect(() => {
    const fetchService =
      async () => {
        if (
          !branchId ||
          !serviceId
        ) {
          setLoading(false);
          return;
        }

        try {
          setLoading(true);

          const res =
            await fetch(
              `/api/services?branchId=${branchId}`
            );

          if (!res.ok) {
            throw new Error(
              "Unable to load service"
            );
          }

          const data =
            await res.json();

          const found =
            (
              data.services ||
              []
            ).find(
              (
                item: ServiceWithBranches
              ) =>
                item.id ===
                serviceId
            ) || null;

          setService(found);
        } catch (error) {
          console.error(
            "Service fetch error:",
            error
          );

          setService(null);
        } finally {
          setLoading(false);
        }
      };

    fetchService();
  }, [
    branchId,
    serviceId,
  ]);

  // ===================================================
  // STATIC CONTENT
  // ===================================================

  const content =
    useMemo(() => {
      const name =
        service?.name ||
        serviceNameFromUrl;

      return getServiceContent(
        name
      );
    }, [
      service?.name,
      serviceNameFromUrl,
    ]);

  // ===================================================
  // ACTIVE PACKAGES
  // ===================================================

  const packages =
    useMemo(() => {
      if (
        !service?.packages
      ) {
        return [];
      }

      return service.packages.filter(
        (pkg) =>
          pkg.isActive
      );
    }, [service]);

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Header
          setIsContactOpen={
            setIsContactOpen
          }
        />

        <div
          className="
            min-h-[80vh]
            flex
            items-center
            justify-center
          "
        >
          <div
            className="
              w-12
              h-12
              rounded-full
              border-2
              border-lime-400
              border-t-transparent
              animate-spin
            "
          />
        </div>

        <ContactForm
          open={
            isContactOpen
          }
          setOpen={
            setIsContactOpen
          }
        />

        <Footer />
      </main>
    );
  }

  // ===================================================
  // NOT FOUND
  // ===================================================

  if (
    !service ||
    !content
  ) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Header
          setIsContactOpen={
            setIsContactOpen
          }
        />

        <section
          className="
            min-h-[80vh]
            flex
            flex-col
            items-center
            justify-center
            px-6
            text-center
            pt-24
          "
        >
          <h1
            className="
              text-3xl
              md:text-4xl
              font-black
              uppercase
            "
          >
            Service Not Available
          </h1>

          <p
            className="
              text-neutral-500
              mt-3
            "
          >
            This training
            program is currently
            unavailable.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="
              mt-8
              bg-lime-400
              text-black
              font-bold
              px-6
              py-3
              rounded-xl
              cursor-pointer
            "
          >
            Back to Home
          </button>
        </section>

        <ContactForm
          open={
            isContactOpen
          }
          setOpen={
            setIsContactOpen
          }
        />

        <Footer />
      </main>
    );
  }

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <main
      className="
        min-h-screen
        bg-black
        text-white
        overflow-hidden
      "
    >
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <Header
        setIsContactOpen={
          setIsContactOpen
        }
      />

      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      <section
        className="
          relative
          min-h-[70vh]
          md:min-h-[75vh]

          flex
          items-end

          overflow-hidden
        "
      >
        <Image
          src={
            content.image
          }
          alt={
            service.name
          }
          fill
          priority
          className="
            object-cover
          "
        />

        {/* DARK OVERLAY */}

        <div
          className="
            absolute
            inset-0

            bg-gradient-to-t

            from-black
            via-black/45
            to-black/20
          "
        />

        {/* LEFT GRADIENT */}

        <div
          className="
            absolute
            inset-0

            bg-gradient-to-r

            from-black/90
            via-black/35
            to-transparent
          "
        />

        {/* BACK BUTTON */}


        {/* HERO CONTENT */}

        <div
          className="
            relative
            z-10

            max-w-7xl
            mx-auto
            w-full

            px-6
            md:px-10

            pb-12
            md:pb-16
          "
        >
         

          <h1
            className="
              mt-4

              max-w-5xl

              text-5xl
              md:text-7xl
              lg:text-8xl

              font-black

              uppercase

              tracking-tight

              leading-[0.92]
            "
          >
            {service.name}
          </h1>

          <p
            className="
              mt-5

              max-w-3xl

              text-lg
              md:text-2xl

              text-neutral-300

              font-medium

              leading-relaxed
            "
          >
            {
              content.heroTitle
            }
          </p>

          {/* BRANCH */}

          <div
            className="
              mt-6

              inline-flex
              items-center
              gap-2

              px-4
              py-2

              rounded-full

              bg-black/40

              border
              border-white/10

              backdrop-blur-lg

              text-sm
              text-neutral-300
            "
          >
            <span
              className="
                w-2
                h-2
                bg-lime-400
                rounded-full
              "
            />

            {selectedBranch
              ?.name ||
              service
                .branches?.[0]
                ?.name ||
              "Fuel Gym"}
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* ABOUT PROGRAM */}
      {/* ================================================= */}

      <section
        className="
          max-w-7xl
          mx-auto

          px-6
          md:px-10

          py-16
          md:py-20
        "
      >
        <div
          className="
            grid
            lg:grid-cols-[0.75fr_1.25fr]

            gap-10
            lg:gap-20
          "
        >
          {/* TITLE */}

          <div>
            <p
              className="
                text-lime-400

                text-xs

                tracking-[0.3em]

                uppercase

                font-bold
              "
            >
              The Program
            </p>

            <h2
              className="
                mt-4

                text-4xl
                md:text-5xl

                font-black

                uppercase

                tracking-tight

                leading-[1.05]
              "
            >
              {content.eyebrow}
              <br />

              <span
                className="
                  text-neutral-500
                "
              >
                At Fuel
              </span>
            </h2>
          </div>

          {/* INTRO */}

          <div
            className="
              space-y-5
            "
          >
            {content.intro.map(
              (
                paragraph,
                index
              ) => (
                <p
                  key={index}
                  className="
                    text-neutral-300

                    text-base
                    md:text-lg

                    leading-8
                  "
                >
                  {paragraph}
                </p>
              )
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* SERVICE SPECIFIC SECTIONS */}
        {/* ================================================= */}

        {content.sections &&
          content.sections
            .length > 0 && (
            <div
              className="
                mt-16
                space-y-8
              "
            >
              {content.sections.map(
                (
                  section,
                  sectionIndex
                ) => (
                  <div
                    key={`${section.title}-${sectionIndex}`}
                    className="
                      rounded-3xl

                      border
                      border-white/[0.08]

                      bg-neutral-950

                      p-6
                      md:p-8
                    "
                  >
                    {/* SECTION TITLE */}

                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <div
                        className="
                          w-10
                          h-10

                          rounded-xl

                          bg-white/[0.05]

                          border
                          border-white/10

                          flex
                          items-center
                          justify-center
                        "
                      >
                        <CalendarDays
                          size={
                            18
                          }
                          className="
                            text-lime-400
                          "
                        />
                      </div>

                      <h3
                        className="
                          text-xl
                          md:text-2xl

                          font-black

                          uppercase
                        "
                      >
                        {
                          section.title
                        }
                      </h3>
                    </div>

                    {/* PARAGRAPHS */}

                    {section
                      .paragraphs &&
                      section
                        .paragraphs
                        .length >
                        0 && (
                        <div
                          className="
                            mt-5
                            space-y-4
                          "
                        >
                          {section.paragraphs.map(
                            (
                              paragraph,
                              index
                            ) => (
                              <p
                                key={
                                  index
                                }
                                className="
                                  text-neutral-400

                                  leading-7
                                "
                              >
                                {
                                  paragraph
                                }
                              </p>
                            )
                          )}
                        </div>
                      )}

                    {/* SCHEDULE */}

                    {section
                      .schedules &&
                      section
                        .schedules
                        .length >
                        0 && (
                        <div
                          className="
                            mt-7

                            grid
                            md:grid-cols-2

                            gap-4
                          "
                        >
                          {section.schedules.map(
                            (
                              schedule,
                              index
                            ) => (
                              <div
                                key={`${schedule.label}-${index}`}
                                className="
                                  rounded-2xl

                                  border
                                  border-white/[0.07]

                                  bg-black/50

                                  p-5
                                "
                              >
                                <div
                                  className="
                                    flex
                                    items-center
                                    gap-2
                                  "
                                >
                                  <Clock3
                                    size={
                                      15
                                    }
                                    className="
                                      text-lime-400
                                    "
                                  />

                                  <p
                                    className="
                                      text-sm
                                      font-bold

                                      text-white
                                    "
                                  >
                                    {
                                      schedule.label
                                    }
                                  </p>
                                </div>

                                <div
                                  className="
                                    mt-4

                                    flex
                                    flex-wrap

                                    gap-2
                                  "
                                >
                                  {schedule.times.map(
                                    (
                                      time
                                    ) => (
                                      <span
                                        key={
                                          time
                                        }
                                        className="
                                          px-3
                                          py-1.5

                                          rounded-lg

                                          border
                                          border-white/10

                                          bg-white/[0.035]

                                          text-xs
                                          text-neutral-300
                                        "
                                      >
                                        {
                                          time
                                        }
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                )
              )}
            </div>
          )}

        {/* ================================================= */}
        {/* CLOSING */}
        {/* ================================================= */}

        {content.closing && (
          <div
            className="
              mt-12

              border-l-2
              border-lime-400

              pl-6
              md:pl-8

              max-w-5xl
            "
          >
            <p
              className="
                text-lg
                md:text-xl

                text-neutral-300

                leading-8
              "
            >
              {
                content.closing
              }
            </p>
          </div>
        )}

        {/* TAGLINE */}

        {content.tagline && (
          <div
            className="
              mt-12

              rounded-3xl

              border
              border-white/10

              bg-neutral-950

              px-6
              md:px-10

              py-8

              text-center
            "
          >
            <p
              className="
                text-2xl
                md:text-3xl

                font-black

                uppercase

                tracking-tight

                text-white
              "
            >
              {
                content.tagline
              }
            </p>
          </div>
        )}

        {/* ================================================= */}
        {/* BENEFITS */}
        {/* ================================================= */}

        <div
          className="
            mt-16

            grid
            md:grid-cols-2

            gap-5
          "
        >
          {/* WHAT YOU'LL GAIN */}

          <div
            className="
              rounded-3xl

              border
              border-white/[0.08]

              bg-neutral-950

              p-7
              md:p-8
            "
          >
            <p
              className="
                text-xs

                text-lime-400

                uppercase

                tracking-[0.25em]

                font-bold
              "
            >
              Benefits
            </p>

            <h3
              className="
                mt-3

                text-2xl

                font-black

                uppercase
              "
            >
              What You&apos;ll Gain
            </h3>

            <div
              className="
                mt-6
                space-y-4
              "
            >
              {content.benefits.map(
                (benefit) => (
                  <div
                    key={
                      benefit
                    }
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >
                    <div
                      className="
                        mt-0.5

                        w-5
                        h-5

                        shrink-0

                        rounded-full

                        border
                        border-lime-400/30

                        bg-lime-400/10

                        flex
                        items-center
                        justify-center
                      "
                    >
                      <Check
                        size={
                          12
                        }
                        className="
                          text-lime-400
                        "
                      />
                    </div>

                    <span
                      className="
                        text-neutral-300

                        text-sm
                        md:text-base
                      "
                    >
                      {benefit}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* PERFECT FOR */}

          <div
            className="
              rounded-3xl

              border
              border-white/[0.08]

              bg-neutral-950

              p-7
              md:p-8
            "
          >
            <p
              className="
                text-xs

                text-lime-400

                uppercase

                tracking-[0.25em]

                font-bold
              "
            >
              Who It&apos;s For
            </p>

            <h3
              className="
                mt-3

                text-2xl

                font-black

                uppercase
              "
            >
              Perfect For
            </h3>

            <div
              className="
                mt-6

                flex
                flex-wrap

                gap-3
              "
            >
              {content.idealFor.map(
                (item) => (
                  <div
                    key={item}
                    className="
                      rounded-full

                      border
                      border-white/10

                      bg-black

                      px-4
                      py-2

                      text-sm
                      text-neutral-300
                    "
                  >
                    {item}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
        </section>

{/* ================================================= */}
{/* BOOK FREE TRIAL CTA */}
{/* ================================================= */}

<section
  className="
    relative
    bg-black
    px-6
    md:px-10
    pb-16
    md:pb-20
  "
>
  <div
    className="
      relative

      max-w-7xl
      mx-auto

      overflow-hidden

      rounded-[28px]

      border
      border-lime-400/20

      bg-neutral-950

      px-6
      md:px-10
      lg:px-12

      py-9
      md:py-11
    "
  >
    {/* GREEN GLOW */}

    <div
      className="
        absolute
        -top-24
        -right-20

        w-[300px]
        h-[300px]

        rounded-full

        bg-lime-400/[0.08]

        blur-[100px]

        pointer-events-none
      "
    />

    {/* SMALL ACCENT */}

    <div
      className="
        absolute
        top-0
        left-10

        w-20
        h-[3px]

        bg-lime-400
      "
    />

    <div
      className="
        relative
        z-10

        flex
        flex-col
        lg:flex-row

        lg:items-center
        lg:justify-between

        gap-7
      "
    >
      {/* CONTENT */}

      <div className="max-w-3xl">
        <p
          className="
            text-xs
            font-bold

            uppercase

            tracking-[0.3em]

            text-lime-400
          "
        >
          Ready To Start?
        </p>

        <h2
          className="
            mt-3

            text-3xl
            md:text-4xl
            lg:text-5xl

            font-black

            uppercase

            tracking-tight

            leading-tight

            text-white
          "
        >
          Experience{" "}
          <span className="text-lime-400">
            {service.name}
          </span>{" "}
          At Fuel
        </h2>

        <p
          className="
            mt-4

            max-w-2xl

            text-sm
            md:text-base

            leading-7

            text-neutral-400
          "
        >
          Book a free trial session and
          experience our structured
          training, expert coaching and
          FUEL community before choosing
          your membership.
        </p>
      </div>

      {/* CTA */}

      <button
        type="button"
        onClick={() =>
          setIsBookTrialOpen(true)
        }
        className="
          shrink-0

          min-w-[190px]

          h-13

          px-7

          rounded-xl

          bg-lime-400

          text-black

          text-sm
          font-black

          uppercase

          tracking-wide

          cursor-pointer

          shadow-[0_0_30px_rgba(163,230,53,0.18)]

          hover:bg-lime-300
          hover:scale-[1.02]

          hover:shadow-[0_0_40px_rgba(163,230,53,0.28)]

          transition-all
          duration-300
        "
      >
        Book Free Trial
      </button>
    </div>
  </div>
</section>

{/* ================================================= */}
{/* PACKAGES */}
{/* ================================================= */}


      {/* ================================================= */}
      {/* PACKAGES */}
      {/* ================================================= */}

      <section
        className="
          border-t
          border-neutral-900

          bg-neutral-950

          py-16
          md:py-20

          px-6
        "
      >
        <div
          className="
            max-w-7xl
            mx-auto
          "
        >
          {/* PACKAGE HEADING */}

          <div
            className="
              max-w-3xl
            "
          >
            <p
              className="
                text-lime-400

                text-xs

                tracking-[0.3em]

                uppercase

                font-bold
              "
            >
              Membership Options
            </p>

            <h2
              className="
                mt-4

                text-4xl
                md:text-5xl

                font-black

                uppercase

                tracking-tight
              "
            >
              Choose Your{" "}
              <span
                className="
                  text-lime-400
                "
              >
                Package
              </span>
            </h2>

            <p
              className="
                mt-4

                text-neutral-500

                leading-7
              "
            >
              Select the
              membership option
              that works best for
              your training goals.
            </p>
          </div>

          {/* ================================================= */}
          {/* PACKAGE CARDS */}
          {/* ================================================= */}

          {packages.length >
          0 ? (
            <div
              className="
                mt-10

                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-3

                gap-6
              "
            >
              {packages.map(
                (pkg) => {
                  const hasDiscount =
                    !!pkg.originalPrice &&
                    pkg.originalPrice >
                      pkg.price;

                  return (
                    <div
                      key={
                        pkg.id
                      }
                      className="
                        group
                        relative

                        rounded-3xl

                        border
                        border-neutral-800

                        bg-neutral-900/70

                        p-7

                        overflow-hidden

                        transition
                        duration-300

                        hover:border-neutral-600
                        hover:-translate-y-1
                      "
                    >
                      {/* NAME */}

                      <h3
                        className="
                          text-2xl
                          font-black
                        "
                      >
                        {
                          pkg.name
                        }
                      </h3>

                      {/* DURATION */}

                      <p
                        className="
                          mt-2

                          text-sm
                          text-neutral-500
                        "
                      >
                        {
                          pkg.durationInDays
                        }{" "}
                        Days
                        Membership
                      </p>

                      {/* PRICE */}

                      <div
                        className="
                          mt-7

                          flex
                          items-end

                          gap-3
                        "
                      >
                        <span
                          className="
                            text-4xl
                            md:text-5xl

                            font-black
                          "
                        >
                          ₹
                          {(
                            pkg.price /
                            100
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </span>

                        {hasDiscount && (
                          <span
                            className="
                              mb-1

                              text-neutral-600

                              line-through
                            "
                          >
                            ₹
                            {(
                              (pkg.originalPrice ||
                                0) /
                              100
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        )}
                      </div>

                      {/* DESCRIPTION */}

                      <p
                        className="
                          mt-6

                          min-h-[60px]

                          text-sm

                          leading-6

                          text-neutral-400
                        "
                      >
                        {pkg.description ||
                          `Join our ${service.name} program and start your training journey at Fuel Gym.`}
                      </p>

                      {/* COUPONS */}

                      {pkg.coupons?.some(
                        (
                          coupon
                        ) =>
                          coupon.isActive &&
                          !coupon.isPrivate
                      ) && (
                        <div
                          className="
                            mt-6
                            space-y-2
                          "
                        >
                          {pkg.coupons
                            .filter(
                              (
                                coupon
                              ) =>
                                coupon.isActive &&
                                !coupon.isPrivate
                            )
                            .map(
                              (
                                coupon
                              ) => (
                                <div
                                  key={
                                    coupon.id
                                  }
                                  className="
                                    rounded-xl

                                    border
                                    border-lime-400/20

                                    bg-lime-400/5

                                    px-4
                                    py-3
                                  "
                                >
                                  <p
                                    className="
                                      text-xs
                                      text-neutral-500
                                    "
                                  >
                                    Offer
                                  </p>

                                  <p
                                    className="
                                      mt-1

                                      font-bold

                                      tracking-wider

                                      text-lime-300
                                    "
                                  >
                                    {
                                      coupon.code
                                    }
                                  </p>
                                </div>
                              )
                            )}
                        </div>
                      )}

                      {/* CTA */}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackage(
                            pkg
                          );

                          setOpen(
                            true
                          );
                        }}
                        className="
                          mt-8

                          w-full
                          h-12

                          rounded-xl

                          bg-lime-400
                          text-black

                          font-bold

                          cursor-pointer

                          hover:bg-lime-300

                          transition
                        "
                      >
                        Choose Package
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div
              className="
                mt-10

                rounded-3xl

                border
                border-neutral-800

                bg-neutral-900/50

                px-6
                py-14

                text-center
              "
            >
              <h3
                className="
                  text-2xl
                  font-bold
                "
              >
                Packages Coming
                Soon
              </h3>

              <p
                className="
                  mt-3

                  text-neutral-500
                "
              >
                Membership
                packages for this
                service are
                currently
                unavailable.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* `SUBSC`RIBE MODAL */}
      {/* ================================================= */}

      {selectedPackage && (
        <SubscribeModal
          open={open}
          setOpen={setOpen}
          selectedPackage={
            selectedPackage
          }
          service={service}
        />
      )}


<BookTrialForm
  open={isBookTrialOpen}
  setOpen={setIsBookTrialOpen}
/>

      {/* ================================================= */}
      {/* CONTACT */}
      {/* ================================================= */}

      <ContactForm
        open={isContactOpen}
        setOpen={
          setIsContactOpen
        }
      />

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <Footer />
    </main>
  );
}