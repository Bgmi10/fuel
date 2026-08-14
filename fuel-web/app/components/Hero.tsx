export const Hero = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {/* Background Image */}
      <img
        src="/hero.jpeg"
        alt="Fuel Human Performance"
        className="
          absolute
          inset-0
          h-full
          w-full
          object-cover
          object-center
        "
      />

      {/* Subtle Dark Overlay */}
      <div
        className="
          absolute
          inset-0
          bg-black/10
        "
      />

      {/* Bottom Fade */}
      <div
        className="
          absolute
          inset-x-0
          bottom-0
          h-40
          bg-gradient-to-t
          from-black
          to-transparent
        "
      />
    </section>
  );
};