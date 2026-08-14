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
              "
            >
              Fuel is the spark that ignites
              your potential — the power that
              drives you to move, grow and
              conquer limits.
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
                max-w-[120px]
              "
            >
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
                  bg-white
                  text-black
                  flex
                  items-center
                  justify-center
                  hover:bg-lime-400
                  hover:scale-105
                  transition-all
                  duration-300
                "
              >
                <img
                  src="https://imgs.search.brave.com/TlENU9LrIKC8jpubywPxOQ6YCqw0OFGlktf0mHl2RZA/rs:fit:32:32:1:0/g:ce/aHR0cDovL2Zhdmlj/b25zLnNlYXJjaC5i/cmF2ZS5jb20vaWNv/bnMvYzY2MGJiOWU5/YjRiMjI5YWQyMDQz/NDk5OGZiZDAxNzE4/OGYwNDcxMGQ5Mjli/YWZmZDNmNjQ1YTFl/NjQyODE4OS9icmFu/ZC55b3V0dWJlLw"
                  alt="YouTube"
                  className="
                    w-6
                    h-6
                  "
                />
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