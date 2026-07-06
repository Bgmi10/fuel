"use client";
import { Parallax } from "react-scroll-parallax";

const About = () => {
  return (
    <section className="relative mt-60 bg-black">

      {/* 🔥 Sticky Center Layer */}
      <div className="sticky top-0 h-screen flex items-center justify-center">

        {/* 🔥 Images */}
        <div className="flex items-center justify-center gap-[30px]">

          {/* LEFT IMAGE */}
          <Parallax
            scale={[1, 0.8]}
            opacity={[1, 0.6]}
            speed={-10}
          >
            <img
              src="https://cdn-images.cure.fit/www-curefit-com/image/upload/w_630,q_auto:good,f_auto,dpr_2,fl_progressive/image/test/image_zoom_widget/image_zoom_widget_img_1.png"
              className="w-[260px] md:w-[380px] lg:w-[520px] rounded-xl object-cover shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
              alt="Fuel training"
            />
          </Parallax>

          {/* RIGHT IMAGE */}
          <Parallax
            scale={[1, 0.7]}
            opacity={[1, 0.4]}
            speed={-20}
          >
            <img
              src="https://cdn-images.cure.fit/www-curefit-com/image/upload/w_630,q_auto:good,f_auto,dpr_2,fl_progressive/image/test/image_zoom_widget/image_zoom_widget_img_2.png"
              className="w-[260px] md:w-[380px] lg:w-[520px] rounded-xl object-cover shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
              alt="Fuel workout"
            />
          </Parallax>

        </div>

        {/* 🔥 Overlay Text (center, readable) */}
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center px-6">

          <div className="bg-black/40 backdrop-blur-sm px-6 py-5 rounded-xl text-center">

            <p className="text-xs md:text-sm tracking-[0.5em] text-neutral-400 mb-4">
              WHY CHOOSE FUEL
            </p>

            <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              OTHER GYMS SELL MEMBERSHIP,
              <br />
              WE BUILD TRANSFORMATIONS.
            </h2>

          </div>
        </div>

      </div>
    </section>
  );
};

export default About