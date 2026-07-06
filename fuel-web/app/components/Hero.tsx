export const Hero = ({ setIsBookTrailOpen }: { setIsBookTrailOpen: (vaule: boolean) => void}) => {
    return (
      <section className="relative h-screen w-full overflow-hidden">
        
        {/* 🎥 Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline

  className="absolute inset-0 h-full w-full object-cover brightness-200"
        >
          <source
            src="/fuelbgvid.MP4"
            type="video/mp4"
            
          />
        </video>
  
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 mt-2">
  
  
        {/* <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]">
  <h1
    className="text-[120px] md:text-[200px] lg:text-[300px] 
               font-extrabold tracking-[0.2em] 
               text-transparent 
               stroke-text"
  >
    FUEL
  </h1>
</div> */}
          {/* 🔥 Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold 
                         tracking-wider text-neutral-200 leading-tight  drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
            TRANSFORM YOUR BODY
            <br />
            <span className="bg-gradient-to-r from-neutral-300 to-neutral-500 
                             bg-clip-text text-transparent">
              AT FUEL GYM
            </span>
          </h1>
  
          {/* 🔹 Subtext */}
          <p className="mt-6 text-neutral-400 text-lg md:text-xl max-w-2xl leading-relaxed">
            Fuel is the spark that ignites your potential — the power that drives you
            to move, grow, and conquer limits.
          </p>
  
          {/* 🔥 CTA */}
          <button
            className="mt-8 px-8 py-3 rounded-md font-semibold tracking-wide 
                       bg-lime-400 text-black
                       shadow-[0_0_25px_rgba(198,255,0,0.3)]
                       hover:shadow-[0_0_40px_rgba(198,255,0,0.6)]
                       hover:bg-lime-300
                       transition-all duration-300"
                       onClick={() => setIsBookTrailOpen(true)}
          >
            BOOK FREE TRIAL
          </button>
          <div className="absolute bottom-20">
             <svg
               xmlns="http://www.w3.org/2000/svg"
               className="w-6 h-6 text-neutral-300"
               fill="none"
               viewBox="0 0 24 24"
               stroke="currentColor"
               strokeWidth={2}
             >
               <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
             </svg>
           </div>
        </div>
      </section>
    );
  };