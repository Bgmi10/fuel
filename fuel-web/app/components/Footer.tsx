"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white border-t border-white/10">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-6 items-start">
          {/* LEFT */}
          <div className="space-y-4 lg:pr-6">
            {/* LOGO */}
            <div className="relative w-[130px] h-[60px]">
              <Image
                src="/logo.png"
                alt="Fuel Gym"
                fill
                className="object-contain"
              />
            </div>

            <p className="text-white/80 leading-7 text-sm uppercase max-w-sm">
              Fuel is the spark that ignites your potential – the power that
              drives you to move, grow and conquer limits.
            </p>
          </div>

          {/* CENTER */}
          <div className="space-y-5 lg:px-4">
            <h2 className="text-2xl font-black uppercase tracking-wide">
              Visit Us
            </h2>

            <div className="space-y-4">
              {/* ADDRESS */}
              <div className="flex items-start gap-3">
                <MapPin
                  className="text-lime-400 min-w-[20px] mt-1"
                  size={20}
                />

                <p className="text-sm leading-7 text-white/90">
                  237 To 239, Purasaiwalkam High Road,
                  <br />
                  Purasaiwalkam, Chennai - 600084.
                  <br />
                  Near Welcome Hotel
                </p>
              </div>

              {/* PHONE */}
              <div className="flex items-center gap-3">
                <Phone className="text-lime-400" size={20} />

                <a
                  href="tel:+918428428866"
                  className="text-sm hover:text-lime-400 transition"
                >
                  +91 8428428866
                </a>
              </div>

              {/* EMAIL */}
              <div className="flex items-center gap-3">
                <Mail className="text-lime-400" size={20} />

                <a
                  href="mailto:fuelgym.co@gmail.com"
                  className="text-sm hover:text-lime-400 transition break-all"
                >
                  fuelgym.co@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-5 md:col-span-2 lg:col-span-1 lg:pl-6 lg:flex lg:flex-col lg:items-end">
            <h2 className="text-2xl font-black uppercase tracking-wide">
              Follow Us
            </h2>

            <div className="flex items-center gap-4 lg:justify-end">
              <Link
                href="https://www.youtube.com/@fuelgym"
                target="_blank"
                className="
                  w-12 h-12 rounded-full
                  border border-white/10
                  hover:border-lime-400
                  transition-all duration-300
                  flex items-center justify-center
                  bg-white/5 hover:bg-white/10
                "
              >
                <img
                  src="https://imgs.search.brave.com/TlENU9LrIKC8jpubywPxOQ6YCqw0OFGlktf0mHl2RZA/rs:fit:32:32:1:0/g:ce/aHR0cDovL2Zhdmlj/b25zLnNlYXJjaC5i/cmF2ZS5jb20vaWNv/bnMvYzY2MGJiOWU5/YjRiMjI5YWQyMDQz/NDk5OGZiZDAxNzE4/OGYwNDcxMGQ5Mjli/YWZmZDNmNjQ1YTFl/NjQyODE4OS9icmFu/ZC55b3V0dWJlLw"
                  alt="YouTube"
                  className="w-6 h-6"
                />
              </Link>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="border-t border-white/10 mt-10 pt-5 text-center">
          <p className="text-white/60 text-sm">
            © 2026 Fuel Gym. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}