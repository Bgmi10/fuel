export const Services = () => {
    const services = [
      "STRENGTH TRAINING",
      "FAT LOSS",
      "PERSONAL TRAINING",
      "DIET & NUTRITION",
      "GROUP CLASSES",
    ];
  
    return (
      <section className="bg-black py-12">
  
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.5em] text-neutral-500">
            SERVICES
          </p>
  
          <h2 className="text-5xl  font-extrabold text-neutral-200 mt-2">
            WHAT YOU GET AT FUEL
          </h2>
        </div>
  
        {/* 🔥 Compact Row */}
        <div className="flex flex-wrap justify-center gap-6 px-6">
  
          {services.map((service, i) => (
            <div
              key={i}
              className="text-white text-sm md:text-base tracking-wide 
                         px-5 py-3 rounded-full border border-neutral-700
                         hover:border-lime-400 hover:text-lime-400
                         transition-all duration-300"
            >
              {service}
            </div>
          ))}
  
        </div>
      </section>
    );
  };