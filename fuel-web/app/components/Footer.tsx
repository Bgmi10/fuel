"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

export default function Footer() {
  const quickLinks = [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "About Us",
      href: "/about",
    },
    {
      label: "Services",
      href: "/#pricing",
    },
    {
      label: "Academy",
      href: "/academy",
    },
    {
      label: "Blogs",
      href: "/blogs",
    },
  ];

  const phoneNumbers = [
    {
      label: "+91 842 842 88 66",
      value: "+918428428866",
    },
    {
      label: "+91 842 842 88 22",
      value: "+918428428822",
    },
    {
      label: "+91 842 842 88 77",
      value: "+918428428877",
    },
    {
      label: "+91 842 842 88 99",
      value: "+918428428899",
    },
  ];

  return (
    <footer
      className="
        relative
        w-full
        bg-black
        text-white
        border-t
        border-white/10
        overflow-hidden
      "
    >
      {/* TOP DASHED LINE */}
      <div
        className="
          w-full
          border-t
          border-dashed
          border-white/35
        "
      />

      <div
        className="
          max-w-[1500px]
          mx-auto
          px-6
          md:px-10
          lg:px-12
          py-10
          md:py-12
        "
      >
        {/* MAIN FOOTER */}

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            lg:grid-cols-[1.2fr_0.8fr_1.4fr_0.7fr]
            gap-10
            lg:gap-12
            items-start
          "
        >
          {/* ===================================== */}
          {/* BRAND */}
          {/* ===================================== */}

          <div>
            <div
              className="
                relative
                w-[120px]
                h-[55px]
              "
            >
              <Image
                src="/logo.png"
                alt="Fuel Gym"
                fill
                className="object-contain object-left"
              />
            </div>

            <p
              className="
                mt-4
                max-w-[280px]
                text-[11px]
                md:text-xs
                leading-5
                text-neutral-500
                lowercase
              "
            >
             WE CREATE THE FIRE THAT MOVES YOU.
             WE TURN EVERY SPARK INTO STRENGTH, EVERY STEP INTO PROGRESS.
            </p>
          </div>

          {/* ===================================== */}
          {/* QUICK LINKS */}
          {/* ===================================== */}

          <div>
            <h3
              className="
                text-base
                md:text-lg
                font-medium
                uppercase
                tracking-wide
                text-white
              "
            >
              Quick Links
            </h3>

            <div
              className="
                mt-4
                flex
                flex-col
                items-start
                gap-2.5
              "
            >
              {quickLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="
                    text-sm
                    text-neutral-400
                    hover:text-lime-400
                    transition-colors
                    duration-300
                  "
                >
                  {item.label}
                </Link>
              ))}

              {/* ENQUIRE */}

              <a
                href="mailto:fuelgym.co@gmail.com"
                className="
                  text-sm
                  text-neutral-400
                  hover:text-lime-400
                  transition-colors
                  duration-300
                "
              >
                Enquire
              </a>
            </div>
          </div>

          {/* ===================================== */}
          {/* CONTACT US */}
          {/* ===================================== */}

          <div>
            <h3
              className="
                text-base
                md:text-lg
                font-medium
                uppercase
                tracking-wide
                text-white
              "
            >
              Contact Us
            </h3>

            <div
              className="
                mt-4
                space-y-5
              "
            >
              {/* ADDRESS */}

              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    mb-2
                  "
                >
                  <MapPin
                    size={15}
                    className="text-lime-400"
                  />

                  <p
                    className="
                      text-sm
                      font-medium
                      uppercase
                      text-white
                    "
                  >
                    Home Branch
                  </p>
                </div>

                <p
                  className="
                    text-xs
                    text-neutral-500
                    leading-5
                    max-w-[330px]
                  "
                >
                  #237 To 239,
                  Purasaiwakkam High Road,
                  Purasaiwakkam, Chennai,
                  Tamil Nadu, India -
                  600084.
                </p>

              </div>

              {/* EMAIL */}

              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Mail
                    size={15}
                    className="text-lime-400"
                  />

                  <p
                    className="
                      text-sm
                      font-medium
                      uppercase
                      text-white
                    "
                  >
                    Email
                  </p>
                </div>

                <a
                  href="mailto:fuelgym.co@gmail.com"
                  className="
                    inline-block
                    mt-1.5
                    text-xs
                    text-neutral-500
                    hover:text-lime-400
                    transition-colors
                    cursor-pointer
                  "
                >
                  fuelgym.co@gmail.com
                </a>
              </div>

              {/* PHONE */}

              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Phone
                    size={15}
                    className="text-lime-400"
                  />

                  <p
                    className="
                      text-sm
                      font-medium
                      uppercase
                      text-white
                    "
                  >
                    Phone
                  </p>
                </div>

                <div
                  className="
                    mt-2
                    flex
                    flex-col
                    items-start
                    gap-2
                  "
                >
                  {phoneNumbers.map(
                    (phone) => (
                      <a
                        key={phone.value}
                        href={`tel:${phone.value}`}
                        className="
                          text-xs
                          text-neutral-500
                          hover:text-lime-400
                          transition-colors
                        "
                      >
                        {phone.label}
                      </a>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===================================== */}
          {/* FOLLOW US */}
          {/* ===================================== */}

        {/* ===================================== */}
{/* FOLLOW US */}
{/* ===================================== */}

<div>
  <h3
    className="
      text-base
      md:text-lg
      font-medium
      uppercase
      tracking-wide
      text-white
    "
  >
    Follow Us
  </h3>

  <div
    className="
      mt-5
      flex
      flex-wrap
      gap-3
      max-w-[180px]
    "
  >
    {/* INSTAGRAM */}

    <Link
      href="https://www.instagram.com/fuelgym.in"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fuel Gym Instagram"
      className="
        w-12
        h-12
        rounded-full

        border
        border-white/10

        bg-neutral-900

        flex
        items-center
        justify-center

        text-neutral-300

        hover:bg-white
        hover:text-black
        hover:scale-105

        transition-all
        duration-300
      "
    >
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
        />

        <circle
          cx="12"
          cy="12"
          r="4"
        />

        <circle
          cx="17.5"
          cy="6.5"
          r="1"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    </Link>

    {/* FACEBOOK */}

    <Link
      href="https://www.facebook.com/p/Fuel-Gym-Yoga-100084722037975/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fuel Gym Facebook"
      className="
        w-12
        h-12
        rounded-full

        border
        border-white/10

        bg-neutral-900

        flex
        items-center
        justify-center

        text-neutral-300

        hover:bg-white
        hover:text-black
        hover:scale-105

        transition-all
        duration-300
      "
    >
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="currentColor"
      >
        <path
          d="
            M13.5 22
            v-9
            h3
            l.5-3.5
            h-3.5
            V7.2
            c0-1
            .3-1.7
            1.8-1.7
            H17V2.3
            c-.8-.1-1.8-.3-3-.3
            -3 0-5 1.8-5 5.1
            v2.4
            H6
            V13
            h3
            v9
            h4.5
            Z
          "
        />
      </svg>
    </Link>

    {/* THREADS */}

    <Link
      href="https://www.threads.com/@fuelgym.in"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fuel Gym Threads"
      className="
        w-12
        h-12
        rounded-full

        border
        border-white/10

        bg-neutral-900

        flex
        items-center
        justify-center

        text-neutral-300

        hover:bg-white
        hover:text-black
        hover:scale-105

        transition-all
        duration-300
      "
    >
      <span
        className="
          text-[21px]
          font-black
          leading-none
        "
      >
        @
      </span>
    </Link>

    {/* YOUTUBE - KEEPING EXISTING ICON */}

   {/* YOUTUBE */}

<Link
  href="https://www.youtube.com/@fuelgym"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Fuel Gym YouTube"
  className="
    w-12
    h-12
    rounded-full

    border
    border-white/10

    bg-neutral-900

    flex
    items-center
    justify-center

    text-neutral-300

    hover:bg-white
    hover:text-black
    hover:scale-105

    transition-all
    duration-300
  "
>
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    fill="currentColor"
  >
    <path
      d="
        M23 12
        c0-2.2-.2-4.2-.5-5.4
        -.3-1.1-1.2-2-2.3-2.3
        C18.4 3.8 12 3.8 12 3.8
        s-6.4 0-8.2.5
        C2.7 4.6 1.8 5.5 1.5 6.6
        1.2 7.8 1 9.8 1 12
        s.2 4.2.5 5.4
        c.3 1.1 1.2 2 2.3 2.3
        1.8.5 8.2.5 8.2.5
        s6.4 0 8.2-.5
        c1.1-.3 2-1.2 2.3-2.3
        .3-1.2.5-3.2.5-5.4
        Z

        M9.8 15.5
        v-7
        l6 3.5
        -6 3.5
        Z
      "
    />
  </svg>
</Link>

    {/* LINKEDIN */}

    <Link
      href="https://in.linkedin.com/company/fuel-gymandyoga"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fuel Gym LinkedIn"
      className="
        w-12
        h-12
        rounded-full

        border
        border-white/10

        bg-neutral-900

        flex
        items-center
        justify-center

        text-neutral-300

        hover:bg-white
        hover:text-black
        hover:scale-105

        transition-all
        duration-300
      "
    >
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="currentColor"
      >
        <path
          d="
            M6.5 8.5
            H3V21
            h3.5
            V8.5ZM4.75 3
            A2.05 2.05 0 1 0 4.75 7.1
            A2.05 2.05 0 0 0 4.75 3ZM9 8.5
            V21
            h3.5
            v-6.2
            c0-1.7
            .3-3.4
            2.5-3.4
            2.2 0
            2.2 2
            2.2 3.5
            V21
            H21
            v-6.8
            c0-3.4
            -.7-6
            -4.7-6
            -1.9 0
            -3.2 1
            -3.8 2
            v-1.7
            H9Z
          "
        />
      </svg>
    </Link>
  </div>
</div>
        </div>

        {/* ===================================== */}
        {/* BOTTOM */}
        {/* ===================================== */}

        <div
          className="
            mt-10
            pt-5
            border-t
            border-white/[0.07]
            flex
            flex-col
            md:flex-row
            items-center
            justify-between
            gap-3
          "
        >
          <p
            className="
              text-[11px]
              text-neutral-600
            "
          >
            © 2026 Fuel Gym. All Rights
            Reserved.
          </p>

          <p
            className="
              text-[11px]
              text-neutral-700
            "
          >
            Fuel Gym & Yoga · Chennai
          </p>
        </div>
      </div>
    </footer>
  );
}