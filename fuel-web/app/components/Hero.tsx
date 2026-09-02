export const Hero = () => {
  return (
    <section
      className="
        relative
        w-full
        overflow-hidden
        bg-black

        /* Mobile */
        h-[58svh]
        min-h-[360px]

        /* Small tablets */
        sm:h-[65svh]
        sm:min-h-[420px]

        /* Desktop */
        md:h-screen
        md:min-h-0
      "
    >
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/Home-poster.webp"
        className="
          absolute
          inset-0
          h-full
          w-full
          object-cover

          object-[5%_center]
          sm:object-[5%_center]
          md:object-center
        "
      >
        {/* Mobile Video */}
        <source
          src="/Home-mobile.mp4"
          type="video/mp4"
          media="(max-width: 639px)"
        />

        {/* Desktop Video */}
        <source
          src="/Home.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Overlay */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-black/10
        "
      />

      {/* Bottom Fade */}
      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-0
          h-16
          sm:h-24
          md:h-40
          bg-gradient-to-t
          from-black
          via-black/40
          to-transparent
        "
      />
    </section>
  );
};