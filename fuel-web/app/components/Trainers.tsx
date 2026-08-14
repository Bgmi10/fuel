export const Trainers = () => {
  const trainers = [
    {
      name: "Arif",
      role: "Head Coach",
      img: "/arif.JPEG",
      qualification: [
        "CPT - NASM",
        "PES - NASM",
        "WLS - NASM",
        "GBB - NASM",
        "CFR PRO - ACFIT",
        "CPR & FIRST AID",
      ],
    },
    {
      name: "Raghav",
      role: "Coach - Gym",
      img: "/ragav.JPEG",
      qualification: [
        "Fitness and Nutrition Science - INFS",
        "Metabolic Science - NASM",
        "Exercise Physiology - Harvard Medical School",
        "CPR & FIRST AID",
      ],
    },
    {
      name: "Narendran",
      role: "Coach - Gym",
      img: "/nk.JPEG",
      qualification: [
        "CPT - ACE",
        "MR. ASIA",
        "MR. INDIA",
        "MR. TAMILNADU",
        "CPR & FIRST AID",
      ],
    },
    {
      name: "Nithya",
      role: "Coach - Yoga",
      img: "/nitya.JPEG",
      qualification: [
        "RYT",
        "AERIAL YOGA",
        "SINGING BOWL",
        "SOUND HEALING",
        "PRENATAL YOGA",
        "CPR & FIRST AID",
      ],
    },
  ];

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
      <div
        className="
          relative
          max-w-[1450px]
          mx-auto
          px-6
          md:px-10
          lg:px-12
        "
      >
        {/* HEADING */}

       {/* HEADING */}

<div className="text-center mb-8 md:mb-10">
  <p
    className="
      text-[12px]
      tracking-[0.6em]
      text-lime-400
      font-semibold
      mb-2
    "
  >
    TRAINERS
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
    <span className="text-lime-400">
      THE MINDS
    </span>{" "}
    BEHIND YOUR MOVEMENT
  </h2>
</div>

        {/* TRAINERS */}

        <div
          className="
            grid
            grid-cols-2
            lg:grid-cols-4
            gap-x-5
            md:gap-x-6
            lg:gap-x-7
            gap-y-8
            w-full
          "
        >
          {trainers.map((trainer) => (
            <div
              key={trainer.name}
              className="group w-full"
            >
              {/* FLIP CARD */}

              <div
                className="
                  relative
                  w-full
                  h-[220px]
                  sm:h-[240px]
                  md:h-[260px]
                  lg:h-[280px]
                  xl:h-[300px]
                  [perspective:1200px]
                "
              >
                <div
                  className="
                    relative
                    w-full
                    h-full
                    transition-transform
                    duration-700
                    ease-out
                    [transform-style:preserve-3d]
                    group-hover:[transform:rotateY(180deg)]
                  "
                >
                  {/* FRONT */}

                  <div
                    className="
                      absolute
                      inset-0
                      w-full
                      h-full
                      overflow-hidden
                      rounded-2xl
                      bg-neutral-950
                      border
                      border-white/[0.05]
                      [backface-visibility:hidden]
                    "
                  >
                    <img
                      src={trainer.img}
                      alt={trainer.name}
                      className="
                        w-full
                        h-full
                        object-cover
                        object-top
                        transition-all
                        duration-500
                        group-hover:scale-[1.03]
                      "
                    />

                    <div
                      className="
                        absolute
                        inset-x-0
                        bottom-0
                        h-20
                        bg-gradient-to-t
                        from-black/70
                        to-transparent
                        pointer-events-none
                      "
                    />
                  </div>

                  {/* BACK */}

                  <div
                    className="
                      absolute
                      inset-0
                      w-full
                      h-full
                      overflow-hidden
                      rounded-2xl
                      border
                      border-white/[0.08]
                      [backface-visibility:hidden]
                      [transform:rotateY(180deg)]
                    "
                  >
                    {/* BLURRED BACKGROUND IMAGE */}

                    <img
                      src={trainer.img}
                      alt=""
                      className="
                        absolute
                        inset-0
                        w-full
                        h-full
                        object-cover
                        object-top
                        scale-110
                        blur-md
                        opacity-40
                      "
                    />

                    {/* DARK OVERLAY */}

                    <div
                      className="
                        absolute
                        inset-0
                        bg-black/75
                        backdrop-blur-[2px]
                      "
                    />

                    {/* CONTENT */}

                    <div
                      className="
                        relative
                        z-10
                        flex
                        flex-col
                        justify-center
                        h-full
                        px-4
                        sm:px-5
                        md:px-6
                      "
                    >
                     <h3
  className="
    text-base
    sm:text-lg
    md:text-xl
    font-black
    uppercase
    text-lime-400
    leading-tight
  "
>
  {trainer.name}
</h3>

                      <p
                        className="
                          mt-0.5
                          text-[10px]
                          sm:text-xs
                          font-medium
                          text-white/55
                        "
                      >
                        {trainer.role}
                      </p>

                      <div
                        className="
                          w-7
                          h-[2px]
                          bg-white
                          my-2
                          md:my-3
                        "
                      />

                      <div
                        className="
                          flex
                          flex-col
                          gap-[3px]
                          md:gap-1
                        "
                      >
                        {trainer.qualification.map(
                          (item) => (
                            <div
                              key={item}
                              className="
                                flex
                                items-start
                                gap-1.5
                              "
                            >
                              <span
                                className="
                                  mt-[5px]
                                  w-[3px]
                                  h-[3px]
                                  rounded-full
                                  bg-white/50
                                  shrink-0
                                "
                              />

                              <p
                                className="
                                  text-[8px]
                                  sm:text-[9px]
                                  md:text-[10px]
                                  lg:text-[11px]
                                  leading-[1.35]
                                  text-neutral-300
                                  font-medium
                                "
                              >
                                {item}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* INFO */}

              <div className="mt-3">
                <h3
                  className="
                    text-base
                    md:text-lg
                    font-black
                    text-white
                    leading-tight
                  "
                >
                  {trainer.name}
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    md:text-sm
                    text-neutral-500
                    leading-5
                  "
                >
                  {trainer.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};